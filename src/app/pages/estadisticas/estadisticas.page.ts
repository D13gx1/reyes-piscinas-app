import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonToolbar, 
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { EstadisticasService, EstadisticasRecaudacion, EstadisticasQuimicas, Mantencion } from '../../services/estadisticas.service';
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
  checkmarkCircle,
  scaleOutline,
  discOutline,
  arrowDownCircleOutline,
  arrowUpCircleOutline,
  walletOutline,
  receiptOutline,
  hourglassOutline,
  checkmarkDoneOutline,
  calculatorOutline,
  chevronBackOutline,
  chevronForwardOutline,
  chevronDownOutline
} from 'ionicons/icons';
import { HistorialMantencionesComponent } from '../../components/historial-mantenciones/historial-mantenciones.component';
import { GraficoIngresosComponent } from '../../components/grafico-ingresos/grafico-ingresos.component';
import { OpcionDesplegable } from '../../components/desplegable/desplegable.component';
import { EncabezadoComponent } from '../../components/encabezado/encabezado.component';
import { formatearGramos, formatearUnidades, formatearKgValor } from '../../utils/unidades';
import { esMantencionPagada, totalCobrado } from '../../utils/mantencion';
import { take } from 'rxjs/operators';
import { ContadorGanancia } from '../../utils/celebracion';
import { COLOR_PRODUCTO } from '../../utils/servicios';
import { MUESTRA_CLORO, MUESTRA_PH, estadoCloroDe, estadoPhDe, etiquetaNivel } from '../../utils/niveles';

/** Cuántas visitas del período quedaron en un estado del agua */
interface ResumenNivel {
  estado: string;
  etiqueta: string;
  cantidad: number;
  porcentaje: number;
  muestra: string;
}

/** De bajo a alto: así se lee la barra de izquierda a derecha */
const ORDEN_NIVELES = ['bajo', 'ideal bajo', 'ideal', 'ideal alto', 'alto'];

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
  'checkmark-circle': checkmarkCircle,
  'scale-outline': scaleOutline,
  'disc-outline': discOutline,
  'arrow-down-circle-outline': arrowDownCircleOutline,
  'arrow-up-circle-outline': arrowUpCircleOutline,
  'wallet-outline': walletOutline,
  'receipt-outline': receiptOutline,
  'hourglass-outline': hourglassOutline,
  'checkmark-done-outline': checkmarkDoneOutline,
  'chevron-back-outline': chevronBackOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'chevron-down-outline': chevronDownOutline,
  'calculator-outline': calculatorOutline
});

@Component({
  selector: 'app-estadisticas',
  templateUrl: './estadisticas.page.html',
  styleUrls: ['./estadisticas.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader, 
    IonToolbar, 
    CommonModule, 
    FormsModule,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    HistorialMantencionesComponent,
    GraficoIngresosComponent,
    EncabezadoComponent,
  ]
})
export class EstadisticasPage implements OnInit {
  private destroyRef = inject(DestroyRef);
  clienteId!: string;
  periodoSeleccionado: string = 'mes';
  mesSeleccionado: number = new Date().getMonth();
  anioSeleccionado: number = new Date().getFullYear();
  fechaSeleccionada: string = this.formatDateForInput(new Date());
  isLoading: boolean = false;
  estadisticas: EstadisticasRecaudacion | null = null;
  estadisticasQuimicas: EstadisticasQuimicas | null = null;
  /** Cuántas visitas del período quedaron ideales, bajas, altas... */
  nivelesCloro: ResumenNivel[] = [];
  nivelesPh: ResumenNivel[] = [];
  mantenciones: Mantencion[] = [];
  mantencionesFiltradas: Mantencion[] = [];
  filtroActual: string = 'todos';
  dineroPendiente: number = 0;
  dineroPagado: number = 0;
  isMigrationExpanded: boolean = false;
  clientesPagados: any[] = [];
  clientesPendientes: any[] = [];

  /**
   * Derivado de `mantenciones`, recalculado solo cuando llegan datos nuevos. El
   * template no lo transforma en línea a propósito: crear un array nuevo en cada
   * ciclo de detección invalidaba el `@Input` del componente hijo y re-renderizaba
   * la lista entera aunque no hubiera cambiado nada.
   */
  mantencionesParaComponente: any[] = [];

