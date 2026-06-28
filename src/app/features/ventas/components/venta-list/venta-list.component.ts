import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { VentaService } from '../../services/venta.service';
import { LocalService } from '../../../maestros/services/local.service';
import { ClienteService } from '../../services/cliente.service';
import { AuthService } from '../../../auth/services/auth.service';

import { VentaResponseDTO, EstadoVenta } from '../../../../core/models/venta.dto';
import { LocalDTO } from '../../../../core/models/local.dto';
import { ClienteDTO } from '../../../../core/models/cliente.dto';

import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete'; // ✨ IMPORTANTE
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';

/**
 * @description Interfaz extendida de ClienteDTO con el campo `displayName` resuelto,
 * necesario para que PrimeNG 21 renderice correctamente el AutoComplete sin [object Object].
 */
export interface ClienteFiltro extends ClienteDTO {
  displayName: string;
}

/**
 * @description Componente contenedor para la consulta, filtrado avanzado y gestión operativa
 * del historial de ventas registradas en el sistema de facturación HardPC.
 */
@Component({
  selector: 'app-venta-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, TableModule, ButtonModule, TagModule,
    DialogModule, SelectModule, InputTextModule, AutoCompleteModule, ToastModule,
    ConfirmDialogModule, TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './venta-list.component.html'
})
export class VentaListComponent implements OnInit {

  /** Referencia declarativa a la tabla PrimeNG para controlar el paginador y el reset de filtros. */
  @ViewChild('dtVentas') dtVentas!: Table;

  private ventaService       = inject(VentaService);
  private localService       = inject(LocalService);
  private clienteService     = inject(ClienteService);
  private authService        = inject(AuthService);
  private messageService     = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router             = inject(Router);

  /** Colección de ventas renderizadas en la página actual. */
  ventas: VentaResponseDTO[] = [];
  totalRecords: number = 0;
  loading: boolean = false;

  /** Controla la visibilidad de acciones restringidas según el rol del usuario autenticado. */
  puedeGestionar: boolean = false;

  /** Catálogo de locales disponibles para el filtro por sucursal. */
  locales: LocalDTO[] = [];

  // ✨ BUSCADOR DE CLIENTES
  clientesSugeridos: ClienteFiltro[] = [];

  /** Objeto cliente actualmente seleccionado en el filtro, usado para extraer su id en la consulta. */
  clienteFiltroSeleccionado: ClienteFiltro | null = null;

  /** Texto visible del AutoComplete — desacoplado del objeto para evitar [object Object] en PrimeNG 21. */
  clienteFiltroInputText: string = '';

  /** Opciones del combo de estado de venta, mapeadas desde el enum EstadoVenta. */
  opcionesEstado = [
    { label: 'Registrada', value: EstadoVenta.REGISTRADA },
    { label: 'Anulada',    value: EstadoVenta.ANULADA    }
  ];

  // Parámetros de filtrado avanzado del panel superior.
  filtroFechaInicio: string | null = null;
  filtroFechaFin:    string | null = null;
  filtroIdLocal:     number | null = null;
  filtroEstado:      string | null = null;
  filtroComprobante: string        = '';
  rowsPerPage:       number        = 10;

  modalDetalleVisible: boolean             = false;
  ventaSeleccionada:   VentaResponseDTO | null = null;

  /**
   * @description Verifica permisos del usuario autenticado y precarga el catálogo de locales.
   */
  ngOnInit(): void {
    this.puedeGestionar = this.authService.esAdminOSupervisor();
    this.localService.listarParaCombo().subscribe(res => this.locales = res);
  }

  /**
   * @description Construye el nombre visible de un cliente priorizando razón social,
   * luego nombre completo y finalmente el número de documento como fallback.
   */
  private buildDisplayName(c: ClienteDTO): string {
    return c.razonSocial?.trim()
      || `${c.nombres ?? ''} ${c.apellidos ?? ''}`.trim()
      || c.numeroDocumento
      || 'Sin nombre';
  }

  // ✨ BÚSQUEDA EN CALIENTE (AUTOCOMPLETE)

  /**
   * @description Consulta clientes en tiempo real según el texto ingresado y
   * construye el `displayName` de cada resultado para el renderizado del AutoComplete.
   */
  buscarClientesFiltro(event: any): void {
    const query = typeof event === 'string' ? event : event.query;

    this.clienteService.listarPaginado(0, 15, query).subscribe(res => {
      this.clientesSugeridos = res.content.map(c => ({
        ...c,
        displayName: this.buildDisplayName(c)
      }));
    });
  }

  /**
   * @description Captura el cliente elegido del dropdown y sincroniza
   * el texto visible del input con su `displayName`.
   */
  onClienteFiltroSelect(event: any): void {
    const cliente: ClienteFiltro = event?.value ?? event;
    this.clienteFiltroSeleccionado = cliente;
    this.clienteFiltroInputText    = cliente.displayName;
  }

  /**
   * @description Limpia el cliente seleccionado cuando el usuario borra el contenido del AutoComplete.
   */
  onClienteFiltroClear(): void {
    this.clienteFiltroSeleccionado = null;
    this.clienteFiltroInputText    = '';
  }

