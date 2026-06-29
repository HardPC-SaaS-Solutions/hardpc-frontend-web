import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table'; // ✨ IMPORTANTE AÑADIR ESTE MÓDULO PARA LAS TABLAS
import { forkJoin, catchError, of } from 'rxjs';
import { ReportesService } from '../../services/reportes.service';
import { BadgeModule } from 'primeng/badge';

@Component({
  selector: 'app-dashboard-gerencial',
  standalone: true,
  imports: [CommonModule, ChartModule, TableModule, BadgeModule],
  templateUrl: './dashboard-gerencial.component.html'
})
export class DashboardGerencialComponent implements OnInit {

  private reportesService = inject(ReportesService);

  cargando = true;
  errorCarga = false;

  // ── KPIs GLOBALES ──────────────────────────────────────────────
  inversionPorLocal: any[] = [];
  totalInversionGlobal = 0;
  ingresoMesActual = 0;
  gastoMesActual = 0;

  // ── DATOS PARA GRÁFICOS (CHART.JS) ─────────────────────────────
  finanzasData: any; // Combina Ingresos y Gastos
  topProductosData: any;
  rendimientoCajerosData: any;
  estadoSerialesData: any;

  // ── DATOS PARA TABLAS ──────────────────────────────────────────
  topClientes: any[] = [];
  topProveedores: any[] = [];

  // ── CONFIGURACIONES ────────────────────────────────────────────
  barChartOptions: any;
  pieChartOptions: any;

  ngOnInit(): void {
    this.configurarOpcionesGraficos();
    this.cargarTodosLosReportes();
  }

  private configurarOpcionesGraficos(): void {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    this.barChartOptions = {
      plugins: { legend: { labels: { color: textColor } } },
      scales: {
        x: { ticks: { color: textColorSecondary }, grid: { color: surfaceBorder, drawBorder: false } },
        y: { ticks: { color: textColorSecondary }, grid: { color: surfaceBorder, drawBorder: false } }
      }
    };

    this.pieChartOptions = {
      plugins: { legend: { labels: { color: textColor } } }
    };
  }