  // Se construye una vez: el template lo llama varias veces por ciclo de
  // detección y crear un Intl.NumberFormat en cada llamada es caro.
  private readonly currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  });

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

  /** Lo ganado en el mes en curso (mismo cálculo que el gráfico), para el encabezado */
  gananciaMesActual = 0;
  /** Chip del encabezado que cuenta todo lo ganado al marcar un pago */
  readonly contadorGanancia = new ContadorGanancia();

  ngOnInit() {
    const hoy = new Date();
    this.estadisticasService
      .getIngresosPorAnio()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(anios => {
        this.gananciaMesActual = anios.find(a => a.anio === hoy.getFullYear())?.meses[hoy.getMonth()].total ?? 0;
      });

    this.cargarAnios();
    // Se recalcula cada vez que cambian los clientes (pagos, mantenciones nuevas…),
    // así que volver a esta pestaña no necesita recargar nada
    this.clienteService.clientes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargarEstadisticas());
  }

  cargarAnios() {
    // Cargar años disponibles de forma simple
    const anioActual = new Date().getFullYear();
    this.anios = [anioActual, anioActual - 1, anioActual - 2, anioActual - 3];
    this.opcionesAnio = this.anios.map(anio => ({ valor: anio, texto: String(anio) }));
    this.opcionesMes = this.meses.map(m => ({ valor: m.valor, texto: m.nombre }));
  }

  // Se arman una vez (no en cada ciclo de detección) para los desplegables
  opcionesMes: OpcionDesplegable<number>[] = [];
  opcionesAnio: OpcionDesplegable<number>[] = [];

  /** Deslizar hacia abajo: recalcula y cierra el indicador cuando termina */
  onRefrescar(evento: any) {
    this.cargarEstadisticas();
    setTimeout(() => evento.target.complete(), 500);
  }

  // ===== Comparación con el período anterior =====

  /** Total recaudado del período anterior (mismo largo); null mientras carga */
  totalAnterior: number | null = null;
  /** Historial de mantenciones plegado: la página no se vuelve un scroll infinito */
  mostrarHistorial = false;
  /** Pestaña de la tarjeta de químicos */
  tabQuimicos: 'totales' | 'promedio' | 'niveles' = 'totales';

  private cargarAnterior() {
    this.totalAnterior = null;
    let consulta;
    if (this.periodoSeleccionado === 'dia') {
      const [a, m, d] = this.fechaSeleccionada.split('-').map(Number);
      consulta = this.estadisticasService.getEstadisticasDia(this.formatDateForInput(new Date(a, m - 1, d - 1)));
    } else if (this.periodoSeleccionado === 'mes') {
      const previo = new Date(this.anioSeleccionado, this.mesSeleccionado - 1, 1);
      consulta = this.estadisticasService.getEstadisticasMes(previo.getFullYear(), previo.getMonth());
    } else {
      consulta = this.estadisticasService.getEstadisticasAnio(this.anioSeleccionado - 1);
    }
    consulta.subscribe({
      next: (stats) => (this.totalAnterior = stats.total || 0),
      error: () => (this.totalAnterior = null)
    });
  }

  /** % de cambio frente al período anterior; null si no hay con qué comparar */
  get variacion(): number | null {
    if (this.totalAnterior === null || !this.estadisticas || this.totalAnterior === 0) return null;
    return Math.round(((this.estadisticas.total - this.totalAnterior) / this.totalAnterior) * 100);
  }

  /** Parte cobrada de lo generado en el período (0-100) para la barra */
  get porcentajePagado(): number {
    const total = this.dineroPagado + this.dineroPendiente;
    return total > 0 ? (this.dineroPagado / total) * 100 : 0;
  }

  get enPeriodo(): string {
    return { dia: 'en el día', mes: 'en el mes', anio: 'en el año' }[this.periodoSeleccionado] || '';
  }

  get delPeriodo(): string {
    return { dia: 'del día', mes: 'del mes', anio: 'del año' }[this.periodoSeleccionado] || '';
  }

  get nombreAnterior(): string {
    return { dia: 'ayer', mes: 'el mes anterior', anio: 'el año anterior' }[this.periodoSeleccionado] || '';
  }

  /** "19 de octubre de 2026", "Octubre 2026" o "2026" */
  get etiquetaPeriodo(): string {
    if (this.periodoSeleccionado === 'dia') {
      const [a, m, d] = this.fechaSeleccionada.split('-').map(Number);
      return new Date(a, m - 1, d).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (this.periodoSeleccionado === 'mes') return `${this.getNombreMes(this.mesSeleccionado)} ${this.anioSeleccionado}`;
    return String(this.anioSeleccionado);
  }

  /** ¿El período elegido es el actual? (no se avanza al futuro) */
  get esPeriodoActual(): boolean {
    const hoy = new Date();
    if (this.periodoSeleccionado === 'dia') return this.fechaSeleccionada >= this.formatDateForInput(hoy);
    if (this.periodoSeleccionado === 'mes') {
      return this.anioSeleccionado > hoy.getFullYear() ||
        (this.anioSeleccionado === hoy.getFullYear() && this.mesSeleccionado >= hoy.getMonth());
    }
    return this.anioSeleccionado >= hoy.getFullYear();
  }

  /** Flechas ◀ ▶ del período */
  moverPeriodo(direccion: number) {
    if (this.periodoSeleccionado === 'dia') {
      const [a, m, d] = this.fechaSeleccionada.split('-').map(Number);
      this.fechaSeleccionada = this.formatDateForInput(new Date(a, m - 1, d + direccion));
    } else if (this.periodoSeleccionado === 'mes') {
      const nueva = new Date(this.anioSeleccionado, this.mesSeleccionado + direccion, 1);
      this.mesSeleccionado = nueva.getMonth();
      this.anioSeleccionado = nueva.getFullYear();
    } else {
      this.anioSeleccionado += direccion;
    }
    this.cargarEstadisticas();
  }

  cargarEstadisticas() {
    this.isLoading = true;
    this.cargarAnterior();
    
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
        this.refrescarMantencionesParaComponente();
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
    return this.currencyFormatter.format(precio);
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
        this.mantencionesFiltradas = this.mantenciones.filter(m => esMantencionPagada(m));
        break;
      case 'pendientes':
        this.mantencionesFiltradas = this.mantenciones.filter(m => !esMantencionPagada(m));
        break;
      default:
        this.mantencionesFiltradas = [...this.mantenciones];
    }
  }

  getNombreMes(mes: number): string {
    return this.meses.find(m => m.valor === mes)?.nombre || '';
  }

  refrescarEstadisticas() {
    this.cargarEstadisticas();
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
    this.clienteService.borrarRegistroHistorial(mantencion.clienteId, mantencion).subscribe({
      next: () => {
        this.mostrarToast('Registro eliminado correctamente');
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
    const monto = mantencion.precio || 0;
    this.clienteService.marcarPagoHistorial(mantencion.clienteId, mantencion).subscribe({
      next: () => {
        // La animación del dinero subiendo es la confirmación
        this.clienteService.getClientes().pipe(take(1))
          .subscribe(clientes => this.contadorGanancia.mostrar(totalCobrado(clientes), monto));
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
    this.clienteService.deshacerPagoHistorial(mantencion.clienteId, mantencion).subscribe({
      next: () => {
        this.mostrarToast('Pago deshecho correctamente');
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

  // ===== Formato de unidades químicas =====
  // Los valores llegan en kilos desde Firestore; el subtexto muestra el equivalente en gramos.

  formatearKgValor = formatearKgValor;
  /** Mismo color por producto que en el historial y al completar */
  readonly colorProducto = COLOR_PRODUCTO;
  formatearGramos = formatearGramos;
  formatearUnidades = formatearUnidades;

  // Método para toggle de la notificación de migración
  toggleMigration() {
    this.isMigrationExpanded = !this.isMigrationExpanded;
  }

  private refrescarMantencionesParaComponente() {
    this.mantencionesParaComponente = this.transformarHistorialParaComponente(this.mantenciones);
    const hechas = this.mantenciones.filter(m => !m.suspendida);
    this.nivelesCloro = this.resumirNiveles(hechas.map(m => estadoCloroDe(m.cloro, m.estadoCloro)), MUESTRA_CLORO);
    this.nivelesPh = this.resumirNiveles(hechas.map(m => estadoPhDe(m.ph, m.estadoPh)), MUESTRA_PH);
  }

  /** Cuántas visitas cayeron en cada estado (solo los que aparecen), de bajo a alto */
  private resumirNiveles(estados: (string | null)[], muestras: Record<string, string>): ResumenNivel[] {
    const medidos = estados.filter((e): e is string => !!e);
    return ORDEN_NIVELES
      .map(estado => {
        const cantidad = medidos.filter(e => e === estado).length;
        return {
          estado,
          etiqueta: etiquetaNivel(estado),
          cantidad,
          porcentaje: medidos.length ? (cantidad / medidos.length) * 100 : 0,
          muestra: muestras[estado],
        };
      })
      .filter(n => n.cantidad > 0);
  }

  /** Estado del promedio del período, para ponerle su punto de color */
  estadoPromedio(tipo: 'cloro' | 'ph', valor: number): { etiqueta: string; muestra: string } | null {
    const estado = tipo === 'cloro' ? estadoCloroDe(valor) : estadoPhDe(valor);
    if (!estado) return null;
    return { etiqueta: etiquetaNivel(estado), muestra: (tipo === 'cloro' ? MUESTRA_CLORO : MUESTRA_PH)[estado] };
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
      cantidadAlgicida: item.cantidadAlgicida,
      cuarzo: item.cuarzo,
      bomba: item.bomba,
      estadoCloro: item.estadoCloro,
      estadoPh: item.estadoPh,
      hora: item.hora,
      pagado: esMantencionPagada(item),
      suspendida: item.suspendida || undefined,
      movidaA: item.movidaA
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
