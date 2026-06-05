import { TestBed } from '@angular/core/testing';

import { FormaPagoService } from './forma-pago.service';

describe('FormaPagoService', () => {
  let service: FormaPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FormaPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
