import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * @description Componente de panel de control (Dashboard) para los Catálogos Maestros.
 * Renderiza un menú de navegación visual que centraliza el acceso a las configuraciones
 * base del ERP de HardPC (inventario, facturación, seguridad y locales).
 */
@Component({
  selector: 'app-maestros-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './maestros-dashboard.component.html'
})
export class MaestrosDashboardComponent {

  /**
   * @description Colección estática de módulos maestros.
   * Define la estructura, metadatos visuales (íconos de PrimeIcons, colores de Tailwind)
   * y las rutas de navegación para renderizar la cuadrícula del menú principal.
   */
  modulos = [
    {
      titulo: 'Locales',
      descripcion: 'Sucursales y puntos de venta físicos',
      icono: 'pi pi-building',
      ruta: '/maestros/locales',
      colorTexto: 'text-blue-600',
      colorFondo: 'bg-blue-50'
    },
    {
      titulo: 'Roles',
      descripcion: 'Niveles de acceso y permisos',
      icono: 'pi pi-shield',
      ruta: '/maestros/roles',
      colorTexto: 'text-indigo-600',
      colorFondo: 'bg-indigo-50'
    },
    {
      titulo: 'Tipos de Documento',
      descripcion: 'DNI, RUC, Carnet de Extranjería',
      icono: 'pi pi-id-card',
      ruta: '/maestros/tipos-documento',
      colorTexto: 'text-cyan-600',
      colorFondo: 'bg-cyan-50'
    },
    {
      titulo: 'Formas de Pago',
      descripcion: 'Efectivo, Yape, Tarjetas',
      icono: 'pi pi-credit-card',
      ruta: '/maestros/formas-pago',
      colorTexto: 'text-emerald-600',
      colorFondo: 'bg-emerald-50'
    },
    {
      titulo: 'Comprobantes',
      descripcion: 'Boletas, Facturas y Notas',
      icono: 'pi pi-file-pdf',
      ruta: '/maestros/tipos-comprobante',
      colorTexto: 'text-orange-600',
      colorFondo: 'bg-orange-50'
    },
    {
      titulo: 'Categorías',
      descripcion: 'Clasificación del inventario',
      icono: 'pi pi-tags',
      ruta: '/maestros/categorias',
      colorTexto: 'text-purple-600',
      colorFondo: 'bg-purple-50'
    },
    {
      titulo: 'Marcas',
      descripcion: 'Firmas comerciales de repuestos',
      icono: 'pi pi-star',
      ruta: '/maestros/marcas',
      colorTexto: 'text-pink-600',
      colorFondo: 'bg-pink-50'
    },
    {
      titulo: 'Unidades de Medida',
      descripcion: 'Métricas para el stock (UND, LTS)',
      icono: 'pi pi-box',
      ruta: '/maestros/unidades-medida',
      colorTexto: 'text-teal-600',
      colorFondo: 'bg-teal-50'
    }
  ];

}
