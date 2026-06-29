import { Routes } from '@angular/router';
import { AppLayoutComponent } from './layout/app-layout/app-layout.component';
import { LoginComponent } from './features/auth/components/login/login.component';
import { authGuard } from './core/guards/auth-guard';

// Componentes del Módulo Maestros
import { CategoriaListComponent } from './features/maestros/components/categoria-list/categoria-list.component';
import { TipoComprobanteListComponent } from './features/maestros/components/tipo-comprobante-list/tipo-comprobante-list.component';
import { LocalListComponent } from './features/maestros/components/local-list/local-list.component';
import { MarcaListComponent } from './features/maestros/components/marca-list/marca-list.component';
import { FormaPagoListComponent } from './features/maestros/components/forma-pago-list/forma-pago-list.component';
import { RolListComponent } from './features/maestros/components/rol-list/rol-list.component';
import { UnidadMedidaListComponent } from './features/maestros/components/unidad-medida-list/unidad-medida-list.component';
import { TipoDocumentoListComponent } from './features/maestros/components/tipo-documento-list/tipo-documento-list.component';
import { MaestrosDashboardComponent } from './features/maestros/components/maestros-dashboard/maestros-dashboard.component';

// Componentes de Seguridad y Accesos
import { UsuarioListComponent } from './features/usuarios/components/usuario-list/usuario-list.component';

// Componentes de Directorios Comerciales
import { ClienteListComponent } from './features/ventas/components/cliente-list/cliente-list.component';
import { ProveedorListComponent } from './features/compras/components/proveedor-list/proveedor-list.component';

// Componentes de Inventario y Catálogo
import { ProductoListComponent } from './features/inventario/components/producto-list/producto-list.component';
import { AlmacenDashboardComponent } from './features/inventario/components/almacen-dashboard/almacen-dashboard.component';

// Componentes del Módulo de Compras
import { IngresoListComponent } from './features/compras/components/ingreso-list/ingreso-list.component';
import { IngresoFormComponent } from './features/compras/components/ingreso-form/ingreso-form.component';
import { VentaListComponent } from './features/ventas/components/venta-list/venta-list.component';
import { VentaFormComponent } from './features/ventas/components/venta-form/venta-form.component';
import { CierreCajaComponent } from './features/ventas/components/cierre-caja/cierre-caja.component';
import { DashboardGerencialComponent } from './features/dashboard/components/dashboard-gerencial/dashboard-gerencial.component';

/**
 * @description Configuración principal de enrutamiento para el Sistema Administrativo de HardPC.
 * Define la jerarquía de navegación de la aplicación, agrupando las rutas por dominios de negocio
 * e implementando protección estricta mediante Guards para las áreas operativas del ERP.
 */
export const routes: Routes = [
  {
    // Ruta pública: Punto de acceso único para la autenticación del personal.
    path: 'login',
    component: LoginComponent
  },
  {
    // Ruta protegida: Contenedor principal (Layout) del ERP que requiere token activo.
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [

      { path: 'dashboard', component: DashboardGerencialComponent },

      // =======================================================
      // MÓDULO MAESTROS: Panel de control y catálogos base
      // =======================================================
      { path: 'maestros', component: MaestrosDashboardComponent },
      { path: 'maestros/roles', component: RolListComponent },
      { path: 'maestros/locales', component: LocalListComponent },
      { path: 'maestros/categorias', component: CategoriaListComponent },
      { path: 'maestros/marcas', component: MarcaListComponent },
      { path: 'maestros/unidades-medida', component: UnidadMedidaListComponent },
      { path: 'maestros/tipos-documento', component: TipoDocumentoListComponent },
      { path: 'maestros/formas-pago', component: FormaPagoListComponent },
      { path: 'maestros/tipos-comprobante', component: TipoComprobanteListComponent },

      // =======================================================
      // MÓDULO DE SEGURIDAD Y ACCESOS
      // =======================================================
      { path: 'usuarios', component: UsuarioListComponent },

      // =======================================================
      // MÓDULOS DE DIRECTORIO COMERCIAL (VENTAS Y COMPRAS)
      // =======================================================
      { path: 'clientes', component: ClienteListComponent },
      { path: 'proveedores', component: ProveedorListComponent },

      // =======================================================
      // MÓDULO DE INVENTARIO Y ALMACÉN
      // =======================================================
      { path: 'productos', component: ProductoListComponent },
      { path: 'almacen', component: AlmacenDashboardComponent },

      // =======================================================
      // MÓDULO COMPRAS
      // =======================================================
      {
        // Lista y consulta de ingresos registrados.
        path: 'compras',
        component: IngresoListComponent
      },
      {
        // Registro de un nuevo ingreso de mercadería.
        path: 'compras/nuevo',
        component: IngresoFormComponent
      },

      // =======================================================
      // MÓDULO VENTAS
      // =======================================================
      {
        // Lista y consulta de ventas registradas.
        path: 'ventas',
        component: VentaListComponent
      },
      {
        // Registro de una nueva venta.
        path: 'ventas/nuevo',
        component: VentaFormComponent
      },

      {
        path: 'ventas/cierre-caja',
        component: CierreCajaComponent
      },
    ]
  },
  {
    // Ruta comodín (Fallback): Intercepta cualquier URL no mapeada y redirige de forma segura al inicio.
    path: '**',
    redirectTo: 'login'
  }
];
