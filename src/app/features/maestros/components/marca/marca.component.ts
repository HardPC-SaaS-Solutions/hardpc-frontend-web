import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MarcaService } from '../../services/marca.service';
import { MarcaDTO } from '../../../../core/models/marca.dto';

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
 * @description Componente central para la gestión de marcas en el inventario de HardPC.
 */
@Component({
  selector: 'app-marca',
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
  templateUrl: './marca.component.html'
})
export class MarcaComponent implements OnInit {
  // Inyección de dependencias
  private marcaService = inject(MarcaService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // --- ESTADO DE LA TABLA ---
  marcas: MarcaDTO[] = [];
  totalRecords: number = 0;
  loading: boolean = true;
  rowsPerPage: number = 10;

  // --- ESTADO DEL FORMULARIO Y MODAL ---
  marcaForm!: FormGroup;
  modalVisible: boolean = false;
  modoEdicion: boolean = false;
  idMarcaActual: number | null = null;

  ngOnInit(): void {
    this.inicializarFormulario();
  }

  private inicializarFormulario(): void {
    this.marcaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(255)]]
    });
  }

  cargarMarcas(event: any): void {
    this.loading = true;
    const page = event.first ? event.first / event.rows : 0;
    const size = event.rows || this.rowsPerPage;
    const buscar = event.globalFilter || '';

    this.marcaService.listarPaginado(page, size, buscar).subscribe({
      next: (response) => {
        this.marcas = response.content;
        this.totalRecords = response.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar marcas:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las marcas' });
        this.loading = false;
      }
    });
  }

  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.idMarcaActual = null;
    this.marcaForm.reset({ activo: true });
    this.modalVisible = true;
  }

  abrirModalEditar(marca: MarcaDTO): void {
    this.modoEdicion = true;
    this.idMarcaActual = marca.id!;

    this.marcaForm.patchValue({
      nombre: marca.nombre,
      descripcion: marca.descripcion,
      activo: marca.activo
    });
    this.modalVisible = true;
  }

  cerrarModal(): void {
    this.modalVisible = false;
  }

  guardarMarca(): void {
    if (this.marcaForm.invalid) {
      this.marcaForm.markAllAsTouched();
      return;
    }

    const formValues = this.marcaForm.value;

    if (this.modoEdicion && this.idMarcaActual) {
      const marcaExistente = this.marcas.find(m => m.id === this.idMarcaActual);
      const marcaData: MarcaDTO = { ...formValues, activo: marcaExistente?.activo };

      this.marcaService.actualizar(this.idMarcaActual, marcaData).subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarMarcas({ first: 0, rows: this.rowsPerPage });
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Marca actualizada correctamente' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar la marca' })
      });
    } else {
      const marcaData: MarcaDTO = { ...formValues, activo: true };
      this.marcaService.crear(marcaData).subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarMarcas({ first: 0, rows: this.rowsPerPage });
          this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Marca registrada correctamente' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la marca' })
      });
    }
  }

  eliminarMarca(marca: MarcaDTO): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas desactivar la marca <b>${marca.nombre}</b>?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, desactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.marcaService.eliminar(marca.id!).subscribe({
          next: () => {
            this.cargarMarcas({ first: 0, rows: this.rowsPerPage });
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Marca desactivada' });
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo desactivar la marca' })
        });
      }
    });
  }

  restaurarMarca(marca: MarcaDTO): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas reactivar la marca <b>${marca.nombre}</b>?`,
      header: 'Confirmar Restauración',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        const marcaRestaurada: MarcaDTO = { ...marca, activo: true };
        this.marcaService.actualizar(marca.id!, marcaRestaurada).subscribe({
          next: () => {
            this.cargarMarcas({ first: 0, rows: this.rowsPerPage });
            this.messageService.add({ severity: 'success', summary: 'Restaurado', detail: 'Marca reactivada' });
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo reactivar la marca' })
        });
      }
    });
  }
}