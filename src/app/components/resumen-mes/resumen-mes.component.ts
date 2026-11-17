import { Component, ChangeDetectionStrategy, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trendingUpOutline, trendingDownOutline, trophyOutline, bulbOutline, closeOutline } from 'ionicons/icons';
import { ResumenMes, ResumenMesService } from '../../services/resumen-mes.service';
import { celebrarProgreso } from '../../utils/celebracion';

addIcons({
  'trending-up-outline': trendingUpOutline,
  'trending-down-outline': trendingDownOutline,
  'trophy-outline': trophyOutline,
  'bulb-outline': bulbOutline,
  'close-outline': closeOutline,
});

/** Pieza de confeti con su posición, color y retraso ya decididos */
interface Confeti {
  izquierda: number;
  retraso: number;
  duracion: number;
  color: string;
  giro: number;
}

const COLORES_CONFETI = ['#16a34a', '#22c55e', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ec4899'];

/**
 * Tarjeta de cierre de mes: felicita si se recaudó más que el mes anterior y
 * anima si fue menos. Vive en el contenedor de pestañas para verse en cualquier
 * pantalla; la abre ResumenMesService.
 */
@Component({
  selector: 'app-resumen-mes',
  templateUrl: './resumen-mes.component.html',
  styleUrls: ['./resumen-mes.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonIcon],
})
export class ResumenMesComponent {
  private servicio = inject(ResumenMesService);

  readonly resumen = this.servicio.actual;
  readonly avisos = this.servicio.avisos;
  readonly panelAbierto = this.servicio.panelAbierto;

  /** Igualar al mes anterior también se celebra */
  readonly subio = computed(() => {
    const r = this.resumen();
    return !!r && r.total >= r.totalAnterior;
  });

  readonly confeti: Confeti[] = Array.from({ length: 28 }, (_, i) => ({
    izquierda: Math.random() * 100,
    retraso: Math.random() * 0.6,
    duracion: 2.2 + Math.random() * 1.4,
    color: COLORES_CONFETI[i % COLORES_CONFETI.length],
    giro: Math.random() * 360,
  }));

  private readonly formato = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

  constructor() {
    // Al aparecer un mes mejor suena el acorde de "día completo"
    effect(() => {
      if (this.resumen() && this.subio()) celebrarProgreso(true);
    });
  }

  cerrar() {
    this.servicio.cerrar();
  }

  cerrarPanel() {
    this.servicio.cerrarPanel();
  }

  abrirAviso(resumen: ResumenMes) {
    this.servicio.abrirAviso(resumen);
  }

  /** Para cada fila de la campana (subio() es solo para la tarjeta abierta) */
  subioMes(r: ResumenMes): boolean {
    return r.total >= r.totalAnterior;
  }

  /** Aún no se abre: etiqueta "Nuevo"; al tocarlo deja de serlo */
  esNuevo(r: ResumenMes): boolean {
    return this.servicio.esNuevo(r);
  }

  /** "Mejor que agosto · +19%", "Más bajo que agosto · −15%", "Primer mes con ingresos" */
  resumenCorto(r: ResumenMes): string {
    if (!r.totalAnterior) return 'Primer mes con ingresos';
    const p = this.porcentaje(r) ?? 0;
    if (r.total === r.totalAnterior) return `Igual que ${r.mesAnterior}`;
    return this.subioMes(r)
      ? `Mejor que ${r.mesAnterior} · +${p}%`
      : `Más bajo que ${r.mesAnterior} · −${Math.abs(p)}%`;
  }

  monto(valor: number): string {
    return '$' + this.formato.format(Math.round(valor || 0));
  }

  /** Diferencia con el mes anterior en %, o null si el anterior fue 0 */
  porcentaje(r: ResumenMes): number | null {
    if (!r.totalAnterior) return null;
    return Math.round(((r.total - r.totalAnterior) / r.totalAnterior) * 100);
  }

  diferencia(r: ResumenMes): number {
    return Math.abs(r.total - r.totalAnterior);
  }

  titular(r: ResumenMes): string {
    if (!this.subio()) return `${r.mes} fue un mes más tranquilo`;
    if (!r.totalAnterior) return `${r.mes} fue tu primer mes con ingresos`;
    if (r.total === r.totalAnterior) return `${r.mes} igualó a ${r.mesAnterior}`;
    return `${r.mes} fue mejor que ${r.mesAnterior}`;
  }

  /** Mantenciones del mes frente al anterior: "+7" / "−3" / "igual" */
  cambioCantidad(r: ResumenMes): string {
    const d = r.cantidad - r.cantidadAnterior;
    if (d === 0) return `igual que ${r.mesAnterior}`;
    return `${d > 0 ? '+' : '−'}${Math.abs(d)} vs ${r.mesAnterior}`;
  }

  /** Consejo según la temporada que viene (Chile: verano de diciembre a febrero) */
  consejo(r: ResumenMes): string {
    const siguiente = (r.indiceMes + 1) % 12;
    if ([10, 11, 0, 1].includes(siguiente)) {
      return `Se viene la temporada alta de piscinas: ${r.mesSiguiente} es buen momento para sumar clientes nuevos.`;
    }
    if ([2, 3].includes(siguiente)) {
      return `Termina el verano: ofrece a tus clientes la mantención de cierre de temporada.`;
    }
    if ([4, 5, 6, 7].includes(siguiente)) {
      return `En invierno las piscinas piden menos: aprovecha de ofrecer planes mensuales.`;
    }
    return `Se acerca la primavera: es el momento de preparar las piscinas para el verano.`;
  }
}
