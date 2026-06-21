import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IngresoFormComponent } from './ingreso-form.component';

describe('IngresoFormComponent', () => {
  let component: IngresoFormComponent;
  let fixture: ComponentFixture<IngresoFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngresoFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IngresoFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
