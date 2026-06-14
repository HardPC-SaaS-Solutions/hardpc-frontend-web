import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuario.service';
import { RolService } from '../../../maestros/services/rol.service';
import { TipoDocumentoService } from '../../../maestros/services/tipo-documento.service';
import { UsuarioDTO } from '../../../../core/models/usuario.dto';
import { RolDTO } from '../../../../core/models/rol.dto';
import { TipoDocumentoDTO } from '../../../../core/models/tipo-documento.dto';

import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CheckboxModule } from 'primeng/checkbox';

/**
 * @description Componente central para la gestión de Usuarios y Accesos en HardPC.
 * Administra el personal del sistema implementando validaciones dinámicas avanzadas,
 * control de estado del formulario, manejo de errores robusto y seguridad en contraseñas.
 */
@Component({
  selector: 'app-usuario-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, TableModule, ButtonModule,
    TagModule, DialogModule, InputTextModule, SelectModule, PasswordModule,
    ToastModule, ConfirmDialogModule, CheckboxModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './usuario-list.component.html'
})
export class UsuarioListComponent implements OnInit {

  /** Referencia nativa a la tabla PrimeNG para gestionar la paginación y refresco. */
  @ViewChild('dt') dt!: Table;

  // Inyección de dependencias
  private usuarioService = inject(UsuarioService);
  private rolService = inject(RolService);
  private tipoDocService = inject(TipoDocumentoService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // --- ESTADO DE LA TABLA Y COMBOS ---
  /** Colección de usuarios actuales renderizados en la tabla. */
  usuarios: UsuarioDTO[] = [];
  /** Colección de roles disponibles para el selector del formulario y filtros. */
  opcionesRol: RolDTO[] = [];
  /** Colección de tipos de documento disponibles para el selector del formulario. */
  opcionesTipoDoc: TipoDocumentoDTO[] = [];

  /** Total de registros disponibles en la base de datos para la paginación. */
  totalRecords: number = 0;
  /** Indicador de carga visual para la tabla. */
  loading: boolean = true;
  /** Cantidad de registros mostrados por página. */
  rowsPerPage: number = 10;

  /** Almacena el ID del rol seleccionado en el filtro superior de la tabla para consultas segmentadas. */
  filtroRol: number | null = null;

  // --- ESTADO DEL FORMULARIO Y MODAL ---
  /** Instancia del formulario reactivo para la gestión de datos del usuario. */
  usuarioForm!: FormGroup;
  /** Controla la visibilidad de la ventana modal. */
  modalVisible: boolean = false;
  /** Determina el contexto del modal: `true` para Edición, `false` para Creación. */
  modoEdicion: boolean = false;
  /** Almacena el ID del usuario en curso durante la edición. */
  idActual: number | null = null;

  // --- ESTADOS DE CONTROL Y EXPERIENCIA DE USUARIO (UX) ---
  /** Bloquea el botón de guardado para prevenir envíos múltiples de la misma petición. */
  guardando: boolean = false;
  /** Controla la habilitación visual y lógica del campo de contraseña en modo edición. */
  habilitarCambioPassword: boolean = false;
  /** Almacena la longitud exacta requerida para el documento de identidad seleccionado. */
  longitudDocRequerida: number | null = null;

  /**
   * @description Expresión regular para validación de contraseñas de alta seguridad.
   * Exige: 1 número, 1 minúscula, 1 mayúscula, sin espacios, y entre 8-20 caracteres.
   */
  private passwordPattern = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=\S+$).{8,20}$/;

