import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoriaService } from '../../services/categoria.service';
import { CategoriaDTO } from '../../../../core/models/categoria.dto';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-categoria-list',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TagModule],
  templateUrl: './categoria-list.component.html'
})
export class CategoriaListComponent {
  private categoriaService = inject(CategoriaService);

  categorias: CategoriaDTO[] = [];
  totalRecords: number = 0;
  loading: boolean = true;
  rowsPerPage: number = 10;

  cargarCategorias(event: any): void {
    this.loading = true;

    const page = event.first ? event.first / event.rows : 0;
    const size = event.rows || this.rowsPerPage;
    const buscar = event.globalFilter || '';

    this.categoriaService.listarPaginado(page, size, buscar).subscribe({
      next: (response) => {
        this.categorias = response.content;
        this.totalRecords = response.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al traer categorías:', err);
        this.loading = false;
      }
    });
  }
}
