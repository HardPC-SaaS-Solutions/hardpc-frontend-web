import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { ProductoService } from '../../services/producto.service';
import { ProductoDTO } from '../../../../core/models/producto.dto';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';

/**
 * @description Componente de presentación (Dumb Component) para el formulario de Productos.
 * Responsable exclusivo de la captura, validación reactiva y emisión de datos.
 * Recibe catálogos pre-cargados por su componente contenedor para optimizar el rendimiento de red.
 */
@Component({
  selector: 'app-producto-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, ButtonModule,
    InputTextModule, InputNumberModule, SelectModule, CheckboxModule
  ],
  templateUrl: './producto-form.component.html'
})
export class ProductoFormComponent implements OnInit {

  // ======================================================================
  // --- COMUNICACIÓN CON EL COMPONENTE PADRE (SMART COMPONENT) ---
  // ======================================================================

  /** DTO del producto a editar. Si es nulo, el formulario opera en modo 'Creación'. */
  @Input() productoAEditar: ProductoDTO | null = null;

  /** Catálogo de clasificaciones inyectado para evitar peticiones HTTP duplicadas. */
  @Input() opcionesCategoria: any[] = [];

  /** Catálogo de firmas comerciales inyectado en memoria. */
  @Input() opcionesMarca: any[] = [];

  /** Catálogo de métricas logísticas inyectado en memoria. */
  @Input() opcionesUM: any[] = [];

  /** Emite el registro procesado (creado o actualizado) tras una transacción exitosa. */
  @Output() onGuardado = new EventEmitter<ProductoDTO>();

  /** Notifica al contenedor que el usuario decidió abortar la operación. */
  @Output() onCancelar = new EventEmitter<void>();

  // --- INYECCIÓN DE DEPENDENCIAS ---
  private fb = inject(FormBuilder);
  private productoService = inject(ProductoService);
  private messageService = inject(MessageService);

  // --- ESTADO INTERNO ---
  /** Gestor reactivo de las validaciones y valores del formulario. */
  productoForm!: FormGroup;
  /** Bloqueo visual y lógico para evitar el doble envío de formularios (Double Submit). */
  guardando: boolean = false;
  /** Bandera que define el flujo transaccional: `true` = PUT (Edición), `false` = POST (Creación). */
  modoEdicion: boolean = false;

  /**
   * @description Inicializa la estructura de controles y evalúa el payload de entrada
   * para determinar si se debe transicionar al modo edición.
   */
  ngOnInit(): void {
    this.inicializarFormulario();

    if (this.productoAEditar) {
      this.modoEdicion = true;
      this.cargarDatosEdicion();
    }
  }

  /**
   * @description Construye el árbol del formulario reactivo imponiendo las reglas de negocio
   * (ej. precios y garantías no pueden ser negativos, descripciones con longitud máxima).
   */
  private inicializarFormulario(): void {
    this.productoForm = this.fb.group({
      codigoSku: ['', [Validators.required, Validators.maxLength(50)]],
      descripcion: ['', [Validators.required, Validators.maxLength(255)]],
      precioUsd: [null, [Validators.required, Validators.min(0.01)]],
      mesesGarantia: [12, [Validators.required, Validators.min(0)]],
      esSerializado: [false, Validators.required],
      idMarca: [null, Validators.required],
      idCategoria: [null, Validators.required],
      idUnidadMedida: [null, Validators.required],
      imagenUrl: ['', Validators.maxLength(255)]
    });
  }

  /**
   * @description Extrae los valores del DTO recibido e hidrata los controles del formulario.
   * Aplica salvaguardas arquitectónicas inhabilitando identificadores clave.
   */
  private cargarDatosEdicion(): void {
    this.productoForm.patchValue({
      codigoSku: this.productoAEditar!.codigoSku,
      descripcion: this.productoAEditar!.descripcion,
      precioUsd: this.productoAEditar!.precioUsd,
      mesesGarantia: this.productoAEditar!.mesesGarantia,
      esSerializado: this.productoAEditar!.esSerializado,
      idMarca: this.productoAEditar!.idMarca,
      idCategoria: this.productoAEditar!.idCategoria,
      idUnidadMedida: this.productoAEditar!.idUnidadMedida,
      imagenUrl: this.productoAEditar!.imagenUrl
    });

    // ✨ Regla arquitectónica de inmutabilidad en edición:
    // El SKU (llave natural) y la naturaleza logística (Serializado vs Granel)
    // no pueden mutar una vez que el producto ya existe en el Kardex.
    this.productoForm.get('codigoSku')?.disable();
    this.productoForm.get('esSerializado')?.disable();
  }

  /**
   * @description Despacha la transacción hacia la API. Recupera los campos deshabilitados
   * utilizando `getRawValue()` para asegurar que el backend reciba el SKU original y el tipo de stock.
   */
  guardar(): void {
    if (this.productoForm.invalid) {
      this.productoForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Formulario Incompleto', detail: 'Revise los campos marcados en rojo.' });
      return;
    }

    this.guardando = true;
    const formValues = this.productoForm.getRawValue();

    if (this.modoEdicion && this.productoAEditar?.id) {
      const data: ProductoDTO = { ...formValues, estado: this.productoAEditar.estado };
      this.productoService.actualizar(this.productoAEditar.id, data).subscribe({
        next: (res) => {
          this.guardando = false;
          this.onGuardado.emit(res);
        },
        error: (err) => this.manejarErrorBackend(err)
      });
    } else {
      const data: ProductoDTO = { ...formValues, estado: true };
      this.productoService.crear(data).subscribe({
        next: (res) => {
          this.guardando = false;
          this.onGuardado.emit(res);
        },
        error: (err) => this.manejarErrorBackend(err)
      });
    }
  }

  /**
   * @description Aborta el proceso actual y notifica al componente contenedor para que cierre la vista.
   */
  cancelar(): void {
    this.onCancelar.emit();
  }

  /**
   * @description Interceptor transaccional de excepciones. Mapea la estructura estándar
   * `ApiErrorResponse` y el arreglo `FieldErrorDTO` para extraer notificaciones granulares
   * de las validaciones arrojadas por Spring Boot.
   * @param err Interfaz del error HTTP devuelto por el servicio subyacente.
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

      if (err.status === 409 || err.status === 400 || err.status === 404) severidad = 'warn';

      // Reconstruye visualmente los errores de campos (Constraints de Hibernate Validator)
      if (err.error.detalles && Array.isArray(err.error.detalles) && err.error.detalles.length > 0) {
        const erroresCampos = err.error.detalles.map((d: any) => `${d.campo}: ${d.mensaje}`).join(' | ');
        mensaje = `${mensaje} -> ${erroresCampos}`;
      }
    }
    else if (err.status === 403 || err.status === 401) {
      severidad = 'error';
      titulo = err.status === 401 ? 'No Autorizado' : 'Acceso Denegado';
      mensaje = 'No tienes los permisos necesarios para esta acción.';
    }

    this.messageService.add({ severity: severidad as any, summary: titulo, detail: mensaje, life: 6000 });
  }
}
