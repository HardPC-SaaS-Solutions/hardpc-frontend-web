import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';

import { StockLocalService } from '../../services/stock-local.service';
import { ItemSerialService } from '../../services/item-serial.service';
import { MovimientoInventarioService } from '../../services/movimiento-inventario.service';
import { LocalService } from '../../../maestros/services/local.service';
import { AuthService } from '../../../auth/services/auth.service';

import { StockLocalDTO } from '../../../../core/models/stock-local.dto';
import { ItemSerialDTO, EstadoDisponibilidad, Condicion } from '../../../../core/models/item-serial.dto';
import { MovimientoInventarioDTO, TipoMovimiento } from '../../../../core/models/movimiento-inventario.dto';
import { LocalDTO } from '../../../../core/models/local.dto';

import { Table, TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService, ConfirmationService } from 'primeng/api';

/**
 * @description Dashboard central para la gestión operativa del Almacén e Inventario.
 * Consolida la visualización del Stock a granel, el seguimiento de Ítems Serializados,
 * y la auditoría del Kardex (Movimientos). Provee herramientas de exportación y
 * transacciones inmutables para el traslado físico de mercancía entre locales.
 */
@Component({
  selector: 'app-almacen-dashboard',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, TableModule, TabsModule,
    SelectModule, ButtonModule, TagModule, DialogModule, InputTextModule,
    InputNumberModule, ToastModule, ConfirmDialogModule, TooltipModule, CheckboxModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './almacen-dashboard.component.html'
})
export class AlmacenDashboardComponent implements OnInit {

  // --- REFERENCIAS A TABLAS PRIMENG ---
  @ViewChild('dtStock') dtStock!: Table;
  @ViewChild('dtSerial') dtSerial!: Table;
  @ViewChild('dtKardex') dtKardex!: Table;

