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

// Módulos de UI/UX
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

/**
 * @description Componente central para la gestión de marcas en el inventario de HardPC.
 * Administra el catálogo de fabricantes (ej. Asus, Kingston, Intel) asegurando
 * la estandarización y correcta clasificación de los productos y repuestos.
 */
@Component({
  selector: 'app-marca-list',
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
  templateUrl: './marca-list.component.html'
})
export class MarcaListComponent implements OnInit {
  // Inyección de dependencias
  private marcaService = inject(MarcaService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // --- ESTADO DE LA TABLA ---
  /** Colección de marcas actuales renderizadas en la tabla. */
  marcas: MarcaDTO[] = [];
  /** Total de registros disponibles en la base de datos para la paginación. */
  totalRecords: number = 0;
  /** Indicador de carga para la tabla de PrimeNG. */
  loading: boolean = true;
  /** Cantidad de registros mostrados por página. */
  rowsPerPage: number = 10;
  /** Almacena el índice del primer elemento de la página actual para evitar perder el foco al recargar. */
  firstItemIndex: number = 0;

  // --- ESTADO DEL FORMULARIO Y MODAL ---
  /** Instancia del formulario reactivo para la gestión de datos. */
  marcaForm!: FormGroup;
  /** Controla la visibilidad de la ventana modal. */
  modalVisible: boolean = false;
  /** Determina el contexto del modal: `true` para Edición, `false` para Creación. */
  modoEdicion: boolean = false;
  /** Almacena el ID de la marca en curso durante la edición. */
  idMarcaActual: number | null = null;

  /**
   * @description Inicializa el componente construyendo la estructura base del formulario.
   */
  ngOnInit(): void {
    this.inicializarFormulario();
  }

  /**
   * @description Construye el formulario reactivo aplicando las validaciones requeridas.
   * El estado del registro se maneja de forma programática.
   */
  private inicializarFormulario(): void {
    this.marcaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      logoUrl: ['', [Validators.maxLength(500)]]
    });
  }

  /**
   * @description Carga el listado paginado de marcas desde la API.
   * Procesa eventos de la tabla (LazyLoad) y captura la posición de la paginación actual.
   * @param event Objeto de evento emitido por la tabla PrimeNG.
   */
  cargarMarcas(event: any): void {
    this.loading = true;

    // Capturamos en qué índice está la tabla actualmente para mantener la posición al actualizar
    this.firstItemIndex = event.first !== undefined ? event.first : 0;

    const page = this.firstItemIndex / (event.rows || this.rowsPerPage);
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

  /**
   * @description Configura y despliega el modal en contexto de creación de un nuevo fabricante.
   */
  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.idMarcaActual = null;
    this.marcaForm.reset();
    this.modalVisible = true;
  }

  /**
   * @description Configura y despliega el modal en contexto de edición, cargando los
   * datos del fabricante seleccionado en el formulario.
   * @param marca Instancia del DTO seleccionada en la vista.
   */
  abrirModalEditar(marca: MarcaDTO): void {
    this.modoEdicion = true;
    this.idMarcaActual = marca.id!;

    this.marcaForm.patchValue({
      nombre: marca.nombre,
      logoUrl: marca.logoUrl
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
   * @description Procesa la persistencia de datos del formulario.
   * Determina si se ejecuta una creación (POST) o una actualización (PUT) conservando el estado lógico.
   */
  guardarMarca(): void {
    if (this.marcaForm.invalid) {
      this.marcaForm.markAllAsTouched();
      return;
    }

    const formValues = this.marcaForm.value;

    if (this.modoEdicion && this.idMarcaActual) {
      // Recupera el estado original para no alterarlo durante la edición general
      const marcaExistente = this.marcas.find(m => m.id === this.idMarcaActual);
      const marcaData: MarcaDTO = { ...formValues, estado: marcaExistente?.estado };

      this.marcaService.actualizar(this.idMarcaActual, marcaData).subscribe({
        next: () => {
          this.cerrarModal();
          // Mantiene a la tabla visualmente en la misma página tras la edición
          this.cargarMarcas({ first: this.firstItemIndex, rows: this.rowsPerPage });
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Marca actualizada correctamente' });
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar la marca' });
        }
      });
    } else {
      // Fuerza el estado activo por defecto al registrar una nueva marca
      const marcaData: MarcaDTO = { ...formValues, estado: true };
      this.marcaService.crear(marcaData).subscribe({
        next: () => {
          this.cerrarModal();
          // Retorna a la primera página para visualizar la creación reciente
          this.cargarMarcas({ first: 0, rows: this.rowsPerPage });
          this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Marca registrada correctamente' });
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la marca' });
        }
      });
    }
  }

  /**
   * @description Solicita confirmación al usuario para ejecutar la baja lógica de un fabricante.
   * @param marca Instancia del DTO a desactivar.
   */
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
            this.cargarMarcas({ first: this.firstItemIndex, rows: this.rowsPerPage });
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Marca desactivada' });
          },
          error: (err) => {
            console.error(err);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo desactivar la marca' });
          }
        });
      }
    });
  }

  /**
   * @description Solicita confirmación y reactiva un fabricante usando una operación de actualización (PUT).
   * @param marca Instancia del DTO a reactivar.
   */
  restaurarMarca(marca: MarcaDTO): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas reactivar la marca <b>${marca.nombre}</b>?`,
      header: 'Confirmar Restauración',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        const marcaRestaurada: MarcaDTO = { ...marca, estado: true };
        this.marcaService.actualizar(marca.id!, marcaRestaurada).subscribe({
          next: () => {
            this.cargarMarcas({ first: this.firstItemIndex, rows: this.rowsPerPage });
            this.messageService.add({ severity: 'success', summary: 'Restaurado', detail: 'Marca reactivada' });
          },
          error: (err) => {
            console.error(err);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo reactivar la marca' });
          }
        });
      }
    });
  }
}
