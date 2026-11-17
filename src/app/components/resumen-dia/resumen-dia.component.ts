import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Tarjeta compacta con el resumen del día elegido en el inicio: cuántas
 * quedan por hacer y la barra de progreso con contador (hechas/total).
 * Los filtros por estado viven en HomePage, fijos al hacer scroll.
 *
 * La celebración (sonido, vibración) la decide HomePage, que sabe si la pantalla
 * está visible; aquí solo se anima con `celebrando`.
 */
@Component({
  selector: 'app-resumen-dia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resumen-dia.component.html',
  styleUrls: ['./resumen-dia.component.scss'],
})
export class ResumenDiaComponent {
  @Input() numero: number | string = '';
  @Input() mes = '';
  @Input() etiqueta = '';
  @Input() pendientes = 0;
  @Input() hechas = 0;
  /** Contador que se ve junto a la barra (puede ir un paso atrás hasta que se celebra) */
  @Input() hechasMostradas = 0;
  /** Porcentaje de la barra (0-100) */
  @Input() progreso = 0;
  @Input() celebrando = false;

  get total(): number {
    return this.hechas + this.pendientes;
  }
}
