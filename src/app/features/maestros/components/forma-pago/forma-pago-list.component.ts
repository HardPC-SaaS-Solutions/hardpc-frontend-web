import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormaPagoService } from '../../services/forma-pago.service';
import { FormaPagoDTO } from '../../../../core/models/forma-pago.dto';

import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

/**
 * @description Componente central para la gestión del catálogo de Formas de Pago.
 * Administra los métodos de transacción habilitados en el sistema de ventas de HardPC
 * utilizando un control avanzado del estado de la tabla mediante ViewChild.
 */
@Component({
  selector: 'app-forma-pago-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, TableModule, ButtonModule,
    TagModule, DialogModule, InputTextModule, ToastModule, ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './forma-pago-list.component.html'
})
export class FormaPagoListComponent implements OnInit {

  /** * Referencia directa a la instancia de la tabla de PrimeNG.
   * Permite extraer el estado actual (paginación, filtros) de forma nativa.
   */
  @ViewChild('dt') dt!: Table;

  // Inyección de dependencias
  private formaPagoService = inject(FormaPagoService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // --- ESTADO DE LA TABLA ---
  /** Colección de formas de pago actuales renderizadas en la tabla. */
  formasPago: FormaPagoDTO[] = [];
  /** Total de registros disponibles en la base de datos para la paginación. */
  totalRecords: number = 0;
  /** Indicador de carga visual para la tabla. */
  loading: boolean = true;
  /** Cantidad de registros mostrados por página. */
  rowsPerPage: number = 10;

  // --- ESTADO DEL FORMULARIO Y MODAL ---
  /** Instancia del formulario reactivo para la gestión de datos. */
  formaPagoForm!: FormGroup;
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
    this.formaPagoForm = this.fb.group({
      descripcion: ['', [Validators.required, Validators.maxLength(50)]]
    });
  }

  /**
   * @description Carga el listado paginado de formas de pago desde la API.
   * Soporta paginación y filtrado dinámico delegado por PrimeNG.
   * @param event Objeto de evento con los metadatos actuales de la tabla.
   */
  cargarFormasPago(event: any): void {
    this.loading = true;

    const first = event.first ?? 0;
    const rows = event.rows ?? this.rowsPerPage;
    const page = first / rows;
    const buscar = event.globalFilter || '';

    this.formaPagoService.listarPaginado(page, rows, buscar).subscribe({
      next: (response) => {
        this.formasPago = response.content;
        this.totalRecords = response.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los registros' });
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
    this.formaPagoForm.reset();
    this.modalVisible = true;
  }

  /**
   * @description Configura y despliega el modal en contexto de edición.
   * @param item Instancia del DTO seleccionada en la vista.
   */
  abrirModalEditar(item: FormaPagoDTO): void {
    this.modoEdicion = true;
    this.idActual = item.id!;
    this.formaPagoForm.patchValue({ descripcion: item.descripcion });
    this.modalVisible = true;
  }

  /**
   * @description Oculta la ventana modal sin ejecutar cambios.
   */
  cerrarModal(): void {
    this.modalVisible = false;
  }

  /**
   * @description Procesa la persistencia de datos decidiendo entre POST o PUT.
   * Aprovecha la API de PrimeNG para mantener la posición en ediciones o
   * reiniciar la tabla visualizando el primer bloque en creaciones.
   */
  guardar(): void {
    if (this.formaPagoForm.invalid) {
      this.formaPagoForm.markAllAsTouched();
      return;
    }

    const formValues = this.formaPagoForm.value;

    if (this.modoEdicion && this.idActual) {
      const existente = this.formasPago.find(x => x.id === this.idActual);
      const data: FormaPagoDTO = { ...formValues, estado: existente?.estado };

      this.formaPagoService.actualizar(this.idActual, data).subscribe({
        next: () => {
          this.cerrarModal();
          // Extrae los metadatos actuales de la tabla para recargar conservando la página.
          this.cargarFormasPago(this.dt.createLazyLoadMetadata());
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Registro actualizado correctamente' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar' })
      });
    } else {
      const data: FormaPagoDTO = { ...formValues, estado: true };
      this.formaPagoService.crear(data).subscribe({
        next: () => {
          this.cerrarModal();
          // Reinicia completamente el estado de la tabla, forzando la vuelta a la página 1.
          this.dt.reset();
          this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Registro creado correctamente' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear' })
      });
    }
  }

  /**
   * @description Solicita confirmación y ejecuta la desactivación lógica del registro.
   * @param item Instancia del DTO a desactivar.
   */
  eliminar(item: FormaPagoDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas desactivar la forma de pago <b>${item.descripcion}</b>?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, desactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.formaPagoService.eliminar(item.id!).subscribe({
          next: () => {
            // Conserva el estado de paginación tras eliminar.
            this.cargarFormasPago(this.dt.createLazyLoadMetadata());
            this.messageService.add({ severity: 'info', summary: 'Eliminado', detail: 'Registro desactivado', icon: 'pi pi-trash' });
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
  restaurar(item: FormaPagoDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas reactivar la forma de pago <b>${item.descripcion}</b>?`,
      header: 'Confirmar Restauración',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        const data: FormaPagoDTO = { ...item, estado: true };
        this.formaPagoService.actualizar(item.id!, data).subscribe({
          next: () => {
            // Conserva el estado de paginación tras restaurar.
            this.cargarFormasPago(this.dt.createLazyLoadMetadata());
            this.messageService.add({ severity: 'success', summary: 'Restaurado', detail: 'Registro reactivado' });
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo reactivar' })
        });
      }
    });
  }
}
