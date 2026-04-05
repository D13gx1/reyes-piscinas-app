import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Mantencion } from '../../services/estadisticas.service';

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
  cantidadCloro?: number;
  cantidadBajaPh?: number;
  cantidadSubePh?: number;
  cantidadPastillas?: number;
  hora?: string;
  pagado?: boolean;
}

@Component({
  selector: 'app-historial-mantenciones',
  templateUrl: './historial-mantenciones.component.html',
  styleUrls: ['./historial-mantenciones.component.scss'],
  standalone: true,
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
        this.mantencionesFiltradas = this.mantenciones.filter((m: any) => m.pagado);
        break;
      case 'pendientes':
        this.mantencionesFiltradas = this.mantenciones.filter((m: any) => !m.pagado);
        break;
      default:
        this.mantencionesFiltradas = this.mantenciones;
        break;
    }
  }

  // Métodos de formateo (deberían moverse a un servicio compartido)
  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(precio || 0);
  }

  formatearFechaCompleta(fecha: any): string {
    if (!fecha) return 'N/A';
    
    const date = new Date(fecha);
    const opciones: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    };
    
    return date.toLocaleDateString('es-CL', opciones);
  }

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
    const styles: Record<string, any> = {
      success: {
        background: '#dcfce7',
        color: '#15803d',
        padding: '4px 12px',
        borderRadius: '999px',
        fontWeight: '600',
        fontSize: '0.8rem'
      },
      warning: {
        background: '#fef3c7',
        color: '#d97706',
        padding: '4px 12px',
        borderRadius: '999px',
        fontWeight: '600',
        fontSize: '0.8rem'
      },
      danger: {
        background: '#fee2e2',
        color: '#dc2626',
        padding: '4px 12px',
        borderRadius: '999px',
        fontWeight: '600',
        fontSize: '0.8rem'
      },
      medium: {
        background: '#f1f5f9',
        color: '#64748b',
        padding: '4px 12px',
        borderRadius: '999px',
        fontWeight: '600',
        fontSize: '0.8rem'
      }
    };
    
    return styles[color as keyof typeof styles] || styles['medium'];
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
