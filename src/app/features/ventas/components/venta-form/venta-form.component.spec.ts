import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VentaFormComponent } from './venta-form.component';

describe('VentaFormComponent', () => {
  let component: VentaFormComponent;
  let fixture: ComponentFixture<VentaFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VentaFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VentaFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
