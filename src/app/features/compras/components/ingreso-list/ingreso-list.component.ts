import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

import { IngresoCompraService } from '../../services/ingreso-compra.service';
import { LocalService } from '../../../maestros/services/local.service';
import { AuthService } from '../../../auth/services/auth.service';
// Ajusta esta ruta según dónde tengas tu servicio de proveedor
import { ProveedorService } from '../../services/proveedor.service';

import { IngresoCompraResponseDTO, EstadoIngreso } from '../../../../core/models/ingreso-compra-response.dto';
import { LocalDTO } from '../../../../core/models/local.dto';

import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';

/**
 * @description Componente central para la auditoría y listado de Compras/Ingresos a Almacén.
 * Provee una vista paginada con filtros cruzados avanzados (fechas, locales, proveedores)
 * y actúa como punto de partida tanto para registrar nuevas compras como para anular transacciones.
 */
@Component({
  selector: 'app-ingreso-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, TableModule, ButtonModule, TagModule,
    DialogModule, SelectModule, InputTextModule, ToastModule, ConfirmDialogModule, TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './ingreso-list.component.html'
})
export class IngresoListComponent implements OnInit {

  /** Referencia nativa a la tabla PrimeNG para gestionar programáticamente su ciclo de vida y paginación. */
  @ViewChild('dtIngresos') dtIngresos!: Table;

  // --- INYECCIÓN DE DEPENDENCIAS ---
  private ingresoService = inject(IngresoCompraService);
  private localService = inject(LocalService);
  private proveedorService = inject(ProveedorService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  // --- ESTADOS DE LA TABLA ---
  /** Colección de ingresos de compra renderizados en la vista actual. */
  ingresos: IngresoCompraResponseDTO[] = [];
  /** Total consolidado de registros en la base de datos aplicables al filtro actual. */
  totalRecords: number = 0;
  /** Indicador visual de procesamiento asíncrono para la grilla. */
  loading: boolean = false;
  /** Bandera RBAC que habilita acciones destructivas (Anulación) solo a roles de gestión. */
  puedeGestionar: boolean = false;

  // --- CATÁLOGOS PARA FILTROS ---
  /** Colección de sucursales disponibles para segmentar la búsqueda. */
  locales: LocalDTO[] = [];
  /** Colección de socios comerciales disponibles para filtrar compras por proveedor. */
  proveedores: any[] = []; // Ojo: Considera tipar esto con ProveedorDTO si está disponible

  // --- MODELOS DE FILTRO AVANZADO ---
  /** Límite inferior cronológico para la auditoría de compras. */
  filtroFechaInicio: string | null = null;
  /** Límite superior cronológico para la auditoría de compras. */
  filtroFechaFin: string | null = null;
  /** Identificador de la sucursal seleccionada en los filtros. */
  filtroIdLocal: number | null = null;
  /** Identificador del proveedor seleccionado en los filtros. */
  filtroIdProveedor: number | null = null;

  // --- ESTADOS DEL MODAL DE DETALLE ---
  /** Controla la visibilidad del modal de inspección detallada. */
  modalDetalleVisible: boolean = false;
  /** Almacena el payload completo de la transacción en curso de inspección. */
  ingresoSeleccionado: IngresoCompraResponseDTO | null = null;

  /**
   * @description Inicializa el componente validando los permisos de seguridad
   * y desencadenando la carga de los catálogos maestros necesarios para los filtros.
   */
  ngOnInit(): void {
    this.puedeGestionar = this.authService.esAdminOSupervisor();
    this.cargarCatalogos();
  }

  /**
   * @description Ejecuta de forma asíncrona la carga de catálogos paramétricos (Locales y Proveedores)
   * requeridos para el funcionamiento de la barra de filtros avanzados.
   */
  private cargarCatalogos(): void {
    // Carga de Topología de Sucursales
    this.localService.listarParaCombo().subscribe({
      next: (res) => this.locales = res,
      error: () => console.error('Error al cargar locales')
    });

    // Carga del Directorio de Proveedores
    this.proveedorService.listarParaCombo().subscribe({
      next: (res) => this.proveedores = res,
      error: () => console.error('Error al cargar proveedores')
    });
  }

  // ======================================================================
  // --- LÓGICA DE CARGA PAGINADA (LAZY) ---
  // ======================================================================

  /**
   * @description Solicita al servidor el bloque de transacciones de compra correspondientes,
   * empaquetando e inyectando todos los criterios del filtro cruzado.
   * @param event Objeto contenedor de metadatos de paginación emitido por PrimeNG.
   */
  cargarIngresos(event: any): void {
    this.loading = true;
    const page = (event.first ?? 0) / (event.rows ?? 10);
    const size = event.rows ?? 10;

    // Acondicionamiento estricto de fechas al estándar ISO 8601 esperado por Spring Boot
    const fechaIniFormateada = this.filtroFechaInicio ? `${this.filtroFechaInicio}T00:00:00` : null;
    const fechaFinFormateada = this.filtroFechaFin ? `${this.filtroFechaFin}T23:59:59` : null;

    this.ingresoService.listarPaginadoAvanzado(
      page, size, fechaIniFormateada, fechaFinFormateada, this.filtroIdProveedor, this.filtroIdLocal
    ).subscribe({
      next: (res) => {
        this.ingresos = res.content;
        this.totalRecords = res.totalElements;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.manejarError(err);
      }
    });
  }

  /**
   * @description Fuerza a la tabla a regresar a su estado base (Página 1),
   * lo cual dispara automáticamente el ciclo de recarga con los nuevos filtros aplicados.
   */
  aplicarFiltros(): void {
    if (this.dtIngresos) {
      this.dtIngresos.reset();
    }
  }

  /**
   * @description Purga todos los criterios de búsqueda de la memoria y desencadena
   * una recarga completa del historial de compras.
   */
  limpiarFiltros(): void {
    this.filtroFechaInicio = null;
    this.filtroFechaFin = null;
    this.filtroIdLocal = null;
    this.filtroIdProveedor = null;
    this.aplicarFiltros();
  }

  // ======================================================================
  // --- ACCIONES DE LA GRILLA Y NAVEGACIÓN ---
  // ======================================================================

  /**
   * @description Abandona la vista de auditoría y redirige al operador hacia
   * la interfaz transaccional de registro de nueva compra.
   */
  abrirNuevaCompra(): void {
    this.router.navigate(['/compras/nuevo']);
  }

  /**
   * @description Carga en memoria la transacción seleccionada y despliega el modal
   * de auditoría para examinar las líneas de detalle (productos/seriales).
   * @param ingreso DTO que contiene la cabecera e historial de la compra.
   */
  verDetalle(ingreso: IngresoCompraResponseDTO): void {
    this.ingresoSeleccionado = ingreso;
    this.modalDetalleVisible = true;
  }

  /**
   * @description Destruye el contexto de inspección actual y oculta la ventana modal.
   */
  cerrarModalDetalle(): void {
    this.modalDetalleVisible = false;
    this.ingresoSeleccionado = null;
  }

  /**
   * @description Secuencia crítica de seguridad: Invoca un panel de confirmación severo
   * advirtiendo al operador de la naturaleza destructiva de la anulación (reversión física de inventario).
   * @param ingreso Transacción comercial candidata a la anulación.
   */
  anularCompra(ingreso: IngresoCompraResponseDTO): void {
    this.confirmationService.confirm({
      message: `¿Estás completamente seguro de anular la compra <b>${ingreso.serieComprobante}-${ingreso.numeroComprobante}</b> del proveedor ${ingreso.razonSocialProveedor}? <br><br><b>¡Atención!</b> Esta acción descontará físicamente el stock del almacén.`,
      header: 'Confirmación de Anulación FÍSICA',
      icon: 'pi pi-exclamation-triangle text-red-500',
      acceptLabel: 'Sí, Anular Compra',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger shadow-md',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => {
        this.ejecutarAnulacion(ingreso.idIngreso);
      }
    });
  }

