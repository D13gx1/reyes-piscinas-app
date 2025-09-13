import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistorialClientePage } from './historial-cliente.page';

describe('HistorialClientePage', () => {
  let component: HistorialClientePage;
  let fixture: ComponentFixture<HistorialClientePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HistorialClientePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
