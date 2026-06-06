import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RolService } from '../../services/rol.service';
import { RolDTO } from '../../../../core/models/rol.dto';

// Módulos PrimeNG
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

/**
 * @description Componente central para la gestión de Roles en el ERP de HardPC.
 * Administra los niveles de acceso del personal, mapeando las enumeraciones de
 * seguridad del backend (Spring Security) a una interfaz amigable.
 */
@Component({
  selector: 'app-rol-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, TableModule, ButtonModule,
    TagModule, DialogModule, InputTextModule, TextareaModule,
    SelectModule, ToastModule, ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './rol-list.component.html'
})
export class RolListComponent implements OnInit {

  /** Referencia nativa a la tabla PrimeNG para gestionar su paginación y refresco sin perder estado. */
  @ViewChild('dt') dt!: Table;

  // Inyección de dependencias
  private rolService = inject(RolService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // --- ESTADO DE LA TABLA ---
  /** Colección de roles actuales renderizados en la tabla. */
  roles: RolDTO[] = [];
  /** Total de registros disponibles para la paginación. */
  totalRecords: number = 0;
  /** Indicador de carga visual para la tabla. */
  loading: boolean = true;
  /** Cantidad de registros mostrados por página. */
  rowsPerPage: number = 10;

  // --- ESTADO DEL FORMULARIO Y MODAL ---
  /** Instancia del formulario reactivo para la gestión de roles. */
  rolForm!: FormGroup;
  /** Controla la visibilidad de la ventana modal. */
  modalVisible: boolean = false;
  /** Determina el contexto del modal: `true` para Edición, `false` para Creación. */
  modoEdicion: boolean = false;
  /** Almacena el ID del rol en curso durante la edición. */
  idActual: number | null = null;

  /** * Diccionario de roles disponibles cargados desde el backend,
   * estructurado para consumirse en selectores de PrimeNG (p-select).
   */
  opcionesRol: { label: string, value: string }[] = [];

  /**
   * @description Inicializa el componente construyendo el formulario y precargando
   * las opciones de roles estandarizados desde el backend.
   */
  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarOpcionesRol();
  }

  /**
   * @description Construye el formulario reactivo aplicando validaciones de longitud y obligatoriedad.
   */
  private inicializarFormulario(): void {
    this.rolForm = this.fb.group({
      nombre: ['', [Validators.required]],
      descripcion: ['', [Validators.maxLength(255)]]
    });
  }

  /**
   * @description Método utilitario de UI/UX para sanear la presentación del rol.
   * Elimina el prefijo técnico de Spring Security para mostrar una etiqueta limpia (ej. ROLE_ADMIN -> ADMIN).
   * @param nombreEnum Nombre estricto del rol procedente de la base de datos.
   * @returns Nombre formateado para la vista.
   */
  formatearNombreRol(nombreEnum: string): string {
    if (!nombreEnum) return '';
    return nombreEnum.replace('ROLE_', '');
  }

  /**
   * @description Carga el listado paginado de roles desde la API delegando los
   * metadatos a la tabla (LazyLoad).
   * @param event Objeto con los metadatos de paginación y filtrado.
   */
  cargarRoles(event: any): void {
    this.loading = true;

    const first = event.first ?? 0;
    const rows = event.rows ?? this.rowsPerPage;
    const page = first / rows;
    const buscar = event.globalFilter || '';

    this.rolService.listarPaginado(page, rows, buscar).subscribe({
      next: (response) => {
        this.roles = response.content;
        this.totalRecords = response.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los roles' });
        this.loading = false;
      }
    });
  }

