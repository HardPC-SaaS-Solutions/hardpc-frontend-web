import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { ClienteFormComponent } from '../cliente-form/cliente-form.component';

import { VentaService } from '../../services/venta.service';
import { ClienteService } from '../../services/cliente.service';
import { LocalService } from '../../../maestros/services/local.service';
import { ProductoService } from '../../../inventario/services/producto.service';
import { ItemSerialService } from '../../../inventario/services/item-serial.service';
import { StockLocalService } from '../../../inventario/services/stock-local.service'; // ✨ NUEVO SERVICIO INYECTADO
import { TipoDocumentoService } from '../../../maestros/services/tipo-documento.service';
import { TipoDocumentoDTO } from '../../../../core/models/tipo-documento.dto';

import { VentaRequestDTO } from '../../../../core/models/venta.dto';
import { LocalDTO } from '../../../../core/models/local.dto';
import { ClienteDTO } from '../../../../core/models/cliente.dto';

import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

/**
 * @description Interfaz extendida de ClienteDTO con el campo `displayName` resuelto,
 * necesario para que PrimeNG 21 renderice correctamente el AutoComplete sin [object Object].
 */
export interface ClientePOS extends ClienteDTO {
  displayName: string;
}

/**
 * @description Componente de Punto de Venta (POS) encargado del registro completo de ventas:
 * selección de cliente, armado del carrito, validación de stock, asignación de seriales y emisión del comprobante.
 */
@Component({
  selector: 'app-venta-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule, ButtonModule, SelectModule,
    InputTextModule, InputNumberModule, TableModule, ToastModule, DialogModule,
    AutoCompleteModule, TagModule, TooltipModule, ClienteFormComponent
  ],
  providers: [MessageService],
  templateUrl: './venta-form.component.html'
})
export class VentaFormComponent implements OnInit {

  private fb                = inject(FormBuilder);
  private ventaService      = inject(VentaService);
  private clienteService    = inject(ClienteService);
  private localService      = inject(LocalService);
  private productoService   = inject(ProductoService);
  private messageService    = inject(MessageService);
  private itemSerialService = inject(ItemSerialService);
  private stockLocalService = inject(StockLocalService); // ✨ INYECCIÓN DEL STOCK
  private tipoDocService    = inject(TipoDocumentoService);
  private router            = inject(Router);

  /** Formulario reactivo principal que encapsula encabezado y detalle de la venta. */
  ventaForm!: FormGroup;

  /** Bandera que bloquea el botón de emisión mientras la petición al backend está en curso. */
  guardando = false;

  /** Catálogo de locales disponibles para seleccionar el almacén de origen del stock. */
  locales: LocalDTO[] = [];

  /** Catálogo de tipos de documento precargado para el formulario de creación rápida de cliente. */
  tiposDocumentoMaster: TipoDocumentoDTO[] = [];

  tiposComprobante = [
    { id: 1, nombre: 'Factura Electrónica' },
    { id: 2, nombre: 'Boleta de Venta Electrónica' }
  ];
  formasPago = [
    { id: 1, nombre: 'Efectivo (Caja)' },
    { id: 2, nombre: 'Tarjeta de Crédito/Débito' },
    { id: 3, nombre: 'Transferencia Bancaria / Yape / Plin' }
  ];

  // ── AUTOCOMPLETE CLIENTE ─────────────────────────────────────────────────

  /** Sugerencias resueltas del buscador de clientes para el dropdown del AutoComplete. */
  clientesFiltrados: ClientePOS[] = [];

  /** Objeto cliente actualmente vinculado a la venta, usado para extraer el id en el payload. */
  clienteSeleccionado: ClientePOS | null = null;

  /** Texto visible en el input del AutoComplete — desacoplado del objeto para evitar [object Object] en PrimeNG 21. */
  clienteInputText: string = '';

  productosFiltrados: any[] = [];
  productoSeleccionado: any = null;

  subtotalCalculado = 0;
  igvCalculado      = 0;
  totalCalculado    = 0;

  /** Controla la visibilidad del modal de creación rápida de cliente. */
  modalClienteVisible  = false;

  /** Controla la visibilidad del modal de selección de números de serie. */
  modalSerialesVisible = false;

  /** Índice de la fila del carrito actualmente en foco para la asignación de seriales. */
  indiceFilaFocoSerial      = -1;

