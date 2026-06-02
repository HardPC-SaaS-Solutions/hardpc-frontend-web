import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { TipoComprobanteService } from '../../services/tipo-comprobante.service';
import { TipoComprobanteDTO } from '../../../../core/models/tipo-comprobante.dto';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-tipo-comprobante-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './tipo-comprobante-list.html'
})
export class TipoComprobanteListComponent implements OnInit {

  private tipoComprobanteService = inject(TipoComprobanteService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  tiposComprobante: TipoComprobanteDTO[] = [];
  totalRecords = 0;
  loading = true;
  rowsPerPage = 10;

  tipoComprobanteForm!: FormGroup;
  modalVisible = false;
  modoEdicion = false;
  idActual: number | null = null;

  ngOnInit(): void {
    this.inicializarFormulario();
  }

  private inicializarFormulario(): void {
    this.tipoComprobanteForm = this.fb.group({
      descripcion: ['', [Validators.required, Validators.maxLength(100)]],
      codigoSunat: ['', [Validators.required, Validators.maxLength(20)]]
    });
  }

  cargarTiposComprobante(event: any): void {
    this.loading = true;

    const page = event.first ? event.first / event.rows : 0;
    const size = event.rows || this.rowsPerPage;
    const buscar = event.globalFilter || '';

    this.tipoComprobanteService.listarPaginado(page, size, buscar)
      .subscribe({
        next: (response) => {
          this.tiposComprobante = response.content;
          this.totalRecords = response.totalElements;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los registros'
          });
        }
      });
  }

  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.idActual = null;
    this.tipoComprobanteForm.reset();
    this.modalVisible = true;
  }

  abrirModalEditar(item: TipoComprobanteDTO): void {
    this.modoEdicion = true;
    this.idActual = item.id!;

    this.tipoComprobanteForm.patchValue({
      descripcion: item.descripcion,
      codigoSunat: item.codigoSunat
    });

    this.modalVisible = true;
  }

  cerrarModal(): void {
    this.modalVisible = false;
  }

  guardar(): void {

    if (this.tipoComprobanteForm.invalid) {
      this.tipoComprobanteForm.markAllAsTouched();
      return;
    }

    const data: TipoComprobanteDTO = this.tipoComprobanteForm.value;

    if (this.modoEdicion && this.idActual) {

      const existente = this.tiposComprobante.find(
        x => x.id === this.idActual
      );

      data.estado = existente?.estado;

      this.tipoComprobanteService.actualizar(this.idActual, data)
        .subscribe({
          next: () => {
            this.cerrarModal();
            this.cargarTiposComprobante({
              first: 0,
              rows: this.rowsPerPage
            });

            this.messageService.add({
              severity: 'success',
              summary: 'Actualizado',
              detail: 'Tipo de comprobante actualizado'
            });
          }
        });

    } else {

      data.estado = true;

      this.tipoComprobanteService.crear(data)
        .subscribe({
          next: () => {
            this.cerrarModal();

            this.cargarTiposComprobante({
              first: 0,
              rows: this.rowsPerPage
            });

            this.messageService.add({
              severity: 'success',
              summary: 'Creado',
              detail: 'Tipo de comprobante registrado'
            });
          }
        });
    }
  }

  eliminar(item: TipoComprobanteDTO): void {

    this.confirmationService.confirm({
      message: `¿Deseas desactivar ${item.descripcion}?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',

      accept: () => {
        this.tipoComprobanteService.eliminar(item.id!)
          .subscribe(() => {

            this.cargarTiposComprobante({
              first: 0,
              rows: this.rowsPerPage
            });

            this.messageService.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'Registro desactivado'
            });
          });
      }
    });
  }

  restaurar(item: TipoComprobanteDTO): void {

    const data = {
      ...item,
      estado: true
    };

    this.tipoComprobanteService.actualizar(item.id!, data)
      .subscribe(() => {

        this.cargarTiposComprobante({
          first: 0,
          rows: this.rowsPerPage
        });

        this.messageService.add({
          severity: 'success',
          summary: 'Restaurado',
          detail: 'Registro reactivado'
        });
      });
  }
}