  /**
   * @description Prepara el modal para crear un nuevo rol.
   * Habilita el control 'nombre' ya que al crear sí es necesario definir la enumeración principal.
   */
  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.idActual = null;
    this.rolForm.reset();
    this.rolForm.get('nombre')?.enable();
    this.modalVisible = true;
  }

  /**
   * @description Prepara el modal en contexto de edición.
   * Por reglas de negocio (seguridad), el nombre del rol se bloquea (disable)
   * para evitar inconsistencias con los permisos preconfigurados en el backend.
   * @param item Instancia del rol a editar.
   */
  abrirModalEditar(item: RolDTO): void {
    this.modoEdicion = true;
    this.idActual = item.id!;
    this.rolForm.patchValue({
      nombre: item.nombre,
      descripcion: item.descripcion
    });
    this.rolForm.get('nombre')?.disable();
    this.modalVisible = true;
  }

  /**
   * @description Oculta la ventana modal sin aplicar cambios.
   */
  cerrarModal(): void {
    this.modalVisible = false;
  }

  /**
   * @description Procesa la persistencia del formulario (POST/PUT).
   * Mantiene el estado de la tabla utilizando los metadatos actualizados de ViewChild.
   */
  guardar(): void {
    if (this.rolForm.invalid) {
      this.rolForm.markAllAsTouched();
      return;
    }

    // getRawValue() captura todos los campos, incluso los que están disable().
    const formValues = this.rolForm.getRawValue();

    if (this.modoEdicion && this.idActual) {
      const existente = this.roles.find(x => x.id === this.idActual);
      const data: RolDTO = { ...formValues, estado: existente?.estado };

      this.rolService.actualizar(this.idActual, data).subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarRoles(this.dt.createLazyLoadMetadata()); // Mantiene página y estado
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Rol actualizado correctamente' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar' })
      });
    } else {
      const data: RolDTO = { ...formValues, estado: true };
      this.rolService.crear(data).subscribe({
        next: () => {
          this.cerrarModal();
          this.dt.reset(); // Va a la página 1 para evidenciar el nuevo registro
          this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Rol registrado correctamente' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear' })
      });
    }
  }

  /**
   * @description Solicita confirmación y ejecuta la desactivación lógica del rol.
   * Utiliza el nombre formateado para que el mensaje sea amigable al usuario.
   * @param item Instancia del rol a desactivar.
   */
  eliminar(item: RolDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas desactivar el rol <b>${this.formatearNombreRol(item.nombre)}</b>?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, desactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.rolService.eliminar(item.id!).subscribe({
          next: () => {
            this.cargarRoles(this.dt.createLazyLoadMetadata());
            this.messageService.add({
              severity: 'info',
              summary: 'Desactivado',
              detail: 'El rol ha sido movido a la papelera',
              icon: 'pi pi-trash'
            });
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo desactivar' })
        });
      }
    });
  }

  /**
   * @description Solicita confirmación y reactiva un rol previamente desactivado.
   * @param item Instancia del rol a reactivar.
   */
  restaurar(item: RolDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas reactivar el rol <b>${this.formatearNombreRol(item.nombre)}</b>?`,
      header: 'Confirmar Restauración',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        const data: RolDTO = { ...item, estado: true };
        this.rolService.actualizar(item.id!, data).subscribe({
          next: () => {
            this.cargarRoles(this.dt.createLazyLoadMetadata());
            this.messageService.add({ severity: 'success', summary: 'Restaurado', detail: 'Rol reactivado' });
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo reactivar' })
        });
      }
    });
  }

  /**
   * @description Recupera el listado de Enums definidos en Spring Boot para estructurarlos
   * como opciones seleccionables en el formulario de creación/edición.
   */
  cargarOpcionesRol(): void {
    this.rolService.listarRolesEnum().subscribe({
      next: (roles) => {
        // Mapea la respuesta a la estructura requerida por PrimeNG
        this.opcionesRol = roles.map(rol => ({
          label: this.formatearNombreRol(rol), // UI limpia (ej. "ADMIN")
          value: rol                           // Valor real backend (ej. "ROLE_ADMIN")
        }));
      },
      error: (err) => console.error('Error al cargar opciones de roles', err)
    });
  }
}
