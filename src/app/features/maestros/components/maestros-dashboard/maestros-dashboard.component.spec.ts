import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaestrosDashboardComponent } from './maestros-dashboard.component';

describe('MaestrosDashboardComponent', () => {
  let component: MaestrosDashboardComponent;
  let fixture: ComponentFixture<MaestrosDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaestrosDashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MaestrosDashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