  /**
   * @description Usa forkJoin para orquestar las 8 llamadas simultáneas.
   * La pantalla de carga solo desaparecerá cuando TODOS los datos estén listos.
   */
  private cargarTodosLosReportes(): void {
    forkJoin({
      ingresos: this.reportesService.obtenerReporteIngresoMensual().pipe(catchError(() => of([]))),
      gastos: this.reportesService.obtenerReporteGastoMensual().pipe(catchError(() => of([]))),
      productos: this.reportesService.obtenerTopProductos().pipe(catchError(() => of([]))),
      cajeros: this.reportesService.obtenerRendimientoCajeros().pipe(catchError(() => of([]))),
      inversion: this.reportesService.obtenerReporteInversion().pipe(catchError(() => of([]))),
      estados: this.reportesService.reporteEstadosAgrupados().pipe(catchError(() => of([]))),
      clientes: this.reportesService.obtenerReporteVentasPorCliente().pipe(catchError(() => of([]))),
      proveedores: this.reportesService.obtenerReporteGastoPorProveedor().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.procesarKPIs(res.inversion, res.ingresos, res.gastos);
        this.procesarGraficoFinanzas(res.ingresos, res.gastos);
        this.procesarTopProductos(res.productos);
        this.procesarRendimientoCajeros(res.cajeros);
        this.procesarEstadosSeriales(res.estados);

        // Asignación directa para las tablas
        this.topClientes = res.clientes || [];
        this.topProveedores = res.proveedores || [];

        this.cargando = false;
      },
      error: () => {
        this.errorCarga = true;
        this.cargando = false;
      }
    });
  }

  // ========================================================================
  // --- MÉTODOS DE PROCESAMIENTO SEGURO DE DATOS (Mapeo a Chart.js) ---
  // ========================================================================

  private procesarKPIs(inversion: any[], ingresos: any[], gastos: any[]): void {
    this.inversionPorLocal = inversion || [];
    this.totalInversionGlobal = this.inversionPorLocal.reduce((acc, curr) => acc + (curr.totalInvertido || 0), 0);

    // Asumimos que el índice 0 trae el mes más reciente por el 'ORDER BY DESC' del backend
    if (ingresos && ingresos.length > 0) this.ingresoMesActual = ingresos[0].totalIngreso;
    if (gastos && gastos.length > 0) this.gastoMesActual = gastos[0].totalGasto;
  }

  private procesarGraficoFinanzas(ingresos: any[], gastos: any[]): void {
    // 1. Alineamos por Mes/Año para el gráfico comparativo
    const mapaMeses = new Map<string, { ingreso: number, gasto: number }>();

    (ingresos || []).forEach(i => {
      const key = `${this.mesStr(i.mes)} ${i.anio}`;
      mapaMeses.set(key, { ingreso: i.totalIngreso, gasto: 0 });
    });

    (gastos || []).forEach(g => {
      const key = `${this.mesStr(g.mes)} ${g.anio}`;
      if (mapaMeses.has(key)) {
        mapaMeses.get(key)!.gasto = g.totalGasto;
      } else {
        mapaMeses.set(key, { ingreso: 0, gasto: g.totalGasto });
      }
    });

    const labels = Array.from(mapaMeses.keys()).reverse(); // De más antiguo a más reciente
    const dataIngresos = Array.from(mapaMeses.values()).map(v => v.ingreso).reverse();
    const dataGastos = Array.from(mapaMeses.values()).map(v => v.gasto).reverse();

    this.finanzasData = {
      labels: labels,
      datasets: [
        { label: 'Ingresos por Ventas (S/)', data: dataIngresos, backgroundColor: '#10B981' }, // Verde
        { label: 'Gastos a Proveedores (S/)', data: dataGastos, backgroundColor: '#EF4444' } // Rojo
      ]
    };
  }

  private procesarTopProductos(productos: any[]): void {
    this.topProductosData = {
      labels: (productos || []).map(p => p.descripcion.length > 15 ? p.descripcion.substring(0, 15) + '...' : p.descripcion),
      datasets: [{
        label: 'Unidades Vendidas',
        data: (productos || []).map(p => p.cantidadVendida),
        backgroundColor: '#3B82F6' // Azul
      }]
    };
  }

  private procesarRendimientoCajeros(cajeros: any[]): void {
    this.rendimientoCajerosData = {
      // ✨ Enriquecemos el label combinando username y cantidadTransacciones
      labels: (cajeros || []).map(c => `${c.username} (${c.cantidadTransacciones} txs)`),
      datasets: [{
        data: (cajeros || []).map(c => c.totalVendido),
        backgroundColor: ['#F59E0B', '#8B5CF6', '#14B8A6', '#EC4899', '#6366F1'],
        hoverBackgroundColor: ['#D97706', '#7C3AED', '#0D9488', '#DB2777', '#4F46E5']
      }]
    };
  }

  private procesarEstadosSeriales(estados: any[]): void {
    const agrupado = new Map<string, number>();

    (estados || []).forEach(e => {
      // ✨ La llave ahora incluye el Local y el Estado (Ej: "Sede Principal | VENDIDO")
      // Internamente ya estás usando el idLocal (implícito al separar por nombreLocal)
      const llave = `${e.nombreLocal} | ${e.estadoDisponibilidad}`;
      const cant = agrupado.get(llave) || 0;

      agrupado.set(llave, cant + e.cantidad);
    });

    // ✨ Como ahora habrá más divisiones (Locales x Estados), ampliamos la paleta de colores
    const paletaColores = [
      '#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6',
      '#14B8A6', '#F43F5E', '#84CC16', '#06B6D4', '#6366F1'
    ];

    this.estadoSerialesData = {
      labels: Array.from(agrupado.keys()),
      datasets: [{
        data: Array.from(agrupado.values()),
        backgroundColor: paletaColores.slice(0, agrupado.size) // Toma solo los colores necesarios
      }]
    };
  }

  private mesStr(mes: number): string {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return meses[mes - 1] || 'N/A';
  }
}
