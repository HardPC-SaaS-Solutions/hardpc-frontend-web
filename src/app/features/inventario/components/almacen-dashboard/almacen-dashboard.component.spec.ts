import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlmacenDashboardComponent } from './almacen-dashboard.component';

describe('AlmacenDashboardComponent', () => {
  let component: AlmacenDashboardComponent;
  let fixture: ComponentFixture<AlmacenDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlmacenDashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AlmacenDashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
