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

// Módulos de UI/UX
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

/**
 * @description Componente central para la gestión de categorías en el inventario de HardPC.
 * Administra el listado paginado, creación, edición y control de estado (activación/desactivación)
 * de las categorías de productos (ej. repuestos, suministros).
 */
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
  // Inyección de dependencias
  private categoriaService = inject(CategoriaService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // --- ESTADO DE LA TABLA ---
  /** Colección de categorías actuales renderizadas en la tabla. */
  categorias: CategoriaDTO[] = [];
  /** Total de registros disponibles en la base de datos para la paginación. */
  totalRecords: number = 0;
  /** Indicador de carga para la tabla de PrimeNG. */
  loading: boolean = true;
  /** Cantidad de registros mostrados por página. */
  rowsPerPage: number = 10;

  // --- ESTADO DEL FORMULARIO Y MODAL ---
  /** Instancia del formulario reactivo para la gestión de datos. */
  categoriaForm!: FormGroup;
  /** Controla la visibilidad de la ventana modal. */
  modalVisible: boolean = false;
  /** Determina el contexto del modal: `true` para Edición, `false` para Creación. */
  modoEdicion: boolean = false;
  /** Almacena el ID de la categoría en curso durante la edición. */
  idCategoriaActual: number | null = null;

  /**
   * @description Inicializa el componente construyendo la estructura del formulario.
   */
  ngOnInit(): void {
    this.inicializarFormulario();
  }

  /**
   * @description Construye el formulario reactivo aplicando las validaciones del DTO.
   * El campo 'estado' se excluye deliberadamente para gestionarse de forma programática.
   */
  private inicializarFormulario(): void {
    this.categoriaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(255)]],
      iconoUrl: ['', [Validators.maxLength(500)]]
    });
  }

  /**
   * @description Carga el listado paginado de categorías desde la API.
   * Diseñado para integrarse con el evento 'onLazyLoad' de PrimeNG, procesando
   * automáticamente la paginación y la búsqueda global.
   * @param event Objeto de evento emitido por la tabla PrimeNG.
   */
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
        console.error('Error al cargar categorías:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las categorías' });
        this.loading = false;
      }
    });
  }

  /**
   * @description Prepara y despliega el modal en contexto de creación de un nuevo registro.
   */
  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.idCategoriaActual = null;
    this.categoriaForm.reset({ estado: true });
    this.modalVisible = true;
  }

  /**
   * @description Prepara y despliega el modal en contexto de edición, poblando el
   * formulario con los datos de la categoría seleccionada.
   * @param categoria Instancia del DTO seleccionada en la tabla.
   */
  abrirModalEditar(categoria: CategoriaDTO): void {
    this.modoEdicion = true;
    this.idCategoriaActual = categoria.id!;

    this.categoriaForm.patchValue({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion,
      iconoUrl: categoria.iconoUrl,
      estado: categoria.estado
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
   * @description Procesa la persistencia de datos. Valida el formulario y decide
   * si ejecutar una creación (POST) o una actualización (PUT) según el contexto actual.
   * Mantiene la integridad del estado lógico preexistente durante las ediciones.
   */
  guardarCategoria(): void {
    if (this.categoriaForm.invalid) {
      this.categoriaForm.markAllAsTouched();
      return;
    }

    const formValues = this.categoriaForm.value;

    if (this.modoEdicion && this.idCategoriaActual) {
      // Recupera el estado original de la categoría para evitar alteraciones accidentales.
      const categoriaExistente = this.categorias.find(c => c.id === this.idCategoriaActual);
      const categoriaData: CategoriaDTO = { ...formValues, estado: categoriaExistente?.estado };

      this.categoriaService.actualizar(this.idCategoriaActual, categoriaData).subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarCategorias({ first: 0, rows: this.rowsPerPage });
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Categoría actualizada correctamente' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar la categoría' })
      });
    } else {
      // Fuerza el estado activo por defecto para nuevos registros.
      const categoriaData: CategoriaDTO = { ...formValues, estado: true };
      this.categoriaService.crear(categoriaData).subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarCategorias({ first: 0, rows: this.rowsPerPage });
          this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Categoría registrada correctamente' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la categoría' })
      });
    }
  }

  /**
   * @description Solicita confirmación y ejecuta la desactivación lógica de una categoría.
   * @param categoria Instancia del DTO a desactivar.
   */
  eliminarCategoria(categoria: CategoriaDTO): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas desactivar la categoría <b>${categoria.nombre}</b>?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, desactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.categoriaService.eliminar(categoria.id!).subscribe({
          next: () => {
            this.cargarCategorias({ first: 0, rows: this.rowsPerPage });
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Categoría desactivada' });
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo desactivar la categoría' })
        });
      }
    });
  }

  /**
   * @description Solicita confirmación y reactiva una categoría previamente desactivada
   * reutilizando el endpoint de actualización integral (PUT).
   * @param categoria Instancia del DTO a reactivar.
   */
  restaurarCategoria(categoria: CategoriaDTO): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas reactivar la categoría <b>${categoria.nombre}</b>?`,
      header: 'Confirmar Restauración',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        const categoriaRestaurada: CategoriaDTO = { ...categoria, estado: true };
        this.categoriaService.actualizar(categoria.id!, categoriaRestaurada).subscribe({
          next: () => {
            this.cargarCategorias({ first: 0, rows: this.rowsPerPage });
            this.messageService.add({ severity: 'success', summary: 'Restaurado', detail: 'Categoría reactivada' });
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo reactivar la categoría' })
        });
      }
    });
  }
}
