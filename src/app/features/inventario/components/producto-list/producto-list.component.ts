import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// ✨ IMPORTAMOS EL NUEVO COMPONENTE FORMULARIO
import { ProductoFormComponent } from '../producto-form/producto-form.component';

import { ProductoService } from '../../services/producto.service';
import { CategoriaService } from '../../../maestros/services/categoria.service';
import { MarcaService } from '../../../maestros/services/marca.service';
import { UnidadMedidaService } from '../../../maestros/services/unidad-medida.service';
import { AuthService } from '../../../auth/services/auth.service';

import { ProductoDTO } from '../../../../core/models/producto.dto';

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
 * @description Componente central para la gestión del catálogo de Productos.
 * Actúa como "Smart Component" (Contenedor) orquestando la visualización de la grilla,
 * paginación asíncrona, filtros cruzados avanzados y exportación de datos.
 * Delega toda la lógica transaccional de creación y edición a su componente hijo (`ProductoFormComponent`).
 */
@Component({
  selector: 'app-producto-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule,
    TagModule, DialogModule, InputTextModule, SelectModule,
    ToastModule, ConfirmDialogModule, TooltipModule,
    ProductoFormComponent // ✨ INYECTAMOS EL HIJO AQUÍ
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './producto-list.component.html'
})
export class ProductoListComponent implements OnInit {

  /** Referencia nativa a la tabla PrimeNG para gestionar programáticamente su ciclo de vida y paginación. */
  @ViewChild('dt') dt!: Table;

