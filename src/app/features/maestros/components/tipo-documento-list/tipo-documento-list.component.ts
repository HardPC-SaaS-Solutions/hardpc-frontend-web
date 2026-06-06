import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TipoDocumentoService } from '../../services/tipo-documento.service';
import { TipoDocumentoDTO } from '../../../../core/models/tipo-documento.dto';

// Módulos PrimeNG
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

/**
 * @description Componente central para la gestión del catálogo de Tipos de Documento.
 * Administra los documentos de identidad oficiales (ej. DNI, RUC, Pasaporte) requeridos
 * para la facturación electrónica y el registro validado de clientes/empleados en HardPC.
 */
@Component({
  selector: 'app-tipo-documento-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, TableModule, ButtonModule,
    TagModule, DialogModule, InputTextModule, InputNumberModule,
    ToastModule, ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './tipo-documento-list.component.html'
})
export class TipoDocumentoListComponent implements OnInit {

  /** Referencia nativa a la tabla PrimeNG para gestionar su paginación y refresco conservando el estado. */
  @ViewChild('dt') dt!: Table;

  // Inyección de dependencias
  private tipoDocumentoService = inject(TipoDocumentoService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // --- ESTADO DE LA TABLA ---
  /** Colección de tipos de documento actuales renderizados en la tabla. */
  documentos: TipoDocumentoDTO[] = [];
  /** Total de registros disponibles en la base de datos para la paginación. */
  totalRecords: number = 0;
  /** Indicador de carga visual para la tabla. */
  loading: boolean = true;
  /** Cantidad de registros mostrados por página. */
  rowsPerPage: number = 10;

  // --- ESTADO DEL FORMULARIO Y MODAL ---
  /** Instancia del formulario reactivo para la gestión de datos. */
  documentoForm!: FormGroup;
  /** Controla la visibilidad de la ventana modal. */
  modalVisible: boolean = false;
  /** Determina el contexto del modal: `true` para Edición, `false` para Creación. */
  modoEdicion: boolean = false;
  /** Almacena el ID del registro en curso durante la edición. */
  idActual: number | null = null;

  /**
   * @description Inicializa el componente construyendo la estructura base del formulario.
   */
  ngOnInit(): void {
    this.inicializarFormulario();
  }

  /**
   * @description Construye el formulario reactivo aplicando validaciones estrictas de negocio.
   * Incluye control Regex para alfanuméricos en la abreviatura y límites precisos para la longitud.
   */
  private inicializarFormulario(): void {
    this.documentoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(50)]],
      // Regex idéntico al del backend: Obliga al uso de mayúsculas y números (sin caracteres especiales)
      abreviatura: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(10), Validators.pattern(/^[A-Z0-9]+$/)]],
      longitudExacta: [null, [Validators.required, Validators.min(1), Validators.max(20)]]
    });
  }

  /**
   * @description Carga el listado paginado de tipos de documentos desde la API.
   * @param event Objeto de evento con los metadatos de paginación y filtros de PrimeNG.
   */
  cargarDocumentos(event: any): void {
    this.loading = true;

    const first = event.first ?? 0;
    const rows = event.rows ?? this.rowsPerPage;
    const page = first / rows;
    const buscar = event.globalFilter || '';

    this.tipoDocumentoService.listarPaginado(page, rows, buscar).subscribe({
      next: (response) => {
        this.documentos = response.content;
        this.totalRecords = response.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los tipos de documento' });
        this.loading = false;
      }
    });
  }

  /**
   * @description Prepara y despliega el modal en contexto de creación.
   */
  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.idActual = null;
    this.documentoForm.reset();
    this.modalVisible = true;
  }

  /**
   * @description Prepara y despliega el modal en contexto de edición, cargando la información existente.
   * @param item Instancia del DTO seleccionada en la vista.
   */
  abrirModalEditar(item: TipoDocumentoDTO): void {
    this.modoEdicion = true;
    this.idActual = item.id!;
    this.documentoForm.patchValue({
      nombre: item.nombre,
      abreviatura: item.abreviatura,
      longitudExacta: item.longitudExacta
    });
    this.modalVisible = true;
  }

  /**
   * @description Oculta la ventana modal descartando cualquier cambio no guardado.
   */
  cerrarModal(): void {
    this.modalVisible = false;
  }

  /**
   * @description Procesa la persistencia del formulario decidiendo entre POST o PUT.
   * Garantiza la integridad de la abreviatura transformándola a mayúsculas antes de enviarla.
   */
  guardar(): void {
    if (this.documentoForm.invalid) {
      this.documentoForm.markAllAsTouched();
      return;
    }

    const formValues = this.documentoForm.getRawValue();

    // Saneamiento de seguridad: Aseguramos que la abreviatura se envíe en mayúsculas
    // por si el usuario logró evadir la validación visual del frontend.
    formValues.abreviatura = formValues.abreviatura.toUpperCase();

    if (this.modoEdicion && this.idActual) {
      const existente = this.documentos.find(x => x.id === this.idActual);
      const data: TipoDocumentoDTO = { ...formValues, estado: existente?.estado };

      this.tipoDocumentoService.actualizar(this.idActual, data).subscribe({
        next: () => {
          this.cerrarModal();
          // Congela y recarga la tabla preservando la página y filtros actuales
          this.cargarDocumentos(this.dt.createLazyLoadMetadata());
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Tipo de documento actualizado' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar' })
      });
    } else {
      const data: TipoDocumentoDTO = { ...formValues, estado: true };
      this.tipoDocumentoService.crear(data).subscribe({
        next: () => {
          this.cerrarModal();
          // Limpia la tabla y retorna a la página 1 para evidenciar la creación
          this.dt.reset();
          this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Tipo de documento registrado' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear' })
      });
    }
  }

  /**
   * @description Solicita confirmación y ejecuta la desactivación lógica del documento.
   * Emite una notificación visual informativa con ícono de papelera.
   * @param item Instancia del DTO a desactivar.
   */
  eliminar(item: TipoDocumentoDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas desactivar el documento <b>${item.nombre}</b>?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, desactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.tipoDocumentoService.eliminar(item.id!).subscribe({
          next: () => {
            // Mantiene el bloque de paginación activo
            this.cargarDocumentos(this.dt.createLazyLoadMetadata());
            this.messageService.add({
              severity: 'info',
              summary: 'Desactivado',
              detail: 'Registro movido a la papelera',
              icon: 'pi pi-trash'
            });
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo desactivar' })
        });
      }
    });
  }

  /**
   * @description Solicita confirmación y reactiva un documento previamente desactivado.
   * @param item Instancia del DTO a reactivar.
   */
  restaurar(item: TipoDocumentoDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas reactivar el documento <b>${item.nombre}</b>?`,
      header: 'Confirmar Restauración',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        const data: TipoDocumentoDTO = { ...item, estado: true };
        this.tipoDocumentoService.actualizar(item.id!, data).subscribe({
          next: () => {
            // Mantiene el bloque de paginación activo
            this.cargarDocumentos(this.dt.createLazyLoadMetadata());
            this.messageService.add({ severity: 'success', summary: 'Restaurado', detail: 'Documento reactivado' });
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo reactivar' })
        });
      }
    });
  }
}
