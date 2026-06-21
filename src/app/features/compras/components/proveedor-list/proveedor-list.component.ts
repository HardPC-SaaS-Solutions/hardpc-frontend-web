import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// ✨ IMPORTAMOS EL NUEVO COMPONENTE FORMULARIO
import { ProveedorFormComponent } from '../proveedor-form/proveedor-form.component';

import { ProveedorService } from '../../services/proveedor.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ProveedorDTO } from '../../../../core/models/proveedor.dto';

import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';

/**
 * @description Componente central para la gestión del directorio de Proveedores en HardPC.
 * Actúa como "Smart Component" (Contenedor) encargado de la visualización de la grilla, paginación,
 * exportación de datos y ejecución de acciones destructivas. Delega completamente la lógica de
 * creación y edición a su componente hijo (`ProveedorFormComponent`).
 */
@Component({
  selector: 'app-proveedor-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule,
    TagModule, DialogModule, InputTextModule,
    ToastModule, ConfirmDialogModule, TooltipModule,
    ProveedorFormComponent // ✨ INYECTAMOS EL COMPONENTE HIJO AQUÍ
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './proveedor-list.component.html'
})
export class ProveedorListComponent implements OnInit {

  /** Referencia nativa a la tabla PrimeNG para delegar la gestión del ciclo de vida de la paginación. */
  @ViewChild('dt') dt!: Table;

