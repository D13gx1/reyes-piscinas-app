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
  IonButtons,
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
  IonSelectOption,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { EstadisticasService, EstadisticasRecaudacion, Mantencion } from '../../services/estadisticas.service';
import { ClienteService } from '../../services/cliente.service';
import { addIcons } from 'ionicons';
import { 
  calendarOutline, 
  cashOutline, 
  analyticsOutline, 
  timeOutline,
  refreshOutline,
  trendingUpOutline,
  waterOutline,
  flaskOutline,
  trashOutline
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
  'trash-outline': trashOutline
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
    IonButtons,
    IonIcon,
    IonList,
    IonItem,
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
  dineroPagado = 0;
  dineroPendiente = 0;
  clientesPagados: Mantencion[] = [];
  clientesPendientes: Mantencion[] = [];
  
  
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

  nombrePeriodos: Record<string, string> = {
    dia: 'Día',
    mes: 'Mes',
    anio: 'Año'
  };

  constructor(
    private estadisticasService: EstadisticasService,
    private clienteService: ClienteService,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

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
        this.cargarDineroPagos();
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
        this.cargarDineroPagos();
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
        this.cargarDineroPagos();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando estadísticas del año:', err);
        this.isLoading = false;
      }
    });
  }

  cargarDineroPagos() {
    if (!this.estadisticas) return;

    this.estadisticasService.clientePagoListo(this.estadisticas.fechaInicio, this.estadisticas.fechaFin).subscribe({
      next: (res) => {
        this.dineroPagado = res.dineroPagado || 0;
        this.clientesPagados = res.mantenciones || [];
      },
      error: (err) => {
        console.error('Error cargando clientes pagados:', err);
      }
    });

    this.estadisticasService.clientesPagoPendiente(this.estadisticas.fechaInicio, this.estadisticas.fechaFin).subscribe({
      next: (res) => {
        this.dineroPendiente = res.dineroPendiente || 0;
        this.clientesPendientes = res.mantenciones || [];
      },
      error: (err) => {
        console.error('Error cargando clientes pendientes:', err);
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

  async confirmarBorrado(mantencion: Mantencion) {
    const alert = await this.alertController.create({
      header: 'Confirmar borrado',
      message: `¿Está seguro que desea borrar el registro de mantención para ${mantencion.clienteNombre} del ${this.formatearFechaCorta(mantencion.fecha)}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Borrar',
          role: 'destructive',
          handler: () => {
            this.borrarRegistroHistorial(mantencion);
          }
        }
      ]
    });

    await alert.present();
  }

  borrarRegistroHistorial(mantencion: Mantencion) {
    // Extraer el ID del cliente de la propiedad id de la mantención
    const clienteId = mantencion.clienteId;
    const fecha = mantencion.fecha;
    const hora = mantencion.hora || '00:00';

    this.clienteService.borrarRegistroHistorial(clienteId, fecha, hora).subscribe({
      next: () => {
        this.mostrarToast('Registro eliminado correctamente');
        // Recargar las estadísticas para reflejar el cambio
        this.cargarEstadisticas();
      },
      error: (error) => {
        console.error('Error al borrar el registro:', error);
        this.mostrarToast('Error al eliminar el registro');
      }
    });
  }

  async confirmarPago(mantencion: Mantencion) {
    const alert = await this.alertController.create({
      header: 'Confirmar pago',
      message: `¿Marcar como pagado el servicio para ${mantencion.clienteNombre} del ${this.formatearFechaCorta(mantencion.fecha)}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Marcar pago', handler: () => this.marcarPago(mantencion) }
      ]
    });

    await alert.present();
  }

  marcarPago(mantencion: Mantencion) {
    const clienteId = mantencion.clienteId;
    const fecha = mantencion.fecha;
    const hora = mantencion.hora || '00:00';

    this.clienteService.marcarPagoHistorial(clienteId, fecha, hora).subscribe({
      next: () => {
        this.mostrarToast('Pago registrado correctamente');
        this.cargarEstadisticas();
      },
      error: (err) => {
        console.error('Error marcando pago:', err);
        this.mostrarToast('Error al registrar pago');
      }
    });
  }

  async confirmarDeshacerPago(mantencion: Mantencion) {
    const alert = await this.alertController.create({
      header: 'Confirmar deshacer pago',
      message: `¿Deshacer pago del servicio para ${mantencion.clienteNombre} del ${this.formatearFechaCorta(mantencion.fecha)}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Deshacer pago', handler: () => this.deshacerPago(mantencion) }
      ]
    });

    await alert.present();
  }

  deshacerPago(mantencion: Mantencion) {
    const clienteId = mantencion.clienteId;
    const fecha = mantencion.fecha;
    const hora = mantencion.hora || '00:00';

    this.clienteService.deshacerPagoHistorial(clienteId, fecha, hora).subscribe({
      next: () => {
        this.mostrarToast('Pago deshecho correctamente');
        this.cargarEstadisticas();
      },
      error: (err) => {
        console.error('Error deshaciendo pago:', err);
        this.mostrarToast('Error al deshacer pago');
      }
    });
  }

  async mostrarToast(mensaje: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  // Funciones para categorizar niveles químicos
  getNivelCloro(cloro: number): string {
    if (cloro < 1.0) return 'Bajo';
    if (cloro < 1.5) return 'Ideal Bajo';
    if (cloro < 2.0) return 'Ideal';
    if (cloro < 2.5) return 'Ideal Alto';
    return 'Alto';
  }

  getNivelPh(ph: number): string {
    if (ph < 7.2) return 'Bajo';
    if (ph < 7.4) return 'Ideal Bajo';
    if (ph < 7.6) return 'Ideal';
    if (ph < 7.8) return 'Ideal Alto';
    return 'Alto';
  }

  getColorNivel(nivel: string): string {
    switch (nivel) {
      case 'Bajo': return 'danger';
      case 'Ideal Bajo': return 'warning';
      case 'Ideal': return 'success';
      case 'Ideal Alto': return 'warning';
      case 'Alto': return 'danger';
      default: return 'medium';
    }
  }
}
