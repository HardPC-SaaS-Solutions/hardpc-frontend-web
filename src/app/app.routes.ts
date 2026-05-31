import { Routes } from '@angular/router';
import { AppLayoutComponent } from './layout/app-layout/app-layout.component';
import { LoginComponent } from './features/auth/components/login/login.component';
import { authGuard } from './core/guards/auth-guard';

/**
 * @description Configuración principal de enrutamiento para el Sistema Administrativo de HardPC.
 * Define la estructura de navegación, separando los accesos públicos de las áreas seguras del ERP.
 */
export const routes: Routes = [
  {
    // Punto de entrada público para la autenticación del personal.
    path: 'login',
    component: LoginComponent
  },
  {
    // Estructura base (Layout) de la aplicación donde residirá la navegación principal.
    path: '',
    component: AppLayoutComponent,
    // 🛡️ Barrera de seguridad: Exige un token válido para acceder a cualquier ruta hija.
    canActivate: [authGuard],
    children: [
      // TODO: Registrar aquí los submódulos (lazy loading) de Inventario, Ventas e Ingresos.
    ]
  },
  {
    // Ruta comodín (Fallback): Intercepta cualquier URL inválida y redirige al inicio de sesión.
    path: '**',
    redirectTo: 'login'
  }
];