  // --- INYECCIÓN DE DEPENDENCIAS ---
  private localService = inject(LocalService);
  private stockLocalService = inject(StockLocalService);
  private itemSerialService = inject(ItemSerialService);
  private movimientoService = inject(MovimientoInventarioService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // --- CATÁLOGOS RAÍZ Y CONTEXTO OPERATIVO ---
  /** Lista de todas las sucursales disponibles en el sistema. */
  locales: LocalDTO[] = [];
  /** ID de la sucursal actual seleccionada para auditar su almacén. */
  localSeleccionadoId: number | null = null;
  /** Lista de sucursales destino excluyendo la sucursal de origen actual (evita traslados recursivos). */
  opcionesLocalesDestino: LocalDTO[] = [];

  /** Diccionario visual para filtrar los ítems únicos por su ciclo de vida. */
  opcionesFiltroEstadoSerial = [
    { label: 'Disponible', value: EstadoDisponibilidad.DISPONIBLE },
    { label: 'Vendido', value: EstadoDisponibilidad.VENDIDO },
    { label: 'Reservado', value: EstadoDisponibilidad.RESERVADO },
    { label: 'En Garantía', value: EstadoDisponibilidad.EN_GARANTIA },
    { label: 'Dado de Baja', value: EstadoDisponibilidad.DADO_DE_BAJA },
    { label: 'En Tránsito', value: EstadoDisponibilidad.EN_TRANSITO },
    { label: 'En Reparación', value: EstadoDisponibilidad.EN_REPARACION },
    { label: 'Devuelto a Proveedor', value: EstadoDisponibilidad.DEVUELTO_PROVEEDOR }
  ];

  /** Diccionario visual para filtrar ítems únicos por su condición física. */
  opcionesFiltroCondicion = [
    { label: 'Nuevo', value: Condicion.NUEVO },
    { label: 'Usado', value: Condicion.USADO },
    { label: 'Reacondicionado', value: Condicion.REACONDICIONADO },
    { label: 'Open Box', value: Condicion.OPEN_BOX },
    { label: 'Defectuoso', value: Condicion.DEFECTUOSO }
  ];

  /** ✨ Opciones estandarizadas para segmentar la auditoría del Kardex. */
  opcionesFiltroTipoKardex = [
    { label: 'Entradas', value: TipoMovimiento.ENTRADA },
    { label: 'Salidas', value: TipoMovimiento.SALIDA },
    { label: 'Traslados', value: TipoMovimiento.TRASLADO }
  ];

  // --- ESTADOS TAB 1: STOCK LOCAL (A GRANEL) ---
  stocksLocalesOriginal: StockLocalDTO[] = [];
  stocksLocales: StockLocalDTO[] = [];
  totalRecordsStock: number = 0;
  loadingStock: boolean = false;
  mostrarSoloBajoStock: boolean = false;

  // --- ESTADOS TAB 2: ITEMS SERIALES (ÚNICOS) ---
  itemsSerialesOriginal: ItemSerialDTO[] = [];
  itemsSeriales: ItemSerialDTO[] = [];
  totalRecordsSerial: number = 0;
  loadingSerial: boolean = false;
  filtroEstadoSerial: EstadoDisponibilidad | null = null;
  filtroCondicionSerial: Condicion | null = null;

  // --- ESTADOS TAB 3: KARDEX (HISTÓRICO INMUTABLE) ---
  movimientosOriginal: MovimientoInventarioDTO[] = [];
  movimientos: MovimientoInventarioDTO[] = [];
  totalRecordsKardex: number = 0;
  loadingKardex: boolean = false;
  filtroTipoKardex: TipoMovimiento | null = null;

  // --- MODAL TRASLADO ENTRE LOCALES ---
  trasladoForm!: FormGroup;
  modalTrasladoVisible: boolean = false;
  guardandoTraslado: boolean = false;

  /** Control de RBAC: Determina si el usuario puede efectuar traslados físicos. */
  puedeGestionar: boolean = false;

  /** Bandera arquitectónica: true = Mueve 1 unidad exacta por S/N. false = Mueve N unidades a granel. */
  esTrasladoSerial: boolean = false;
  nombreProductoA_Trasladar: string = '';
  maxCantidadPermitida: number = 1;
  idProductoSeleccionado!: number;
  idSerialSeleccionado: number | null = null;

  /**
   * @description Inicializa la vista, validando permisos (RBAC), preparando
   * transacciones y cargando la topología física de la empresa (Locales).
   */
  ngOnInit(): void {
    this.puedeGestionar = this.authService.esAdminOSupervisor() || this.authService.esOperativo();
    this.inicializarFormularioTraslado();
    this.cargarLocalesActivos();
  }

  /**
   * @description Prepara el formulario reactivo para la logística de traslados físicos.
   */
  private inicializarFormularioTraslado(): void {
    this.trasladoForm = this.fb.group({
      idLocalDestino: [null, Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      observacion: ['', [Validators.maxLength(255)]]
    });
  }

  /**
   * @description Carga las sucursales vigentes. Establece el local de origen por defecto
   * y fuerza la sincronización de las vistas tabulares mediante el event loop asíncrono.
   */
  private cargarLocalesActivos(): void {
    this.localService.listarParaCombo().subscribe({
      next: (res) => {
        this.locales = res.filter(l => l.estado !== false);
        if (this.locales.length > 0) {
          this.localSeleccionadoId = this.locales[0].id!;
          this.actualizarOpcionesDestino();

          // ✨ FIX 1: Forza el renderizado de las tablas diferidas de forma asíncrona
          setTimeout(() => this.reiniciarTablas(), 0);
        }
      },
      error: (err) => this.manejarErrorBackend(err)
    });
  }

  /**
   * @description Evita paradojas logísticas removiendo el local de origen
   * de la lista de destinos posibles.
   */
  actualizarOpcionesDestino(): void {
    if (this.localSeleccionadoId !== null) {
      this.opcionesLocalesDestino = this.locales.filter(l => l.id !== this.localSeleccionadoId);
    }
  }

  /**
   * @description Reacciona al cambio de contexto operativo (cambio de Sucursal).
   * ✨ Cabo Suelto: Purga toda la memoria de filtros para prevenir estados inconsistentes
   * y ordena a las tablas reiniciarse desde cero.
   */
  onLocalChange(): void {
    this.actualizarOpcionesDestino();
    this.mostrarSoloBajoStock = false;
    this.filtroEstadoSerial = null;
    this.filtroCondicionSerial = null;
    this.filtroTipoKardex = null;
    this.reiniciarTablas();
  }

  /**
   * @description Devuelve los paginadores a la posición inicial (Página 1),
   * lo cual desencadena automáticamente sus eventos de carga (onLazyLoad).
   */
  private reiniciarTablas(): void {
    if (this.dtStock) this.dtStock.reset();
    if (this.dtSerial) this.dtSerial.reset();
    if (this.dtKardex) this.dtKardex.reset();
  }

  // ======================================================================
  // --- LÓGICA TAB 1: STOCK LOCAL A GRANEL ---
  // ======================================================================

  cargarStockLocal(event: any): void {
    if (!this.localSeleccionadoId) return;
    this.loadingStock = true;
    const page = (event.first ?? 0) / (event.rows ?? 10);
    const rows = event.rows ?? 10;
    const buscar = event.globalFilter || '';

    this.stockLocalService.buscarEnLocalPaginado(this.localSeleccionadoId, page, rows, buscar).subscribe({
      next: (res) => {
        this.stocksLocalesOriginal = res.content;
        this.totalRecordsStock = res.totalElements;
        this.aplicarFiltroBajoStock();
        this.loadingStock = false;
      },
      error: () => {
        this.loadingStock = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el stock cuantitativo.' });
      }
    });
  }

  /**
   * @description Filtro en cliente: Aísla y expone los productos que cruzaron su umbral mínimo de seguridad.
   */
  aplicarFiltroBajoStock(): void {
    if (this.mostrarSoloBajoStock) {
      this.stocksLocales = this.stocksLocalesOriginal.filter(item => item.cantidadActual <= item.stockMinimo);
    } else {
      this.stocksLocales = [...this.stocksLocalesOriginal];
    }
  }

  // ======================================================================
  // --- LÓGICA TAB 2: INVENTARIO SERIALIZADO (ÍTEMS ÚNICOS) ---
  // ======================================================================

  cargarItemsSeriales(event: any): void {
    if (!this.localSeleccionadoId) return;
    this.loadingSerial = true;
    const page = (event.first ?? 0) / (event.rows ?? 10);
    const rows = event.rows ?? 10;
    const buscar = event.globalFilter || '';

    this.itemSerialService.listarPaginado(page, rows, buscar, this.localSeleccionadoId).subscribe({
      next: (res) => {
        this.itemsSerialesOriginal = res.content;
        this.totalRecordsSerial = res.totalElements;
        this.aplicarFiltrosSerialesCliente();
        this.loadingSerial = false;
      },
      error: () => {
        this.loadingSerial = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el stock de seriales.' });
      }
    });
  }

  /**
   * @description Filtro en cliente: Refina la vista de seriales combinando su estado lógico y físico.
   */
  aplicarFiltrosSerialesCliente(): void {
    let filtrados = [...this.itemsSerialesOriginal];

    if (this.filtroEstadoSerial) {
      filtrados = filtrados.filter(i => i.estadoDisponibilidad === this.filtroEstadoSerial);
    }
    if (this.filtroCondicionSerial) {
      filtrados = filtrados.filter(i => i.condicion === this.filtroCondicionSerial);
    }

    this.itemsSeriales = filtrados;
  }

  // ======================================================================
  // --- LÓGICA TAB 3: KARDEX (HISTÓRICO INMUTABLE) ---
  // ======================================================================

  cargarMovimientosKardex(event: any): void {
    if (!this.localSeleccionadoId) return;
    this.loadingKardex = true;
    const page = (event.first ?? 0) / (event.rows ?? 20);
    const rows = event.rows ?? 20;

    this.movimientoService.listarPorLocal(this.localSeleccionadoId, page, rows).subscribe({
      next: (res) => {
        this.movimientosOriginal = res.content;
        this.totalRecordsKardex = res.totalElements;
        this.aplicarFiltroKardexCliente();
        this.loadingKardex = false;
      },
      error: () => {
        this.loadingKardex = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial del Kardex.' });
      }
    });
  }

  /**
   * @description ✨ FIX 2: Aplica un filtro en memoria sobre la carga actual del historial.
   */
  aplicarFiltroKardexCliente(): void {
    if (this.filtroTipoKardex) {
      this.movimientos = this.movimientosOriginal.filter(m => m.tipoMovimiento === this.filtroTipoKardex);
    } else {
      this.movimientos = [...this.movimientosOriginal];
    }
  }

  // ======================================================================
  // --- MOTOR TRANSACCIONAL: TRASLADOS ENTRE LOCALES ---
  // ======================================================================

  /**
   * @description Inicializa el contexto de traslado para inventario genérico.
   * Modifica los validadores dinámicamente para impedir enviar más stock del que existe.
   * @param item DTO del stock a evaluar.
   */
  abrirTrasladoA_Granel(item: StockLocalDTO): void {
    this.esTrasladoSerial = false;
    this.idProductoSeleccionado = item.idProducto;
    this.idSerialSeleccionado = null;
    this.nombreProductoA_Trasladar = item.descripcionProducto || '';
    this.maxCantidadPermitida = item.cantidadActual;

    this.trasladoForm.reset({ cantidad: 1, idLocalDestino: null, observacion: '' });
    this.trasladoForm.get('cantidad')?.setValidators([Validators.required, Validators.min(1), Validators.max(this.maxCantidadPermitida)]);
    this.trasladoForm.get('cantidad')?.updateValueAndValidity();
    this.trasladoForm.get('cantidad')?.enable();

    this.modalTrasladoVisible = true;
  }

  /**
   * @description Inicializa el contexto de traslado de alta precisión para un equipo específico.
   * Bloquea la cantidad estrictamente a 1 unidad (no se puede dividir un S/N).
   * @param item DTO del ítem serial a movilizar.
   */
  abrirTrasladoSerial(item: ItemSerialDTO): void {
    this.esTrasladoSerial = true;
    this.idProductoSeleccionado = item.idProducto;
    this.idSerialSeleccionado = item.id!;
    this.nombreProductoA_Trasladar = `${item.descripcionProducto} (S/N: ${item.numeroSerie})`;
    this.maxCantidadPermitida = 1;

    this.trasladoForm.reset({ cantidad: 1, idLocalDestino: null, observacion: '' });
    this.trasladoForm.get('cantidad')?.disable();

    this.modalTrasladoVisible = true;
  }

  /** Cierra la operación descartando cambios en memoria. */
  cerrarModalTraslado(): void {
    this.modalTrasladoVisible = false;
  }

  /**
   * @description Invoca el sistema de confirmación preventivo. Al ser una operación
   * de auditoría (afecta Kardex de 2 locales), requiere el consentimiento final del usuario.
   */
  ejecutarTraslado(): void {
    if (this.trasladoForm.invalid || !this.localSeleccionadoId) {
      this.trasladoForm.markAllAsTouched();
      return;
    }

    this.confirmationService.confirm({
      message: `¿Estás seguro de registrar este traslado físico hacia la nueva sucursal? Esta acción es inmutable en el Kardex.`,
      header: 'Confirmación de Traslado',
      icon: 'pi pi-exclamation-triangle text-orange-500',
      acceptLabel: 'Sí, Confirmar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-primary shadow-md',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => {
        this.procesarPeticionTrasladoHTTP();
      }
    });
  }

  /**
   * @description Despacha la transacción DTO hacia el servidor garantizando propiedades ACID.
   */
  private procesarPeticionTrasladoHTTP(): void {
    this.guardandoTraslado = true;
    const formValues = this.trasladoForm.getRawValue();

    const requestDTO: MovimientoInventarioDTO = {
      tipoMovimiento: TipoMovimiento.TRASLADO,
      cantidad: formValues.cantidad,
      idProducto: this.idProductoSeleccionado,
      idLocalOrigen: this.localSeleccionadoId!,
      idLocalDestino: formValues.idLocalDestino,
      idItemSerial: this.idSerialSeleccionado ?? undefined,
      observacion: formValues.observacion
    };

    this.movimientoService.registrarTraslado(requestDTO).subscribe({
      next: () => {
        this.modalTrasladoVisible = false;
        this.guardandoTraslado = false;
        this.messageService.add({ severity: 'success', summary: 'Traslado Completado', detail: 'Mercadería movilizada con éxito.' });
        this.reiniciarTablas();
      },
      error: (err) => {
        this.guardandoTraslado = false;
        this.manejarErrorBackend(err);
      }
    });
  }

  // ======================================================================
  // --- MÉTODOS DE EXPORTACIÓN CSV ATÓMICOS ---
  // ======================================================================

  exportarStockCSV(): void {
    if (this.stocksLocales.length === 0) return;
    const cabeceras = ['SKU', 'Producto', 'Stock_Minimo', 'Stock_Actual', 'Estado_Reposicion'];
    const filas = this.stocksLocales.map(p => [
      p.codigoSkuProducto, p.descripcionProducto, p.stockMinimo, p.cantidadActual,
      (p.cantidadActual <= p.stockMinimo ? 'REQUIERE_REPOSICION' : 'OK')
    ]);
    this.descargarCSV(cabeceras, filas, 'Stock_Granel');
  }

  exportarSerialesCSV(): void {
    if (this.itemsSeriales.length === 0) return;
    const cabeceras = ['SKU', 'Producto', 'Numero_Serie', 'Condicion', 'Disponibilidad'];
    const filas = this.itemsSeriales.map(p => [
      p.codigoSkuProducto, p.descripcionProducto, p.numeroSerie, p.condicion, p.estadoDisponibilidad
    ]);
    this.descargarCSV(cabeceras, filas, 'Items_Seriales');
  }

  exportarKardexCSV(): void {
    if (this.movimientos.length === 0) return;
    const cabeceras = ['Fecha', 'Tipo', 'SKU', 'Producto', 'Serie', 'Cant', 'Origen', 'Destino', 'Operador', 'Observacion'];
    const filas = this.movimientos.map(m => [
      m.fechaHora, m.tipoMovimiento, m.codigoSkuProducto, m.descripcionProducto,
      (m.numeroSerie || '-'), m.cantidad, (m.nombreLocalOrigen || '-'), (m.nombreLocalDestino || '-'),
      m.username, (m.observacion || '')
    ]);
    this.descargarCSV(cabeceras, filas, 'Kardex_Movimientos');
  }

  /**
   * @description Consolidador interno para la generación segura de blobs CSV con Byte Order Mark (BOM).
   */
  private descargarCSV(cabeceras: string[], filas: any[][], prefijo: string): void {
    const contenido = [
      cabeceras.join(','),
      ...filas.map(fila => fila.map(campo => `"${campo}"`).join(','))
    ].join('\n');
    const blob = new Blob(['\ufeff' + contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${prefijo}_${new Date().getTime()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.messageService.add({ severity: 'success', summary: 'Exportación', detail: 'Archivo descargado.' });
  }

  // ======================================================================
  // --- UTILITARIOS Y UX ---
  // ======================================================================

  /**
   * @description Transforma el estado lógico del ítem serial en una paleta de colores amigable para UI.
   */
  getSeverityEstadoSerial(estado: EstadoDisponibilidad | undefined): "success" | "warn" | "secondary" | "danger" | "info" {
    if (!estado) return 'secondary';
    switch (estado) {
      case EstadoDisponibilidad.DISPONIBLE: return 'success';
      case EstadoDisponibilidad.EN_REPARACION:
      case EstadoDisponibilidad.EN_GARANTIA: return 'warn';
      case EstadoDisponibilidad.DADO_DE_BAJA: return 'danger';
      default: return 'info';
    }
  }

  /**
   * @description ✨ Cabo Suelto 1: Mapea la condición física del equipo hacia tokens visuales de PrimeNG.
   */
  getSeverityCondicion(condicion: Condicion | undefined): "success" | "warn" | "secondary" | "danger" | "info" {
    if (!condicion) return 'secondary';
    switch (condicion) {
      case Condicion.NUEVO: return 'success';
      case Condicion.USADO: return 'info';
      case Condicion.REACONDICIONADO:
      case Condicion.OPEN_BOX: return 'warn';
      case Condicion.DEFECTUOSO: return 'danger';
      default: return 'secondary';
    }
  }

  /** Facilitador de usabilidad: Selecciona todo el texto de una caja de búsqueda al recibir el foco. */
  onSearchFocus(event: any): void {
    event.target.select();
  }

  /**
   * @description Motor de traducción de excepciones del backend, sincronizado
   * con las respuestas DTO de Spring Boot.
   */
  private manejarErrorBackend(err: any): void {
    this.guardandoTraslado = false;
    console.error('Error capturado en Almacén:', err);
    let titulo = 'Error del Servidor';
    let mensaje = 'No se pudo procesar la transacción.';
    let severidad = 'error';

    if (err.status === 0) {
      titulo = 'Error de Conexión';
      mensaje = 'No se pudo conectar con el servidor.';
    } else if (err.error && err.error.message) {
      titulo = err.error.error || 'Operación Denegada';
      mensaje = err.error.message;
      if (err.status === 409 || err.status === 400) severidad = 'warn';

      if (err.error.detalles && Array.isArray(err.error.detalles)) {
        mensaje += ' -> ' + err.error.detalles.map((d: any) => `${d.campo}: ${d.mensaje}`).join(' | ');
      }
    } else if (err.status === 403 || err.status === 401) {
      severidad = 'error';
      titulo = 'Acceso Denegado';
      mensaje = 'No tienes los permisos necesarios.';
    }
    this.messageService.add({ severity: severidad, summary: titulo, detail: mensaje, life: 6000 });
  }
}
