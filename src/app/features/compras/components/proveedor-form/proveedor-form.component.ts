import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProveedorService } from '../../services/proveedor.service';
import { ProveedorDTO } from '../../../../core/models/proveedor.dto';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';

/**
 * @description Componente de formulario transaccional para la creación y edición de Proveedores.
 * Diseñado bajo una arquitectura desacoplada y reutilizable, se comunica de forma reactiva
 * con componentes contenedores mediante enlaces de datos unidireccionales y emisión de eventos.
 */
@Component({
  selector: 'app-proveedor-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule],
  templateUrl: './proveedor-form.component.html'
})
export class ProveedorFormComponent implements OnInit {

  // ======================================================================
  // --- COMUNICACIÓN CON EL COMPONENTE PADRE ---
  // ======================================================================

  /** Payload del proveedor a editar; si es nulo, el componente asume el contexto de Creación. */
  @Input() proveedorAEditar: ProveedorDTO | null = null;

  /** Evento emitido tras una persistencia exitosa en la API, retornando el registro actualizado. */
  @Output() onGuardado = new EventEmitter<ProveedorDTO>();

  /** Evento emitido al abortar la operación, notificando al padre la necesidad de cerrar el formulario. */
  @Output() onCancelar = new EventEmitter<void>();

  // --- INYECCIÓN DE DEPENDENCIAS MODERNA ---
  private fb = inject(FormBuilder);
  private proveedorService = inject(ProveedorService);
  private messageService = inject(MessageService);

  // --- ESTADO DEL FORMULARIO Y UX ---
  /** Instancia del formulario reactivo para el control y validación de datos. */
  proveedorForm!: FormGroup;
  /** Bloquea los controles de envío para neutralizar el doble clic (Double Submit). */
  guardando: boolean = false;
  /** Bandera operativa que define si la transacción actual altera o crea un registro. */
  modoEdicion: boolean = false;

  /**
   * @description Inicializa el ciclo de vida del componente estructurando el formulario
   * y evaluando la presencia de datos preexistentes para activar el modo edición.
   */
  ngOnInit(): void {
    this.inicializarFormulario();

    if (this.proveedorAEditar) {
      this.modoEdicion = true;
      this.cargarDatosEdicion();
    }
  }

  /**
   * @description Inicializa la estructura del formulario reactivo aplicando reglas de negocio formales.
   * Exige mediante expresiones regulares (Regex) que el RUC conste de exactamente 11 dígitos numéricos.
   */
  private inicializarFormulario(): void {
    this.proveedorForm = this.fb.group({
      ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      razonSocial: ['', [Validators.required, Validators.maxLength(150)]],
      nombreComercial: ['', [Validators.maxLength(150)]],
      direccion: ['', [Validators.required, Validators.maxLength(255)]],
      telefono: ['', [Validators.required, Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]]
    });
  }

  /**
   * @description Puebla el formulario reactivo con los datos del proveedor seleccionado.
   * Aplica la regla arquitectónica de inmutabilidad comercial: El RUC, al actuar como
   * identificador legal único ante el fisco, queda bloqueado para solo lectura durante la edición.
   */
  private cargarDatosEdicion(): void {
    this.proveedorForm.patchValue({
      ruc: this.proveedorAEditar!.ruc,
      razonSocial: this.proveedorAEditar!.razonSocial,
      nombreComercial: this.proveedorAEditar!.nombreComercial,
      direccion: this.proveedorAEditar!.direccion,
      telefono: this.proveedorAEditar!.telefono,
      email: this.proveedorAEditar!.email
    });

    this.proveedorForm.get('ruc')?.disable();
  }

  /**
   * @description Procesa y despacha la transacción del formulario (POST o PUT).
   * Valida la integridad de los datos, marca campos inválidos visualmente si falla y utiliza
   * `getRawValue()` para recuperar los valores de los controles deshabilitados (como el RUC).
   */
  guardar(): void {
    if (this.proveedorForm.invalid) {
      this.proveedorForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Formulario Incompleto', detail: 'Revise los campos en rojo.' });
      return;
    }

    this.guardando = true;
    const formValues = this.proveedorForm.getRawValue();

    if (this.modoEdicion && this.proveedorAEditar?.id) {
      const data: ProveedorDTO = { ...formValues, estado: this.proveedorAEditar.estado };
      this.proveedorService.actualizar(this.proveedorAEditar.id, data).subscribe({
        next: (res) => {
          this.guardando = false;
          this.onGuardado.emit(res);
        },
        error: (err) => this.manejarErrorBackend(err)
      });
    } else {
      const data: ProveedorDTO = { ...formValues, estado: true };
      this.proveedorService.crear(data).subscribe({
        next: (res) => {
          this.guardando = false;
          this.onGuardado.emit(res);
        },
        error: (err) => this.manejarErrorBackend(err)
      });
    }
  }

  /**
   * @description Notifica de forma reactiva al componente padre que la operación
   * ha sido cancelada por acción del usuario.
   */
  cancelar(): void {
    this.onCancelar.emit();
  }

  /**
   * @description Motor de excepciones unificado de alta fidelidad. Intercepta los errores del backend
   * y los traduce a mensajes legibles e interactivos. Extrae dinámicamente las anomalías por campo
   * enviadas a través del `FieldErrorDTO` de Spring Boot para un diagnóstico preciso en la interfaz.
   * @param err Objeto encapsulador del error HTTP interceptado.
   */
  private manejarErrorBackend(err: any): void {
    this.guardando = false;
    console.error('Error capturado del backend:', err);

    let titulo = 'Error del Servidor';
    let mensaje = 'Ocurrió un error inesperado al procesar la solicitud.';
    let severidad = 'error';

    if (err.status === 0) {
      titulo = 'Error de Conexión';
      mensaje = 'No se pudo conectar con el servidor. Verifique su conexión o intente más tarde.';
    }
    else if (err.error && err.error.message) {
      titulo = err.error.error || `Error ${err.status}`;
      mensaje = err.error.message;

      if (err.status === 409 || err.status === 400 || err.status === 404) {
        severidad = 'warn';
      }

      // Mapeo atómico de las violaciones de restricciones de Spring Boot Validation (@Valid)
      if (err.error.detalles && Array.isArray(err.error.detalles) && err.error.detalles.length > 0) {
        const erroresCampos = err.error.detalles.map((d: any) => `${d.campo}: ${d.mensaje}`).join(' | ');
        mensaje = `${mensaje} -> ${erroresCampos}`;
      }
    }
    else if (err.status === 403 || err.status === 401) {
      severidad = 'error';
      titulo = err.status === 401 ? 'No Autorizado' : 'Acceso Denegado';
      mensaje = 'No tienes los permisos necesarios o tu sesión ha expirado.';
    }

    this.messageService.add({
      severity: severidad as any,
      summary: titulo,
      detail: mensaje,
      life: 6000
    });
  }
}
