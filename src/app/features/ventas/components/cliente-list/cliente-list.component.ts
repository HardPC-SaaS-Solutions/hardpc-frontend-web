import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// ✨ IMPORTAMOS EL NUEVO COMPONENTE FORMULARIO
import { ClienteFormComponent } from '../cliente-form/cliente-form.component';

import { ClienteService } from '../../services/cliente.service';
import { TipoDocumentoService } from '../../../maestros/services/tipo-documento.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ClienteDTO, TipoCliente } from '../../../../core/models/cliente.dto';
import { TipoDocumentoDTO } from '../../../../core/models/tipo-documento.dto';

import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';

/**
 * @description Componente central (Smart Component / Contenedor) para la administración del directorio de Clientes.
 * Coordina la carga asíncrona y diferida (Lazy Loading) de la grilla de datos, la barra de filtros cruzados,
 * los mecanismos de exportación a formatos comerciales (CSV) y las mutaciones de estado in situ (Desactivar/Reactivar).
 * Delega la captura lógica y validación atómica al componente hijo (`ClienteFormComponent`).
 */
@Component({
  selector: 'app-cliente-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule,
    TagModule, DialogModule, InputTextModule, SelectModule,
    ToastModule, ConfirmDialogModule, TooltipModule,
    ClienteFormComponent // ✨ INYECTAMOS AQUÍ
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './cliente-list.component.html'
})
export class ClienteListComponent implements OnInit {

  /** Referencia declarativa a la instancia de la tabla PrimeNG para reajustar y extraer metadatos de paginación. */
  @ViewChild('dt') dt!: Table;

