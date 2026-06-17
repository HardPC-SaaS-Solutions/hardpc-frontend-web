import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';

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
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService, ConfirmationService } from 'primeng/api';

/**
 * @description Componente central para la gestión del catálogo de Productos.
 * Motor principal del sistema de administración y ventas de Anta Salón Spa y Barbería.
 * Soporta filtros dinámicos cruzados, control de inventario serializado vs granel,
 * exportación atómica de datos y seguridad basada en roles (RBAC).
 */
@Component({
  selector: 'app-producto-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, TableModule, ButtonModule,
    TagModule, DialogModule, InputTextModule, InputNumberModule, SelectModule,
    ToastModule, ConfirmDialogModule, TooltipModule, CheckboxModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './producto-list.component.html'
})
export class ProductoListComponent implements OnInit {

  /** Referencia nativa a la tabla PrimeNG para gestionar programáticamente su ciclo de vida y paginación. */
  @ViewChild('dt') dt!: Table;

  // Inyección de dependencias de servicios y catálogos maestros
  private productoService = inject(ProductoService);
  private categoriaService = inject(CategoriaService);
  private marcaService = inject(MarcaService);
  private umService = inject(UnidadMedidaService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // --- TABLA Y DATOS ---
  /** Colección de productos actuales renderizados en la tabla. */
  productos: ProductoDTO[] = [];

  /** Colecciones dinámicas para poblar los selectores del formulario y los filtros. */
  opcionesCategoria: any[] = [];
  opcionesMarca: any[] = [];
  opcionesUM: any[] = [];

  /** Opciones estáticas para el filtro de naturaleza del stock. */
  opcionesFiltroTipo = [
    { label: 'Ítem Serializado (Único)', value: true },
    { label: 'Stock General (A granel)', value: false }
  ];

  /** Total de registros consolidados en la base de datos para el cálculo de páginas. */
  totalRecords: number = 0;
  /** Indicador de carga visual para la tabla de PrimeNG. */
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

  // --- FORMULARIO Y MODAL ---
  /** Instancia del formulario reactivo para la captura y validación de datos del producto. */
  productoForm!: FormGroup;
  /** Determina la visibilidad en pantalla de la ventana modal. */
  modalVisible: boolean = false;
  /** Define el contexto operativo del modal: `true` para Edición, `false` para Creación. */
  modoEdicion: boolean = false;
  /** Almacena el ID del registro en tránsito durante la edición. */
  idActual: number | null = null;
  /** Bloquea la interfaz de guardado temporalmente para impedir colisiones o dobles envíos. */
  guardando: boolean = false;

  // --- ESTADO DE PERMISOS ---
  /** Bandera de seguridad (RBAC) que habilita acciones estructurales solo para roles elevados. */
  puedeGestionar: boolean = false;

  /**
   * @description Inicializa el ciclo de vida del componente, verificando los privilegios
   * del usuario actual antes de construir la estructura del formulario y cargar catálogos.
   */
  ngOnInit(): void {
    this.puedeGestionar = this.authService.esAdminOSupervisor();
    this.inicializarFormulario();
    this.cargarCombos();
  }

  /**
   * @description Construye el árbol del formulario reactivo aplicando reglas de negocio formales,
   * garantizando valores por defecto seguros (ej. 12 meses de garantía base).
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
   * @description Ejecuta de forma paralela la obtención de todos los catálogos maestros
   * requeridos para gestionar las relaciones del producto.
   */
  private cargarCombos(): void {
    this.categoriaService.listarParaCombo().subscribe(res => this.opcionesCategoria = res);
    this.marcaService.listarParaCombo().subscribe(res => this.opcionesMarca = res);
    this.umService.listarParaCombo().subscribe(res => this.opcionesUM = res);
  }

  /**
   * @description Solicita a la API el listado paginado de productos inyectando dinámicamente
   * los parámetros del motor de filtros cruzados.
   * @param event Objeto portador de los metadatos de paginación y text-search dictados por la tabla.
   */
  cargarProductos(event: any): void {
    this.loading = true;
    const first = event.first ?? 0;
    const rows = event.rows ?? this.rowsPerPage;
    const page = first / rows;
    const buscar = event.globalFilter || '';

    this.productoService.listarPaginado(
      page,
      rows,
      buscar,
      this.filtroSerializado,
      this.filtroCategoria,
      this.filtroMarca
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
   * @description Aplica los filtros cruzados seleccionados en la cabecera.
   * Reinicia la paginación a la vista inicial (Página 1) delegando la recarga a la API de PrimeNG.
   */
  aplicarFiltros(): void {
    if (this.dt) {
      this.dt.reset();
    }
  }

  /**
   * @description Transforma la vista de datos activa en un archivo CSV formateado y atómico.
   * Asegura la legibilidad traduciendo booleanos de base de datos a jerga de negocio
   * (ej. "Item Serializado" vs "Stock General").
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
        p.codigoSku,
        p.nombreCategoria || '',
        p.nombreMarca || '',
        p.descripcion,
        p.precioUsd,
        p.mesesGarantia,
        p.descripcionUnidadMedida || '',
        controlStock,
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
    link.download = 'Catalogo_Productos_HardPC.csv';
    link.click();
    URL.revokeObjectURL(url);

    this.messageService.add({ severity: 'success', summary: 'Exportación', detail: 'Catálogo exportado exitosamente' });
  }

  /**
   * @description Acondiciona y despliega el formulario modal para el ingreso de un nuevo registro.
   * Garantiza que los controles inmutables (SKU, esSerializado) estén habilitados al momento de crear.
   */
  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.idActual = null;
    this.guardando = false;
    this.productoForm.reset({
      mesesGarantia: 12,
      esSerializado: false
    });
    this.productoForm.get('codigoSku')?.enable();
    this.productoForm.get('esSerializado')?.enable();
    this.modalVisible = true;
  }

  /**
   * @description Despliega el formulario modal en formato de edición poblándolo con los datos del DTO.
   * Aplica la regla arquitectónica de inmutabilidad: El SKU y la naturaleza de seguimiento (esSerializado)
   * son de solo lectura una vez que el producto ya ha generado historial en el sistema.
   * @param item Instancia DTO del producto seleccionado.
   */
  abrirModalEditar(item: ProductoDTO): void {
    this.modoEdicion = true;
    this.idActual = item.id!;
    this.guardando = false;

    this.productoForm.patchValue({
      codigoSku: item.codigoSku,
      descripcion: item.descripcion,
      precioUsd: item.precioUsd,
      mesesGarantia: item.mesesGarantia,
      esSerializado: item.esSerializado,
      idMarca: item.idMarca,
      idCategoria: item.idCategoria,
      idUnidadMedida: item.idUnidadMedida,
      imagenUrl: item.imagenUrl
    });

    // Bloqueo de propiedades fundamentales de inventario
    this.productoForm.get('codigoSku')?.disable();
    this.productoForm.get('esSerializado')?.disable();
    this.modalVisible = true;
  }

  /**
   * @description Oculta la ventana modal abortando toda operación en curso sin guardar cambios.
   */
  cerrarModal(): void {
    this.modalVisible = false;
  }

  /**
   * @description Motor unificado de excepciones de alta fidelidad. Intercepta los errores
   * del backend y los traduce a mensajes amigables. Desglosa de forma precisa los errores
   * arrojados por el DTO `FieldErrorDTO` de Spring Boot para optimizar el feedback al usuario.
   * @param err Objeto encapsulador del error HTTP.
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

      // Extracción atómica de validaciones específicas enviadas por la API
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

    this.messageService.add({ severity: severidad, summary: titulo, detail: mensaje, life: 6000 });
  }

  /**
   * @description Procesa y despacha la transacción del formulario (POST o PUT).
   * Contiene mecanismos de extracción en bruto (`getRawValue`) para recuperar los campos deshabilitados
   * y salvaguardas (guardando) para anular envíos múltiples involuntarios.
   */
  guardar(): void {
    if (this.productoForm.invalid) {
      this.productoForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Formulario Incompleto', detail: 'Revise los campos marcados en rojo.' });
      return;
    }

    this.guardando = true;
    const formValues = this.productoForm.getRawValue();

    if (this.modoEdicion && this.idActual) {
      const existente = this.productos.find(x => x.id === this.idActual);
      const data: ProductoDTO = { ...formValues, estado: existente?.estado };

      this.productoService.actualizar(this.idActual, data).subscribe({
        next: () => {
          this.cerrarModal();
          this.cargarProductos(this.dt.createLazyLoadMetadata());
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Producto modificado' });
        },
        error: (err) => this.manejarErrorBackend(err)
      });
    } else {
      const data: ProductoDTO = { ...formValues, estado: true };
      this.productoService.crear(data).subscribe({
        next: () => {
          this.cerrarModal();
          this.dt.reset();
          this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Producto registrado en el catálogo' });
        },
        error: (err) => this.manejarErrorBackend(err)
      });
    }
  }

  /**
   * @description Exige confirmación para desactivar lógicamente a un producto.
   * Evita su futura asociación a compras o ventas sin destruir el historial previo.
   * @param item Producto a retirar del catálogo activo.
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
   * @description Exige confirmación para restaurar la vigencia de un producto inactivo.
   * Invoca internamente al endpoint ligero de tipo PATCH.
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
