import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * @description Componente de la barra superior (Topbar) del ERP de HardPC.
 * Gestiona la visualización de la identidad del usuario activo (nombre, rol y avatar)
 * y expone acciones globales de sesión.
 */
@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.component.html'
})
export class TopbarComponent implements OnInit {
  /** Nombre completo o correo del usuario autenticado. */
  nombreUsuario: string = 'Cargando...';

  /** Etiqueta de rol amigable para la interfaz (ej. Administrador, Cajero). */
  rolUsuario: string = 'Rol';

  /** Carácter inicial utilizado para renderizar el avatar circular. */
  inicial: string = '';

  /**
   * @param authService Servicio para operaciones de ciclo de vida de sesión.
   * @param router Enrutador para gestionar la salida del sistema.
   */
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * @description Gancho de ciclo de vida de Angular.
   * Se ejecuta al inicializar el componente para cargar el estado visual del usuario.
   */
  ngOnInit(): void {
    this.cargarDatosUsuario();
  }

  /**
   * @description Extrae los metadatos del usuario desde el almacenamiento local y los
   * formatea para su presentación en la vista. Incluye la limpieza de prefijos de
   * seguridad de Spring Boot (ej. 'ROLE_') y mapea los roles internos a etiquetas comerciales.
   */
  private cargarDatosUsuario(): void {
    const userDataString = localStorage.getItem('hardpc_user_data');

    if (userDataString) {
      const userData = JSON.parse(userDataString);

      // Prioriza el nombre completo; de lo contrario, muestra el email.
      this.nombreUsuario = userData.nombreCompleto || userData.email;

      // Sanitización del prefijo de seguridad estándar.
      const rolCrudo = userData.rol || 'Usuario';
      const rolLimpio = rolCrudo.replace('ROLE_', '');

      // Diccionario de correspondencia para la jerarquía de la empresa HardPC.
      const diccionarioRoles: { [key: string]: string } = {
        'ADMIN': 'Administrador',
        'SUPERVISOR': 'Supervisor',
        'OPERATIVO': 'Operativo',
        'CAJERO': 'Cajero'
      };

      // Aplica la traducción visual o mantiene la base limpia como respaldo.
      this.rolUsuario = diccionarioRoles[rolLimpio] || rolLimpio;

      // Generación del caracter principal para el componente de avatar.
      this.inicial = this.nombreUsuario.charAt(0).toUpperCase();
    }
  }

  /**
   * @description Cierra la sesión activa en el sistema y redirige al usuario
   * al portal de acceso público.
   */
  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
