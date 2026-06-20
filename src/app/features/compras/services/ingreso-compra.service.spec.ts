import { TestBed } from '@angular/core/testing';

import { IngresoCompraService } from './ingreso-compra.service';

describe('IngresoCompraService', () => {
  let service: IngresoCompraService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IngresoCompraService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
