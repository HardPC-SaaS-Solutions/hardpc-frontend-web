import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnidadMedidaListComponent } from './unidad-medida-list.component';

describe('UnidadMedidaListComponent', () => {
  let component: UnidadMedidaListComponent;
  let fixture: ComponentFixture<UnidadMedidaListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnidadMedidaListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UnidadMedidaListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
