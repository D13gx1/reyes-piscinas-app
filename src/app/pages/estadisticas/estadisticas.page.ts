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
  trashOutline,
  trendingDownOutline,
  buildOutline,
  checkmarkCircle
} from 'ionicons/icons';
import { HistorialMantencionesComponent } from '../../components/historial-mantenciones/historial-mantenciones.component';

addIcons({
  'calendar-outline': calendarOutline,
  'cash-outline': cashOutline,
  'analytics-outline': analyticsOutline,
  'time-outline': timeOutline,
  'refresh-outline': refreshOutline,
  'trending-up-outline': trendingUpOutline,
  'trending-down-outline': trendingDownOutline,
  'water-outline': waterOutline,
  'flask-outline': flaskOutline,
  'trash-outline': trashOutline,
  'build-outline': buildOutline,
  'checkmark-circle': checkmarkCircle
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
    IonSelectOption,
    HistorialMantencionesComponent,
  ]
})
export class EstadisticasPage implements OnInit {
  clienteId!: string;
  periodoSeleccionado: string = 'mes';
  mesSeleccionado: number = new Date().getMonth();
  anioSeleccionado: number = new Date().getFullYear();
  fechaSeleccionada: string = this.formatDateForInput(new Date());
  isLoading: boolean = false;
  estadisticas: EstadisticasRecaudacion | null = null;
  estadisticasQuimicas: any = null;
  mantenciones: Mantencion[] = [];
  mantencionesFiltradas: Mantencion[] = [];
  filtroActual: string = 'todos';
  dineroPendiente: number = 0;
  dineroPagado: number = 0;
  isMigrationExpanded: boolean = false;
  clientesPagados: any[] = [];
  clientesPendientes: any[] = [];

  meses = [
    { valor: 0, nombre: 'Enero' },
    { valor: 1, nombre: 'Febrero' },
    { valor: 2, nombre: 'Marzo' },
    { valor: 3, nombre: 'Abril' },
    { valor: 4, nombre: 'Mayo' },
    { valor: 5, nombre: 'Junio' },
    { valor: 6, nombre: 'Julio' },
    { valor: 7, nombre: 'Agosto' },
    { valor: 8, nombre: 'Septiembre' },
    { valor: 9, nombre: 'Octubre' },
    { valor: 10, nombre: 'Noviembre' },
    { valor: 11, nombre: 'Diciembre' }
  ];