  /**
   * @description Despacha la consulta paginada al servicio aplicando todos los filtros activos.
   * Formatea las fechas al estándar ISO 8601 requerido por el backend.
   */
  cargarVentas(event: any): void {
    this.loading = true;
    const page   = (event.first ?? 0) / (event.rows ?? this.rowsPerPage);
    const size   = event.rows ?? this.rowsPerPage;

    // Agrega únicamente los filtros informados por el usuario.
    const fechaIniFormateada = this.filtroFechaInicio ? `${this.filtroFechaInicio}T00:00:00` : null;
    const fechaFinFormateada = this.filtroFechaFin    ? `${this.filtroFechaFin}T23:59:59`    : null;
    const idClienteParam     = this.clienteFiltroSeleccionado?.id ?? null;

    this.ventaService.listarPaginadoAvanzado(
      page, size, fechaIniFormateada, fechaFinFormateada,
      idClienteParam, this.filtroIdLocal, this.filtroEstado, this.filtroComprobante
    ).subscribe({
      next: (res) => {
        this.ventas       = res.content;
        this.totalRecords = res.totalElements;
        this.loading      = false;
      },
      error: (err) => {
        this.loading = false;
        this.manejarErrorBackend(err);
      }
    });
  }

  /**
   * @description Aplica los filtros activos reseteando el paginador a la primera página.
   */
  aplicarFiltros(): void {
    if (this.dtVentas) this.dtVentas.reset();
  }

  /**
   * @description Restablece todos los filtros de búsqueda a sus valores iniciales
   * y recarga la tabla desde el inicio.
   */
  limpiarFiltros(): void {
    this.filtroFechaInicio         = null;
    this.filtroFechaFin            = null;
    this.filtroIdLocal             = null;
    this.clienteFiltroSeleccionado = null;
    this.clienteFiltroInputText    = '';
    this.filtroEstado              = null;
    this.filtroComprobante         = '';
    this.aplicarFiltros();
  }

  /**
   * @description Navega al formulario de registro de nueva venta.
   */
  abrirNuevaVenta(): void { this.router.navigate(['/ventas/nuevo']); }

  /**
   * @description Carga el detalle de la venta seleccionada y despliega el modal informativo.
   */
  verDetalle(venta: VentaResponseDTO): void {
    this.ventaSeleccionada    = venta;
    this.modalDetalleVisible  = true;
  }

  /**
   * @description Cierra el modal de detalle y limpia la referencia al objeto activo.
   */
  cerrarModalDetalle(): void {
    this.modalDetalleVisible = false;
    this.ventaSeleccionada   = null;
  }

  /**
   * @description Despliega la confirmación preventiva antes de ejecutar la anulación comercial.
   * Informa al usuario el efecto logístico sobre el stock y los seriales asignados.
   */
  anularVenta(venta: VentaResponseDTO): void {
    this.confirmationService.confirm({
      message:                `¿Está seguro de anular la venta <b>${venta.serieComprobante}-${venta.numeroComprobante}</b> del cliente ${venta.nombreCliente}?<br><br><b>Efecto Logístico:</b> Reingresará físicamente el stock al almacén y liberará las series asignadas.`,
      header:                 'Confirmación de Anulación Comercial',
      icon:                   'pi pi-exclamation-triangle text-red-500',
      acceptLabel:            'Sí, Anular',
      rejectLabel:            'Cancelar',
      acceptButtonStyleClass: 'p-button-danger shadow-md',
      accept: () => this.ejecutarAnulacionCaja(venta.idVenta)
    });
  }

  /**
   * @description Ejecuta la petición de anulación al backend y recarga la tabla tras confirmar.
   */
  private ejecutarAnulacionCaja(idVenta: number): void {
    this.loading = true;
    this.ventaService.anularVenta(idVenta).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Caja Sincronizada', detail: 'Venta anulada exitosamente.' });
        this.aplicarFiltros();
      },
      error: (err) => {
        this.loading = false;
        this.manejarErrorBackend(err);
      }
    });
  }

  /**
   * @description Compila el listado visible en un archivo CSV con BOM para compatibilidad con Excel.
   */
  exportarDatos(): void {
    if (!this.ventas || this.ventas.length === 0) return;

    const cabeceras = ['Fecha', 'Comprobante', 'Serie', 'Número', 'Cliente', 'Sucursal', 'Canal de Pago', 'Total', 'Estado'];
    const filas     = this.ventas.map(v => [
      v.fechaVenta, v.descripcionTipoComprobante, v.serieComprobante, v.numeroComprobante,
      v.nombreCliente, v.nombreLocal, v.descripcionFormaPago, v.totalVenta, v.estadoVenta
    ]);

    const contenido = [cabeceras.join(','), ...filas.map(f => f.map(c => `"${c}"`).join(','))].join('\n');
    const blob      = new Blob(['\ufeff' + contenido], { type: 'text/csv;charset=utf-8;' });
    const url       = URL.createObjectURL(blob);
    const link      = document.createElement('a');
    link.href       = url;
    link.download   = 'Ventas_HardPC.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * @description Resuelve el severity visual del tag de estado para PrimeNG
   * según el valor del enum EstadoVenta.
   */
  getSeverityEstado(estado: EstadoVenta): "success" | "danger" | "secondary" {
    return estado === EstadoVenta.REGISTRADA ? 'success' : 'danger';
  }

  /**
   * @description Consolida los errores HTTP del backend y los presenta como notificación toast.
   */
  private manejarErrorBackend(err: any): void {
    const msg = err.error?.message || 'Error al procesar la solicitud.';
    this.messageService.add({ severity: 'error', summary: 'Caja Bloqueada', detail: msg, life: 6000 });
  }
}
