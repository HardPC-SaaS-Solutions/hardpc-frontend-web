import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ClienteService } from '../../services/cliente.service';
import { TipoDocumentoService } from '../../../maestros/services/tipo-documento.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ClienteDTO, TipoCliente } from '../../../../core/models/cliente.dto';
import { TipoDocumentoDTO } from '../../../../core/models/tipo-documento.dto';

import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';

/**
 * @description Componente central para la gestión del directorio de Clientes en HardPC.
 * Administra personas naturales y jurídicas implementando validaciones dinámicas de formularios,
 * control estricto de tipos de documentos, filtros de búsqueda y exportación de datos.
 */
@Component({
  selector: 'app-cliente-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, TableModule, ButtonModule,
    TagModule, DialogModule, InputTextModule, SelectModule,
    ToastModule, ConfirmDialogModule, TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './cliente-list.component.html'
})
export class ClienteListComponent implements OnInit {

  /** Referencia nativa a la tabla PrimeNG para gestionar su ciclo de vida y estado (paginación/filtros). */
  @ViewChild('dt') dt!: Table;

  // Inyección de dependencias
  private clienteService = inject(ClienteService);
  private tipoDocService = inject(TipoDocumentoService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // --- ESTADO DE LA TABLA Y COMBOS ---
  /** Colección de clientes actuales renderizados en la tabla. */
  clientes: ClienteDTO[] = [];

  /** Catálogo maestro inmutable de tipos de documento obtenidos del backend. */
  tiposDocumentoMaster: TipoDocumentoDTO[] = [];
  /** Colección filtrada dinámicamente según el tipo de cliente seleccionado. */
  opcionesTipoDoc: TipoDocumentoDTO[] = [];

  /** Opciones cortas utilizadas para el filtro superior de la tabla. */
  opcionesFiltroTipoCliente = [
    { label: 'Natural', value: TipoCliente.PERSONA_NATURAL },
    { label: 'Empresa', value: TipoCliente.EMPRESA }
  ];

  /** Opciones descriptivas utilizadas en el selector del formulario modal. */
  opcionesFormTipoCliente = [
    { label: 'Persona Natural', value: TipoCliente.PERSONA_NATURAL },
    { label: 'Persona Jurídica (Empresa)', value: TipoCliente.EMPRESA }
  ];

  /** Total de registros disponibles en la base de datos para la paginación. */
  totalRecords: number = 0;
  /** Indicador de carga visual para la tabla. */
  loading: boolean = true;
  /** Cantidad de registros mostrados por página. */
  rowsPerPage: number = 10;

  // --- ESTADO DEL FORMULARIO Y MODAL ---
  /** Instancia del formulario reactivo para la gestión de datos. */
  clienteForm!: FormGroup;
  /** Controla la visibilidad de la ventana modal. */
  modalVisible: boolean = false;
  /** Determina el contexto del modal: `true` para Edición, `false` para Creación. */
  modoEdicion: boolean = false;
  /** Almacena el ID del cliente en curso durante la edición. */
  idActual: number | null = null;
  /** Bloquea el botón de guardado para prevenir dobles envíos. */
  guardando: boolean = false;
  /** Almacena la longitud exacta requerida para el documento de identidad seleccionado. */
  longitudDocRequerida: number | null = null;

  // --- ESTADO DE PERMISOS Y FILTROS ---
  /** Determina si el usuario actual tiene permisos (Admin/Supervisor) para eliminar registros. */
  puedeEliminar: boolean = false;
  /** Almacena el valor seleccionado en el filtro rápido por tipo de cliente de la tabla. */
  filtroTipoCliente: any = null;

  /**
   * @description Inicializa el componente, verifica permisos de usuario, construye el
   * formulario y carga los catálogos maestros necesarios.
   */
  ngOnInit(): void {
    this.puedeEliminar = this.authService.esAdminOSupervisor();
    this.inicializarFormulario();
    this.cargarCombos();
  }

  /**
   * @description Construye el formulario reactivo base. Suscribe eventos reactivos
   * al cambio del 'tipoCliente' para disparar mutaciones dinámicas en los demás controles.
   */
  private inicializarFormulario(): void {
    this.clienteForm = this.fb.group({
      tipoCliente: [TipoCliente.PERSONA_NATURAL, Validators.required],
      idTipoDocumento: [null, Validators.required],
      numeroDocumento: [{value: '', disabled: true}, [Validators.required]],

      nombres: ['', [Validators.required, Validators.maxLength(100)]],
      apellidos: ['', [Validators.required, Validators.maxLength(100)]],
      razonSocial: [{value: '', disabled: true}, [Validators.maxLength(150)]],

      telefono: ['', Validators.maxLength(20)],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      direccion: ['', Validators.maxLength(255)]
    });

    // Escucha cambios en el tipo de cliente para mutar el formulario en tiempo real
    this.clienteForm.get('tipoCliente')?.valueChanges.subscribe(tipo => {
      this.aplicarValidacionesDinamicas(tipo);
    });
  }

  /**
   * @description Modifica dinámicamente el estado y las validaciones del formulario.
   * Si es Persona Natural: Habilita nombres/apellidos, deshabilita y limpia razón social.
   * Si es Empresa: Habilita razón social, deshabilita y limpia nombres/apellidos.
   * @param tipo Valor actual del enum TipoCliente seleccionado.
   */
  private aplicarValidacionesDinamicas(tipo: TipoCliente): void {
    const nombresCtrl = this.clienteForm.get('nombres');
    const apellidosCtrl = this.clienteForm.get('apellidos');
    const razonSocialCtrl = this.clienteForm.get('razonSocial');

    if (tipo === TipoCliente.PERSONA_NATURAL) {
      nombresCtrl?.enable();
      nombresCtrl?.setValidators([Validators.required, Validators.maxLength(100)]);
      apellidosCtrl?.enable();
      apellidosCtrl?.setValidators([Validators.required, Validators.maxLength(100)]);

      razonSocialCtrl?.disable();
      razonSocialCtrl?.clearValidators();
      razonSocialCtrl?.setValue('');
    } else {
      razonSocialCtrl?.enable();
      razonSocialCtrl?.setValidators([Validators.required, Validators.maxLength(150)]);

      nombresCtrl?.disable();
      nombresCtrl?.clearValidators();
      nombresCtrl?.setValue('');
      apellidosCtrl?.disable();
      apellidosCtrl?.clearValidators();
      apellidosCtrl?.setValue('');
    }

    nombresCtrl?.updateValueAndValidity();
    apellidosCtrl?.updateValueAndValidity();
    razonSocialCtrl?.updateValueAndValidity();

    this.filtrarDocumentosPorTipo(tipo);
  }

  /**
   * @description Restringe los documentos de identidad disponibles según el tipo de cliente.
   * Empresa solo puede usar RUC. Persona Natural puede usar cualquier otro (DNI, CE, etc.).
   * @param tipo Valor actual del enum TipoCliente seleccionado.
   */
  private filtrarDocumentosPorTipo(tipo: TipoCliente): void {
    if (!this.tiposDocumentoMaster || this.tiposDocumentoMaster.length === 0) return;

    if (tipo === TipoCliente.PERSONA_NATURAL) {
      this.opcionesTipoDoc = this.tiposDocumentoMaster.filter(doc => doc.abreviatura !== 'RUC');
    } else {
      this.opcionesTipoDoc = this.tiposDocumentoMaster.filter(doc => doc.abreviatura === 'RUC');
    }

    // Valida si el documento previamente seleccionado sigue siendo válido bajo el nuevo filtro
    const idSeleccionado = this.clienteForm.get('idTipoDocumento')?.value;
    if (idSeleccionado) {
      const sigueSiendoValido = this.opcionesTipoDoc.some(doc => doc.id === idSeleccionado);
      if (!sigueSiendoValido) {
        this.clienteForm.get('idTipoDocumento')?.setValue(null);
        this.clienteForm.get('numeroDocumento')?.setValue('');
        this.clienteForm.get('numeroDocumento')?.disable();
        this.longitudDocRequerida = null;
      }
    }
  }

  /**
   * @description Carga el catálogo maestro de tipos de documento y dispara
   * el filtro inicial basado en el valor por defecto del formulario.
   */
  private cargarCombos(): void {
    this.tipoDocService.listarParaCombo().subscribe(res => {
      this.tiposDocumentoMaster = res;
      this.filtrarDocumentosPorTipo(this.clienteForm.get('tipoCliente')?.value);
    });
  }

  /**
   * @description Reacciona a la selección de un tipo de documento para habilitar
   * la entrada del número de documento aplicando su longitud exacta como validación (ej. DNI = 8).
   * @param event Objeto de evento emitido por el componente select.
   */
  onTipoDocumentoChange(event: any): void {
    const idSeleccionado = event.value;
    const tipoDoc = this.tiposDocumentoMaster.find(t => t.id === idSeleccionado);
    const docControl = this.clienteForm.get('numeroDocumento');

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
   * @description Carga el listado paginado de clientes inyectando búsquedas y filtros de cabecera.
   * @param event Objeto con los metadatos de paginación de PrimeNG.
   */
  cargarClientes(event: any): void {
    this.loading = true;
    const first = event.first ?? 0;
    const rows = event.rows ?? this.rowsPerPage;
    const page = first / rows;
    const buscar = event.globalFilter || '';

    this.clienteService.listarPaginado(page, rows, buscar, this.filtroTipoCliente || undefined).subscribe({
      next: (res) => {
        this.clientes = res.content;
        this.totalRecords = res.totalElements;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los clientes' });
        this.loading = false;
      }
    });
  }

  /**
   * @description Reinicia la tabla a la primera página y recarga los datos
   * al momento de aplicar un filtro rápido desde la cabecera (Natural/Empresa).
   */
  filtrarPorTipoCabecera(): void {
    this.dt.first = 0;
    this.cargarClientes(this.dt.createLazyLoadMetadata());
  }

  /**
   * @description Exporta la vista actual de clientes a formato CSV garantizando la
   * atomicidad de los datos. Mapea la información consolidando las diferencias
   * entre Personas Naturales y Empresas.
   */
  exportarDatos(): void {
    if (!this.clientes || this.clientes.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Exportación', detail: 'No hay datos para exportar en esta página.' });
      return;
    }

    const cabeceras = [
      'Tipo Documento', 'Numero Documento', 'Tipo Cliente', 'Nombres',
      'Apellidos', 'Razon Social', 'Telefono', 'Email', 'Direccion', 'Estado'
    ];

    const filas = this.clientes.map(c => {
      const tipo = this.esPersonaJuridica(c.tipoCliente) ? 'Persona Jurídica (Empresa)' : 'Persona Natural';
      const estado = c.estado ? 'Activo' : 'Inactivo';

      return [
        c.abreviaturaTipoDocumento || '',
        c.numeroDocumento || '',
        tipo,
        c.nombres || '',
        c.apellidos || '',
        c.razonSocial || '',
        c.telefono || '',
        c.email || '',
        c.direccion || '',
        estado
      ];
    });

    const contenidoCSV = [
      cabeceras.join(','),
      ...filas.map(fila => fila.map(campo => `"${campo}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Listado_Clientes_HardPC.csv';
    link.click();
    URL.revokeObjectURL(url);

    this.messageService.add({ severity: 'success', summary: 'Exportación', detail: 'Archivo CSV generado con éxito' });
  }

  /**
   * @description Prepara y despliega el modal en contexto de creación.
   * Inicializa el formulario como Persona Natural y bloquea campos dependientes.
   */
  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.idActual = null;
    this.guardando = false;
    this.longitudDocRequerida = null;

    this.clienteForm.reset({ tipoCliente: TipoCliente.PERSONA_NATURAL });

    this.clienteForm.get('tipoCliente')?.enable();
    this.clienteForm.get('idTipoDocumento')?.enable();
    this.clienteForm.get('numeroDocumento')?.disable();

    this.aplicarValidacionesDinamicas(TipoCliente.PERSONA_NATURAL);

    this.modalVisible = true;
  }

  /**
   * @description Prepara el modal en contexto de edición con datos precargados.
   * Aplica la inmutabilidad arquitectónica: Identidad (Tipo de Cliente, Doc, Número)
   * no pueden ser modificados una vez registrados.
   * @param item Instancia del DTO del cliente a editar.
   */
  abrirModalEditar(item: ClienteDTO): void {
    this.modoEdicion = true;
    this.idActual = item.id!;
    this.guardando = false;

    this.aplicarValidacionesDinamicas(item.tipoCliente);

    const tipoDoc = this.tiposDocumentoMaster.find(t => t.id === item.idTipoDocumento);
    this.longitudDocRequerida = tipoDoc?.longitudExacta || null;

    this.clienteForm.patchValue({
      tipoCliente: item.tipoCliente,
      idTipoDocumento: item.idTipoDocumento,
      numeroDocumento: item.numeroDocumento,
      nombres: item.nombres,
      apellidos: item.apellidos,
      razonSocial: item.razonSocial,
      telefono: item.telefono,
      email: item.email,
      direccion: item.direccion
    });

    // REGLA DE NEGOCIO: La identidad legal es inmutable en edición
    this.clienteForm.get('idTipoDocumento')?.disable();
    this.clienteForm.get('numeroDocumento')?.disable();
    this.clienteForm.get('tipoCliente')?.disable();

    this.modalVisible = true;
  }

  /**
   * @description Oculta la ventana modal descartando cualquier cambio.
   */
  cerrarModal(): void {
    this.modalVisible = false;
  }

  /**
   * @description Centraliza el manejo de excepciones devueltas por la API,
   * proporcionando feedback amigable al usuario final.
   * @param err Objeto de error HTTP.
   */
  private manejarErrorBackend(err: any): void {
    this.guardando = false;
    console.error('Error del backend:', err);
    let mensaje = 'Ocurrió un error al procesar la solicitud.';
    if (typeof err.error === 'string') mensaje = err.error;
    else if (err.error?.message || err.error?.detail) mensaje = err.error.message || err.error.detail;
    else if (err.status === 403) mensaje = 'No tienes los permisos necesarios para esta acción.';

    this.messageService.add({ severity: 'error', summary: err.status === 403 ? 'Acceso Denegado' : 'Error de Servidor', detail: mensaje });
  }

  /**
   * @description Persiste la información del formulario (POST/PUT).
   * Valida integridad y bloquea la UI (guardando) para evitar conflictos de red.
   */
  guardar(): void {
    if (this.clienteForm.invalid) {
      this.clienteForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Incompleto',
        detail: 'Revise los campos marcados en rojo antes de guardar.'
      });
      return;
    }

    this.guardando = true;
    const formValues = this.clienteForm.getRawValue();

    if (this.modoEdicion && this.idActual) {
      const existente = this.clientes.find(x => x.id === this.idActual);
      const data: ClienteDTO = { ...formValues, estado: existente?.estado };

      this.clienteService.actualizar(this.idActual, data).subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarClientes(this.dt.createLazyLoadMetadata());
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Cliente actualizado' });
        },
        error: (err) => this.manejarErrorBackend(err)
      });
    } else {
      const data: ClienteDTO = { ...formValues, estado: true };
      this.clienteService.crear(data).subscribe({
        next: () => {
          this.cerrarModal();
          this.dt.reset();
          this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Cliente registrado' });
        },
        error: (err) => this.manejarErrorBackend(err)
      });
    }
  }

  /**
   * @description Solicita confirmación y ejecuta la desactivación lógica del cliente.
   * @param item Instancia del cliente a desactivar.
   */
  eliminar(item: ClienteDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas desactivar al cliente <b>${item.nombres || item.razonSocial}</b>?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, desactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.clienteService.eliminar(item.id!).subscribe({
          next: () => {
            this.cargarClientes(this.dt.createLazyLoadMetadata());
            this.messageService.add({ severity: 'info', summary: 'Desactivado', detail: 'Cliente desactivado' });
          },
          error: (err) => this.manejarErrorBackend(err)
        });
      }
    });
  }

  /**
   * @description Solicita confirmación y reactiva un cliente previamente desactivado
   * mediante el uso del endpoint optimizado PATCH.
   * @param item Instancia del cliente a reactivar.
   */
  restaurar(item: ClienteDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas reactivar al cliente <b>${item.nombres || item.razonSocial}</b>?`,
      header: 'Confirmar Restauración',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.clienteService.reactivar(item.id!).subscribe({
          next: () => {
            this.cargarClientes(this.dt.createLazyLoadMetadata());
            this.messageService.add({ severity: 'success', summary: 'Restaurado', detail: 'Cliente reactivado' });
          },
          error: (err) => this.manejarErrorBackend(err)
        });
      }
    });
  }

  /**
   * @description Utilidad para verificar rápidamente el tipo de cliente en la vista.
   * @param tipo Valor del enum TipoCliente a evaluar.
   * @returns Verdadero si es empresa, falso en caso contrario.
   */
  esPersonaJuridica(tipo: string): boolean {
    return tipo === 'EMPRESA';
  }
}
