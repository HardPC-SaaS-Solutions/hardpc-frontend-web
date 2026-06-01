import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CategoriaService } from '../../services/categoria.service';
import { CategoriaDTO } from '../../../../core/models/categoria.dto';

// Módulos de PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

// Nuevos Módulos para UX
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-categoria-list',
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
  templateUrl: './categoria-list.component.html'
})
export class CategoriaListComponent implements OnInit {
  private categoriaService = inject(CategoriaService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);             // <-- Inyectado
  private confirmationService = inject(ConfirmationService);

  // Variables de la tabla
  categorias: CategoriaDTO[] = [];
  totalRecords: number = 0;
  loading: boolean = true;
  rowsPerPage: number = 10;

  // Variables del Modal y Formulario
  categoriaForm!: FormGroup;
  modalVisible: boolean = false;
  modoEdicion: boolean = false;
  idCategoriaActual: number | null = null;

  ngOnInit(): void {
    this.inicializarFormulario();
  }

  // Reflejamos las validaciones exactas de tu DTO
  private inicializarFormulario(): void {
    this.categoriaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(255)]],
      iconoUrl: ['', [Validators.maxLength(500)]],
      estado: [true] // Por defecto activo al crear
    });
  }

  // --- MÉTODOS DE LA TABLA ---
  cargarCategorias(event: any): void {
    this.loading = true;
    const page = event.first ? event.first / event.rows : 0;
    const size = event.rows || this.rowsPerPage;
    const buscar = event.globalFilter || '';

    this.categoriaService.listarPaginado(page, size, buscar).subscribe({
      next: (response) => {
        this.categorias = response.content;
        this.totalRecords = response.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al traer categorías:', err);
        this.loading = false;
      }
    });
  }

  // --- MÉTODOS DEL MODAL ---
  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.idCategoriaActual = null;
    this.categoriaForm.reset({ estado: true }); // Limpia y deja estado activo
    this.modalVisible = true;
  }

  abrirModalEditar(categoria: CategoriaDTO): void {
    this.modoEdicion = true;
    this.idCategoriaActual = categoria.id!;
    // Llenamos el formulario con los datos de la fila
    this.categoriaForm.patchValue({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion,
      iconoUrl: categoria.iconoUrl,
      estado: categoria.estado
    });
    this.modalVisible = true;
  }

  cerrarModal(): void {
    this.modalVisible = false;
  }

  // --- GUARDAR O ACTUALIZAR ---
  guardarCategoria(): void {
    if (this.categoriaForm.invalid) {
      this.categoriaForm.markAllAsTouched(); // Pinta de rojo los campos vacíos
      return;
    }

    const categoriaData: CategoriaDTO = this.categoriaForm.value;

    if (this.modoEdicion && this.idCategoriaActual) {
      // Petición PUT
      this.categoriaService.actualizar(this.idCategoriaActual, categoriaData).subscribe({
        next: () => {
          this.cerrarModal();
          // Recargamos la tabla (simulamos un evento lazy)
          this.cargarCategorias({ first: 0, rows: this.rowsPerPage });
        },
        error: (err) => console.error('Error al actualizar', err)
      });
    } else {
      // Petición POST
      this.categoriaService.crear(categoriaData).subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarCategorias({ first: 0, rows: this.rowsPerPage });
        },
        error: (err) => console.error('Error al crear', err)
      });
    }
  }

  eliminarCategoria(categoria: CategoriaDTO): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas eliminar la categoría <b>${categoria.nombre}</b>?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.categoriaService.eliminar(categoria.id!).subscribe({
          next: () => {
            this.cargarCategorias({ first: 0, rows: this.rowsPerPage });
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Categoría eliminada lógicamente' });
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la categoría' })
        });
      }
    });
  }
}