  // --- INYECCIÓN DE DEPENDENCIAS MODERNA ---
  private clienteService = inject(ClienteService);
  private tipoDocService = inject(TipoDocumentoService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // --- ESTADO DE LA TABLA Y COMBOS ---
  /** Colección de registros de clientes renderizados en la página actual. */
  clientes: ClienteDTO[] = [];
  /** Catálogo de referencia de tipos de documento legal pre-cargado para nutrir al formulario hijo. */
  tiposDocumentoMaster: TipoDocumentoDTO[] = [];

  /** Mapeo visual estandarizado para el filtrado rápido por categoría de personería. */
  opcionesFiltroTipoCliente = [
    { label: 'Natural', value: TipoCliente.PERSONA_NATURAL },
    { label: 'Empresa', value: TipoCliente.EMPRESA }
  ];

  /** Contador global de registros que cumplen los criterios de filtrado para el cálculo del paginador. */
  totalRecords: number = 0;
  /** Bandera reactiva que gestiona el spinner visual de bloqueo durante peticiones HTTP asíncronas. */
  loading: boolean = true;
  /** Volumen predeterminado de filas expuestas por segmento de página. */
  rowsPerPage: number = 10;

  // --- ESTADO DE NAVEGACIÓN Y CONTEXTO MODAL ---
  /** Gobierna la visibilidad de la ventana modal que encapsula al formulario. */
  modalVisible: boolean = false;
  /** * Contexto operativo de transferencia hacia el componente hijo mediante `@Input()`.
   * Si es `null`, inicializa el formulario para inserción. Si contiene un objeto, inicializa en modo edición.
   */
  clienteSeleccionado: ClienteDTO | null = null;

  /** Control RBAC local: Determina si el usuario actual ostenta facultades para inhabilitar registros comerciales. */
  puedeEliminar: boolean = false;
  /** Estado del filtro actual por personería (Natural vs Empresa) seleccionado en la barra superior. */
  filtroTipoCliente: any = null;

  /**
   * @description Inicializa el componente validando los permisos de seguridad (RBAC)
   * y disparando la precarga de los catálogos base requeridos.
   */
  ngOnInit(): void {
    this.puedeEliminar = this.authService.esAdminOSupervisor();
    this.cargarCombos();
  }

  /**
   * @description Obtiene de forma proactiva la colección paramétrica de documentos de identidad de la SUNAT,
   * asegurando que estén disponibles en memoria antes de la interacción con el formulario.
   */
  private cargarCombos(): void {
    this.tipoDocService.listarParaCombo().subscribe({
      next: (res) => {
        this.tiposDocumentoMaster = res;
      },
      error: () => console.error('Error al precargar catálogo de tipos de documento')
    });
  }

  // ======================================================================
  // --- LÓGICA DE CARGA PAGINADA (LAZY LOADING) ---
  // ======================================================================

  /**
   * @description Despacha hacia el servicio la consulta estructurada del bloque de registros,
   * empaquetando filtros globales, filtros de cabecera y parámetros de paginación de la grilla.
   * @param event Encapsulador de eventos y metadatos emitidos por el ciclo nativo de PrimeNG.
   */
  cargarClientes(event: any): void {
    this.loading = true;
    const first = event.first ?? 0;
    const rows = event.rows ?? this.rowsPerPage;
    const page = first / rows;
    const buscar = event.globalFilter || '';

    this.clienteService.listarPaginado(page, rows, buscar, this.filtroTipoCliente || undefined).subscribe({
      next: (res) => {
        this.clientes = res.content;
        this.totalRecords = res.totalElements;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los clientes' });
        this.loading = false;
      }
    });
  }

  /**
   * @description Sincroniza e intercepta los cambios manuales en el combo de filtrado por tipo,
   * reseteando el paginador a la primera posición y recalculando metadatos dinámicamente.
   */
  filtrarPorTipoCabecera(): void {
    this.dt.first = 0;
    this.cargarClientes(this.dt.createLazyLoadMetadata());
  }

  // ======================================================================
  // --- SUB-SISTEMA DE EXPORTACIÓN ---
  // ======================================================================

  /**
   * @description Compila y exporta de manera atómica el catálogo visible a un archivo CSV plano.
   * Inyecta marcas de control (BOM) para blindar la legibilidad de caracteres con tildes o eñes en MS Excel.
   */
  exportarDatos(): void {
    if (!this.clientes || this.clientes.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Exportación', detail: 'No hay datos para exportar en esta página.' });
      return;
    }

    const cabeceras = [
      'Tipo Documento', 'Numero Documento', 'Tipo Cliente', 'Nombres',
      'Apellidos', 'Razon Social', 'Telefono', 'Email', 'Direccion', 'Estado'
    ];

    const filas = this.clientes.map(c => {
      const tipo = this.esPersonaJuridica(c.tipoCliente) ? 'Persona Jurídica (Empresa)' : 'Persona Natural';
      const estado = c.estado ? 'Activo' : 'Inactivo';

      return [
        c.abreviaturaTipoDocumento || '', c.numeroDocumento || '', tipo,
        c.nombres || '', c.apellidos || '', c.razonSocial || '',
        c.telefono || '', c.email || '', c.direccion || '', estado
      ];
    });

    const contenidoCSV = [
      cabeceras.join(','),
      ...filas.map(fila => fila.map(campo => `"${campo}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Listado_Clientes_HardPC.csv';
    link.click();
    URL.revokeObjectURL(url);

    this.messageService.add({ severity: 'success', summary: 'Exportación', detail: 'Archivo CSV generado con éxito' });
  }

  // ======================================================================
  // --- ENLACE REACTIVO Y CONTROL DEL COMPONENTE HIJO ---
  // ======================================================================

  /**
   * @description Restablece la variable de selección a nulo para obligar al componente hijo
   * a inicializar un formulario en blanco adaptado para inserción. Despliega la ventana modal.
   */
  abrirModalNuevo(): void {
    this.clienteSeleccionado = null;
    this.modalVisible = true;
  }

  /**
   * @description Enruta el DTO de datos seleccionado hacia el `@Input()` del formulario hijo,
   * instruyéndolo a disparar las reglas de hidratación en modo edición.
   * @param item DTO que representa las propiedades del cliente seleccionado.
   */
  abrirModalEditar(item: ClienteDTO): void {
    this.clienteSeleccionado = item;
    this.modalVisible = true;
  }

  /**
   * @description Intercepta la confirmación exitosa (`@Output()`) enviada por el formulario.
   * Clausura la interfaz modal, recarga la tabla preservando metadatos y lanza una notificación global.
   * @param clienteGuardado Payload de datos procesado por el backend y devuelto por el hijo.
   */
  alGuardarCliente(clienteGuardado: ClienteDTO): void {
    this.modalVisible = false;
    this.cargarClientes(this.dt.createLazyLoadMetadata());
    this.messageService.add({ severity: 'success', summary: 'Operación Exitosa', detail: 'El cliente se guardó correctamente.' });
  }

  // ======================================================================
  // --- ACCIONES OPERATIVAS Y TRANSICIONES DE ESTADO ---
  // ======================================================================

  /**
   * @description Consolidador de excepciones del backend. Mapea la estructura estándar
   * de errores HTTP para transformarla en notificaciones legibles.
   */
  private manejarErrorBackend(err: any): void {
    console.error('Error capturado del backend:', err);
    let titulo = 'Error del Servidor';
    let mensaje = 'Ocurrió un error inesperado al procesar la solicitud.';
    if (err.error && err.error.message) {
      titulo = err.error.error || `Error ${err.status}`;
      mensaje = err.error.message;
    }
    this.messageService.add({ severity: 'error', summary: titulo, detail: mensaje, life: 6000 });
  }

  /**
   * @description Despliega una advertencia preventiva de confirmación. Tras ser aceptada, efectúa
   * una desactivación lógica en la base de datos (preservando el histórico contable/ventas).
   * @param item Registro de cliente candidato a inhabilitación.
   */
  eliminar(item: ClienteDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas desactivar al cliente <b>${item.nombres || item.razonSocial}</b>?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, desactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.clienteService.eliminar(item.id!).subscribe({
          next: () => {
            this.cargarClientes(this.dt.createLazyLoadMetadata());
            this.messageService.add({ severity: 'info', summary: 'Desactivado', detail: 'Cliente desactivado' });
          },
          error: (err) => this.manejarErrorBackend(err)
        });
      }
    });
  }

  /**
   * @description Despliega un modal de confirmación antes de restaurar los privilegios
   * y la vigencia comercial del cliente en el sistema de facturación.
   * @param item Registro de cliente inactivo a rehabilitar.
   */
  restaurar(item: ClienteDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas reactivar al cliente <b>${item.nombres || item.razonSocial}</b>?`,
      header: 'Confirmar Restauración',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.clienteService.reactivar(item.id!).subscribe({
          next: () => {
            this.cargarClientes(this.dt.createLazyLoadMetadata());
            this.messageService.add({ severity: 'success', summary: 'Restaurado', detail: 'Cliente reactivado' });
          },
          error: (err) => this.manejarErrorBackend(err)
        });
      }
    });
  }

  /**
   * @description Evalúa la cadena de personería jurídica del cliente para determinar la estrategia de renderizado.
   * @param tipo Cadena representativa de la condición comercial.
   * @returns `true` si el cliente opera como corporación o empresa.
   */
  esPersonaJuridica(tipo: string): boolean {
    return tipo === 'EMPRESA';
  }
}
