import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UnidadMedidaService } from '../../services/unidad-medida.service';
import { UnidadMedidaDTO } from '../../../../core/models/unidad-medida.dto';

// Módulos PrimeNG
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

/**
 * @description Componente central para la gestión del catálogo de Unidades de Medida.
 * Administra las métricas utilizadas en el inventario (ej. Cajas, Metros, Unidades)
 * integrando control avanzado de estado en la tabla mediante ViewChild.
 */
@Component({
  selector: 'app-unidad-medida-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, TableModule, ButtonModule,
    TagModule, DialogModule, InputTextModule, ToastModule, ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './unidad-medida-list.component.html'
})
export class UnidadMedidaListComponent implements OnInit {

  /** Referencia nativa a la instancia de la tabla PrimeNG para gestionar su paginación y filtros dinámicos. */
  @ViewChild('dt') dt!: Table;

  // Inyección de dependencias
  private unidadMedidaService = inject(UnidadMedidaService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // --- ESTADO DE LA TABLA ---
  /** Colección de unidades de medida actuales renderizadas en la tabla. */
  unidades: UnidadMedidaDTO[] = [];
  /** Total de registros disponibles en la base de datos para la paginación. */
  totalRecords: number = 0;
  /** Indicador de carga visual para la tabla. */
  loading: boolean = true;
  /** Cantidad de registros mostrados por página. */
  rowsPerPage: number = 10;

  // --- ESTADO DEL FORMULARIO Y MODAL ---
  /** Instancia del formulario reactivo para la gestión de datos. */
  unidadForm!: FormGroup;
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
   * @description Construye el formulario reactivo aplicando las validaciones requeridas.
   */
  private inicializarFormulario(): void {
    this.unidadForm = this.fb.group({
      descripcion: ['', [Validators.required, Validators.maxLength(100)]],
      abreviatura: ['', [Validators.required, Validators.maxLength(10)]]
    });
  }

  /**
   * @description Carga el listado paginado de unidades desde la API.
   * Delega el cálculo de paginación a los metadatos dinámicos proporcionados por PrimeNG.
   * @param event Objeto de evento emitido por la tabla PrimeNG.
   */
  cargarUnidades(event: any): void {
    this.loading = true;

    const first = event.first ?? 0;
    const rows = event.rows ?? this.rowsPerPage;
    const page = first / rows;
    const buscar = event.globalFilter || '';

    this.unidadMedidaService.listarPaginado(page, rows, buscar).subscribe({
      next: (response) => {
        this.unidades = response.content;
        this.totalRecords = response.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las unidades de medida' });
        this.loading = false;
      }
    });
  }

  /**
   * @description Configura y despliega el modal en contexto de creación.
   */
  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.idActual = null;
    this.unidadForm.reset();
    this.modalVisible = true;
  }

  /**
   * @description Configura y despliega el modal en contexto de edición.
   * @param item Instancia del DTO seleccionada en la vista.
   */
  abrirModalEditar(item: UnidadMedidaDTO): void {
    this.modoEdicion = true;
    this.idActual = item.id!;
    this.unidadForm.patchValue({
      descripcion: item.descripcion,
      abreviatura: item.abreviatura
    });
    this.modalVisible = true;
  }

  /**
   * @description Oculta la ventana modal sin ejecutar cambios en la base de datos.
   */
  cerrarModal(): void {
    this.modalVisible = false;
  }

  /**
   * @description Procesa la persistencia de datos (POST o PUT).
   * Aprovecha la API de PrimeNG para mantener la posición de la tabla en ediciones,
   * o forzar la recarga desde la página 1 al crear un nuevo registro.
   */
  guardar(): void {
    if (this.unidadForm.invalid) {
      this.unidadForm.markAllAsTouched();
      return;
    }

    // Extracción segura de valores, útil si hubiera controles deshabilitados en el futuro.
    const formValues = this.unidadForm.getRawValue();

    if (this.modoEdicion && this.idActual) {
      const existente = this.unidades.find(x => x.id === this.idActual);
      const data: UnidadMedidaDTO = { ...formValues, estado: existente?.estado };

      this.unidadMedidaService.actualizar(this.idActual, data).subscribe({
        next: () => {
          this.cerrarModal();
          // Congela y recarga la tabla preservando la página y filtros actuales
          this.cargarUnidades(this.dt.createLazyLoadMetadata());
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Unidad de medida actualizada' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar' })
      });
    } else {
      const data: UnidadMedidaDTO = { ...formValues, estado: true };
      this.unidadMedidaService.crear(data).subscribe({
        next: () => {
          this.cerrarModal();
          // Reinicia el estado de la tabla, volviendo a la primera página
          this.dt.reset();
          this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Unidad de medida registrada' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear' })
      });
    }
  }

  /**
   * @description Solicita confirmación y ejecuta la desactivación lógica de la unidad.
   * Emite una notificación visual amigable de tipo 'info'.
   * @param item Instancia del DTO a desactivar.
   */
  eliminar(item: UnidadMedidaDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas desactivar la unidad de medida <b>${item.descripcion}</b>?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, desactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.unidadMedidaService.eliminar(item.id!).subscribe({
          next: () => {
            // Mantiene el bloque de paginación activo
            this.cargarUnidades(this.dt.createLazyLoadMetadata());
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
   * @description Solicita confirmación y reactiva un registro previamente desactivado.
   * @param item Instancia del DTO a reactivar.
   */
  restaurar(item: UnidadMedidaDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas reactivar la unidad de medida <b>${item.descripcion}</b>?`,
      header: 'Confirmar Restauración',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        const data: UnidadMedidaDTO = { ...item, estado: true };
        this.unidadMedidaService.actualizar(item.id!, data).subscribe({
          next: () => {
            // Mantiene el bloque de paginación activo
            this.cargarUnidades(this.dt.createLazyLoadMetadata());
            this.messageService.add({ severity: 'success', summary: 'Restaurado', detail: 'Unidad de medida reactivada' });
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo reactivar' })
        });
      }
    });
  }
}
