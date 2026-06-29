import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CajaService} from '../../services/caja.service';
import { CajaSesionDTO, CajaSesionRequestDTO } from '../../../../core/models/caja-sesion.dto';

import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-cierre-caja',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputNumberModule, ToastModule],
  providers: [MessageService],
  templateUrl: './cierre-caja.component.html'
})
export class CierreCajaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private cajaService = inject(CajaService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  cierreForm!: FormGroup;
  cajaActiva: CajaSesionDTO | null = null;
  procesando = false;
  verificando = true;

  ngOnInit(): void {
    this.cierreForm = this.fb.group({
      montoCierreEfectivoReal: [null, [Validators.required, Validators.min(0)]]
    });
    this.verificarCajaActiva();
  }

  private verificarCajaActiva(): void {
    this.cajaService.obtenerMiCajaActiva().subscribe({
      next: (caja) => {
        this.verificando = false;
        if (caja) {
          this.cajaActiva = caja;
        } else {
          // Si no tiene caja, lo devolvemos al listado
          this.messageService.add({ severity: 'info', summary: 'Sin Caja Activa', detail: 'No tienes ninguna caja pendiente por cerrar.' });
          setTimeout(() => this.router.navigate(['/ventas']), 2000);
        }
      },
      error: () => {
        this.verificando = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo verificar el estado de la caja.' });
      }
    });
  }

  procesarCierre(): void {
    if (this.cierreForm.invalid) {
      this.cierreForm.markAllAsTouched();
      return;
    }

    this.procesando = true;
    const monto = this.cierreForm.get('montoCierreEfectivoReal')?.value;

    this.cajaService.cerrarCaja(monto).subscribe({
      next: (res) => {
        this.procesando = false;

        // Calcular el descuadre para mostrar en el Toast (opcional, buena UX)
        const sistema = res.montoCierreSistema || 0;
        const descuadre = monto - sistema;
        let msj = descuadre === 0 ? 'Caja cuadrada perfectamente.' : `Descuadre de S/ ${Math.abs(descuadre).toFixed(2)} (${descuadre > 0 ? 'Sobrante' : 'Faltante'}).`;

        this.messageService.add({ severity: descuadre === 0 ? 'success' : 'warn', summary: 'Turno Finalizado', detail: `Caja cerrada. ${msj}` });

        setTimeout(() => this.router.navigate(['/ventas']), 3000);
      },
      error: (err) => {
        this.procesando = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo procesar el cierre de caja.' });
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/ventas']);
  }
}
