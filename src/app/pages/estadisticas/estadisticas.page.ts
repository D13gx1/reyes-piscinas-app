import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonItemDivider,
  IonBadge,
  IonSpinner,
  IonGrid,
  IonRow,
  IonCol,
  IonChip,
  IonSelect,
  IonSelectOption
} from '@ionic/angular/standalone';
import { EstadisticasService, EstadisticasRecaudacion, Mantencion } from '../../services/estadisticas.service';
import { addIcons } from 'ionicons';
import { 
  calendarOutline, 
  cashOutline, 
  analyticsOutline, 
  timeOutline,
  refreshOutline,
  trendingUpOutline,
  waterOutline,
  flaskOutline
} from 'ionicons/icons';

addIcons({
  'calendar-outline': calendarOutline,
  'cash-outline': cashOutline,
  'analytics-outline': analyticsOutline,
  'time-outline': timeOutline,
  'refresh-outline': refreshOutline,
  'trending-up-outline': trendingUpOutline,
  'water-outline': waterOutline,
  'flask-outline': flaskOutline,
});

@Component({
  selector: 'app-estadisticas',
  templateUrl: './estadisticas.page.html',
  styleUrls: ['./estadisticas.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    CommonModule, 
    FormsModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonItemDivider,
    IonBadge,
    IonSpinner,
    IonGrid,
    IonRow,
    IonCol,
    IonChip,
    IonSelect,
    IonSelectOption
  ]
})
export class EstadisticasPage implements OnInit {
  periodoSeleccionado: 'dia' | 'mes' | 'anio' = 'dia';
  estadisticas: EstadisticasRecaudacion | null = null;
  mantenciones: Mantencion[] = [];
  estadisticasQuimicas: any = null;
  isLoading = false;
  
  // Fechas para selección
  fechaSeleccionada = new Date().toISOString().split('T')[0];
  mesSeleccionado = new Date().getMonth() + 1;
  anioSeleccionado = new Date().getFullYear();
  
  // Opciones para selectores
  meses = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ];

  anios = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  constructor(private estadisticasService: EstadisticasService) { }

  ngOnInit() {
    this.cargarEstadisticas();
  }

  ionViewWillEnter() {
    this.cargarEstadisticas();
  }

  cargarEstadisticas() {
    this.isLoading = true;
    
    switch (this.periodoSeleccionado) {
      case 'dia':
        this.cargarEstadisticasDia();
        break;
      case 'mes':
        this.cargarEstadisticasMes();
        break;
      case 'anio':
        this.cargarEstadisticasAnio();
        break;
    }
  }

  cargarEstadisticasDia() {
    this.estadisticasService.getEstadisticasDia(this.fechaSeleccionada).subscribe({
      next: (stats) => {
        this.estadisticas = stats;
        this.cargarMantencionesDetalladas();
        this.cargarEstadisticasQuimicas();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando estadísticas del día:', err);
        this.isLoading = false;
      }
    });
  }

  cargarEstadisticasMes() {
    this.estadisticasService.getEstadisticasMes(this.anioSeleccionado, this.mesSeleccionado).subscribe({
      next: (stats) => {
        this.estadisticas = stats;
        this.cargarMantencionesDetalladas();
        this.cargarEstadisticasQuimicas();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando estadísticas del mes:', err);
        this.isLoading = false;
      }
    });
  }

  cargarEstadisticasAnio() {
    this.estadisticasService.getEstadisticasAnio(this.anioSeleccionado).subscribe({
      next: (stats) => {
        this.estadisticas = stats;
        this.cargarMantencionesDetalladas();
        this.cargarEstadisticasQuimicas();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando estadísticas del año:', err);
        this.isLoading = false;
      }
    });
  }

  cargarMantencionesDetalladas() {
    if (!this.estadisticas) return;

    this.estadisticasService.getMantencionesDetalladas(
      this.estadisticas.fechaInicio, 
      this.estadisticas.fechaFin
    ).subscribe({
      next: (mantenciones) => {
        this.mantenciones = mantenciones;
      },
      error: (err) => {
        console.error('Error cargando mantenciones detalladas:', err);
      }
    });
  }

  cargarEstadisticasQuimicas() {
    if (!this.estadisticas) return;

    this.estadisticasService.getEstadisticasQuimicas(
      this.estadisticas.fechaInicio, 
      this.estadisticas.fechaFin
    ).subscribe({
      next: (stats) => {
        this.estadisticasQuimicas = stats;
      },
      error: (err) => {
        console.error('Error cargando estadísticas químicas:', err);
      }
    });
  }

  onPeriodoChange() {
    this.cargarEstadisticas();
  }

  onFechaChange() {
    if (this.periodoSeleccionado === 'dia') {
      this.cargarEstadisticas();
    }
  }

  onMesChange() {
    if (this.periodoSeleccionado === 'mes') {
      this.cargarEstadisticas();
    }
  }

  onAnioChange() {
    if (this.periodoSeleccionado === 'mes' || this.periodoSeleccionado === 'anio') {
      this.cargarEstadisticas();
    }
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(precio);
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatearFechaCorta(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-CL');
  }

  getNombreMes(mes: number): string {
    return this.meses.find(m => m.valor === mes)?.nombre || '';
  }

  async refrescarEstadisticas() {
    this.isLoading = true;
    setTimeout(() => {
      this.cargarEstadisticas();
    }, 500);
  }
}
