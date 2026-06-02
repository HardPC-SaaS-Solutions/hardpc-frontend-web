import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { LocalService } from '../../services/local.service';
import { LocalDTO } from '../../../../core/models/local.dto';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-local-list',
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
  templateUrl: './local-list.html'
})
export class LocalListComponent implements OnInit {

  private localService = inject(LocalService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  locales: LocalDTO[] = [];
  totalRecords = 0;
  loading = true;
  rowsPerPage = 10;

  localForm!: FormGroup;
  modalVisible = false;
  modoEdicion = false;
  idActual: number | null = null;

  ngOnInit(): void {
    this.inicializarFormulario();
  }

  private inicializarFormulario(): void {
    this.localForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      direccion: ['', [Validators.required, Validators.maxLength(255)]],
      telefono: ['', [Validators.required, Validators.maxLength(20)]],
      fotoPortadaUrl: ['', [Validators.maxLength(255)]]
    });
  }

  cargarLocales(event: any): void {

    this.loading = true;

    const page = event.first ? event.first / event.rows : 0;
    const size = event.rows || this.rowsPerPage;
    const buscar = event.globalFilter || '';

    this.localService.listarPaginado(page, size, buscar)
      .subscribe({
        next: (response) => {
          this.locales = response.content;
          this.totalRecords = response.totalElements;
          this.loading = false;
        },
        error: () => {
          this.loading = false;

          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los locales'
          });
        }
      });
  }

  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.idActual = null;
    this.localForm.reset();
    this.modalVisible = true;
  }

  abrirModalEditar(local: LocalDTO): void {

    this.modoEdicion = true;
    this.idActual = local.id!;

    this.localForm.patchValue({
      nombre: local.nombre,
      direccion: local.direccion,
      telefono: local.telefono,
      fotoPortadaUrl: local.fotoPortadaUrl
    });

    this.modalVisible = true;
  }

  cerrarModal(): void {
    this.modalVisible = false;
  }

  guardar(): void {

    if (this.localForm.invalid) {
      this.localForm.markAllAsTouched();
      return;
    }

    const data: LocalDTO = this.localForm.value;

    if (this.modoEdicion && this.idActual) {

      const existente = this.locales.find(
        x => x.id === this.idActual
      );

      data.estado = existente?.estado;

      this.localService.actualizar(this.idActual, data)
        .subscribe({
          next: () => {

            this.cerrarModal();

            this.cargarLocales({
              first: 0,
              rows: this.rowsPerPage
            });

            this.messageService.add({
              severity: 'success',
              summary: 'Actualizado',
              detail: 'Local actualizado correctamente'
            });
          }
        });

    } else {

      data.estado = true;

      this.localService.crear(data)
        .subscribe({
          next: () => {

            this.cerrarModal();

            this.cargarLocales({
              first: 0,
              rows: this.rowsPerPage
            });

            this.messageService.add({
              severity: 'success',
              summary: 'Creado',
              detail: 'Local registrado correctamente'
            });
          }
        });
    }
  }

  eliminar(local: LocalDTO): void {

    this.confirmationService.confirm({
      message: `¿Deseas desactivar el local ${local.nombre}?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',

      accept: () => {

        this.localService.eliminar(local.id!)
          .subscribe(() => {

            this.cargarLocales({
              first: 0,
              rows: this.rowsPerPage
            });

            this.messageService.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'Local desactivado correctamente'
            });
          });
      }
    });
  }

  restaurar(local: LocalDTO): void {

    const data: LocalDTO = {
      ...local,
      estado: true
    };

    this.localService.actualizar(local.id!, data)
      .subscribe(() => {

        this.cargarLocales({
          first: 0,
          rows: this.rowsPerPage
        });

        this.messageService.add({
          severity: 'success',
          summary: 'Restaurado',
          detail: 'Local reactivado correctamente'
        });
      });
  }
}