  /**
   * @description Inicializa el componente construyendo el formulario y cargando los catálogos.
   */
  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarCombos();
  }

  /**
   * @description Construye el formulario reactivo aplicando validaciones de negocio base.
   * El campo 'numeroDocumento' inicia deshabilitado hasta que se seleccione un tipo.
   */
  private inicializarFormulario(): void {
    this.usuarioForm = this.fb.group({
      idTipoDocumento: [null, Validators.required],
      numeroDocumento: [{value: '', disabled: true}, [Validators.required]],
      nombres: ['', Validators.maxLength(100)],
      apellidos: ['', Validators.maxLength(100)],
      telefono: ['', [Validators.required, Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      direccion: ['', Validators.maxLength(255)],
      idRol: [null, Validators.required],
      username: ['', [Validators.required, Validators.maxLength(50)]],
      password: ['', [Validators.pattern(this.passwordPattern)]]
    });
  }

  /**
   * @description Carga los catálogos necesarios para los selectores.
   * Filtra estratégicamente el 'RUC' de los tipos de documento para el personal.
   */
  private cargarCombos(): void {
    this.rolService.listarParaCombo().subscribe(res => this.opcionesRol = res);

    this.tipoDocService.listarParaCombo().subscribe(res => {
      // Excluye el RUC ya que los empleados de HardPC se registran usualmente con DNI o CE
      this.opcionesTipoDoc = res.filter(doc => doc.abreviatura !== 'RUC');
    });
  }

  /**
   * @description Reacciona al cambio de Tipo de Documento en el formulario para aplicar
   * validaciones de longitud precisas de forma dinámica (ej. 8 para DNI).
   * @param event Evento emitido por el selector de PrimeNG.
   */
  onTipoDocumentoChange(event: any): void {
    const idSeleccionado = event.value;
    const tipoDoc = this.opcionesTipoDoc.find(t => t.id === idSeleccionado);
    const docControl = this.usuarioForm.get('numeroDocumento');

    if (tipoDoc) {
      this.longitudDocRequerida = tipoDoc.longitudExacta;
      docControl?.enable();
      docControl?.setValidators([
        Validators.required,
        Validators.minLength(tipoDoc.longitudExacta),
        Validators.maxLength(tipoDoc.longitudExacta)
      ]);
      docControl?.updateValueAndValidity();
    } else {
      docControl?.disable();
    }
  }

  /**
   * @description Activa o desactiva las validaciones y el control del campo contraseña.
   * Útil para que los administradores decidan si blanquean o no la clave de un usuario.
   */
  toggleCambioPassword(): void {
    const passControl = this.usuarioForm.get('password');
    if (this.habilitarCambioPassword) {
      passControl?.enable();
      passControl?.setValidators([Validators.required, Validators.pattern(this.passwordPattern)]);
    } else {
      passControl?.disable();
      passControl?.clearValidators();
    }
    passControl?.updateValueAndValidity();
  }

  /**
   * @description Carga el listado paginado de usuarios desde la API.
   * Delega la paginación y aplica inyección del filtro por rol directamente al backend.
   * @param event Objeto con los metadatos de paginación y filtros de la tabla.
   */
  cargarUsuarios(event: any): void {
    this.loading = true;
    const first = event.first ?? 0;
    const rows = event.rows ?? this.rowsPerPage;
    const page = first / rows;
    const buscar = event.globalFilter || '';

    this.usuarioService.listarPaginado(page, rows, buscar, this.filtroRol || undefined).subscribe({
      next: (res) => {
        this.usuarios = res.content;
        this.totalRecords = res.totalElements;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los usuarios' });
        this.loading = false;
      }
    });
  }

  /**
   * @description Prepara el modal en contexto de creación.
   * Reinicia bloqueos y hace obligatoria la definición de la contraseña inicial.
   */
  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.idActual = null;
    this.guardando = false;
    this.longitudDocRequerida = null;
    this.habilitarCambioPassword = true; // La contraseña inicial es obligatoria

    this.usuarioForm.reset();

    // Rehabilitación de campos base para nuevos registros
    this.usuarioForm.get('idTipoDocumento')?.enable();
    this.usuarioForm.get('numeroDocumento')?.disable(); // Se habilitará en 'onTipoDocumentoChange'
    this.usuarioForm.get('username')?.enable();

    this.usuarioForm.get('password')?.enable();
    this.usuarioForm.get('password')?.setValidators([Validators.required, Validators.pattern(this.passwordPattern)]);
    this.usuarioForm.get('password')?.updateValueAndValidity();

    this.modalVisible = true;
  }

  /**
   * @description Prepara el modal en contexto de edición con datos precargados.
   * Aplica reglas de inmutabilidad en la identidad del usuario y oculta la contraseña.
   * @param item Instancia del usuario a editar.
   */
  abrirModalEditar(item: UsuarioDTO): void {
    this.modoEdicion = true;
    this.idActual = item.id!;
    this.guardando = false;
    this.habilitarCambioPassword = false;

    // Configuración de validación dinámica inicial según el documento existente
    const tipoDoc = this.opcionesTipoDoc.find(t => t.id === item.idTipoDocumento);
    this.longitudDocRequerida = tipoDoc?.longitudExacta || null;

    this.usuarioForm.patchValue({
      idTipoDocumento: item.idTipoDocumento,
      numeroDocumento: item.numeroDocumento,
      nombres: item.nombres,
      apellidos: item.apellidos,
      telefono: item.telefono,
      email: item.email,
      direccion: item.direccion,
      idRol: item.idRol,
      username: item.username,
      password: ''
    });

    // Bloqueo de campos inmutables por reglas de seguridad y arquitectura
    this.usuarioForm.get('idTipoDocumento')?.disable();
    this.usuarioForm.get('numeroDocumento')?.disable();
    this.usuarioForm.get('username')?.disable();

    // La contraseña permanece deshabilitada hasta que se active el toggle
    this.usuarioForm.get('password')?.disable();
    this.usuarioForm.get('password')?.clearValidators();
    this.usuarioForm.get('password')?.updateValueAndValidity();

    this.modalVisible = true;
  }

  /**
   * @description Oculta la ventana modal descartando cualquier cambio.
   */
  cerrarModal(): void {
    this.modalVisible = false;
  }

  /**
   * @description Centraliza el manejo y traducción de errores devueltos por la API.
   * Extrae mensajes amigables para el usuario o detecta bloqueos de seguridad (403).
   * @param err Objeto de error HTTP.
   */
  private manejarErrorBackend(err: any): void {
    this.guardando = false;

    console.error('Log completo del error del backend:', err);

    let mensaje = 'Ocurrió un error al procesar la solicitud.';

    if (typeof err.error === 'string') {
      mensaje = err.error;
    } else if (err.error?.message || err.error?.detail) {
      mensaje = err.error.message || err.error.detail;
    } else if (err.status === 403) {
      mensaje = 'No tienes los permisos necesarios (ROLE_ADMIN) para esta acción.';
    }

    this.messageService.add({
      severity: 'error',
      summary: err.status === 403 ? 'Acceso Denegado' : 'Error de Servidor',
      detail: mensaje
    });
  }

  /**
   * @description Procesa la persistencia del formulario (POST/PUT).
   * Utiliza el extractor de valores en crudo para recuperar campos deshabilitados
   * e implementa prevención de doble envío.
   */
  guardar(): void {
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }

    this.guardando = true; // Bloqueo de UX para prevenir doble clic
    const formValues = this.usuarioForm.getRawValue();

    if (this.modoEdicion && this.idActual) {
      const existente = this.usuarios.find(x => x.id === this.idActual);
      const data: UsuarioDTO = { ...formValues, estado: existente?.estado };

      // Se omite el password del DTO si no se solicitó cambiarlo para no sobreescribir con nulos
      if (!this.habilitarCambioPassword) {
        delete data.password;
      }

      this.usuarioService.actualizar(this.idActual, data).subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarUsuarios(this.dt.createLazyLoadMetadata());
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Usuario actualizado' });
        },
        error: (err) => this.manejarErrorBackend(err)
      });
    } else {
      const data: UsuarioDTO = { ...formValues, estado: true };
      this.usuarioService.crear(data).subscribe({
        next: () => {
          this.cerrarModal();
          this.dt.reset();
          this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Usuario registrado' });
        },
        error: (err) => this.manejarErrorBackend(err)
      });
    }
  }

  /**
   * @description Solicita confirmación y ejecuta la desactivación lógica del usuario.
   * @param item Instancia del usuario a desactivar.
   */
  eliminar(item: UsuarioDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas desactivar al usuario <b>${item.username}</b>?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, desactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.usuarioService.eliminar(item.id!).subscribe({
          next: () => {
            this.cargarUsuarios(this.dt.createLazyLoadMetadata());
            this.messageService.add({ severity: 'info', summary: 'Desactivado', detail: 'Acceso revocado', icon: 'pi pi-user-minus' });
          },
          error: (err) => this.manejarErrorBackend(err)
        });
      }
    });
  }

  /**
   * @description Solicita confirmación y reactiva el acceso de un usuario utilizando
   * una petición PATCH optimizada.
   * @param item Instancia del usuario a reactivar.
   */
  restaurar(item: UsuarioDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas reactivar al usuario <b>${item.username}</b>?`,
      header: 'Confirmar Restauración',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.usuarioService.reactivar(item.id!).subscribe({
          next: () => {
            this.cargarUsuarios(this.dt.createLazyLoadMetadata());
            this.messageService.add({ severity: 'success', summary: 'Restaurado', detail: 'Acceso restaurado' });
          },
          error: (err) => this.manejarErrorBackend(err)
        });
      }
    });
  }

  /**
   * @description Utilidad visual para sanear el nombre del rol y mostrarlo sin tecnicismos en la tabla.
   * @param nombreEnum Identificador interno del rol (ej. ROLE_ADMIN).
   * @returns Cadena de texto limpia (ej. ADMIN).
   */
  formatearNombreRol(nombreEnum: string | undefined): string {
    if (!nombreEnum) return '';
    return nombreEnum.replace('ROLE_', '');
  }

  /**
   * @description Aplica el filtro por rol manteniendo el texto de búsqueda intacto.
   * Evita usar dt.reset() para no perder el estado del input de texto.
   */
  filtrarPorRol(): void {
    this.dt.first = 0; // Regresamos a la página 1 de forma manual
    this.cargarUsuarios(this.dt.createLazyLoadMetadata()); // Disparamos la carga con los filtros vigentes
  }
}
