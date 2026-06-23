import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { ClienteService } from '../../services/cliente.service';
import { ClienteDTO, TipoCliente } from '../../../../core/models/cliente.dto';
import { TipoDocumentoDTO } from '../../../../core/models/tipo-documento.dto';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';

/**
 * @description Componente de presentación (Dumb Component) para la creación y edición de Clientes.
 * Encapsula la lógica reactiva de validaciones dinámicas (mutando los campos requeridos
 * entre Persona Natural y Empresa) y restringe la longitud de los documentos de identidad
 * basándose en catálogos inyectados.
 */
@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule],
  templateUrl: './cliente-form.component.html'
})
export class ClienteFormComponent implements OnInit {

  // ======================================================================
  // --- COMUNICACIÓN CON EL COMPONENTE PADRE (SMART COMPONENT) ---
  // ======================================================================

  /** Payload del cliente a editar. Si es nulo, el componente asume el contexto de Creación. */
  @Input() clienteAEditar: ClienteDTO | null = null;

  /** Catálogo maestro inyectado por el padre para evitar peticiones HTTP duplicadas y optimizar el rendimiento. */
  @Input() tiposDocumentoMaster: TipoDocumentoDTO[] = [];

  /** Evento emitido tras una persistencia exitosa en la API, retornando el registro procesado. */
  @Output() onGuardado = new EventEmitter<ClienteDTO>();

  /** Evento emitido al abortar la operación, notificando al padre la necesidad de cerrar la vista. */
  @Output() onCancelar = new EventEmitter<void>();

  // --- INYECCIÓN DE DEPENDENCIAS ---
  private fb = inject(FormBuilder);
  private clienteService = inject(ClienteService);
  private messageService = inject(MessageService);

  // --- ESTADO INTERNO DEL FORMULARIO ---
  /** Instancia del formulario reactivo para el control y validación de datos. */
  clienteForm!: FormGroup;
  /** Bloquea los controles de envío para neutralizar envíos múltiples (Double Submit). */
  guardando: boolean = false;
  /** Bandera operativa que define si la transacción actual altera o crea un registro. */
  modoEdicion: boolean = false;

  /** Colección dinámica de documentos permitidos según el tipo de cliente seleccionado. */
  opcionesTipoDoc: TipoDocumentoDTO[] = [];
  /** Almacena la longitud exacta requerida para el documento de identidad actual. */
  longitudDocRequerida: number | null = null;

  /** Opciones estáticas para el selector de tipo de persona. */
  opcionesFormTipoCliente = [
    { label: 'Persona Natural', value: TipoCliente.PERSONA_NATURAL },
    { label: 'Persona Jurídica (Empresa)', value: TipoCliente.EMPRESA }
  ];

  /**
   * @description Inicializa el ciclo de vida del componente estructurando el formulario
   * y evaluando la presencia de datos preexistentes para activar el modo edición o creación.
   */
  ngOnInit(): void {
    this.inicializarFormulario();

    if (this.clienteAEditar) {
      this.modoEdicion = true;
      this.cargarDatosEdicion();
    } else {
      // Establece el estado de validaciones inicial para una nueva creación
      this.aplicarValidacionesDinamicas(TipoCliente.PERSONA_NATURAL);
    }
  }

  /**
   * @description Construye el árbol del formulario reactivo inicial.
   * Suscribe un observador a 'tipoCliente' para detonar mutaciones estructurales en tiempo real.
   */
  private inicializarFormulario(): void {
    this.clienteForm = this.fb.group({
      tipoCliente: [{ value: TipoCliente.PERSONA_NATURAL, disabled: false }, Validators.required],
      idTipoDocumento: [{ value: null, disabled: false }, Validators.required],
      numeroDocumento: [{ value: '', disabled: true }, [Validators.required]],
      nombres: ['', [Validators.required, Validators.maxLength(100)]],
      apellidos: ['', [Validators.required, Validators.maxLength(100)]],
      razonSocial: [{ value: '', disabled: true }, [Validators.maxLength(150)]],
      telefono: ['', Validators.maxLength(20)],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      direccion: ['', Validators.maxLength(255)]
    });

    this.clienteForm.get('tipoCliente')?.valueChanges.subscribe(tipo => {
      if (tipo) this.aplicarValidacionesDinamicas(tipo);
    });
  }