  // --- INYECCIÓN DE DEPENDENCIAS ---
  private productoService = inject(ProductoService);
  private categoriaService = inject(CategoriaService);
  private marcaService = inject(MarcaService);
  private umService = inject(UnidadMedidaService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // --- ESTADO DE LA TABLA Y DATOS ---
  /** Colección de productos actuales renderizados en la tabla. */
  productos: ProductoDTO[] = [];

  /** Colecciones maestras cargadas en memoria para inyectar hacia el componente hijo y poblar filtros. */
  opcionesCategoria: any[] = [];
  opcionesMarca: any[] = [];
  opcionesUM: any[] = [];

  /** Diccionario visual para segmentar la búsqueda por la naturaleza del inventario. */
  opcionesFiltroTipo = [
    { label: 'Ítem Serializado (Único)', value: true },
    { label: 'Stock General (A granel)', value: false }
  ];

  /** Total de registros consolidados en la base de datos para el cálculo de páginas. */
  totalRecords: number = 0;
  /** Indicador de carga visual asíncrona para la grilla. */
  loading: boolean = true;
  /** Cantidad de registros renderizados por página. */
  rowsPerPage: number = 10;

  // --- VARIABLES DE ESTADO PARA FILTROS CRUZADOS ---
  /** Almacena el valor del filtro por naturaleza de inventario. */
  filtroSerializado: boolean | null = null;
  /** Almacena el ID de la categoría seleccionada en el filtro superior. */
  filtroCategoria: number | null = null;
  /** Almacena el ID de la marca seleccionada en el filtro superior. */
  filtroMarca: number | null = null;

  // --- ESTADO DEL MODAL Y COMUNICACIÓN CON EL HIJO ---
  /** Controla la visibilidad de la ventana modal que envuelve al componente hijo. */
  modalVisible: boolean = false;
  /** Payload inyectado hacia el hijo mediante `@Input()`. Define si es Creación (null) o Edición (Objeto). */
  productoSeleccionado: ProductoDTO | null = null;

  /** Control de RBAC: Determina si el usuario actual tiene privilegios para gestionar el catálogo. */
  puedeGestionar: boolean = false;

  /**
   * @description Inicializa el componente validando los permisos de seguridad y pre-cargando
   * los catálogos maestros que serán compartidos con el formulario hijo.
   */
  ngOnInit(): void {
    this.puedeGestionar = this.authService.esAdminOSupervisor();
    this.cargarCombos();
  }

  /**
   * @description Ejecuta de forma paralela la obtención de los catálogos requeridos
   * para el motor de filtros de la grilla y los selectores del formulario.
   */
  private cargarCombos(): void {
    this.categoriaService.listarParaCombo().subscribe(res => this.opcionesCategoria = res);
    this.marcaService.listarParaCombo().subscribe(res => this.opcionesMarca = res);
    this.umService.listarParaCombo().subscribe(res => this.opcionesUM = res);
  }

  // ======================================================================
  // --- LÓGICA DE CARGA PAGINADA (LAZY) ---
  // ======================================================================

  /**
   * @description Solicita al servidor el bloque de productos inyectando dinámicamente
   * los parámetros del motor de filtros cruzados y la paginación de PrimeNG.
   * @param event Objeto portador de los metadatos de la tabla.
   */
  cargarProductos(event: any): void {
    this.loading = true;
    const first = event.first ?? 0;
    const rows = event.rows ?? this.rowsPerPage;
    const page = first / rows;
    const buscar = event.globalFilter || '';

    this.productoService.listarPaginado(
      page, rows, buscar, this.filtroSerializado, this.filtroCategoria, this.filtroMarca
    ).subscribe({
      next: (res) => {
        this.productos = res.content;
        this.totalRecords = res.totalElements;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el catálogo' });
        this.loading = false;
      }
    });
  }

  /**
   * @description Fuerza a la tabla a regresar a su estado base (Página 1),
   * lo cual dispara automáticamente el ciclo de recarga (`onLazyLoad`) con los filtros actuales.
   */
  aplicarFiltros(): void {
    if (this.dt) {
      this.dt.reset();
    }
  }

  // ======================================================================
  // --- MÉTODOS DE EXPORTACIÓN ---
  // ======================================================================

  /**
   * @description Transforma la vista de datos activa en un archivo CSV formateado.
   * Traduce las propiedades booleanas internas a jerga de negocio comprensible para los usuarios.
   */
  exportarDatos(): void {
    if (!this.productos || this.productos.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Exportación', detail: 'No hay datos para exportar.' });
      return;
    }

    const cabeceras = [
      'SKU', 'Categoría', 'Marca', 'Descripción',
      'Precio (USD)', 'Garantía (Meses)', 'Unidad Medida',
      'Control de Stock', 'Estado'
    ];

    const filas = this.productos.map(p => {
      const controlStock = p.esSerializado ? 'Item Serializado' : 'Stock General';
      const estado = p.estado ? 'Activo' : 'Inactivo';

      return [
        p.codigoSku, p.nombreCategoria || '', p.nombreMarca || '', p.descripcion,
        p.precioUsd, p.mesesGarantia, p.descripcionUnidadMedida || '', controlStock, estado
      ];
    });

    const contenidoCSV = [
      cabeceras.join(','),
      ...filas.map(fila => fila.map(campo => `"${campo}"`).join(','))
    ].join('\n');

    // Inyección de Byte Order Mark (BOM) para correcta interpretación de caracteres especiales en MS Excel
    const blob = new Blob(['\ufeff' + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Catalogo_Productos_HardPC.csv';
    link.click();
    URL.revokeObjectURL(url);

    this.messageService.add({ severity: 'success', summary: 'Exportación', detail: 'Catálogo exportado exitosamente' });
  }

  // ======================================================================
  // --- GESTIÓN DE FLUJOS HACIA EL FORMULARIO HIJO ---
  // ======================================================================

  /**
   * @description Prepara el entorno para registrar un nuevo producto en el catálogo.
   */
  abrirModalNuevo(): void {
    this.productoSeleccionado = null;
    this.modalVisible = true;
  }

  /**
   * @description Prepara el entorno para editar las propiedades de un producto.
   * Inyecta el DTO seleccionado hacia el componente hijo.
   * @param item Instancia DTO del producto a editar.
   */
  abrirModalEditar(item: ProductoDTO): void {
    this.productoSeleccionado = item;
    this.modalVisible = true;
  }

  /**
   * @description Manejador del evento `@Output()` emitido por `ProductoFormComponent` tras una transacción exitosa.
   * Cierra el modal y sincroniza la grilla con el estado actual del backend.
   * @param productoActualizado DTO devuelto por el hijo con los datos consolidados.
   */
  alGuardarProducto(productoActualizado: ProductoDTO): void {
    this.modalVisible = false;
    this.cargarProductos(this.dt.createLazyLoadMetadata());
    this.messageService.add({ severity: 'success', summary: 'Operación Exitosa', detail: `El catálogo se ha actualizado correctamente.` });
  }

  // ======================================================================
  // --- OPERACIONES DE LISTA (Destructivas / Transiciones de Estado) ---
  // ======================================================================

  /**
   * @description Motor de traducción de excepciones de red, mapeado a la estructura `ApiErrorResponse`.
   */
  private manejarErrorBackend(err: any): void {
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

  /**
   * @description Exige confirmación para desactivar lógicamente un producto del sistema.
   * Evita su futura asociación a compras o ventas sin alterar la integridad del historial previo.
   * @param item Producto a inhabilitar.
   */
  eliminar(item: ProductoDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas deshabilitar el producto <b>${item.codigoSku}</b> del catálogo?`,
      header: 'Confirmar Baja',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, deshabilitar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.productoService.eliminar(item.id!).subscribe({
          next: () => {
            this.cargarProductos(this.dt.createLazyLoadMetadata());
            this.messageService.add({ severity: 'info', summary: 'Deshabilitado', detail: 'Producto retirado del catálogo activo' });
          },
          error: (err) => this.manejarErrorBackend(err)
        });
      }
    });
  }

  /**
   * @description Exige confirmación para restaurar la vigencia comercial de un producto inactivo.
   * @param item Producto a rehabilitar.
   */
  restaurar(item: ProductoDTO): void {
    this.confirmationService.confirm({
      message: `¿Deseas reactivar el producto <b>${item.codigoSku}</b>?`,
      header: 'Confirmar Restauración',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.productoService.reactivar(item.id!).subscribe({
          next: () => {
            this.cargarProductos(this.dt.createLazyLoadMetadata());
            this.messageService.add({ severity: 'success', summary: 'Restaurado', detail: 'Producto nuevamente activo' });
          },
          error: (err) => this.manejarErrorBackend(err)
        });
      }
    });
  }
}