  anios: number[] = [];
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
    this.cargarAnios();
    this.cargarEstadisticas();
  }

  ionViewWillEnter() {
    this.cargarAnios();
    this.cargarEstadisticas();
  }

  cargarAnios() {
    // Cargar años disponibles de forma simple
    const anioActual = new Date().getFullYear();
    this.anios = [anioActual, anioActual - 1, anioActual - 2, anioActual - 3];
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

    console.log('Cargando mantenciones detalladas para:', this.estadisticas.fechaInicio, 'a', this.estadisticas.fechaFin);
    
    this.estadisticasService.getMantencionesDetalladas(
      this.estadisticas.fechaInicio, 
      this.estadisticas.fechaFin
    ).subscribe({
      next: (mantenciones) => {
        console.log('Mantenciones cargadas:', mantenciones);
        this.mantenciones = mantenciones;
        // No aplicar filtro aquí, el componente lo manejará
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

  formatearFechaCompleta(fecha: string): string {
    const date = new Date(fecha);
    const dia = date.getDate().toString().padStart(2, '0');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mes = meses[date.getMonth()];
    return `${dia} ${mes}`;
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Métodos para el nuevo diseño de filtros
  setFilter(filtro: string) {
    this.filtroActual = filtro;
    this.aplicarFiltro();
    
    // Actualizar las variables CSS para la animación del indicador
    this.actualizarIndicadorFiltro(filtro);
  }
  
  actualizarIndicadorFiltro(filtro: string) {
    const filtros = ['todos', 'pagados', 'pendientes'];
    const indiceActivo = filtros.indexOf(filtro);
    
    // Actualizar todas las pestañas
    filtros.forEach((nombreFiltro, index) => {
      const boton = document.querySelector(`button[style*="--tab-index: ${index};"]`) as HTMLElement;
      if (boton) {
        boton.style.setProperty('--tab-index', index.toString());
        
        // Forzar la actualización del indicador
        setTimeout(() => {
          boton.classList.toggle('active', index === indiceActivo);
        }, 10);
      }
    });
  }

  aplicarFiltro() {
    switch (this.filtroActual) {
      case 'pagados':
        this.mantencionesFiltradas = this.mantenciones.filter(m => m.pagado);
        break;
      case 'pendientes':
        this.mantencionesFiltradas = this.mantenciones.filter(m => !m.pagado);
        break;
      default:
        this.mantencionesFiltradas = [...this.mantenciones];
    }
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
        // Solución definitiva: Refrescar página completa después de la operación
        setTimeout(() => {
          console.log('Forzando recarga completa para sincronización...');
          window.location.reload();
        }, 1000);
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

    console.log('Marcando pago para:', clienteId, fecha, hora);

    this.clienteService.marcarPagoHistorial(clienteId, fecha, hora).subscribe({
      next: () => {
        console.log('Pago marcado exitosamente');
        this.mostrarToast('Pago registrado correctamente');
        
        // Solución definitiva: Refrescar página completa después de la operación
        setTimeout(() => {
          console.log('Forzando recarga completa para sincronización...');
          window.location.reload();
        }, 1000);
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
        // Solución definitiva: Refrescar página completa después de la operación
        setTimeout(() => {
          console.log('Forzando recarga completa para sincronización...');
          window.location.reload();
        }, 1000);
      },
      error: (err) => {
        console.error('Error deshaciendo pago:', err);
        this.mostrarToast('Error al deshacer pago');
      }
    });
  }

  async migrarPreciosHistorial() {
    const { firstValueFrom } = await import('rxjs');
    const clientes = await firstValueFrom(this.clienteService.getClientes());
    let migrados = 0;

    for (const cliente of clientes) {
      let modificado = false;

      cliente.historial = cliente.historial.map((registro: any) => {
        if (registro.precioCobrado === undefined || registro.precioCobrado === null) {
          modificado = true;
          return { ...registro, precioCobrado: cliente.precio };
        }
        return registro;
      });

      if (modificado) {
        await firstValueFrom(this.clienteService.updateCliente(cliente));
        migrados++;
      }
    }

    await this.mostrarToast(`✅ Migración completada: ${migrados} clientes actualizados`);
    this.cargarEstadisticas();
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

  // Método para toggle de la notificación de migración
  toggleMigration() {
    this.isMigrationExpanded = !this.isMigrationExpanded;
  }

  // Método para transformar los datos del historial al formato esperado por el componente
  transformarHistorialParaComponente(historial: any[]): any[] {
    return historial.map(item => ({
      id: `${item.fecha}_${item.hora || '00:00'}`,
      clienteId: item.clienteId || '',
      clienteNombre: item.clienteNombre || 'Cliente',
      precio: item.precio || 0,
      fecha: item.fecha,
      servicio: item.servicio || 'Mantenimiento',
      cloro: item.cloro || 0,
      ph: item.ph || 0,
      cantidadCloro: item.cantidadCloro,
      cantidadBajaPh: item.cantidadBajaPh,
      cantidadSubePh: item.cantidadSubePh,
      cantidadPastillas: item.cantidadPastillas,
      hora: item.hora,
      pagado: item.pagado || false
    }));
  }

  // Métodos para manejar eventos del historial
  verDetalleMantencion(mantencion: any) {
    console.log('Ver detalle de mantención:', mantencion);
    // Aquí puedes implementar la lógica para ver detalles
  }

  togglePago(event: {mantencion: any, evento: Event}) {
    const mantencion = event.mantencion;
    if (mantencion.pagado) {
      this.confirmarDeshacerPago(mantencion);
    } else {
      this.confirmarPago(mantencion);
    }
  }

  borrarMantencion(event: {mantencion: any, evento: Event}) {
    const mantencion = event.mantencion;
    this.confirmarBorrado(mantencion);
  }
}