  // --- INYECCIÓN DE DEPENDENCIAS ---
  // Nota: FormBuilder ha sido removido exitosamente al ser delegado al componente hijo.
  private proveedorService = inject(ProveedorService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // --- ESTADO DE LA TABLA Y PAGINACIÓN ---
  /** Colección de proveedores actuales renderizados en la vista. */
  proveedores: ProveedorDTO[] = [];
  /** Total de registros consolidados en la base de datos para el cálculo de páginas. */
  totalRecords: number = 0;
  /** Indicador de carga visual asíncrona para la tabla de PrimeNG. */
  loading: boolean = true;
  /** Cantidad de registros renderizados por página. */
  rowsPerPage: number = 10;

  // --- ESTADO DEL MODAL Y COMUNICACIÓN CON EL HIJO ---
  /** Determina la visibilidad en pantalla de la ventana modal que envuelve al componente hijo. */
  modalVisible: boolean = false;
  /** * Payload inyectado hacia el componente hijo mediante `@Input()`.
   * Si es `null`, el hijo entra en modo 'Creación'. Si posee un objeto, entra en modo 'Edición'.
   */
  proveedorSeleccionado: ProveedorDTO | null = null;

  // --- ESTADO DE PERMISOS (RBAC) ---
  /** Bandera de seguridad que habilita acciones estructurales solo para roles elevados. */
  puedeGestionar: boolean = false;

  /**
   * @description Inicializa el ciclo de vida del componente validando los privilegios operativos.
   */
  ngOnInit(): void {
    this.puedeGestionar = this.authService.esAdminOSupervisor();
  }

  // ======================================================================
  // --- LÓGICA DE CARGA PAGINADA (LAZY) ---
  // ======================================================================

  /**
   * @description Solicita a la API el listado paginado de proveedores.
   * @param event Objeto portador de los metadatos de paginación y filtros de texto dictados por la tabla.
   */
  cargarProveedores(event: any): void {
    this.loading = true;
    const first = event.first ?? 0;
    const rows = event.rows ?? this.rowsPerPage;
    const page = first / rows;
    const buscar = event.globalFilter || '';

    this.proveedorService.listarPaginado(page, rows, buscar).subscribe({
      next: (res) => {
        this.proveedores = res.content;
        this.totalRecords = res.totalElements;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los proveedores' });
        this.loading = false;
      }
    });
  }

  // ======================================================================
  // --- MÉTODOS DE EXPORTACIÓN ---
  // ======================================================================

  /**
   * @description Transforma la vista de datos activa en un archivo CSV formateado,
   * preservando la fidelidad de las celdas mediante encerramiento en comillas.
   */
  exportarDatos(): void {
    if (!this.proveedores || this.proveedores.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Exportación', detail: 'No hay datos para exportar.' });
      return;
    }

    const cabeceras = ['RUC', 'Razón Social', 'Nombre Comercial', 'Teléfono', 'Email', 'Dirección', 'Estado'];

    const filas = this.proveedores.map(p => {
      return [
        p.ruc,
        p.razonSocial,
        p.nombreComercial || '',
        p.telefono,
        p.email,
        p.direccion,
        p.estado ? 'Activo' : 'Inactivo'
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
    link.download = 'Listado_Proveedores_HardPC.csv';
    link.click();
    URL.revokeObjectURL(url);

    this.messageService.add({ severity: 'success', summary: 'Exportación', detail: 'Archivo generado con éxito' });
  }

  // ======================================================================
  // --- GESTIÓN DE FLUJOS HACIA EL FORMULARIO HIJO ---
  // ======================================================================

  /**
   * @description Prepara el entorno para registrar un nuevo proveedor.
   * Al pasar `null`, el componente hijo inicializará un formulario en blanco.
   */
  abrirModalNuevo(): void {
    this.proveedorSeleccionado = null;
    this.modalVisible = true;
  }

  /**
   * @description Prepara el entorno para editar un proveedor existente.
   * Transfiere el DTO seleccionado hacia el componente hijo para poblar su formulario.
   * @param item Instancia DTO del proveedor a editar.
   */
  abrirModalEditar(item: ProveedorDTO): void {
    this.proveedorSeleccionado = item;
    this.modalVisible = true;
  }

  /**
   * @description Escucha el evento `@Output()` emitido por el componente hijo tras una transacción exitosa.
   * Oculta el modal, notifica el éxito de la operación y solicita la actualización de la grilla.
   * @param proveedorActualizado Payload devuelto por el hijo con el registro guardado.
   */
  alGuardarProveedor(proveedorActualizado: ProveedorDTO): void {
    this.modalVisible = false;
    this.cargarProveedores(this.dt.createLazyLoadMetadata());
    this.messageService.add({
      severity: 'success',
      summary: 'Operación Exitosa',
      detail: `Proveedor ${proveedorActualizado.razonSocial} procesado correctamente.`
    });
  }

  // ======================================================================
  // --- OPERACIONES DE LISTA (Destructivas / Transiciones de Estado) ---
  // ======================================================================

  /**
   * @description Motor de traducción de excepciones de red, mapeado a la estructura `ApiErrorResponse`.
   */
  private manejarErrorBackend(err: any): void {
    console.error('Error capturado del backend:', err);

    let titulo = 'Error del Servidor';
    let mensaje = 'Ocurrió un error inesperado al procesar la solicitud.';
    let severidad = 'error';

    if (err.status === 0) {
      titulo = 'Error de Conexión';
      mensaje = 'No se pudo conectar con el servidor. Verifique su conexión o intente más tarde.';
    }
    else if (err.error && err.error.message) {
      titulo = err.error.error || `Error ${err.status}`;
      mensaje = err.error.message;

      if (err.status === 409 || err.status === 400 || err.status === 404) {
        severidad = 'warn';
      }

      if (err.error.detalles && Array.isArray(err.error.detalles) && err.error.detalles.length > 0) {
        const erroresCampos = err.error.detalles.map((d: any) => `${d.campo}: ${d.mensaje}`).join(' | ');
        mensaje = `${mensaje} -> ${erroresCampos}`;
      }
    }
    else if (err.status === 403 || err.status === 401) {
      severidad = 'error';
      titulo = err.status === 401 ? 'No Autorizado' : 'Acceso Denegado';
      mensaje = 'No tienes los permisos necesarios o tu sesión ha expirado.';
    }

    this.messageService.add({
      severity: severidad as any,
      summary: titulo,
      detail: mensaje,
      life: 6000
    });
  }

  /**
   * @description Exige confirmación para desactivar lógicamente a un proveedor del sistema.
   * Evita su futura asociación a compras sin destruir el historial previo en el Kardex.
   * @param item Proveedor a suspender.
   */
  eliminar(item: ProveedorDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas desactivar al proveedor <b>${item.razonSocial}</b>?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, desactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.proveedorService.eliminar(item.id!).subscribe({
          next: () => {
            this.cargarProveedores(this.dt.createLazyLoadMetadata());
            this.messageService.add({ severity: 'info', summary: 'Desactivado', detail: 'Proveedor inactivo' });
          },
          error: (err) => this.manejarErrorBackend(err)
        });
      }
    });
  }

  /**
   * @description Exige confirmación para restaurar la vigencia comercial de un proveedor inactivo.
   * @param item Proveedor a rehabilitar.
   */
  restaurar(item: ProveedorDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas reactivar al proveedor <b>${item.razonSocial}</b>?`,
      header: 'Confirmar Restauración',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.proveedorService.reactivar(item.id!).subscribe({
          next: () => {
            this.cargarProveedores(this.dt.createLazyLoadMetadata());
            this.messageService.add({ severity: 'success', summary: 'Restaurado', detail: 'Proveedor activo' });
          },
          error: (err) => this.manejarErrorBackend(err)
        });
      }
    });
  }
}
