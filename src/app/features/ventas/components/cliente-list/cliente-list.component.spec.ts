import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteListComponent } from './cliente-list.component';

describe('ClienteListComponent', () => {
  let component: ClienteListComponent;
  let fixture: ComponentFixture<ClienteListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClienteListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
