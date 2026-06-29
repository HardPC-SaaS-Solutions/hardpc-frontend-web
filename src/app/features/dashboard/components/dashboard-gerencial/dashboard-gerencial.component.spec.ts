import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardGerencialComponent } from './dashboard-gerencial.component';

describe('DashboardGerencialComponent', () => {
  let component: DashboardGerencialComponent;
  let fixture: ComponentFixture<DashboardGerencialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardGerencialComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardGerencialComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