  /**
   * @description Modifica dinámicamente el estado y las validaciones de los controles.
   * Si es Persona Natural: Habilita nombres/apellidos y bloquea razón social.
   * Si es Empresa: Habilita razón social y purga nombres/apellidos.
   * @param tipo Valor del enum TipoCliente actualmente seleccionado.
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
   * @description Restringe los documentos de identidad disponibles en el selector
   * según la naturaleza jurídica del cliente (ej. Empresas solo pueden usar RUC).
   * Desvincula y purga selecciones inválidas previas.
   * @param tipo Valor del enum TipoCliente actualmente seleccionado.
   */
  private filtrarDocumentosPorTipo(tipo: TipoCliente): void {
    if (!this.tiposDocumentoMaster || this.tiposDocumentoMaster.length === 0) return;

    if (tipo === TipoCliente.PERSONA_NATURAL) {
      this.opcionesTipoDoc = this.tiposDocumentoMaster.filter(doc => doc.abreviatura !== 'RUC');
    } else {
      this.opcionesTipoDoc = this.tiposDocumentoMaster.filter(doc => doc.abreviatura === 'RUC');
    }

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
   * @description Reacciona a la selección de un documento para habilitar la captura numérica
   * aplicando validaciones de longitud estricta provistas por el catálogo maestro (ej. DNI = 8).
   * @param event Objeto de evento emitido por el selector de PrimeNG.
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
   * @description Extrae los valores del DTO recibido e hidrata los controles del formulario.
   * Aplica salvaguardas arquitectónicas inhabilitando identificadores clave.
   */
  private cargarDatosEdicion(): void {
    this.aplicarValidacionesDinamicas(this.clienteAEditar!.tipoCliente);

    const tipoDoc = this.tiposDocumentoMaster.find(t => t.id === this.clienteAEditar!.idTipoDocumento);
    this.longitudDocRequerida = tipoDoc?.longitudExacta || null;

    this.clienteForm.patchValue({
      tipoCliente: this.clienteAEditar!.tipoCliente,
      idTipoDocumento: this.clienteAEditar!.idTipoDocumento,
      numeroDocumento: this.clienteAEditar!.numeroDocumento,
      nombres: this.clienteAEditar!.nombres,
      apellidos: this.clienteAEditar!.apellidos,
      razonSocial: this.clienteAEditar!.razonSocial,
      telefono: this.clienteAEditar!.telefono,
      email: this.clienteAEditar!.email,
      direccion: this.clienteAEditar!.direccion
    });

    // ✨ Regla arquitectónica de inmutabilidad:
    // La identidad comercial/legal del cliente no puede ser alterada una vez consolidada en sistema.
    this.clienteForm.get('idTipoDocumento')?.disable();
    this.clienteForm.get('numeroDocumento')?.disable();
    this.clienteForm.get('tipoCliente')?.disable();
  }

  /**
   * @description Procesa y despacha la transacción del formulario hacia la API de clientes.
   * Extrae los valores inmutables valiéndose de `getRawValue()`.
   */
  guardar(): void {
    if (this.clienteForm.invalid) {
      this.clienteForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Formulario Incompleto', detail: 'Revise los campos marcados en rojo.' });
      return;
    }

    this.guardando = true;
    const formValues = this.clienteForm.getRawValue();

    if (this.modoEdicion && this.clienteAEditar?.id) {
      const data: ClienteDTO = { ...formValues, estado: this.clienteAEditar.estado };
      this.clienteService.actualizar(this.clienteAEditar.id, data).subscribe({
        next: (res) => {
          this.guardando = false;
          this.onGuardado.emit(res);
        },
        error: (err) => this.manejarErrorBackend(err)
      });
    } else {
      const data: ClienteDTO = { ...formValues, estado: true };
      this.clienteService.crear(data).subscribe({
        next: (res) => {
          this.guardando = false;
          this.onGuardado.emit(res);
        },
        error: (err) => this.manejarErrorBackend(err)
      });
    }
  }

  /**
   * @description Aborta el proceso de captura y notifica al componente contenedor.
   */
  cancelar(): void {
    this.onCancelar.emit();
  }

  /**
   * @description Motor de traducción de excepciones de red, mapeado a la estructura `ApiErrorResponse`.
   * Provee retroalimentación granular campo por campo ante infracciones de validación del backend.
   * @param err Objeto encapsulador del error HTTP.
   */
  private manejarErrorBackend(err: any): void {
    this.guardando = false;
    let titulo = 'Error del Servidor';
    let mensaje = 'Ocurrió un error inesperado al procesar la solicitud.';
    let severidad = 'error';

    if (err.status === 0) {
      titulo = 'Error de Conexión';
      mensaje = 'No se pudo conectar con el servidor.';
    } else if (err.error && err.error.message) {
      titulo = err.error.error || `Error ${err.status}`;
      mensaje = err.error.message;
      if (err.status === 409 || err.status === 400 || err.status === 404) severidad = 'warn';

      if (err.error.detalles && Array.isArray(err.error.detalles) && err.error.detalles.length > 0) {
        const erroresCampos = err.error.detalles.map((d: any) => `${d.campo}: ${d.mensaje}`).join(' | ');
        mensaje = `${mensaje} -> ${erroresCampos}`;
      }
    } else if (err.status === 403 || err.status === 401) {
      severidad = 'error';
      titulo = err.status === 401 ? 'No Autorizado' : 'Acceso Denegado';
      mensaje = 'No tienes los permisos necesarios.';
    }

    this.messageService.add({ severity: severidad as any, summary: titulo, detail: mensaje, life: 6000 });
  }
}
