import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MarcaService } from '../../services/marca.service';
import { MarcaDTO } from '../../../../core/models/marca.dto';

// Módulos de PrimeNG
import { TableModule, Table } from 'primeng/table';
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
 * Administra el catálogo de fabricantes (ej. Asus, Kingston, Intel) con control
 * avanzado del estado de la tabla (paginación/filtros) mediante ViewChild.
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
  /** Referencia nativa a la instancia de la tabla PrimeNG para gestionar su ciclo de vida. */
  @ViewChild('dt') dt!: Table;

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
   */
  private inicializarFormulario(): void {
    this.marcaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      logoUrl: ['', [Validators.maxLength(500)]]
    });
  }

  /**
   * @description Carga el listado paginado de marcas desde la API.
   * Delegando el cálculo de paginación a los metadatos dinámicos de PrimeNG.
   * @param event Objeto de evento emitido por la tabla PrimeNG.
   */
  cargarMarcas(event: any): void {
    this.loading = true;

    const first = event.first ?? 0;
    const rows = event.rows ?? this.rowsPerPage;
    const page = first / rows;
    const buscar = event.globalFilter || '';

    this.marcaService.listarPaginado(page, rows, buscar).subscribe({
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
   * @description Configura y despliega el modal en contexto de edición.
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
   * @description Oculta la ventana modal sin ejecutar cambios.
   */
  cerrarModal(): void {
    this.modalVisible = false;
  }

  /**
   * @description Procesa la persistencia de datos del formulario.
   * Aplica actualización o creación conservando el estado exacto de la tabla (UI).
   */
  guardarMarca(): void {
    if (this.marcaForm.invalid) {
      this.marcaForm.markAllAsTouched();
      return;
    }

    const formValues = this.marcaForm.value;

    if (this.modoEdicion && this.idMarcaActual) {
      const marcaExistente = this.marcas.find(m => m.id === this.idMarcaActual);
      const marcaData: MarcaDTO = { ...formValues, estado: marcaExistente?.estado };

      this.marcaService.actualizar(this.idMarcaActual, marcaData).subscribe({
        next: () => {
          this.cerrarModal();
          // Congela la vista de la tabla recargando con los metadatos actuales
          this.cargarMarcas(this.dt.createLazyLoadMetadata());
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Marca actualizada correctamente' });
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar la marca' });
        }
      });
    } else {
      const marcaData: MarcaDTO = { ...formValues, estado: true };
      this.marcaService.crear(marcaData).subscribe({
        next: () => {
          this.cerrarModal();
          // Limpia la tabla y retorna a la página 1 para evidenciar la creación
          this.dt.reset();
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
   * Modificado para emitir una notificación tipo "info" con ícono de papelera.
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
            // Mantiene el bloque de paginación activo
            this.cargarMarcas(this.dt.createLazyLoadMetadata());
            this.messageService.add({
              severity: 'info',
              summary: 'Eliminado',
              detail: 'Marca desactivada correctamente',
              icon: 'pi pi-trash'
            });
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
            // Mantiene el bloque de paginación activo
            this.cargarMarcas(this.dt.createLazyLoadMetadata());
            this.messageService.add({ severity: 'success', summary: 'Restaurado', detail: 'Marca reactivada correctamente' });
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
