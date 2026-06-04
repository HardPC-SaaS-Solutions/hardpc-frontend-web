import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipoComprobanteListComponent } from './tipo-comprobante-list.component';

describe('TipoComprobanteList', () => {
  let component: TipoComprobanteListComponent;
  let fixture: ComponentFixture<TipoComprobanteListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TipoComprobanteListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TipoComprobanteListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
