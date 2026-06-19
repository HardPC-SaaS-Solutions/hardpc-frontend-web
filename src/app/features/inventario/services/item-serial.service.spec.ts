import { TestBed } from '@angular/core/testing';

import { ItemSerialService } from './item-serial.service';

describe('ItemSerialService', () => {
  let service: ItemSerialService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ItemSerialService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
