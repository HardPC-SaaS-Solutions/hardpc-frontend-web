import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormaPagoListComponent } from './forma-pago-list.component';
import { CategoriaListComponent } from '../categoria-list/categoria-list.component';

describe('FormaPagoListComponent', () => {
  let component: FormaPagoListComponent;
  let fixture: ComponentFixture<FormaPagoListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormaPagoListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FormaPagoListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
