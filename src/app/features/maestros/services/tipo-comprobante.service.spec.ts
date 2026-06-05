import { TestBed } from '@angular/core/testing';

import { TipoComprobanteService } from './tipo-comprobante.service';

describe('TipoComprobanteService', () => {
  let service: TipoComprobanteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TipoComprobanteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
