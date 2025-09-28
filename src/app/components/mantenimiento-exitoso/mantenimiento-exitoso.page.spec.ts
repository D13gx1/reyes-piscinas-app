import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MantenimientoExitosoPage } from './mantenimiento-exitoso.page';

describe('MantenimientoExitosoPage', () => {
  let component: MantenimientoExitosoPage;
  let fixture: ComponentFixture<MantenimientoExitosoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MantenimientoExitosoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