  /** Series físicas disponibles en el local para el producto en foco. */
  serialesDisponiblesLocal: string[] = [];

  /** Series que el cajero ha marcado para despacho en la sesión actual del modal. */
  serialesSeleccionados: string[] = [];

  /**
   * @description Inicializa el formulario reactivo y precarga los catálogos de locales y tipos de documento.
   */
  ngOnInit(): void {
    this.inicializarFormulario();
    this.localService.listarParaCombo().subscribe(res => this.locales = res);
    this.tipoDocService.listarParaCombo().subscribe(res => this.tiposDocumentoMaster = res);
    this.detalles.valueChanges.subscribe(() => this.calcularEstructuraFinanciera());
  }

  /**
   * @description Construye la estructura del formulario reactivo con sus validadores base
   * e instala el listener de seguridad para vaciar el carrito al cambiar de local.
   */
  private inicializarFormulario(): void {
    this.ventaForm = this.fb.group({
      idCliente:         [null, Validators.required],
      idTipoComprobante: [2,    Validators.required],
      idFormaPago:       [1,    Validators.required],
      idLocal:           [null, Validators.required],
      serieComprobante:  ['',   [Validators.required, Validators.pattern(/^[BFAz0-9]{4}$/)]],
      numeroComprobante: ['',   [Validators.required, Validators.pattern(/^[0-9]{1,8}$/)]],
      impuesto:          [0,    Validators.required],
      totalVenta:        [0,    Validators.required],
      detalles: this.fb.array([], Validators.minLength(1))
    });

    // ✨ LISTENER DE SEGURIDAD: Vaciar carrito si se cambia el local origen a mitad de la venta
    this.ventaForm.get('idLocal')?.valueChanges.subscribe(nuevoLocal => {
      if (this.detalles.length > 0) {
        this.detalles.clear();
        this.calcularEstructuraFinanciera();
        this.messageService.add({
          severity: 'warn',
          summary:  'Almacén Cambiado',
          detail:   'La cesta se ha vaciado porque el stock dependía del local anterior.'
        });
      }
    });
  }

