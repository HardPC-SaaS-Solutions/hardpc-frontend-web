import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
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
 * Administra los socios comerciales encargados del abastecimiento, implementando validaciones
 * estrictas (ej. RUC de 11 dígitos), control de permisos jerárquicos, exportación de datos
 * y un motor de excepciones de alta fidelidad.
 */
@Component({
  selector: 'app-proveedor-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, TableModule, ButtonModule,
    TagModule, DialogModule, InputTextModule,
    ToastModule, ConfirmDialogModule, TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './proveedor-list.component.html'
})
export class ProveedorListComponent implements OnInit {

  /** Referencia nativa a la tabla PrimeNG para delegar la gestión del ciclo de vida de la paginación. */
  @ViewChild('dt') dt!: Table;

  // Inyección de dependencias
  private proveedorService = inject(ProveedorService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // --- ESTADO DE LA TABLA ---
  /** Colección de proveedores actuales renderizados en la vista. */
  proveedores: ProveedorDTO[] = [];
  /** Total de registros consolidados en la base de datos para el cálculo de páginas. */
  totalRecords: number = 0;
  /** Indicador de carga visual para la tabla de PrimeNG. */
  loading: boolean = true;
  /** Cantidad de registros renderizados por página. */
  rowsPerPage: number = 10;

  // --- ESTADO DEL FORMULARIO Y MODAL ---
  /** Instancia del formulario reactivo para la captura y validación de datos del proveedor. */
  proveedorForm!: FormGroup;
  /** Determina la visibilidad en pantalla de la ventana modal. */
  modalVisible: boolean = false;
  /** Define el contexto operativo del modal: `true` para Edición, `false` para Creación. */
  modoEdicion: boolean = false;
  /** Almacena el ID del registro en tránsito durante la edición. */
  idActual: number | null = null;
  /** Bloquea la interfaz de guardado temporalmente para impedir colisiones o dobles envíos. */
  guardando: boolean = false;

  // --- ESTADO DE PERMISOS ---
  /** Bandera de seguridad (RBAC) que habilita acciones destructivas solo para roles elevados. */
  puedeGestionar: boolean = false;

  /**
   * @description Inicializa el ciclo de vida del componente, verificando los privilegios
   * del usuario actual antes de construir la estructura del formulario.
   */
  ngOnInit(): void {
    this.puedeGestionar = this.authService.esAdminOSupervisor();
    this.inicializarFormulario();
  }

  /**
   * @description Construye el árbol del formulario reactivo aplicando reglas de negocio formales.
   * Exige mediante expresiones regulares (Regex) que el RUC conste de exactamente 11 dígitos numéricos.
   */
  private inicializarFormulario(): void {
    this.proveedorForm = this.fb.group({
      ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      razonSocial: ['', [Validators.required, Validators.maxLength(150)]],
      nombreComercial: ['', [Validators.maxLength(150)]],
      direccion: ['', [Validators.required, Validators.maxLength(255)]],
      telefono: ['', [Validators.required, Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]]
    });
  }

  /**
   * @description Solicita a la API el listado paginado de proveedores.
   * @param event Objeto portador de los metadatos de paginación y filtros dictados por la tabla.
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

  /**
   * @description Transforma la vista de datos activa en un archivo CSV formateado y atómico,
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

  /**
   * @description Acondiciona y despliega el formulario modal para el ingreso de un nuevo registro,
   * rehabilitando controles previamente bloqueados.
   */
  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.idActual = null;
    this.guardando = false;
    this.proveedorForm.reset();
    this.proveedorForm.get('ruc')?.enable();
    this.modalVisible = true;
  }

  /**
   * @description Despliega el formulario modal en formato de edición poblándolo con los datos del DTO.
   * Aplica la regla arquitectónica de inmutabilidad: El RUC como llave de negocio legal es de solo lectura.
   * @param item Instancia DTO del proveedor seleccionado.
   */
  abrirModalEditar(item: ProveedorDTO): void {
    this.modoEdicion = true;
    this.idActual = item.id!;
    this.guardando = false;

    this.proveedorForm.patchValue({
      ruc: item.ruc,
      razonSocial: item.razonSocial,
      nombreComercial: item.nombreComercial,
      direccion: item.direccion,
      telefono: item.telefono,
      email: item.email
    });

    this.proveedorForm.get('ruc')?.disable();
    this.modalVisible = true;
  }

  /**
   * @description Oculta la ventana modal abortando toda operación en curso sin guardar cambios.
   */
  cerrarModal(): void {
    this.modalVisible = false;
  }

  /**
   * @description Motor unificado de excepciones de alta fidelidad. Intercepta los errores
   * del backend y los traduce a mensajes amigables con categorización dinámica de UI.
   * Desglosa de forma precisa los errores arrojados por el DTO `FieldErrorDTO` de Spring Boot.
   * @param err Objeto encapsulador del error HTTP.
   */
  private manejarErrorBackend(err: any): void {
    this.guardando = false;
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

      // Extracción atómica de campos y descripciones provistas por el ApiErrorResponse
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
      severity: severidad,
      summary: titulo,
      detail: mensaje,
      life: 6000 // Se otorgan 6 segundos para permitir la lectura cómoda de las causas
    });
  }

  /**
   * @description Procesa y despacha la transacción del formulario (POST o PUT).
   * Contiene mecanismos de extracción en bruto para tolerar controles deshabilitados
   * y bloqueos preventivos de UI para anular el doble sometimiento (Double Submit).
   */
  guardar(): void {
    if (this.proveedorForm.invalid) {
      this.proveedorForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Formulario Incompleto', detail: 'Revise los campos en rojo.' });
      return;
    }

    this.guardando = true;
    const formValues = this.proveedorForm.getRawValue();

    if (this.modoEdicion && this.idActual) {
      const existente = this.proveedores.find(x => x.id === this.idActual);
      const data: ProveedorDTO = { ...formValues, estado: existente?.estado };

      this.proveedorService.actualizar(this.idActual, data).subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarProveedores(this.dt.createLazyLoadMetadata());
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Proveedor actualizado' });
        },
        error: (err) => this.manejarErrorBackend(err)
      });
    } else {
      const data: ProveedorDTO = { ...formValues, estado: true };
      this.proveedorService.crear(data).subscribe({
        next: () => {
          this.cerrarModal();
          this.dt.reset();
          this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Proveedor registrado' });
        },
        error: (err) => this.manejarErrorBackend(err)
      });
    }
  }

  /**
   * @description Exige confirmación para desactivar lógicamente a un proveedor del sistema.
   * Evita su futura asociación a compras sin destruir el historial previo.
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
   * @description Exige confirmación para restaurar la vigencia de un proveedor inactivo.
   * Invoca internamente al endpoint ligero de tipo PATCH.
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
