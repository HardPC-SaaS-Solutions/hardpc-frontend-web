import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { ProveedorFormComponent } from '../proveedor-form/proveedor-form.component';
// ✨ IMPORTAMOS EL NUEVO COMPONENTE FORMULARIO DE PRODUCTO
import { ProductoFormComponent } from '../../../inventario/components/producto-form/producto-form.component';

import { IngresoCompraService } from '../../services/ingreso-compra.service';
import { ProveedorService } from '../../services/proveedor.service';
import { LocalService } from '../../../maestros/services/local.service';
import { ProductoService } from '../../../inventario/services/producto.service';
// ✨ IMPORTAMOS LOS SERVICIOS MAESTROS PARA EL MODAL DE PRODUCTO
import { CategoriaService } from '../../../maestros/services/categoria.service';
import { MarcaService } from '../../../maestros/services/marca.service';
import { UnidadMedidaService } from '../../../maestros/services/unidad-medida.service';

import { IngresoCompraRequestDTO } from '../../../../core/models/ingreso-compra-request.dto';
import { LocalDTO } from '../../../../core/models/local.dto';
import { ProveedorDTO } from '../../../../core/models/proveedor.dto';
import { ProductoDTO } from '../../../../core/models/producto.dto'; // ✨ IMPORTADO PARA EL TIPADO

import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';

/**
 * @description Componente transaccional avanzado para el registro de Ingresos por Compra.
 * Implementa el patrón Maestro-Detalle. Integra calculadoras financieras, validaciones de
 * comprobantes de pago, captura de números de serie y características "Quick-Add"
 * para registrar catálogos faltantes (Proveedores/Productos) sobre la marcha.
 */
@Component({
  selector: 'app-ingreso-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule, ButtonModule, SelectModule,
    InputTextModule, InputNumberModule, DatePickerModule, TableModule, ToastModule,
    DialogModule, AutoCompleteModule, TagModule,
    ProveedorFormComponent,
    ProductoFormComponent // ✨ INYECTAMOS EL COMPONENTE AQUÍ
  ],
  providers: [MessageService],
  templateUrl: './ingreso-form.component.html'
})
export class IngresoFormComponent implements OnInit {

  // --- INYECCIÓN DE DEPENDENCIAS ---
  private fb = inject(FormBuilder);
  private ingresoService = inject(IngresoCompraService);
  private proveedorService = inject(ProveedorService);
  private localService = inject(LocalService);
  private productoService = inject(ProductoService);

  // Servicios Maestros para proveer al Modal de creación rápida de Producto
  private categoriaService = inject(CategoriaService);
  private marcaService = inject(MarcaService);
  private umService = inject(UnidadMedidaService);

  private messageService = inject(MessageService);
  private router = inject(Router);

  // --- ESTADO DEL FORMULARIO PRINCIPAL ---
  /** Instancia del formulario reactivo que orquesta la transacción completa (Cabecera y Detalle). */
  compraForm!: FormGroup;
  /** Bloqueo de UI para prevenir transacciones duplicadas (Double Submit). */
  guardando: boolean = false;

  // --- CATÁLOGOS COMUNES DE COMPRA ---
  /** Colección de proveedores registrados en el sistema. */
  proveedores: any[] = [];
  /** Sucursales destino para el ingreso físico de la mercadería. */
  locales: LocalDTO[] = [];
  /** Tipificación estandarizada para fines tributarios. */
  tiposComprobante = [
    { id: 1, nombre: 'Factura Electrónica' },
    { id: 2, nombre: 'Boleta de Venta Electrónica' },
    { id: 5, nombre: 'Guía de Remisión Remitente' }
  ];

  // --- CATÁLOGOS DELEGADOS PARA MODAL DE PRODUCTO ---
  opcionesCategoria: any[] = [];
  opcionesMarca: any[] = [];
  opcionesUM: any[] = [];

  // --- BUSCADOR INTELIGENTE DE PRODUCTOS (AUTOCOMPLETE) ---
  /** Resultados en tiempo real de la búsqueda de productos en el catálogo. */
  productosFiltrados: any[] = [];
  /** Producto en tránsito seleccionado en el Autocomplete antes de ser añadido a la grilla. */
  productoSeleccionado: any = null;

  // --- MÉTRICAS FINANCIERAS EN TIEMPO REAL ---
  subtotalCalculado: number = 0;
  igvCalculado: number = 0;
  totalCalculado: number = 0;

