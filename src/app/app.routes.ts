import { Routes } from '@angular/router';
import { AppLayoutComponent } from './layout/app-layout/app-layout.component';
import { LoginComponent } from './features/auth/components/login/login.component';
import { authGuard } from './core/guards/auth-guard';

import { CategoriaListComponent } from './features/maestros/components/categoria-list/categoria-list.component';
import { TipoComprobanteListComponent } from './features/maestros/components/tipo-comprobante-list/tipo-comprobante-list.component';
import { LocalListComponent } from './features/maestros/components/local-list/local-list.component';
import { MarcaListComponent } from './features/maestros/components/marca-list/marca-list.component';
import { FormaPagoListComponent } from './features/maestros/components/forma-pago-list/forma-pago-list.component';
import { RolListComponent } from './features/maestros/components/rol-list/rol-list.component';
import { UnidadMedidaListComponent } from './features/maestros/components/unidad-medida-list/unidad-medida-list.component';
import { TipoDocumentoListComponent } from './features/maestros/components/tipo-documento-list/tipo-documento-list.component';
import { MaestrosDashboardComponent } from './features/maestros/components/maestros-dashboard/maestros-dashboard.component';

/**
 * @description Configuración principal de enrutamiento para el Sistema Administrativo de HardPC.
 * Define la estructura jerárquica de la aplicación, implementando protección mediante Guards
 * para las áreas administrativas.
 */
export const routes: Routes = [
  {
    // Ruta pública: Punto de acceso al sistema.
    path: 'login',
    component: LoginComponent
  },
  {
    // Ruta protegida: Estructura base del ERP que requiere autenticación.
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      // MÓDULO MAESTROS: Panel de control y gestión de catálogos base.
      {
        path: 'maestros',
        component: MaestrosDashboardComponent
      },
      // CRUDs de Catálogos Maestros
      { path: 'maestros/roles', component: RolListComponent },
      { path: 'maestros/locales', component: LocalListComponent },
      { path: 'maestros/categorias', component: CategoriaListComponent },
      { path: 'maestros/marcas', component: MarcaListComponent },
      { path: 'maestros/unidades-medida', component: UnidadMedidaListComponent },
      { path: 'maestros/tipos-documento', component: TipoDocumentoListComponent },
      { path: 'maestros/formas-pago', component: FormaPagoListComponent },
      { path: 'maestros/tipos-comprobante', component: TipoComprobanteListComponent },

      // TODO: Implementar Lazy Loading para módulos de Inventario, Ventas e Ingresos aquí.
    ]
  },
  {
    // Fallback: Redirección automática a login ante rutas no definidas.
    path: '**',
    redirectTo: 'login'
  }
];