  /**
   * @description Consuma la orden de anulación hacia el backend. Actualiza la UI
   * ante el éxito y propaga los errores (ej. "Stock ya vendido") en caso de rechazo del servidor.
   * @param idIngreso Identificador interno de la transacción.
   */
  private ejecutarAnulacion(idIngreso: number): void {
    this.loading = true;
    this.ingresoService.anularIngresoCompra(idIngreso).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Anulación Exitosa', detail: 'La compra fue anulada y el stock revertido.' });
        this.aplicarFiltros(); // Fuerza la actualización del estado visual en la grilla
      },
      error: (err) => {
        this.loading = false;
        this.manejarError(err);
      }
    });
  }

  // ======================================================================
  // --- UTILITARIOS Y UX ---
  // ======================================================================

  /**
   * @description Transforma el estado lógico de la transacción en un token visual
   * semánticamente correcto para los Tags de PrimeNG.
   * @param estado Condición del ciclo de vida del ingreso (ej. REGISTRADO, ANULADO).
   */
  getSeverityEstado(estado: EstadoIngreso): "success" | "danger" | "secondary" {
    switch (estado) {
      case EstadoIngreso.REGISTRADO: return 'success';
      case EstadoIngreso.ANULADO: return 'danger';
      default: return 'secondary';
    }
  }

  /**
   * @description Interceptor genérico de errores. Procesa y traduce los payloads de error
   * devueltos por Spring Boot hacia notificaciones visuales legibles para el usuario final.
   * @param err Objeto encapsulador del error HTTP.
   */
  private manejarError(err: any): void {
    console.error('Error capturado:', err);
    let titulo = 'Error del Servidor';
    let mensaje = 'No se pudo procesar la solicitud.';
    if (err.error && err.error.message) {
      titulo = err.error.error || 'Operación Denegada';
      mensaje = err.error.message;
    }
    this.messageService.add({ severity: 'error', summary: titulo, detail: mensaje, life: 6000 });
  }
}
