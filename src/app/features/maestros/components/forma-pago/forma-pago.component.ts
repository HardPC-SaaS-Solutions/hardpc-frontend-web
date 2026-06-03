import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormaPagoService } from '../../services/forma-pago.service';
import { FormaPagoDTO } from '../../../../core/models/forma-pago.dto';

// Módulos de PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

// Módulos de UI/UX
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

/**
 * @description Componente central para la gestión de formas de pago en HardPC.
 */
@Component({
  selector: 'app-forma-pago',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    ToggleSwitchModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './forma-pago.component.html'
})
export class FormaPagoComponent implements OnInit {
  // Inyección de dependencias
  private formaPagoService = inject(FormaPagoService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // --- ESTADO DE LA TABLA ---
  formasPago: FormaPagoDTO[] = [];
  totalRecords: number = 0;
  loading: boolean = true;
  rowsPerPage: number = 10;

  // --- ESTADO DEL FORMULARIO Y MODAL ---
  formaPagoForm!: FormGroup;
  modalVisible: boolean = false;
  modoEdicion: boolean = false;
  idFormaPagoActual: number | null = null;

  ngOnInit(): void {
    this.inicializarFormulario();
  }

  private inicializarFormulario(): void {
    this.formaPagoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(255)]]
    });
  }

  cargarFormasPago(event: any): void {
    this.loading = true;
    const page = event.first ? event.first / event.rows : 0;
    const size = event.rows || this.rowsPerPage;
    const buscar = event.globalFilter || '';

    this.formaPagoService.listarPaginado(page, size, buscar).subscribe({
      next: (response) => {
        this.formasPago = response.content;
        this.totalRecords = response.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar formas de pago:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las formas de pago' });
        this.loading = false;
      }
    });
  }

  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.idFormaPagoActual = null;
    this.formaPagoForm.reset({ activo: true });
    this.modalVisible = true;
  }

  abrirModalEditar(formaPago: FormaPagoDTO): void {
    this.modoEdicion = true;
    this.idFormaPagoActual = formaPago.id!;

    this.formaPagoForm.patchValue({
      nombre: formaPago.nombre,
      descripcion: formaPago.descripcion,
      activo: formaPago.activo
    });
    this.modalVisible = true;
  }

  cerrarModal(): void {
    this.modalVisible = false;
  }

  guardarFormaPago(): void {
    if (this.formaPagoForm.invalid) {
      this.formaPagoForm.markAllAsTouched();
      return;
    }

    const formValues = this.formaPagoForm.value;

    if (this.modoEdicion && this.idFormaPagoActual) {
      const formaPagoExistente = this.formasPago.find(f => f.id === this.idFormaPagoActual);
      const formaPagoData: FormaPagoDTO = { ...formValues, activo: formaPagoExistente?.activo };

      this.formaPagoService.actualizar(this.idFormaPagoActual, formaPagoData).subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarFormasPago({ first: 0, rows: this.rowsPerPage });
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Forma de pago actualizada correctamente' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar la forma de pago' })
      });
    } else {
      const formaPagoData: FormaPagoDTO = { ...formValues, activo: true };
      this.formaPagoService.crear(formaPagoData).subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarFormasPago({ first: 0, rows: this.rowsPerPage });
          this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Forma de pago registrada correctamente' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la forma de pago' })
      });
    }
  }

  eliminarFormaPago(formaPago: FormaPagoDTO): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas desactivar la forma de pago <b>${formaPago.nombre}</b>?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, desactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.formaPagoService.eliminar(formaPago.id!).subscribe({
          next: () => {
            this.cargarFormasPago({ first: 0, rows: this.rowsPerPage });
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Forma de pago desactivada' });
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo desactivar la forma de pago' })
        });
      }
    });
  }

  restaurarFormaPago(formaPago: FormaPagoDTO): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas reactivar la forma de pago <b>${formaPago.nombre}</b>?`,
      header: 'Confirmar Restauración',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        const formaPagoRestaurada: FormaPagoDTO = { ...formaPago, activo: true };
        this.formaPagoService.actualizar(formaPago.id!, formaPagoRestaurada).subscribe({
          next: () => {
            this.cargarFormasPago({ first: 0, rows: this.rowsPerPage });
            this.messageService.add({ severity: 'success', summary: 'Restaurado', detail: 'Forma de pago reactivada' });
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo reactivar la forma de pago' })
        });
      }
    });
  }
}