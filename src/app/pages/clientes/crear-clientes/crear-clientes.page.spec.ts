import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrearClientesPage } from './crear-clientes.page';

describe('CrearClientesPage', () => {
  let component: CrearClientesPage;
  let fixture: ComponentFixture<CrearClientesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearClientesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
