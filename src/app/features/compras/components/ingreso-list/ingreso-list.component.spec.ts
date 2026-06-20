import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IngresoListComponent } from './ingreso-list.component';

describe('IngresoListComponent', () => {
  let component: IngresoListComponent;
  let fixture: ComponentFixture<IngresoListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngresoListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IngresoListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