  // --- GESTOR DE ÍTEMS SERIALIZADOS ---
  /** Controla la visibilidad del modal para escanear/escribir números de serie. */
  modalSerialesVisible: boolean = false;
  /** Índice del producto en el FormArray que está recibiendo las series físicas. */
  indiceFilaActualSerial: number = -1;
  /** Buffer temporal para validar las series antes de consolidarlas en el formulario. */
  serialesTemporales: string[] = [];

  // --- GESTIÓN DE MODALES QUICK-ADD ---
  modalProveedorVisible: boolean = false;
  modalProductoVisible: boolean = false;

  /**
   * @description Inicializa el componente, construye el árbol reactivo, carga catálogos
   * y suscribe los observadores matemáticos para las finanzas de la transacción.
   */
  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarCatalogos();

    // 1. Reactive Watcher: Recalcula la base imponible si se añaden/modifican productos.
    this.detalles.valueChanges.subscribe(() => {
      this.calcularSubtotalY_SugerirIGV();
    });

    // 2. Reactive Watcher: Recalcula el total neto si el usuario ajusta el impuesto por diferencias de redondeo.
    this.compraForm.get('impuesto')?.valueChanges.subscribe(() => {
      this.calcularTotalFinal();
    });
  }

  /**
   * @description Configura la validación estructural de la Cabecera de Compra y crea el contenedor de Detalles.
   */
  private inicializarFormulario(): void {
    this.compraForm = this.fb.group({
      idProveedor: [null, Validators.required],
      idTipoComprobante: [1, Validators.required],
      idLocal: [null, Validators.required],
      serieComprobante: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{4}$/)]],
      numeroComprobante: ['', [Validators.required, Validators.pattern(/^[0-9]{1,8}$/)]],
      fechaIngreso: ['', Validators.required],
      impuesto: [0, Validators.required],
      totalCompra: [0, Validators.required],
      detalles: this.fb.array([], Validators.minLength(1)) // Mínimo 1 producto para considerar la compra válida
    });
  }

  /**
   * @description Getter (Azúcar Sintáctico) para acceder rápidamente al FormArray de productos ("El Carrito").
   */
  get detalles(): FormArray {
    return this.compraForm.get('detalles') as FormArray;
  }

  /**
   * @description Paraleliza la carga de todos los catálogos maestros requeridos para
   * operar tanto la vista principal como los modales de creación rápida.
   */
  private cargarCatalogos(): void {
    // Maestros de Compras
    this.proveedorService.listarParaCombo().subscribe(res => this.proveedores = res);
    this.localService.listarParaCombo().subscribe(res => this.locales = res);

    // Maestros de Producto (Para inyectar al modal si el usuario decide crear uno nuevo)
    this.categoriaService.listarParaCombo().subscribe(res => this.opcionesCategoria = res);
    this.marcaService.listarParaCombo().subscribe(res => this.opcionesMarca = res);
    this.umService.listarParaCombo().subscribe(res => this.opcionesUM = res);
  }

  // ======================================================================
  // --- LÓGICA DE FORMATEO Y CUMPLIMIENTO TRIBUTARIO ---
  // ======================================================================

  /**
   * @description Fuerza la serie del comprobante a mayúsculas para estandarización de registros (Ej: f001 -> F001).
   */
  formatearSerie(): void {
    const control = this.compraForm.get('serieComprobante');
    if (control?.value) {
      control.setValue(control.value.toUpperCase(), { emitEvent: false });
    }
  }

  /**
   * @description Autocompleta el número de comprobante con ceros a la izquierda,
   * emulando el formato estándar de facturación física y electrónica (Ej: 45 -> 00000045).
   */
  formatearCorrelativo(): void {
    const control = this.compraForm.get('numeroComprobante');
    if (control?.value && !isNaN(control.value)) {
      const numeroRelleno = control.value.toString().padStart(8, '0');
      control.setValue(numeroRelleno, { emitEvent: false });
    }
  }

  // ======================================================================
  // --- LÓGICA DE MODALES QUICK-ADD (AGILIDAD OPERATIVA) ---
  // ======================================================================

  abrirModalNuevoProveedor(): void {
    this.modalProveedorVisible = true;
  }

  abrirModalNuevoProducto(): void {
    this.modalProductoVisible = true;
  }

  /**
   * @description Callback ejecutado cuando el modal hijo crea un proveedor exitosamente.
   * Cierra el modal, recarga el catálogo en memoria y lo auto-selecciona en el comprobante.
   * @param nuevoProv DTO del proveedor recién creado.
   */
  alGuardarNuevoProveedor(nuevoProv: ProveedorDTO): void {
    this.modalProveedorVisible = false;
    this.messageService.add({ severity: 'success', summary: 'Proveedor Creado', detail: 'Seleccionado automáticamente.' });

    this.proveedorService.listarParaCombo().subscribe(res => {
      this.proveedores = res;
      this.compraForm.patchValue({ idProveedor: nuevoProv.id });
    });
  }

  /**
   * @description ✨ Callback UX avanzado: Al crear un producto desde la transacción en curso,
   * este método no solo actualiza catálogos, sino que simula su búsqueda, selección y lo inyecta
   * directamente en el detalle (carrito) sin intervención adicional del usuario.
   * @param nuevoProd DTO del producto recién integrado al catálogo.
   */
  alGuardarNuevoProducto(nuevoProd: ProductoDTO): void {
    this.modalProductoVisible = false;
    this.messageService.add({ severity: 'success', summary: 'Producto Creado', detail: 'Agregado al detalle automáticamente.' });

    this.productoSeleccionado = nuevoProd;
    this.agregarProductoAlDetalle();
  }

  // ======================================================================
  // --- MOTOR FINANCIERO Y CÁLCULOS DINÁMICOS ---
  // ======================================================================

  /**
   * @description Recorre el FormArray de productos para determinar el Subtotal, y propone
   * automáticamente el IGV (18%). Al emitir el evento en el control, dispara en cascada
   * el recálculo del Total final.
   */
  calcularSubtotalY_SugerirIGV(): void {
    let subtotal = 0;
    const filas = this.detalles.getRawValue();

    filas.forEach((fila: any) => {
      subtotal += (fila.cantidad || 0) * (fila.precioCompraUnitario || 0);
    });

    this.subtotalCalculado = subtotal;
    const impuestoSugerido = Number((this.subtotalCalculado * 0.18).toFixed(2));
    this.compraForm.patchValue({ impuesto: impuestoSugerido }, { emitEvent: true });
  }

  /**
   * @description Tolera ajustes manuales en el impuesto (para corregir descuadres por redondeo
   * de céntimos en facturas físicas) y determina el monto final a pagar.
   */
  calcularTotalFinal(): void {
    const impuestoActual = this.compraForm.get('impuesto')?.value || 0;
    this.igvCalculado = impuestoActual;
    this.totalCalculado = Number((this.subtotalCalculado + this.igvCalculado).toFixed(2));
    this.compraForm.patchValue({ totalCompra: this.totalCalculado }, { emitEvent: false });
  }

  // ======================================================================
  // --- LÓGICA DE DETALLES ("CARRITO DE COMPRAS") ---
  // ======================================================================

  /**
   * @description Alimenta el componente Autocomplete consultando coincidencias en el backend.
   */
  buscarProductoCombo(event: any): void {
    const query = event.query;
    this.productoService.listarPaginado(0, 15, query).subscribe(res => {
      this.productosFiltrados = res.content;
    });
  }

  /**
   * @description Transforma el ítem seleccionado en el Autocomplete en una nueva fila
   * del FormArray reactivo. Incorpora validación de duplicados (consolidando cantidades
   * en lugar de repetir filas).
   */
  agregarProductoAlDetalle(): void {
    if (!this.productoSeleccionado) return;

    const idRealProducto = this.productoSeleccionado.id || this.productoSeleccionado.idProducto;

    const existe = this.detalles.controls.some(ctrl => ctrl.value.idProducto === idRealProducto);
    if (existe) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'El producto ya está en la lista. Aumente la cantidad.' });
      this.productoSeleccionado = null;
      return;
    }

    const fila = this.fb.group({
      idProducto: [idRealProducto],
      codigoSku: [this.productoSeleccionado.codigoSku],
      descripcion: [this.productoSeleccionado.descripcion],
      esSerializado: [this.productoSeleccionado.esSerializado],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      precioCompraUnitario: [0, [Validators.required, Validators.min(0)]],
      numerosSerie: [[]] // Inicializa el array de series vacío
    });

    this.detalles.push(fila);
    this.productoSeleccionado = null;
  }

  /**
   * @description Extrae un producto de la transacción. Dispara en cascada la reevaluación
   * financiera de los importes de la compra.
   */
  eliminarFila(index: number): void {
    this.detalles.removeAt(index);
  }

  // ======================================================================
  // --- INGRESO LÓGICO DE INVENTARIO FÍSICO (SERIES) ---
  // ======================================================================

  /**
   * @description Despliega el entorno de captura de números de serie para productos únicos.
   * Dinamiza la cantidad de inputs visuales en función de la `cantidad` ingresada en la grilla.
   * @param index Posición de la fila en el FormArray.
   */
  abrirModalSeriales(index: number): void {
    this.indiceFilaActualSerial = index;
    const filaForm = this.detalles.at(index);
    const cantidadRequerida = filaForm.get('cantidad')?.value || 1;
    let serialesActuales = filaForm.get('numerosSerie')?.value || [];

    this.serialesTemporales = [...serialesActuales];

    // Auto-completar el buffer con espacios vacíos si aumentó la cantidad
    while (this.serialesTemporales.length < cantidadRequerida) {
      this.serialesTemporales.push('');
    }
    // Recortar el buffer si disminuyó la cantidad
    if (this.serialesTemporales.length > cantidadRequerida) {
      this.serialesTemporales = this.serialesTemporales.slice(0, cantidadRequerida);
    }

    this.modalSerialesVisible = true;
  }

  /**
   * @description Audita la captura de series evaluando vacíos y previniendo la duplicación
   * de códigos idénticos mediante estructuras `Set`. Consolida el buffer en el FormArray.
   */
  guardarSeriales(): void {
    if (this.serialesTemporales.some(s => !s || s.trim() === '')) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Debe completar todos los números de serie.' });
      return;
    }

    const setSeriales = new Set(this.serialesTemporales);
    if (setSeriales.size !== this.serialesTemporales.length) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Hay números de serie duplicados en la lista.' });
      return;
    }

    const filaForm = this.detalles.at(this.indiceFilaActualSerial);
    filaForm.patchValue({ numerosSerie: [...this.serialesTemporales] });

    this.modalSerialesVisible = false;
    this.messageService.add({ severity: 'success', summary: 'Series Registradas', detail: 'Listas para guardar.' });
  }

  // ======================================================================
  // --- CONSOLIDACIÓN TRANSACCIONAL Y GUARDADO ---
  // ======================================================================

  /**
   * @description Verifica la integridad de la transacción, asegura la consistencia de inventario
   * (N cantidades de un equipo exigen N series escaneadas) y ensambla el payload final (DTO)
   * para asentar definitivamente la mercadería y registrar la inversión.
   */
  registrarCompra(): void {
    if (this.compraForm.invalid) {
      this.compraForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Formulario Inválido', detail: 'Revise los campos obligatorios y asegúrese de agregar productos con el formato correcto de SUNAT.' });
      return;
    }

    // Auditoría Pre-Vuelo: Valida coherencia entre cantidades reportadas y series capturadas.
    const filas = this.detalles.getRawValue();
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i];
      if (f.esSerializado && f.numerosSerie.length !== f.cantidad) {
        this.messageService.add({ severity: 'error', summary: 'Faltan Series', detail: `El producto ${f.codigoSku} requiere ${f.cantidad} series registradas.` });
        return;
      }
    }

    this.guardando = true;

    // Ensamblaje del Request de Ingreso según contratos del backend
    const formValues = this.compraForm.getRawValue();
    const payload: IngresoCompraRequestDTO = {
      idProveedor: formValues.idProveedor,
      idTipoComprobante: formValues.idTipoComprobante,
      idLocal: formValues.idLocal,
      serieComprobante: formValues.serieComprobante,
      numeroComprobante: formValues.numeroComprobante,
      fechaIngreso: formValues.fechaIngreso,
      impuesto: formValues.impuesto,
      totalCompra: formValues.totalCompra,
      detalles: filas.map((f: any) => ({
        idProducto: f.idProducto,
        cantidad: f.cantidad,
        precioCompraUnitario: f.precioCompraUnitario,
        numerosSerie: f.esSerializado ? f.numerosSerie : undefined
      }))
    };

    this.ingresoService.registrarCompra(payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Compra registrada y stock actualizado en el Kardex.' });
        setTimeout(() => this.router.navigate(['/compras']), 1500);
      },
      error: (err) => {
        this.guardando = false;
        let msg = 'No se pudo registrar la compra.';
        if (err.error && err.error.message) msg = err.error.message;
        this.messageService.add({ severity: 'error', summary: 'Error del Servidor', detail: msg });
      }
    });
  }

  /**
   * @description Abandona la captura de la factura, devolviendo al usuario al panel de control
   * del historial de compras.
   */
  cancelar(): void {
    this.router.navigate(['/compras']);
  }
}
