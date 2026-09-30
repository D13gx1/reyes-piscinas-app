import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  pauseCircleOutline,
  waterOutline,
  flaskOutline,
  arrowDownCircleOutline,
  arrowUpCircleOutline,
  discOutline,
  calendarOutline,
  buildOutline,
  trashOutline,
  checkmarkCircle,
  checkmarkOutline
} from 'ionicons/icons';
import { Mantencion } from '../../services/estadisticas.service';
import { formatearKgValor, formatearGramos, formatearUnidades } from '../../utils/unidades';
import { esMantencionPagada } from '../../utils/mantencion';

addIcons({
  'pause-circle-outline': pauseCircleOutline,
  'water-outline': waterOutline,
  'flask-outline': flaskOutline,
  'arrow-down-circle-outline': arrowDownCircleOutline,
  'arrow-up-circle-outline': arrowUpCircleOutline,
  'disc-outline': discOutline,
  'calendar-outline': calendarOutline,
  'build-outline': buildOutline,
  'trash-outline': trashOutline,
  'checkmark-circle': checkmarkCircle,
  'checkmark-outline': checkmarkOutline,
});

// Tipo intermedio para compatibilidad entre diferentes servicios
interface HistorialItem {
  id: string;
  clienteId: string;
  clienteNombre: string;
  precio: number;
  fecha: string;
  servicio?: string;
  cloro: number;
  ph: number;
  /** Kilos de cloro granulado */
  cantidadCloro?: number;
  /** Kilos de baja pH */
  cantidadBajaPh?: number;
  /** Kilos de sube pH */
  cantidadSubePh?: number;
  /** Unidades de pastillas de cloro */
  cantidadPastillas?: number;
  hora?: string;
  /** `id` del registro en el historial (ausente en registros antiguos) */
  registroId?: string;
  pagado?: boolean;
  suspendida?: boolean;
}

@Component({
  selector: 'app-historial-mantenciones',
  templateUrl: './historial-mantenciones.component.html',
  styleUrls: ['./historial-mantenciones.component.scss'],
  standalone: true,
  // El template llama a ~20 métodos por fila (formateo de precio, fecha, niveles
  // de cloro y pH). Con la estrategia por defecto eso se re-ejecutaba en cada
  // ciclo de detección aunque la lista no hubiera cambiado; con OnPush solo
  // corre cuando el padre reemplaza el array de entrada.
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonicModule,
  ],
})
export class HistorialMantencionesComponent implements OnInit, OnChanges {
  @Input() mantenciones: any[] = [];
  @Input() titulo: string = 'Historial de Mantenciones';
  @Input() mostrarFiltros: boolean = true;
  @Input() filtroInicial: string = 'todos';
  
  @Output() onMantencionClick = new EventEmitter<any>();
  @Output() onPagoToggle = new EventEmitter<{mantencion: any, evento: Event}>();
  @Output() onBorrarClick = new EventEmitter<{mantencion: any, evento: Event}>();

  filtroActual: string = 'todos';
  mantencionesFiltradas: Mantencion[] = [];

  private readonly currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  });

  private readonly dateFormatter = new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  private readonly badgeStyles: Record<string, Record<string, string>> = {
    success: {
      background: '#dcfce7', color: '#15803d'
    },
    warning: {
      background: '#fef3c7', color: '#d97706'
    },
    danger: {
      background: '#fee2e2', color: '#dc2626'
    },
    medium: {
      background: '#f1f5f9', color: '#64748b'
    }
  };

  constructor() { }

  ngOnInit() {
    this.filtroActual = this.filtroInicial;
    this.aplicarFiltro();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Detectar cambios en las mantenciones y aplicar filtro
    if (changes['mantenciones'] && !changes['mantenciones'].firstChange) {
      this.aplicarFiltro();
    }
  }

  setFilter(filtro: string) {
    this.filtroActual = filtro;
    this.aplicarFiltro();
    this.actualizarIndicadorFiltro(filtro);
  }

  private actualizarIndicadorFiltro(filtro: string) {
    const filtros = ['todos', 'pagados', 'pendientes'];
    const indiceActivo = filtros.indexOf(filtro);
    
    // Actualizar todas las pestañas
    filtros.forEach((nombreFiltro, index) => {
      const boton = document.querySelector(`.filter-tab[style*="--tab-index: ${index};"]`) as HTMLElement;
      if (boton) {
        boton.style.setProperty('--tab-index', index.toString());
        boton.classList.toggle('active', index === indiceActivo);
      }
    });
  }

  private aplicarFiltro() {
    switch (this.filtroActual) {
      case 'pagados':
        this.mantencionesFiltradas = this.mantenciones.filter((m: any) => esMantencionPagada(m));
        break;
      case 'pendientes':
        this.mantencionesFiltradas = this.mantenciones.filter((m: any) => !esMantencionPagada(m));
        break;
      default:
        this.mantencionesFiltradas = this.mantenciones;
        break;
    }
  }

  /** Usado por el template para el botón de pago. */
  esPagado(mantencion: Mantencion): boolean {
    return esMantencionPagada(mantencion);
  }

  trackByMantencion(_index: number, mantencion: Mantencion): string {
    return mantencion.id;
  }

  // Métodos de formateo (deberían moverse a un servicio compartido)
  formatearPrecio(precio: number): string {
    return this.currencyFormatter.format(precio || 0);
  }

  formatearFechaCompleta(fecha: any): string {
    if (!fecha) return 'N/A';
    
    const date = this.parseFechaLocal(fecha);
    return this.dateFormatter.format(date);
  }

  private parseFechaLocal(fecha: string | Date): Date {
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const [year, month, day] = fecha.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    return new Date(fecha);
  }

  // ===== Formato de unidades químicas =====
  // Los valores llegan en kilos; cada producto muestra el kg grande y el equivalente en gramos debajo.

  formatearKgValor = formatearKgValor;
  formatearGramos = formatearGramos;
  formatearUnidades = formatearUnidades;

  // Métodos para determinar niveles (deberían moverse a un servicio compartido)
  getNivelCloro(cloro: number): string {
    if (!cloro) return 'Sin datos';
    if (cloro >= 1.0 && cloro <= 3.0) return 'Ideal';
    if (cloro < 1.0) return 'Bajo';
    return 'Alto';
  }

  getColorNivel(nivel: string): string {
    switch (nivel) {
      case 'Ideal': return 'success';
      case 'Bajo': return 'warning';
      case 'Alto': return 'danger';
      default: return 'medium';
    }
  }

  getNivelPh(ph: number): string {
    if (!ph) return 'Sin datos';
    if (ph >= 7.2 && ph <= 7.6) return 'Ideal';
    if (ph < 7.2) return 'Bajo';
    return 'Alto';
  }

  getBadgeStyle(color: string): any {
    return this.badgeStyles[color] || this.badgeStyles['medium'];
  }

  // Event handlers
  onMantencionSelected(mantencion: any, evento: Event) {
    evento.stopPropagation();
    this.onMantencionClick.emit(mantencion);
  }

  onPagoClick(mantencion: any, evento: Event) {
    evento.stopPropagation();
    this.onPagoToggle.emit({ mantencion, evento });
  }

  onBorrar(mantencion: any, evento: Event) {
    evento.stopPropagation();
    this.onBorrarClick.emit({ mantencion, evento });
  }
}