  /**
   * @description Acceso directo al FormArray de líneas de detalle dentro del formulario principal.
   */
  get detalles(): FormArray {
    return this.ventaForm.get('detalles') as FormArray;
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────

  /**
   * @description Resuelve el nombre visible de un cliente priorizando razón social,
   * luego nombre completo y finalmente el número de documento como fallback.
   */
  private buildDisplayName(c: ClienteDTO): string {
    return c.razonSocial?.trim()
      || `${c.nombres ?? ''} ${c.apellidos ?? ''}`.trim()
      || c.numeroDocumento
      || 'Sin nombre';
  }

  // ── AUTOCOMPLETE CLIENTE ─────────────────────────────────────────────────

  /**
   * @description Consulta clientes en tiempo real según el texto ingresado
   * y construye el `displayName` de cada resultado para el renderizado del AutoComplete.
   */
  buscarClientesPOS(event: any): void {
    const query = typeof event === 'string' ? event : event.query;
    this.clienteService.listarPaginado(0, 15, query).subscribe(res => {
      this.clientesFiltrados = res.content.map(c => ({
        ...c,
        displayName: this.buildDisplayName(c)
      }));
    });
  }

  /**
   * @description Captura el cliente elegido del dropdown y sincroniza
   * el texto visible del input con su `displayName`.
   */
  onClienteSelect(event: any): void {
    const cliente: ClientePOS = event?.value ?? event;
    this.clienteSeleccionado  = cliente;
    this.clienteInputText     = cliente.displayName;
  }

  /**
   * @description Limpia el cliente vinculado cuando el usuario borra el contenido del AutoComplete.
   */
  onClienteClear(): void {
    this.clienteSeleccionado = null;
    this.clienteInputText    = '';
  }

  /**
   * @description Despliega el modal de creación rápida de cliente sin abandonar el POS.
   */
  abrirQuickAddCliente(): void {
    this.modalClienteVisible = true;
  }

  /**
   * @description Recibe el cliente creado desde el formulario hijo, lo asigna a la venta activa
   * y cierra el modal sin interrumpir el flujo de caja.
   */
  alGuardarNuevoCliente(nuevoCliente: ClienteDTO): void {
    this.modalClienteVisible = false;
    const pos: ClientePOS    = { ...nuevoCliente, displayName: this.buildDisplayName(nuevoCliente) };
    this.clienteSeleccionado = pos;
    this.clienteInputText    = pos.displayName;
    this.messageService.add({ severity: 'success', summary: 'Cliente Creado', detail: 'Asignado a la venta en curso.' });
  }

  // ── PRODUCTOS E INVENTARIO REACTIVO ──────────────────────────────────────

  /**
   * @description Busca productos en tiempo real por SKU o descripción para el buscador del carrito.
   */
  buscarProductosPOS(event: any): void {
    this.productoService.listarPaginado(0, 15, event.query).subscribe(res => {
      this.productosFiltrados = res.content;
    });
  }

  /**
   * @description Valida el stock disponible del producto seleccionado en el local activo
   * antes de insertarlo en el carrito. Bifurca la estrategia según si el producto es serializado o a granel.
   */
  agregarItemAlCarrito(): void {
    if (!this.productoSeleccionado) return;

    const idLocal = this.ventaForm.get('idLocal')?.value;
    if (!idLocal) {
      this.messageService.add({ severity: 'error', summary: 'Caja Cerrada', detail: 'Seleccione un local de origen antes de agregar artículos.' });
      this.productoSeleccionado = null;
      return;
    }

    const idReal       = this.productoSeleccionado.id || this.productoSeleccionado.idProducto;
    const esSerializado = !!this.productoSeleccionado.esSerializado;
    const sku          = this.productoSeleccionado.codigoSku;

    if (this.detalles.controls.some(ctrl => ctrl.value.idProducto === idReal)) {
      this.messageService.add({ severity: 'warn', summary: 'Producto en Carrito', detail: 'El artículo ya está listado. Modifique las unidades directamente.' });
      this.productoSeleccionado = null;
      return;
    }

    // ✨ ESTRATEGIA REACTIVA BIFURCADA
    if (esSerializado) {
      // Consulta las series físicas disponibles para determinar el stock máximo despacháble.
      this.itemSerialService.obtenerSeriesDisponiblesParaVenta(idReal, idLocal).subscribe({
        next: (seriesDisponibles) => {
          const stockActual = seriesDisponibles.length;
          if (stockActual === 0) {
            this.messageService.add({ severity: 'error', summary: 'Agotado', detail: `No hay series disponibles para el SKU ${sku} en este local.` });
            this.productoSeleccionado = null;
            return;
          }
          this.insertarFilaCarrito(stockActual);
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error de Red', detail: 'No se pudo consultar el inventario serializado.' })
      });
    } else {
      // Consulta el stock a granel del local para productos sin numeración de serie.
      this.stockLocalService.buscarEnLocalPaginado(idLocal, 0, 10, sku).subscribe({
        next: (res) => {
          const stockItem   = res.content.find((s: any) => s.idProducto === idReal);
          const stockActual = stockItem ? stockItem.cantidadActual : 0;

          if (stockActual === 0) {
            this.messageService.add({ severity: 'error', summary: 'Agotado', detail: `El SKU ${sku} no tiene stock físico en este local.` });
            this.productoSeleccionado = null;
            return;
          }
          this.insertarFilaCarrito(stockActual);
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error de Red', detail: 'No se pudo consultar el stock a granel.' })
      });
    }
  }

  /**
   * @description Construye el FormGroup de la línea de carrito con sus validadores de cantidad limitada
   * al stock disponible e instala el listener reactivo de seguridad para seriales y bloqueo de exceso.
   */
  // ✨ FUNCIÓN CENTRALIZADA DE INSERCIÓN Y SEGURIDAD
  private insertarFilaCarrito(stockMaximo: number): void {
    const idReal = this.productoSeleccionado.id || this.productoSeleccionado.idProducto;

    const fila = this.fb.group({
      idProducto:          [idReal],
      codigoSkuProducto:   [this.productoSeleccionado.codigoSku],
      descripcionProducto: [this.productoSeleccionado.descripcion],
      precioVentaUnitario: [this.productoSeleccionado.precioUsd || 0],
      esSerializado:       [!!this.productoSeleccionado.esSerializado],
      cantidad:            [1, [Validators.required, Validators.min(1), Validators.max(stockMaximo)]],
      descuento:           [0, [Validators.required, Validators.min(0)]],
      numerosSerie:        [[] as string[]],
      stockMaximoVisible:  [stockMaximo]
    });

    fila.get('cantidad')?.valueChanges.subscribe(nuevaCantidad => {
      // ✨ CLÁUSULA DE GUARDIA: Si el cajero borra el input dejándolo nulo, salimos temprano
      if (nuevaCantidad === null || nuevaCantidad === undefined) {
        return;
      }

      // Bloqueo estricto por si tipean manual
      if (nuevaCantidad > stockMaximo) {
        this.messageService.add({ severity: 'warn', summary: 'Stock Insuficiente', detail: `Solo hay ${stockMaximo} unidades físicas disponibles en caja.` });
        fila.patchValue({ cantidad: stockMaximo }, { emitEvent: false });
        nuevaCantidad = stockMaximo;
      }

      // Resetea las series vinculadas si la cantidad cambia después de haberlas asignado.
      const series = fila.get('numerosSerie')?.value || [];
      if (series.length > 0 && series.length !== nuevaCantidad) {
        fila.patchValue({ numerosSerie: [] as string[] }, { emitEvent: false });
        this.messageService.add({ severity: 'info', summary: 'Series Reseteadas', detail: 'La cantidad cambió. Reasigne los números de serie.' });
      }
      this.calcularEstructuraFinanciera();
    });

    this.detalles.push(fila);
    this.productoSeleccionado = null;
    this.calcularEstructuraFinanciera();
  }

  /**
   * @description Elimina la fila del carrito en la posición indicada y recalcula los totales.
   */
  eliminarItemFila(index: number): void {
    this.detalles.removeAt(index);
    this.calcularEstructuraFinanciera();
  }

  // ── COMPROBANTE ───────────────────────────────────────────────────────────

  /**
   * @description Fuerza el valor de la serie del comprobante a mayúsculas al perder el foco.
   */
  formatearSerie(): void {
    const ctrl = this.ventaForm.get('serieComprobante');
    if (ctrl?.value) ctrl.setValue(ctrl.value.toUpperCase(), { emitEvent: false });
  }

  /**
   * @description Rellena con ceros a la izquierda el correlativo del comprobante al perder el foco.
   */
  formatearCorrelativo(): void {
    const ctrl = this.ventaForm.get('numeroComprobante');
    if (ctrl?.value && !isNaN(ctrl.value))
      ctrl.setValue(ctrl.value.toString().padStart(8, '0'), { emitEvent: false });
  }

  // ── CÁLCULO FINANCIERO ────────────────────────────────────────────────────

  /**
   * @description Recalcula subtotal, IGV (18%) y total de la venta a partir del estado
   * actual del carrito y sincroniza los campos del formulario reactivo.
   */
  private calcularEstructuraFinanciera(): void {
    let subtotal = 0;
    this.detalles.getRawValue().forEach((f: any) => {
      subtotal += (f.cantidad || 0) * (f.precioVentaUnitario || 0) - (f.descuento || 0);
    });
    this.subtotalCalculado = subtotal;
    this.igvCalculado      = Number((subtotal * 0.18).toFixed(2));
    this.totalCalculado    = Number((subtotal + this.igvCalculado).toFixed(2));
    this.ventaForm.patchValue({ impuesto: this.igvCalculado, totalVenta: this.totalCalculado }, { emitEvent: false });
  }

  // ── SERIALES ──────────────────────────────────────────────────────────────

  /**
   * @description Consulta las series físicas disponibles en el local para el producto de la fila indicada
   * y abre el modal de selección de seriales preconservando las ya asignadas.
   */
  abrirSeleccionSeriales(index: number): void {
    this.indiceFilaFocoSerial = index;
    const fila       = this.detalles.at(index);
    const idProducto = fila.get('idProducto')?.value;
    const idLocal    = this.ventaForm.get('idLocal')?.value;
    const actuales   = fila.get('numerosSerie')?.value;

    // Preserva las series ya elegidas al reabrir el modal.
    this.serialesSeleccionados    = Array.isArray(actuales) ? [...actuales] : [];
    this.serialesDisponiblesLocal = [];

    this.itemSerialService.obtenerSeriesDisponiblesParaVenta(idProducto, idLocal).subscribe({
      next:  series => { this.serialesDisponiblesLocal = series; this.modalSerialesVisible = true; },
      error: ()     => this.messageService.add({ severity: 'error', summary: 'Error de Red', detail: 'No se pudieron consultar las series disponibles.' })
    });
  }

  /**
   * @description Valida que la cantidad de series seleccionadas coincida exactamente
   * con la cantidad de la fila y las vincula al FormGroup correspondiente.
   */
  confirmarSerialesVenta(): void {
    const fila      = this.detalles.at(this.indiceFilaFocoSerial);
    const requeridos = fila.get('cantidad')?.value;
    if (this.serialesSeleccionados.length !== requeridos) {
      this.messageService.add({ severity: 'error', summary: 'Error de Despacho', detail: `Seleccione exactamente ${requeridos} número(s) de serie.` });
      return;
    }
    fila.patchValue({ numerosSerie: [...this.serialesSeleccionados] });
    this.modalSerialesVisible = false;
    this.messageService.add({ severity: 'success', summary: 'Hardware Asignado', detail: 'Números de serie listos para empaquetar.' });
  }

  /**
   * @description Agrega o quita un serial de la selección activa en el modal de despacho.
   */
  toggleSeleccionSerial(serial: string): void {
    const idx = this.serialesSeleccionados.indexOf(serial);
    idx > -1 ? this.serialesSeleccionados.splice(idx, 1) : this.serialesSeleccionados.push(serial);
  }

  // ── FACTURACIÓN ───────────────────────────────────────────────────────────

  /**
   * @description Ejecuta la cadena completa de validaciones del POS y, si todo es correcto,
   * construye el payload y despacha la venta al backend para su registro y descarga de stock.
   */
  procesarFacturacion(): void {
    if (!this.clienteSeleccionado?.id) {
      this.messageService.add({ severity: 'warn', summary: 'Falta Cliente', detail: 'Seleccione un cliente adquirente válido.' });
      return;
    }
    this.ventaForm.patchValue({ idCliente: this.clienteSeleccionado.id });

    if (this.ventaForm.invalid) {
      this.ventaForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Caja Bloqueada', detail: 'Complete los datos obligatorios del comprobante.' });
      return;
    }

    const detallesRaw = this.detalles.getRawValue();
    if (detallesRaw.length === 0) {
      this.messageService.add({ severity: 'error', summary: 'Carrito Vacío', detail: 'Agregue al menos un producto.' });
      return;
    }

    // Valida que todos los ítems serializados tengan sus series físicas asignadas.
    for (const f of detallesRaw) {
      if (f.esSerializado && (!f.numerosSerie || f.numerosSerie.length !== f.cantidad)) {
        this.messageService.add({ severity: 'error', summary: 'Faltan Series', detail: `SKU ${f.codigoSkuProducto} requiere ${f.cantidad} número(s) de serie.` });
        return;
      }
    }

    this.guardando = true;
    const formValues       = this.ventaForm.getRawValue();
    const payload: VentaRequestDTO = {
      idCliente:         formValues.idCliente,
      idTipoComprobante: formValues.idTipoComprobante,
      idFormaPago:       formValues.idFormaPago,
      idLocal:           formValues.idLocal,
      serieComprobante:  formValues.serieComprobante,
      numeroComprobante: formValues.numeroComprobante,
      impuesto:          formValues.impuesto,
      totalVenta:        formValues.totalVenta,
      detalles: detallesRaw.map((d: any) => ({
        idProducto:   d.idProducto,
        cantidad:     d.cantidad,
        descuento:    d.descuento,
        numerosSerie: d.esSerializado ? d.numerosSerie : undefined
      }))
    };

    this.ventaService.registrarVenta(payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Venta Consolidada', detail: 'Comprobante emitido y stock descargado.' });
        // Redirige al listado tras confirmar la operación en backend.
        setTimeout(() => this.router.navigate(['/ventas']), 1500);
      },
      error: err => {
        this.guardando = false;
        const msg = err?.error?.message || 'No se pudo procesar la venta.';
        this.messageService.add({ severity: 'error', summary: 'Error del Servidor', detail: msg });
      }
    });
  }

  /**
   * @description Cancela la operación en curso y regresa al listado de ventas sin guardar cambios.
   */
  cancelarOperacion(): void {
    this.router.navigate(['/ventas']);
  }
}
