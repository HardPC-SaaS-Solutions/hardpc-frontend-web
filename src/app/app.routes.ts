import { Routes } from '@angular/router';
import { AppLayoutComponent } from './layout/app-layout/app-layout';
import { LoginComponent } from './features/auth/components/login/login.component'; // Importa tu login

export const routes: Routes = [
  {
    path: 'login', // Ruta pública sin menús
    component: LoginComponent
  },
  {
    path: '', // Rutas privadas (ERP)
    component: AppLayoutComponent,
    children: [
      // Aquí irán las pantallas de tu equipo después
    ]
  },
  {
    path: '**', // Si escriben cualquier cosa, los mandamos al login
    redirectTo: 'login'
  }
];
