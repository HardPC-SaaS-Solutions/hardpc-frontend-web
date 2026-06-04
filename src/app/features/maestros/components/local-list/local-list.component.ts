import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { LocalService } from '../../services/local.service';
import { LocalDTO } from '../../../../core/models/local.dto';

// Módulos de PrimeNG
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

/**
 * @description Componente central para la gestión de locales en el sistema.
 * Administra las sucursales físicas (puntos de venta) de HardPC implementando
 * un control avanzado del estado de la tabla mediante ViewChild.
 */
@Component({
  selector: 'app-local-list',
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
  templateUrl: './local-list.component.html'
})
export class LocalListComponent implements OnInit {

  /** Referencia nativa a la instancia de la tabla PrimeNG para gestionar su paginación de forma directa. */
  @ViewChild('dt') dt!: Table;

  // Inyección de dependencias
  private localService = inject(LocalService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // --- ESTADO DE LA TABLA ---
  /** Colección de locales actuales renderizados en la tabla. */
  locales: LocalDTO[] = [];
  /** Total de registros disponibles en la base de datos para la paginación. */
  totalRecords = 0;
  /** Indicador de carga para la tabla de PrimeNG. */
  loading = true;
  /** Cantidad de registros mostrados por página. */
  rowsPerPage = 10;

  // --- ESTADO DEL FORMULARIO Y MODAL ---
  /** Instancia del formulario reactivo para la gestión de datos. */
  localForm!: FormGroup;
  /** Controla la visibilidad de la ventana modal. */
  modalVisible = false;
  /** Determina el contexto del modal: `true` para Edición, `false` para Creación. */
  modoEdicion = false;
  /** Almacena el ID del local en curso durante la edición. */
  idActual: number | null = null;

  /**
   * @description Inicializa el componente construyendo la estructura del formulario.
   */
  ngOnInit(): void {
    this.inicializarFormulario();
  }

  /**
   * @description Construye el formulario reactivo aplicando las validaciones del DTO.
   * El campo 'estado' se excluye para gestionarse de forma programática.
   */
  private inicializarFormulario(): void {
    this.localForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      direccion: ['', [Validators.required, Validators.maxLength(255)]],
      telefono: ['', [Validators.required, Validators.maxLength(20)]],
      fotoPortadaUrl: ['', [Validators.maxLength(255)]]
    });
  }

  /**
   * @description Carga el listado paginado de locales desde la API.
   * Delega el cálculo de paginación a los metadatos dinámicos proporcionados por PrimeNG.
   * @param event Objeto de evento emitido por la tabla PrimeNG.
   */
  cargarLocales(event: any): void {
    this.loading = true;

    const first = event.first ?? 0;
    const rows = event.rows ?? this.rowsPerPage;
    const page = first / rows;
    const buscar = event.globalFilter || '';

    this.localService.listarPaginado(page, rows, buscar).subscribe({
      next: (response) => {
        this.locales = response.content;
        this.totalRecords = response.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar locales:', err);
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los locales' });
      }
    });
  }

  /**
   * @description Prepara y despliega el modal en contexto de creación.
   */
  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.idActual = null;
    this.localForm.reset();
    this.modalVisible = true;
  }

  /**
   * @description Prepara y despliega el modal en contexto de edición.
   * @param local Instancia del DTO seleccionada en la tabla.
   */
  abrirModalEditar(local: LocalDTO): void {
    this.modoEdicion = true;
    this.idActual = local.id!;

    this.localForm.patchValue({
      nombre: local.nombre,
      direccion: local.direccion,
      telefono: local.telefono,
      fotoPortadaUrl: local.fotoPortadaUrl
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
   * Mantiene la tabla congelada en su vista actual (edición) o la reinicia (creación).
   */
  guardar(): void {
    if (this.localForm.invalid) {
      this.localForm.markAllAsTouched();
      return;
    }

    const data: LocalDTO = this.localForm.value;

    if (this.modoEdicion && this.idActual) {
      const existente = this.locales.find(x => x.id === this.idActual);
      data.estado = existente?.estado;

      this.localService.actualizar(this.idActual, data).subscribe({
        next: () => {
          this.cerrarModal();
          // Congela y recarga la tabla preservando la página y filtros actuales
          this.cargarLocales(this.dt.createLazyLoadMetadata());
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Local actualizado correctamente' });
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el local' });
        }
      });
    } else {
      data.estado = true;

      this.localService.crear(data).subscribe({
        next: () => {
          this.cerrarModal();
          // Reinicia el estado de la tabla, volviendo a la página 1
          this.dt.reset();
          this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Local registrado correctamente' });
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el local' });
        }
      });
    }
  }

  /**
   * @description Solicita confirmación y ejecuta la desactivación lógica de un local.
   * @param local Instancia del DTO a desactivar.
   */
  eliminar(local: LocalDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas desactivar el local <b>${local.nombre}</b>?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, desactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.localService.eliminar(local.id!).subscribe({
          next: () => {
            // Mantiene el bloque de paginación activo
            this.cargarLocales(this.dt.createLazyLoadMetadata());
            this.messageService.add({
              severity: 'info',
              summary: 'Eliminado',
              detail: 'Local desactivado correctamente',
              icon: 'pi pi-trash'
            });
          },
          error: (err) => {
            console.error(err);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo desactivar el local' });
          }
        });
      }
    });
  }

  /**
   * @description Solicita confirmación y reactiva un local previamente desactivado.
   * @param local Instancia del DTO a reactivar.
   */
  restaurar(local: LocalDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas reactivar el local <b>${local.nombre}</b>?`,
      header: 'Confirmar Restauración',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        const data: LocalDTO = { ...local, estado: true };
        this.localService.actualizar(local.id!, data).subscribe({
          next: () => {
            // Mantiene el bloque de paginación activo
            this.cargarLocales(this.dt.createLazyLoadMetadata());
            this.messageService.add({ severity: 'success', summary: 'Restaurado', detail: 'Local reactivado correctamente' });
          },
          error: (err) => {
            console.error(err);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo reactivar el local' });
          }
        });
      }
    });
  }
}
