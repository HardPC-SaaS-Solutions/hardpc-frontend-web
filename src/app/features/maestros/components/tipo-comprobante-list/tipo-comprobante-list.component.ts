import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { TipoComprobanteService } from '../../services/tipo-comprobante.service';
import { TipoComprobanteDTO } from '../../../../core/models/tipo-comprobante.dto';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

/**
 * @description Componente central para la gestión de Tipos de Comprobante.
 * Administra el listado paginado, creación, edición y control de estado
 * de los documentos contables estandarizados por SUNAT (ej. Boleta, Factura).
 */
@Component({
  selector: 'app-tipo-comprobante-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './tipo-comprobante-list.component.html'
})
export class TipoComprobanteListComponent implements OnInit {

  // Inyección de dependencias
  private tipoComprobanteService = inject(TipoComprobanteService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // --- ESTADO DE LA TABLA ---
  /** Colección de comprobantes actuales renderizados en la tabla. */
  tiposComprobante: TipoComprobanteDTO[] = [];
  /** Total de registros disponibles en la base de datos para la paginación. */
  totalRecords = 0;
  /** Indicador de carga para la tabla de PrimeNG. */
  loading = true;
  /** Cantidad de registros mostrados por página. */
  rowsPerPage = 10;

  // --- ESTADO DEL FORMULARIO Y MODAL ---
  /** Instancia del formulario reactivo para la gestión de datos. */
  tipoComprobanteForm!: FormGroup;
  /** Controla la visibilidad de la ventana modal. */
  modalVisible = false;
  /** Determina el contexto del modal: `true` para Edición, `false` para Creación. */
  modoEdicion = false;
  /** Almacena el ID del comprobante en curso durante la edición. */
  idActual: number | null = null;

  /**
   * @description Inicializa el componente construyendo la estructura del formulario.
   */
  ngOnInit(): void {
    this.inicializarFormulario();
  }

  /**
   * @description Construye el formulario reactivo aplicando las validaciones del DTO.
   */
  private inicializarFormulario(): void {
    this.tipoComprobanteForm = this.fb.group({
      descripcion: ['', [Validators.required, Validators.maxLength(100)]],
      codigoSunat: ['', [Validators.required, Validators.maxLength(20)]]
    });
  }

  /**
   * @description Carga el listado paginado de tipos de comprobante desde la API.
   * @param event Objeto de evento emitido por la tabla PrimeNG.
   */
  cargarTiposComprobante(event: any): void {
    this.loading = true;
    const page = event.first ? event.first / event.rows : 0;
    const size = event.rows || this.rowsPerPage;
    const buscar = event.globalFilter || '';

    this.tipoComprobanteService.listarPaginado(page, size, buscar).subscribe({
      next: (response) => {
        this.tiposComprobante = response.content;
        this.totalRecords = response.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar tipos de comprobante:', err);
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los registros' });
      }
    });
  }

  /**
   * @description Prepara y despliega el modal en contexto de creación.
   */
  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.idActual = null;
    this.tipoComprobanteForm.reset();
    this.modalVisible = true;
  }

  /**
   * @description Prepara y despliega el modal en contexto de edición.
   * @param item Instancia del DTO seleccionada en la tabla.
   */
  abrirModalEditar(item: TipoComprobanteDTO): void {
    this.modoEdicion = true;
    this.idActual = item.id!;

    this.tipoComprobanteForm.patchValue({
      descripcion: item.descripcion,
      codigoSunat: item.codigoSunat
    });

    this.modalVisible = true;
  }

  /**
   * @description Oculta la ventana modal sin aplicar cambios.
   */
  cerrarModal(): void {
    this.modalVisible = false;
  }

  /**
   * @description Procesa la persistencia de datos decidiendo entre POST o PUT.
   */
  guardar(): void {
    if (this.tipoComprobanteForm.invalid) {
      this.tipoComprobanteForm.markAllAsTouched();
      return;
    }

    const data: TipoComprobanteDTO = this.tipoComprobanteForm.value;

    if (this.modoEdicion && this.idActual) {
      const existente = this.tiposComprobante.find(x => x.id === this.idActual);
      data.estado = existente?.estado;

      this.tipoComprobanteService.actualizar(this.idActual, data).subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarTiposComprobante({ first: 0, rows: this.rowsPerPage });
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Tipo de comprobante actualizado' });
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el registro' });
        }
      });
    } else {
      data.estado = true;

      this.tipoComprobanteService.crear(data).subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarTiposComprobante({ first: 0, rows: this.rowsPerPage });
          this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Tipo de comprobante registrado' });
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el registro' });
        }
      });
    }
  }

  /**
   * @description Solicita confirmación y ejecuta la desactivación lógica.
   * @param item Instancia del DTO a desactivar.
   */
  eliminar(item: TipoComprobanteDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas desactivar <b>${item.descripcion}</b>?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, desactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.tipoComprobanteService.eliminar(item.id!).subscribe({
          next: () => {
            this.cargarTiposComprobante({ first: 0, rows: this.rowsPerPage });
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Registro desactivado' });
          },
          error: (err) => {
            console.error(err);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo desactivar el registro' });
          }
        });
      }
    });
  }

  /**
   * @description Solicita confirmación y reactiva un registro previamente desactivado.
   * @param item Instancia del DTO a reactivar.
   */
  restaurar(item: TipoComprobanteDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas reactivar <b>${item.descripcion}</b>?`,
      header: 'Confirmar Restauración',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        const data: TipoComprobanteDTO = { ...item, estado: true };
        this.tipoComprobanteService.actualizar(item.id!, data).subscribe({
          next: () => {
            this.cargarTiposComprobante({ first: 0, rows: this.rowsPerPage });
            this.messageService.add({ severity: 'success', summary: 'Restaurado', detail: 'Registro reactivado' });
          },
          error: (err) => {
            console.error(err);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo reactivar el registro' });
          }
        });
      }
    });
  }
}
