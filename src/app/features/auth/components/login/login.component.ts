import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

/**
 * @description Componente de autenticación para el Sistema Administrativo de HardPC.
 * Gestiona el acceso seguro del personal a los módulos de inventario, ventas e ingresos.
 */
@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  /** Grupo de controles del formulario reactivo de inicio de sesión. */
  loginForm: FormGroup;

  /**
   * @param fb Constructor de formularios reactivos.
   * @param authService Servicio centralizado de autenticación.
   * @param router Enrutador para la navegación post-login.
   */
  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.loginForm = this.fb.group({
      // Credencial principal: Admite tanto nombre de usuario como correo electrónico.
      usernameOrEmail: ['', [Validators.required]],

      // Contraseña con políticas de seguridad:
      // Requerido, 8-20 caracteres, incl. al menos 1 mayúscula, 1 minúscula y 1 número.
      password: ['', [
        Validators.required,
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,20}$/)
      ]]
    });
  }

  /**
   * @description Procesa la solicitud de inicio de sesión.
   * Valida la estructura del formulario localmente antes de delegar la petición al servidor.
   */
  iniciarSesion(): void {
    if (this.loginForm.valid) {
      this.authService.login(this.loginForm.value).subscribe({
        next: () => {
          // Autenticación exitosa: Redirección al panel principal del sistema.
          this.router.navigate(['/']);
        },
        error: (err: unknown) => {
          console.error('Error de autenticación:', err);
          // TODO: Escalar a notificación UI no bloqueante (ej. PrimeNG MessageService/Toast).
          alert('Credenciales incorrectas. Verifica tu usuario o contraseña.');
        }
      });
    } else {
      // Activa la visualización de errores de validación en la plantilla HTML.
      this.loginForm.markAllAsTouched();
    }
  }

  /** Obtiene el control de usuario/email para enlazar validaciones en la vista. */
  get usernameOrEmailControl() { return this.loginForm.get('usernameOrEmail'); }

  /** Obtiene el control de la contraseña para enlazar validaciones en la vista. */
  get passwordControl() { return this.loginForm.get('password'); }
}
