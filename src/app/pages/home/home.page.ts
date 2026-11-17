import { Component, OnInit, ViewChild, ElementRef, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, IonItemSliding, IonContent, AlertController, ToastController } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { defineCustomElement as defineIonModal } from '@ionic/core/components/ion-modal.js';
import { defineCustomElement as defineIonDatetime } from '@ionic/core/components/ion-datetime.js';
import { defineCustomElement as defineIonRefresher } from '@ionic/core/components/ion-refresher.js';
import { defineCustomElement as defineIonRefresherContent } from '@ionic/core/components/ion-refresher-content.js';
import { defineCustomElement as defineIonItemSliding } from '@ionic/core/components/ion-item-sliding.js';
import { defineCustomElement as defineIonItemOptions } from '@ionic/core/components/ion-item-options.js';
import { defineCustomElement as defineIonItemOption } from '@ionic/core/components/ion-item-option.js';
import { defineCustomElement as defineIonItem } from '@ionic/core/components/ion-item.js';
import { addIcons } from 'ionicons';
import {
  refreshOutline,
  checkmarkCircleOutline,
  timeOutline,
  locationOutline,
  chevronBackOutline,
  chevronForwardOutline,
  cashOutline,
  arrowUndoOutline,
  trashOutline,
  addCircleOutline,
  buildOutline,
  calendarOutline,
  chevronDownOutline,
  pauseCircleOutline,
  waterOutline,
  callOutline,
  flaskOutline,
  arrowDownCircleOutline,
  arrowUpCircleOutline,
  discOutline,
  closeOutline,
  leafOutline,
  layersOutline,
  constructOutline,
  ellipsisHorizontal,
  pencilOutline,
  chevronUpOutline,
  navigateOutline
} from 'ionicons/icons';
import { ClienteService, Cliente } from '../../services/cliente.service';
import { formatearKgValor, formatearGramos, formatearUnidades, CAMPO_UNIDAD_MASA, UNIDAD_MASA } from '../../utils/unidades';
import { nuevoIdRegistro, esMantencionSaltada, esMantencionPagada, totalCobrado } from '../../utils/mantencion';
import { take } from 'rxjs/operators';
import { SERVICIO_MANTENCION, ProductoUsado, productosUsados, infoServicio } from '../../utils/servicios';
import { SelectorClienteComponent, OpcionCliente, SeleccionCliente } from '../../components/selector-cliente/selector-cliente.component';
import { EncabezadoComponent } from '../../components/encabezado/encabezado.component';
import { ResumenDiaComponent } from '../../components/resumen-dia/resumen-dia.component';
import { colorNivel, etiquetaNivel, MUESTRA_CLORO, MUESTRA_PH } from '../../utils/niveles';
import { celebrarProgreso, ContadorGanancia, EstadoGanancia } from '../../utils/celebracion';
import { tomarPagoPendiente } from '../../utils/pago-reciente';
import { TabsToqueService } from '../../services/tabs-toque.service';

interface ClienteDelDia {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  horaPreferida: string;
  precio: number; // Agregamos el precio
  servicio?: string; // Servicio a realizar (especial o por defecto)
  realizado: boolean;
  /** Solo en realizadas: si esa mantención ya se cobró */
  pagado?: boolean;
  mantenimiento?: {
    estadoCloro: string;
    estadoPh: string;
    /** Kilos de cloro granulado */
    cantidadCloro: number;
    /** Kilos de baja pH */
    cantidadBajaPh: number;
    /** Kilos de sube pH */
    cantidadSubePh: number;
    /** Unidades de pastillas de cloro */
    cantidadPastillas: number;
    fecha: string;
    /** Lo que se usó (químicos y materiales del servicio), ya listo para mostrar */
    productos?: ProductoUsado[];
    hora: string;
  };
}

interface DiaCalendario {
  fecha: Date;
  numero: number;
  diaSemana: string;
  esHoy: boolean;
  seleccionado: boolean;
  cantidadPiscinas: number;
  /** Un punto por cliente del día, con su estado (ver actualizarEventosCalendario) */
  puntos?: EstadoPunto[];
  /** Resumen para lectores de pantalla: "2 hechas, 1 suspendida" */
  resumen?: string;
  /** Puntos que no caben en la tira semanal */
  puntosExtra?: number;
}

type EstadoPunto = 'hecho' | 'movido' | 'suspendido' | 'pendiente';

/** Máximo de puntos por día: dos filas de 6 caben en la celda del calendario */
const MAX_PUNTOS_DIA = 12;
/** En la tira semanal cabe una sola fila; el resto se resume como "+n" */
const MAX_PUNTOS_SEMANA = 4;

addIcons({
  'refresh-outline': refreshOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'time-outline': timeOutline,
  'location-outline': locationOutline,
  'chevron-back-outline': chevronBackOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'cash-outline': cashOutline,
  'arrow-undo-outline': arrowUndoOutline,
  'trash-outline': trashOutline,
  'add-circle-outline': addCircleOutline,
  'build-outline': buildOutline,
  'calendar-outline': calendarOutline,
  'chevron-down-outline': chevronDownOutline,
  'pause-circle-outline': pauseCircleOutline,
  'water-outline': waterOutline,
  'call-outline': callOutline,
  'flask-outline': flaskOutline,
  'arrow-down-circle-outline': arrowDownCircleOutline,
  'arrow-up-circle-outline': arrowUpCircleOutline,
  'disc-outline': discOutline,
  'close-outline': closeOutline,
  'leaf-outline': leafOutline,
  'layers-outline': layersOutline,
  'construct-outline': constructOutline,
  'ellipsis-horizontal': ellipsisHorizontal,
  'pencil-outline': pencilOutline,
  'chevron-up-outline': chevronUpOutline,
  'navigate-outline': navigateOutline
});

// La app arranca con provideIonicAngular() (standalone), que solo registra los
// componentes importados desde '@ionic/angular/standalone'. Esta página usa
// IonicModule, y ion-modal / ion-datetime / ion-refresher no se importan en otro
// lado: sin esto el calendario de "Cambiar de día", la hoja de elegir cliente y el
// deslizar para actualizar no aparecen.
defineIonModal();
defineIonDatetime();
defineIonRefresher();
defineIonRefresherContent();
defineIonItemSliding();
defineIonItemOptions();
defineIonItemOption();
defineIonItem();

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, SelectorClienteComponent, EncabezadoComponent, ResumenDiaComponent],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  readonly colorNivel = colorNivel;
  readonly infoServicio = infoServicio;
  readonly etiquetaNivel = etiquetaNivel;

  /** Tarjeta con las opciones de suspender desplegadas (id del cliente), o null. */

  private destroyRef = inject(DestroyRef);
  private tabsToque = inject(TabsToqueService);
  @ViewChild('contenido', { static: true }) private contenido?: IonContent;

  // Formato de unidades químicas (los valores llegan en kilos)
  formatearKgValor = formatearKgValor;
  formatearGramos = formatearGramos;
  formatearUnidades = formatearUnidades;

  // Se construye una vez: el template lo llama hasta 8 veces por fila y en cada
  // ciclo de detección. `toLocaleString()` crea un formatter interno por llamada.
  private readonly precioFormatter = new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  fechaHoy!: string;
  diaHoy!: string;
  dayNumber!: number;
  dayShort!: string;
  maintenanceCount = 0;
  maintenanceWord = 'mantenciones';
  isToday = true;
  clientesPendientes: ClienteDelDia[] = [];
  clientesRealizados: ClienteDelDia[] = [];
  clientesSuspendidos: ClienteDelDia[] = [];
  seccionActiva: string = 'porRealizar';
  /** Tras elegir un día, la primera carga decide la pestaña (día terminado → Realizadas) */
  private elegirSeccionAlCargar = true;
  isLoading = false;
  progresoDelDia = 0;
  // Contador de clientes borrados (saltados) para la fecha seleccionada
  deletedTodayCount = 0;
  deletedClientsList: { id: string; nombre: string }[] = [];

  // Modal "cambiar de día"
  mostrarSelectorDia = false;
  clienteCambioDia: ClienteDelDia | null = null;
  fechaNuevaCandidata = '';
  
  // Propiedades del calendario
  fechaActual = new Date();
  fechaSeleccionada = new Date();
  mesVista = new Date();
  diasDelMes: DiaCalendario[] = [];
  /** Tira semanal (lunes a domingo) que se ve en el inicio */
  semana: DiaCalendario[] = [];
  /** Lunes de la semana que muestra la tira */
  inicioSemana = new Date();
  /** Calendario desplegado: muestra el mes completo en vez de la semana */
  calendarioAbierto = false;
  /** Tarjeta pendiente con las opciones (suspender / cambiar de día) desplegadas */
  opcionesId: string | null = null;
  /** Punto donde empezó el arrastre sobre el calendario */
  private toqueInicio: { x: number; y: number } | null = null;
  /** Iniciales de la tira y del mes: la semana parte el lunes */
  readonly letrasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  readonly nombresSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  /** Tarjetas de "Realizados" abiertas para ver los productos */
  expandidos = new Set<string>();
  mesAnioActual = '';

  // Selector de mes
  mesSeleccionado: number = this.fechaActual.getMonth();
  meses = [
    { value: 0, nombre: 'Enero' },
    { value: 1, nombre: 'Febrero' },
    { value: 2, nombre: 'Marzo' },
    { value: 3, nombre: 'Abril' },
    { value: 4, nombre: 'Mayo' },
    { value: 5, nombre: 'Junio' },
    { value: 6, nombre: 'Julio' },
    { value: 7, nombre: 'Agosto' },
    { value: 8, nombre: 'Septiembre' },
    { value: 9, nombre: 'Octubre' },
    { value: 10, nombre: 'Noviembre' },
    { value: 11, nombre: 'Diciembre' }
  ];

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private clienteService: ClienteService,
    private router: Router
  ) {
    this.configurarFecha();
    this.inicioSemana = this.lunesDe(this.fechaSeleccionada);
    this.generarSemana();
    this.generarCalendario();
  }

  ngOnInit() {
    // Cada cambio en los clientes (de esta u otra pantalla) rearma el día al instante
    this.clienteService.clientes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargarClientesDelDia());

    // Tocar "Inicio" estando ya en el inicio: vuelve al día de hoy y arriba
    this.tabsToque.retoque$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(tab => {
        if (tab !== 'home') return;
        this.irAHoy();
        this.contenido?.scrollToTop(300);
      });
  }

  async deshacerBorrado(clienteId: string) {
    if (!this.fechaSeleccionada) return;
    const fechaSeleccionadaStr = this.formatearFechaLocal(this.fechaSeleccionada);

    this.clienteService.getClienteById(clienteId).subscribe({
      next: (clienteCompleto) => {
        // Remover la fecha de skippedDates
        (clienteCompleto as any).skippedDates = (clienteCompleto as any).skippedDates || [];
        (clienteCompleto as any).skippedDates = (clienteCompleto as any).skippedDates.filter((d: string) => d !== fechaSeleccionadaStr);

        // Remover entradas 'saltada' del historial para esa fecha
        clienteCompleto.historial = (clienteCompleto.historial || []).filter(h => !(h.fecha === fechaSeleccionadaStr && (h.estadoCloro === 'saltada' || (h.servicio && h.servicio.toLowerCase().includes('saltada')))));

        this.clienteService.updateCliente(clienteCompleto).subscribe({
          next: () => {
            this.showToast('Borrado deshecho ✅', 'success');
            this.cargarClientesDelDia();
          },
          error: (err) => {
            console.error('Error al deshacer borrado:', err);
            this.showToast('Error al deshacer borrado', 'danger');
          }
        });
      },
      error: (err) => {
        console.error('Error obteniendo cliente para deshacer:', err);
        this.showToast('Error al deshacer borrado', 'danger');
      }
    });
  }

  /** Sin pendientes: Realizadas aunque haya suspendidas (o Suspendidas si no se hizo ninguna) */
  private seccionInicialDelDia(): string {
    if (this.clientesPendientes.length > 0) return 'porRealizar';
    if (this.clientesRealizados.length > 0) return 'realizados';
    if (this.clientesSuspendidos.length > 0) return 'suspendidos';
    return 'porRealizar';
  }

  setSeccion(seccion: string) {
    this.seccionActiva = seccion;
  }

  irACompletar(cliente: ClienteDelDia) {
    try {
      this.router.navigate(['/tabs/home/completar_mantencion', cliente.id], {
        queryParams: { fecha: this.formatearFechaLocal(this.fechaSeleccionada) }
      });
    } catch (error) {
      console.error('❌ Error en navegación:', error);
      this.showToast('Error al navegar a completar mantención ❌', 'danger');
    }
  }

  // Clientes activos disponibles para el día seleccionado (no completados ni suspendidos)
  private filtrarDisponibles(clientes: Cliente[]): Cliente[] {
    const fechaStr = this.formatearFechaLocal(this.fechaSeleccionada);
    return clientes.filter(c => {
      if (!c.activo) return false;
      const yaCompletado = (c.historial || []).some(h => h.fecha === fechaStr && h.estadoCloro !== 'saltada');
      const saltadoHist = (c.historial || []).some(h => h.fecha === fechaStr && (h.estadoCloro === 'saltada' || (h.servicio && h.servicio.toLowerCase().includes('saltada'))));
      const saltadoArr = (c as any).skippedDates ? (c as any).skippedDates.includes(fechaStr) : false;
      return !yaCompletado && !(saltadoHist || saltadoArr);
    });
  }

  // ===== Hoja para elegir cliente (y servicio) =====

  /** Configuración de la hoja abierta; null = cerrada. */
  selector: {
    modo: 'agregar' | 'realizada' | 'suspender';
    titulo: string;
    clientes: OpcionCliente[];
    pedirServicio: boolean;
    textoConfirmar: string;
    iconoConfirmar: string;
    peligro: boolean;
  } | null = null;

  get subtituloSelector(): string {
    return this.fechaSeleccionada.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  private aOpciones(clientes: Cliente[]): OpcionCliente[] {
    const pendientes = new Set(this.clientesPendientes.map(c => c.id));
    const suspendidos = new Set(this.clientesSuspendidos.map(c => c.id));
    const esHoy = this.esMismaFecha(this.fechaSeleccionada, new Date());
    return clientes.map(c => ({
      id: c.id || '',
      nombre: c.nombre,
      direccion: c.direccion,
      etiqueta: pendientes.has(c.id || '') ? (esHoy ? 'Toca hoy' : 'Toca este día')
        : suspendidos.has(c.id || '') ? 'Suspendido' : undefined
    }));
  }

  cerrarSelector() {
    this.selector = null;
  }

  onSeleccionCliente(seleccion: SeleccionCliente) {
    const modo = this.selector?.modo;
    const cliente = this.selector?.clientes.find(c => c.id === seleccion.clienteId);
    this.selector = null;
    if (!cliente) return;

    switch (modo) {
      case 'agregar':
        this.guardarServicioExtra(cliente.id, seleccion.servicio);
        break;
      case 'realizada':
        this.router.navigate(['/tabs/home/completar_mantencion', cliente.id], {
          queryParams: { servicio: seleccion.servicio, fecha: this.formatearFechaLocal(this.fechaSeleccionada) }
        });
        break;
      case 'suspender':
        this.ejecutarSuspension({
          id: cliente.id,
          nombre: cliente.nombre,
          direccion: cliente.direccion || '',
          telefono: '',
          horaPreferida: '',
          precio: 0,
          servicio: SERVICIO_MANTENCION,
          realizado: false
        });
        break;
    }
  }

  // Agregar una mantención realizada: elegir cliente y servicio, y completarla
  agregarMantencionRealizada() {
    this.clienteService.getClientes().subscribe({
      next: (clientes) => {
        const disponibles = this.filtrarDisponibles(clientes);
        if (disponibles.length === 0) {
          this.showToast('No hay clientes disponibles para este día', 'warning');
          return;
        }
        this.selector = {
          modo: 'realizada',
          titulo: 'Mantención realizada',
          clientes: this.aOpciones(disponibles),
          pedirServicio: true,
          textoConfirmar: 'Completar',
          iconoConfirmar: 'arrow-forward-outline',
          peligro: false
        };
      },
      error: (err) => {
        console.error('Error al cargar clientes:', err);
        this.showToast('Error al cargar clientes ❌', 'danger');
      }
    });
  }

  // Suspender un cliente del día seleccionado
  agregarClienteSuspendido() {
    this.clienteService.getClientes().subscribe({
      next: (clientes) => {
        const disponibles = this.filtrarDisponibles(clientes);
        if (disponibles.length === 0) {
          this.showToast('No hay clientes disponibles para este día', 'warning');
          return;
        }
        this.selector = {
          modo: 'suspender',
          titulo: 'Suspender mantención',
          clientes: this.aOpciones(disponibles),
          pedirServicio: false,
          textoConfirmar: 'Suspender',
          iconoConfirmar: 'pause-circle-outline',
          peligro: true
        };
      },
      error: (err) => {
        console.error('Error al cargar clientes:', err);
        this.showToast('Error al cargar clientes ❌', 'danger');
      }
    });
  }

  configurarFecha() {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };

    // Formatear la fecha en español
    const formatter = new Intl.DateTimeFormat('es-ES', options);
    let formattedDate = formatter.format(today);

    // Capitalizar la primera letra de cada palabra
    formattedDate = formattedDate
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Reemplazar la coma por un salto de línea para mejor presentación
    this.fechaHoy = formattedDate.replace(',', '\n');

    // Obtener el día de la semana para filtrar clientes
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    this.diaHoy = diasSemana[today.getDay()];

    // Set day number and short day name
    this.dayNumber = today.getDate();
    this.dayShort = this.diaHoy.substring(0, 3).toUpperCase();

    // Configurar fechas del calendario
    this.fechaActual = new Date(today);
    this.fechaSeleccionada = new Date(today);
    this.mesVista = new Date(today);
  }

  generarCalendario() {
    this.diasDelMes = [];

    // Actualizar header del mes
    const mesAnio = this.mesVista.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric'
    });
    this.mesAnioActual = mesAnio.charAt(0).toUpperCase() + mesAnio.slice(1);

    // Generar días del mes con grid layout
    const primerDia = new Date(this.mesVista.getFullYear(), this.mesVista.getMonth(), 1);
    const ultimoDia = new Date(this.mesVista.getFullYear(), this.mesVista.getMonth() + 1, 0);

    // Celdas antes del día 1: la semana parte el lunes (lunes = 0 … domingo = 6)
    const diaSemanaPrimerDia = (primerDia.getDay() + 6) % 7;

    // Agregar celdas vacías antes del primer día para alinear con el día de la semana
    for (let i = 0; i < diaSemanaPrimerDia; i++) {
      this.diasDelMes.push({
        fecha: new Date(), // Fecha dummy
        numero: 0, // Indica celda vacía
        diaSemana: '',
        esHoy: false,
        seleccionado: false,
        cantidadPiscinas: 0
      });
    }

    // Generar días del mes
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const fecha = new Date(this.mesVista.getFullYear(), this.mesVista.getMonth(), dia);
      const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'short' });

      this.diasDelMes.push({
        fecha: fecha,
        numero: dia,
        diaSemana: diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
        esHoy: this.esMismaFecha(fecha, this.fechaActual),
        seleccionado: this.esMismaFecha(fecha, this.fechaSeleccionada),
        cantidadPiscinas: 0 // Will be set later in actualizarEventosCalendario
      });
    }

    // Agregar celdas vacías al final para completar la última fila (opcional, pero mantiene consistencia)
    const totalCeldas = this.diasDelMes.length;
    const celdasFaltantes = (7 - (totalCeldas % 7)) % 7;
    for (let i = 0; i < celdasFaltantes; i++) {
      this.diasDelMes.push({
        fecha: new Date(), // Fecha dummy
        numero: 0, // Indica celda vacía
        diaSemana: '',
        esHoy: false,
        seleccionado: false,
        cantidadPiscinas: 0
      });
    }
  }

  seleccionarDia(dia: DiaCalendario) {
    // El mes desplegado sigue abierto: se pliega con la flecha o deslizando
    this.menuMesAbierto = false;
    this.fechaSeleccionada = new Date(dia.fecha);

    // La tira y el mes son listas distintas: se marca por fecha en ambas
    [...this.diasDelMes, ...this.semana].forEach(d =>
      d.seleccionado = d.numero !== 0 && this.esMismaFecha(d.fecha, this.fechaSeleccionada));

    // Elegido desde el mes: la tira salta a esa semana
    const lunes = this.lunesDe(this.fechaSeleccionada);
    if (lunes.getTime() !== this.inicioSemana.getTime()) {
      this.inicioSemana = lunes;
      this.generarSemana();
      this.actualizarEventosCalendario();
    }

    // "Hoy" con otro mes a la vista: el mes desplegado salta al del día elegido
    if (this.calendarioAbierto) this.abrirMes();

    // Actualizar día seleccionado para filtrar clientes
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    this.diaHoy = diasSemana[dia.fecha.getDay()];

    // Update display properties
    this.dayNumber = dia.fecha.getDate();
    this.dayShort = this.diaHoy.substring(0, 3).toUpperCase();
    this.isToday = this.esMismaFecha(this.fechaSeleccionada, this.fechaActual);

    // Al cambiar de día se parte viendo lo pendiente; si el día ya quedó
    // terminado, al cargar se pasa a Realizadas
    this.seccionActiva = 'porRealizar';
    this.elegirSeccionAlCargar = true;

    // Recargar clientes para el día seleccionado
    this.cargarClientesDelDia();
  }

  cambiarMes(direccion: number) {
    this.menuMesAbierto = false;
    // Se parte del día 1: desde un 31, sumar un mes podía saltarse al siguiente
    this.mesVista.setDate(1);
    this.mesVista.setMonth(this.mesVista.getMonth() + direccion);
    this.mesSeleccionado = this.mesVista.getMonth();
    this.generarCalendario();
    this.actualizarEventosCalendario();
  }

  cambiarMesSeleccionado() {
    this.mesVista.setDate(1);
    this.mesVista.setMonth(this.mesSeleccionado);
    this.generarCalendario();
    this.actualizarEventosCalendario();
  }

  /** Menú de meses desplegado bajo su botón */
  menuMesAbierto = false;

  // ===== Tira semanal =====

  /** Lunes (a las 00:00) de la semana de una fecha */
  private lunesDe(fecha: Date): Date {
    const lunes = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
    return lunes;
  }

  generarSemana() {
    this.semana = Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(this.inicioSemana);
      fecha.setDate(fecha.getDate() + i);
      return {
        fecha,
        numero: fecha.getDate(),
        diaSemana: this.nombresSemana[i],
        esHoy: this.esMismaFecha(fecha, this.fechaActual),
        seleccionado: this.esMismaFecha(fecha, this.fechaSeleccionada),
        cantidadPiscinas: 0
      };
    });
  }

  cambiarSemana(direccion: number) {
    this.inicioSemana = new Date(this.inicioSemana);
    this.inicioSemana.setDate(this.inicioSemana.getDate() + 7 * direccion);
    this.generarSemana();
    this.actualizarEventosCalendario();
  }

  /** Vuelve la tira, el mes y la lista a hoy */
  irAHoy() {
    const hoy = this.semana.find(d => d.esHoy);
    if (hoy) {
      this.seleccionarDia(hoy);
      return;
    }
    this.inicioSemana = this.lunesDe(this.fechaActual);
    this.generarSemana();
    this.seleccionarDia(this.semana.find(d => d.esHoy)!);
  }

  /** Despliega o pliega el mes completo (flecha, nombre del mes o deslizar) */
  alternarCalendario(abrir = !this.calendarioAbierto) {
    if (abrir === this.calendarioAbierto) return;
    if (abrir) {
      this.abrirMes();
    } else {
      this.calendarioAbierto = false;
      this.menuMesAbierto = false;
    }
  }

  onToqueInicio(evento: TouchEvent) {
    const t = evento.touches[0];
    this.toqueInicio = { x: t.clientX, y: t.clientY };
  }

  /** Deslizar hacia abajo despliega el mes, hacia arriba lo pliega */
  onToqueFin(evento: TouchEvent) {
    if (!this.toqueInicio) return;
    const t = evento.changedTouches[0];
    const dx = t.clientX - this.toqueInicio.x;
    const dy = t.clientY - this.toqueInicio.y;
    this.toqueInicio = null;
    if (Math.abs(dy) < 40 || Math.abs(dy) < Math.abs(dx)) return;
    this.alternarCalendario(dy > 0);
  }

  /** Flechas: mueven la semana o, con el calendario abierto, el mes */
  navegar(direccion: number) {
    if (this.calendarioAbierto) this.cambiarMes(direccion);
    else this.cambiarSemana(direccion);
  }

  /** Prepara el mes del día elegido y lo despliega */
  abrirMes() {
    const mismoMes = this.mesVista.getFullYear() === this.fechaSeleccionada.getFullYear() &&
      this.mesVista.getMonth() === this.fechaSeleccionada.getMonth();
    if (!mismoMes) {
      this.mesVista = new Date(this.fechaSeleccionada.getFullYear(), this.fechaSeleccionada.getMonth(), 1);
      this.mesSeleccionado = this.mesVista.getMonth();
      this.generarCalendario();
      this.actualizarEventosCalendario();
    }
    this.calendarioAbierto = true;
  }

  /** Nombre del mes en la cabecera: el del mes visible si está desplegado */
  get tituloCalendario(): string {
    return this.calendarioAbierto ? this.mesAnioActual.replace(' de ', ' ') : this.mesDeLaSemana;
  }

  /** "Octubre 2026" del día elegido, para el botón de la tira */
  get mesDeLaSemana(): string {
    const mes = this.fechaSeleccionada.toLocaleDateString('es-CL', { month: 'long' });
    return `${mes.charAt(0).toUpperCase() + mes.slice(1)} ${this.fechaSeleccionada.getFullYear()}`;
  }

  elegirMes(mes: number) {
    this.menuMesAbierto = false;
    if (mes === this.mesSeleccionado) return;
    this.mesSeleccionado = mes;
    this.cambiarMesSeleccionado();
  }


  /**
   * Puntos del calendario: uno por cliente del día.
   * - verde: mantención hecha
   * - amarillo: se cambió a otro día
   * - rojo: suspendida
   * - color de la app: pendiente (incluye días pasados sin marcar)
   */
  actualizarEventosCalendario() {
    this.clienteService.getClientes().subscribe({
      next: (clientes) => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const orden: Record<EstadoPunto, number> = { hecho: 0, movido: 1, suspendido: 2, pendiente: 3 };

        const enSemana = new Set(this.semana);
        [...this.diasDelMes, ...this.semana].forEach(dia => {
          if (dia.numero === 0) return; // Celdas vacías

          const fechaDia = new Date(dia.fecha);
          fechaDia.setHours(0, 0, 0, 0);
          const fechaStr = this.formatearFechaLocal(fechaDia);
          const diaSemana = diasSemana[fechaDia.getDay()];
          const esPasado = fechaDia < hoy;

          const puntos: EstadoPunto[] = [];
          clientes.forEach(cliente => {
            const estado = this.estadoClienteEnDia(cliente, fechaStr, diaSemana, esPasado);
            if (estado) puntos.push(estado);
          });

          puntos.sort((a, b) => orden[a] - orden[b]);
          const maximo = enSemana.has(dia) ? MAX_PUNTOS_SEMANA : MAX_PUNTOS_DIA;
          dia.puntos = puntos.slice(0, maximo);
          dia.puntosExtra = Math.max(0, puntos.length - maximo);
          dia.cantidadPiscinas = puntos.length;
          dia.resumen = this.resumenPuntos(puntos);
        });
      },
      error: (err) => {
        console.error('Error al cargar eventos del calendario:', err);
      }
    });
  }

  /** Estado de un cliente en una fecha, o null si ese día no le tocaba nada. */
  private estadoClienteEnDia(cliente: Cliente, fechaStr: string, diaSemana: string, esPasado: boolean): EstadoPunto | null {
    const registros = (cliente.historial || []).filter(h => h.fecha === fechaStr);

    if (registros.some(h => !esMantencionSaltada(h))) return 'hecho';

    const saltado = registros.find(h => esMantencionSaltada(h));
    if (saltado) {
      // Al cambiar de día se deja un registro saltado con "Cambio de día" en el servicio
      return /cambio de d[ií]a/i.test(saltado.servicio || '') ? 'movido' : 'suspendido';
    }
    if ((cliente.skippedDates || []).includes(fechaStr)) return 'suspendido';

    // Pendientes (también de días pasados que quedaron sin marcar), solo clientes activos
    if (!cliente.activo) return null;
    const tieneExtra = (cliente.serviciosExtra || []).some(s => s.fecha === fechaStr);
    // Antes de crear al cliente no le tocaba nada
    const creadoDespues = esPasado && !!cliente.fechaCreacion &&
      this.formatearFechaLocal(new Date(cliente.fechaCreacion)) > fechaStr;
    const esProgramado = !creadoDespues && (cliente.programacion?.diasSemana || []).includes(diaSemana);
    return tieneExtra || esProgramado ? 'pendiente' : null;
  }

  private resumenPuntos(puntos: EstadoPunto[]): string {
    const n = (estado: EstadoPunto) => puntos.filter(p => p === estado).length;
    const partes: string[] = [];
    const hechas = n('hecho'), movidas = n('movido'), suspendidas = n('suspendido'), pendientes = n('pendiente');
    if (hechas) partes.push(`${hechas} ${hechas === 1 ? 'hecha' : 'hechas'}`);
    if (movidas) partes.push(`${movidas} ${movidas === 1 ? 'cambiada' : 'cambiadas'} de día`);
    if (suspendidas) partes.push(`${suspendidas} ${suspendidas === 1 ? 'suspendida' : 'suspendidas'}`);
    if (pendientes) partes.push(`${pendientes} ${pendientes === 1 ? 'pendiente' : 'pendientes'}`);
    return partes.join(', ');
  }

  cargarClientesDelDia() {
    this.isLoading = true;
    
    this.clienteService.getClientes().subscribe({
      next: (clientes) => {
        console.log('Clientes cargados:', clientes);
        console.log('Día seleccionado:', this.diaHoy);
        
        // Fecha seleccionada en formato string
        const fechaSeleccionadaStr = this.formatearFechaLocal(this.fechaSeleccionada);

        // Filtrar clientes que tienen mantenimiento en el día seleccionado y no han sido completados o marcados como saltados
        const clientesDelDia = clientes.filter(cliente => {
          if (!cliente.activo || !cliente.programacion) {
            return false;
          }

          const diasProgramados = cliente.programacion.diasSemana || [];
          const tieneMantenimientoHoy = diasProgramados.includes(this.diaHoy);

          // Verificar que no haya un registro de mantenimiento para el día seleccionado
          const yaCompletado = (cliente.historial || []).some(h => h.fecha === fechaSeleccionadaStr && h.estadoCloro !== 'saltada');

          // Verificar marcados como saltados mediante historial o skippedDates
          const estaSaltadoHist = (cliente.historial || []).some(h => h.fecha === fechaSeleccionadaStr && (h.estadoCloro === 'saltada' || (h.servicio && h.servicio.toLowerCase().includes('saltada'))));
          const estaSaltadoArray = (cliente as any).skippedDates ? (cliente as any).skippedDates.includes(fechaSeleccionadaStr) : false;

          const estaSaltado = estaSaltadoHist || estaSaltadoArray;

          return tieneMantenimientoHoy && !yaCompletado && !estaSaltado;
        });

        // Filtrar clientes con servicio extra agregado manualmente para el día
        const clientesServicioExtra = clientes.filter(cliente => {
          if (!cliente.activo) return false;
          const extras = (cliente as any).serviciosExtra || [];
          const extraDia = extras.find((s: any) => s.fecha === fechaSeleccionadaStr);
          if (!extraDia) return false;
          const yaCompletado = (cliente.historial || []).some(h => h.fecha === fechaSeleccionadaStr && h.estadoCloro !== 'saltada');
          const estaSaltadoHist = (cliente.historial || []).some(h => h.fecha === fechaSeleccionadaStr && (h.estadoCloro === 'saltada' || (h.servicio && h.servicio.toLowerCase().includes('saltada'))));
          const estaSaltadoArray = (cliente as any).skippedDates ? (cliente as any).skippedDates.includes(fechaSeleccionadaStr) : false;
          return !yaCompletado && !estaSaltadoHist && !estaSaltadoArray && !clientesDelDia.some(c => c.id === cliente.id);
        });

        // Convertir a formato ClienteDelDia
        this.clientesPendientes = [...clientesDelDia, ...clientesServicioExtra].map(cliente => {
          const extraDia = ((cliente as any).serviciosExtra || []).find((s: any) => s.fecha === fechaSeleccionadaStr);
          return {
            id: cliente.id || '',
            nombre: cliente.nombre,
            direccion: cliente.direccion,
            telefono: cliente.telefono,
            horaPreferida: cliente.programacion?.horaPreferida || 'Sin horario específico',
            precio: ((cliente as any).preciosEspeciales?.[fechaSeleccionadaStr] ?? cliente.precio) || 0,
            servicio: extraDia?.servicio || 'Mantención de piscina',
            realizado: false
          };
        });

        // Cargar clientes realizados (con historial real del día, sin los suspendidos)
        const esRegistroSaltado = (h: any) => h.estadoCloro === 'saltada' || (h.servicio && h.servicio.toLowerCase().includes('saltada'));
        this.clientesRealizados = clientes.filter(cliente => {
          return (cliente.historial || []).some(h => h.fecha === fechaSeleccionadaStr && !esRegistroSaltado(h));
        }).map(cliente => {
          const historialDia = (cliente.historial || []).find(h => h.fecha === fechaSeleccionadaStr && !esRegistroSaltado(h));
          return {
            id: cliente.id || '',
            nombre: cliente.nombre,
            direccion: cliente.direccion,
            telefono: cliente.telefono,
            horaPreferida: cliente.programacion?.horaPreferida || 'Sin horario específico',
            precio: (historialDia?.precioCobrado ?? cliente.precio) || 0,
            servicio: historialDia?.servicio,
            realizado: true,
            pagado: historialDia ? esMantencionPagada(historialDia) : false,
            mantenimiento: historialDia ? {
              estadoCloro: historialDia.estadoCloro || '',
              estadoPh: historialDia.estadoPh || '',
              // Cantidades en kilos
              cantidadCloro: historialDia.cantidadCloro || 0,
              cantidadBajaPh: historialDia.cantidadBajaPh || 0,
              cantidadSubePh: historialDia.cantidadSubePh || 0,
              cantidadPastillas: historialDia.cantidadPastillas || 0,
              fecha: fechaSeleccionadaStr,
              hora: historialDia.hora || '',
              productos: productosUsados(historialDia)
            } : undefined
          };
        });

        this.maintenanceCount = this.clientesPendientes.length;
        this.maintenanceWord = this.maintenanceCount === 1 ? 'mantención' : 'mantenciones';

        // Calcular clientes suspendidos (saltados) para la fecha seleccionada
        const fechaSeleccionadaStrLocal = fechaSeleccionadaStr; // alias local
        this.clientesSuspendidos = clientes
          .filter(c => {
            const saltadoHist = (c.historial || []).some(h => h.fecha === fechaSeleccionadaStrLocal && (h.estadoCloro === 'saltada' || (h.servicio && h.servicio.toLowerCase().includes('saltada'))));
            const saltadoArr = (c as any).skippedDates ? (c as any).skippedDates.includes(fechaSeleccionadaStrLocal) : false;
            return saltadoHist || saltadoArr;
          })
          .map(cliente => ({
            id: cliente.id || '',
            nombre: cliente.nombre,
            direccion: cliente.direccion,
            telefono: cliente.telefono,
            horaPreferida: cliente.programacion?.horaPreferida || 'Sin horario específico',
            precio: ((cliente as any).preciosEspeciales?.[fechaSeleccionadaStrLocal] ?? cliente.precio) || 0,
            servicio: 'Mantención suspendida',
            realizado: false
          }));
        this.deletedClientsList = this.clientesSuspendidos.map(c => ({ id: c.id, nombre: c.nombre }));
        this.deletedTodayCount = this.clientesSuspendidos.length;
        console.log('Clientes suspendidos computed:', this.deletedTodayCount, this.clientesSuspendidos);

        if (this.elegirSeccionAlCargar) {
          this.elegirSeccionAlCargar = false;
          this.seccionActiva = this.seccionInicialDelDia();
        }

        this.calcularProgreso();
        this.actualizarEventosCalendario();
        this.isLoading = false;

        console.log('Clientes para el día seleccionado:', this.clientesPendientes);
        console.log('Clientes borrados para la fecha:', this.deletedClientsList);
      },
      error: (err) => {
        console.error('Error al cargar clientes:', err);
        this.showToast('Error al cargar clientes del día ❌', 'danger');
        this.isLoading = false;
      }
    });
  }

  // Método para formatear el precio
  formatearPrecio(precio: number): string {
    if (!precio || precio === 0) {
      return '0';
    }

    return this.precioFormatter.format(precio);
  }

  // Editar el precio del cliente desde el home: se escribe el precio y se
  // elige en el mismo diálogo si vale solo para el día o para siempre.
  async editarPrecioCliente(cliente: ClienteDelDia) {
    const fecha = this.formatearFechaLocal(this.fechaSeleccionada);
    const esHoy = fecha === this.formatearFechaLocal(new Date());
    const textoDia = esHoy
      ? 'Solo hoy'
      : `Solo el ${this.fechaSeleccionada.getDate()}/${this.fechaSeleccionada.getMonth() + 1}`;

    const leerPrecio = (data: any): number | null => {
      const nuevoPrecio = Math.round(parseFloat(data?.nuevoPrecio));
      if (!nuevoPrecio || nuevoPrecio <= 0) {
        this.showToast('Ingresa un precio válido ❌', 'danger');
        return null;
      }
      return nuevoPrecio;
    };

    const alert = await this.alertController.create({
      header: 'Cambiar precio',
      subHeader: cliente.nombre,
      message: cliente.realizado
        ? 'La mantención ya está hecha: "' + textoDia.toLowerCase() + '" cambia solo lo cobrado ese día.'
        : undefined,
      cssClass: 'alerta-precio',
      inputs: [
        {
          name: 'nuevoPrecio',
          type: 'number',
          min: '1',
          placeholder: 'Nuevo precio (CLP)',
          value: cliente.precio || ''
        }
      ],
      buttons: [
        {
          text: textoDia,
          handler: (data) => {
            const nuevoPrecio = leerPrecio(data);
            if (nuevoPrecio === null) return false;
            this.guardarPrecio(cliente, nuevoPrecio, 'dia');
            return true;
          }
        },
        {
          text: 'Para siempre',
          handler: (data) => {
            const nuevoPrecio = leerPrecio(data);
            if (nuevoPrecio === null) return false;
            this.guardarPrecio(cliente, nuevoPrecio, 'siempre');
            return true;
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  /**
   * Guarda el nuevo precio.
   * - 'dia': precio especial para la fecha seleccionada.
   * - 'siempre': cambia el precio del cliente desde ahora; si en esa fecha había
   *   un precio especial se quita, porque si no seguiría mandando sobre el nuevo.
   * En ambos casos, si la mantención de ese día ya está registrada, se corrige lo
   * cobrado en ella (es lo que leen las estadísticas y la deuda).
   */
  private guardarPrecio(cliente: ClienteDelDia, nuevoPrecio: number, alcance: 'dia' | 'siempre') {
    const fecha = this.formatearFechaLocal(this.fechaSeleccionada);

    this.clienteService.getClienteById(cliente.id).subscribe({
      next: (clienteCompleto) => {
        const especiales = { ...(clienteCompleto.preciosEspeciales || {}) };

        if (alcance === 'siempre') {
          clienteCompleto.precio = nuevoPrecio;
          delete especiales[fecha];
        } else {
          especiales[fecha] = nuevoPrecio;
        }
        clienteCompleto.preciosEspeciales = especiales;

        (clienteCompleto.historial || []).forEach(h => {
          if (h.fecha === fecha && !esMantencionSaltada(h)) {
            h.precioCobrado = nuevoPrecio;
          }
        });

        this.clienteService.updateCliente(clienteCompleto).subscribe({
          next: () => {
            cliente.precio = nuevoPrecio;
            this.cargarClientesDelDia();
            this.showToast(
              alcance === 'siempre'
                ? `Nuevo precio de ${cliente.nombre}: $${this.formatearPrecio(nuevoPrecio)} ✅`
                : `Precio solo para ese día: $${this.formatearPrecio(nuevoPrecio)} ✅`,
              'success'
            );
          },
          error: (err) => {
            console.error('Error al actualizar precio:', err);
            this.showToast('Error al actualizar precio ❌', 'danger');
          }
        });
      },
      error: (err) => {
        console.error('Error obteniendo cliente:', err);
        this.showToast('Error al obtener cliente ❌', 'danger');
      }
    });
  }

  // Agregar un cliente para el día seleccionado con un servicio puntual
  agregarClienteDia() {
    this.clienteService.getClientes().subscribe({
      next: (clientes) => {
        const activos = clientes.filter(c => c.activo);
        if (activos.length === 0) {
          this.showToast('No hay clientes activos para agregar', 'warning');
          return;
        }

        const fechaSeleccionadaStr = this.formatearFechaLocal(this.fechaSeleccionada);
        const yaPendientes = this.clientesPendientes.map(c => c.id);
        // Se excluye solo a los que ya se ven como pendientes o ya están hechos. Un suspendido
        // del día sí aparece: al agregarlo se levanta la suspensión (ver guardarServicioExtra)
        const disponibles = activos.filter(c => {
          const yaCompletado = (c.historial || []).some(h => h.fecha === fechaSeleccionadaStr && !esMantencionSaltada(h));
          return !yaCompletado && !yaPendientes.includes(c.id || '');
        });

        if (disponibles.length === 0) {
          this.showToast('No hay clientes disponibles para agregar este día', 'warning');
          return;
        }

        this.selector = {
          modo: 'agregar',
          titulo: 'Agregar al día',
          clientes: this.aOpciones(disponibles),
          pedirServicio: true,
          textoConfirmar: 'Agregar',
          iconoConfirmar: 'add-circle-outline',
          peligro: false
        };
      },
      error: (err) => {
        console.error('Error al cargar clientes:', err);
        this.showToast('Error al cargar clientes ❌', 'danger');
      }
    });
  }

  // Guardar el servicio extra para la fecha seleccionada
  guardarServicioExtra(clienteId: string, servicio: string) {
    const fechaSeleccionadaStr = this.formatearFechaLocal(this.fechaSeleccionada);
    this.clienteService.getClienteById(clienteId).subscribe({
      next: (clienteCompleto) => {
        // Si ya tenía un servicio extra ese día se reemplaza por el elegido ahora
        clienteCompleto.serviciosExtra = (clienteCompleto.serviciosExtra || [])
          .filter(s => s.fecha !== fechaSeleccionadaStr);
        clienteCompleto.serviciosExtra.push({ fecha: fechaSeleccionadaStr, servicio });

        // Si ese día estaba suspendido (o cambiado de día) se levanta la suspensión:
        // si no, el cliente quedaba agregado pero oculto en la lista del día
        clienteCompleto.skippedDates = (clienteCompleto.skippedDates || []).filter(f => f !== fechaSeleccionadaStr);
        clienteCompleto.historial = (clienteCompleto.historial || []).filter(
          h => !(h.fecha === fechaSeleccionadaStr && esMantencionSaltada(h))
        );

        this.clienteService.updateCliente(clienteCompleto).subscribe({
          next: () => {
            this.cargarClientesDelDia();
            this.showToast(`${servicio} agregado al día ✅`, 'success');
          },
          error: (err) => {
            console.error('Error al agregar servicio extra:', err);
            this.showToast('Error al agregar servicio ❌', 'danger');
          }
        });
      },
      error: (err) => {
        console.error('Error obteniendo cliente:', err);
        this.showToast('Error al obtener cliente ❌', 'danger');
      }
    });
  }

  // Métodos auxiliares
  esMismaFecha(fecha1: Date, fecha2: Date): boolean {
    return fecha1.getDate() === fecha2.getDate() &&
           fecha1.getMonth() === fecha2.getMonth() &&
           fecha1.getFullYear() === fecha2.getFullYear();
  }

  private formatearFechaLocal(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  esMesActual(): boolean {
    return this.mesVista.getMonth() === this.fechaActual.getMonth() &&
           this.mesVista.getFullYear() === this.fechaActual.getFullYear();
  }

  getServicioTipo(frecuencia: string): string {
    switch (frecuencia) {
      case 'semanal': return 'semanal';
      case 'quincenal': return 'quincenal';
      case 'mensual': return 'mensual';
      default: return 'regular';
    }
  }

  calcularProgreso() {
    const total = this.clientesPendientes.length + this.clientesRealizados.length;
    this.progresoDelDia = total === 0 ? 0 : (this.clientesRealizados.length / total) * 100;
    this.detectarAvance(total);
    // Si hay una celebración guardada para cuando se vuelva, la barra se queda donde estaba
    if (this.celebracionPendiente === null) {
      this.progresoMostrado = this.progresoDelDia;
      this.hechasMostradas = this.clientesRealizados.length;
    }
  }

  // ===== Celebración al avanzar el día =====

  /** Activa la animación de la barra y el contador */
  celebrando = false;
  /** Lo que muestra la barra: se iguala al progreso real al celebrar, así se ve llenarse */
  progresoMostrado = 0;
  hechasMostradas = 0;
  private ultimoProgreso: { fecha: string; hechas: number } | null = null;
  private visible = false;
  /** Avance ocurrido mientras se estaba en otra pantalla (p. ej. completar): se celebra al volver */
  private celebracionPendiente: boolean | null = null;

  /** Si en el mismo día subieron las hechas, celebra (o lo deja para cuando se vuelva al inicio). */
  private detectarAvance(total: number) {
    const fecha = this.formatearFechaLocal(this.fechaSeleccionada);
    const hechas = this.clientesRealizados.length;
    const anterior = this.ultimoProgreso;
    this.ultimoProgreso = { fecha, hechas };

    if (!anterior || anterior.fecha !== fecha || hechas <= anterior.hechas) return;

    const completo = total > 0 && hechas === total;
    if (this.visible) {
      this.celebrar(completo);
    } else {
      this.celebracionPendiente = completo || !!this.celebracionPendiente;
    }
  }

  private celebrar(completo: boolean) {
    this.celebrando = false;
    // Un tick después para que la animación CSS se reinicie aunque ya estuviera puesta
    setTimeout(() => {
      this.progresoMostrado = this.progresoDelDia;
      this.hechasMostradas = this.clientesRealizados.length;
      this.celebrando = true;
      celebrarProgreso(completo);
      setTimeout(() => (this.celebrando = false), completo ? 1600 : 1000);
    }, 30);
  }

  /** Se vuelve de completar una mantención: se abre "Realizadas" para verla ahí */
  ionViewWillEnter() {
    if (this.celebracionPendiente !== null) this.seccionActiva = 'realizados';
  }

  ionViewDidEnter() {
    this.visible = true;
    const habiaProgreso = this.celebracionPendiente !== null;
    if (habiaProgreso) {
      const completo = this.celebracionPendiente!;
      this.celebracionPendiente = null;
      // Deja ver primero la barra en su valor anterior y luego se llena
      setTimeout(() => this.celebrar(completo), 250);
    }

    // Pago marcado en "Mantención exitosa": chip con lo cobrado hoy (después de la barra)
    const pagado = tomarPagoPendiente();
    if (pagado > 0) {
      setTimeout(() => this.mostrarGanancia(pagado), habiaProgreso ? 1300 : 300);
    }
  }

  // ===== Chip "cobrado hoy" en el encabezado =====

  private contadorGanancia = new ContadorGanancia();

  /** Chip visible con todo lo ganado; null = oculto */
  get ganancia(): EstadoGanancia | null {
    return this.contadorGanancia.estado;
  }

  /** Todo lo ganado con animación: sube desde (total - monto) hasta el total y luego se va */
  private mostrarGanancia(monto: number) {
    // take(1): la lista llega en vivo y cada cambio repetía la animación
    this.clienteService.getClientes().pipe(take(1)).subscribe(clientes => {
      this.contadorGanancia.mostrar(totalCobrado(clientes), monto);
    });
  }

  formatearMonto(valor: number): string {
    return '$' + this.precioFormatter.format(valor || 0);
  }

  ionViewWillLeave() {
    this.visible = false;
  }

  // Los datos ya llegan en vivo; el botón solo rearma el día y lo confirma
  /** Mantenciones del día elegido (hechas + por hacer) para el chip del encabezado */
  get totalDelDia(): number {
    return this.clientesRealizados.length + this.clientesPendientes.length;
  }

  /** "Hoy", "Mañana", "Ayer" o el día de la semana, para el resumen del día */
  get etiquetaDia(): string {
    const inicio = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dias = Math.round((inicio(this.fechaSeleccionada) - inicio(new Date())) / 86400000);
    if (dias === 0) return 'Hoy';
    if (dias === 1) return 'Mañana';
    if (dias === -1) return 'Ayer';
    const texto = this.fechaSeleccionada.toLocaleDateString('es-CL', { weekday: 'long' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  get diaSemanaCorto(): string {
    return this.fechaSeleccionada.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '').toUpperCase();
  }

  get mesCorto(): string {
    return this.fechaSeleccionada.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');
  }

  /** "Martes 30 de septiembre" para el encabezado */
  get fechaHoyTexto(): string {
    const texto = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  /** Deslizar hacia abajo: recarga el día y el calendario, y cierra el indicador */
  onRefrescar(evento: any) {
    this.cargarClientesDelDia();
    setTimeout(() => evento.target.complete(), 600);
  }

  refrescarClientes() {
    this.cargarClientesDelDia();
    this.showToast('Lista actualizada ✅', 'success');
  }

  async showToast(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color,
      position: 'top'
    });
    toast.present();
  }

  // Método para deshacer una mantención (por si se marca por error)
  async deshacerMantenimiento(cliente: ClienteDelDia) {
    const alert = await this.alertController.create({
      header: 'Deshacer Mantención',
      message: `¿Estás seguro de que quieres deshacer la mantención de ${cliente.nombre}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Deshacer',
          cssClass: 'danger',
          handler: () => {
            cliente.realizado = false;
            cliente.mantenimiento = undefined;

            // Remover la entrada del historial para la fecha seleccionada
            this.removeHistorialEntry(cliente.id, this.formatearFechaLocal(this.fechaSeleccionada));

            this.clientesPendientes.push(cliente);
            this.clientesRealizados = this.clientesRealizados.filter(c => c.id !== cliente.id);

            this.calcularProgreso();
            this.showToast('Mantención deshecha ✅', 'success');
          }
        }
      ]
    });

    await alert.present();
  }

  // Botón de suspender una mantención pendiente: ofrece las dos opciones
  /** "⋯" de la tarjeta: despliega las opciones bajo ella (otra vez la cierra) */
  toggleOpciones(cliente: ClienteDelDia) {
    this.opcionesId = this.opcionesId === cliente.id ? null : cliente.id;
  }

  suspenderDesdeOpciones(cliente: ClienteDelDia) {
    this.opcionesId = null;
    this.ejecutarSuspension(cliente);
  }

  cambiarDiaDesdeOpciones(cliente: ClienteDelDia) {
    this.opcionesId = null;
    this.abrirSelectorCambioDia(cliente);
  }

  /** Acciones al deslizar la tarjeta: cierran el deslizable antes de actuar */
  suspenderDeslizando(deslizable: IonItemSliding, cliente: ClienteDelDia) {
    deslizable.close();
    this.ejecutarSuspension(cliente);
  }

  cambiarDiaDeslizando(deslizable: IonItemSliding, cliente: ClienteDelDia) {
    deslizable.close();
    this.abrirSelectorCambioDia(cliente);
  }

  toggleExpandido(cliente: ClienteDelDia) {
    if (!this.expandidos.delete(cliente.id)) this.expandidos.add(cliente.id);
  }

  /** Color de la muestra del comparador; gris si no se registró */
  muestraCloro(estado: string | null | undefined): string {
    return MUESTRA_CLORO[(estado || '').trim().toLowerCase()] ?? 'var(--ion-color-light)';
  }

  muestraPh(estado: string | null | undefined): string {
    return MUESTRA_PH[(estado || '').trim().toLowerCase()] ?? 'var(--ion-color-light)';
  }

  /** La mantención normal no lleva etiqueta: solo se destacan los servicios especiales */
  esServicioEspecial(servicio?: string): boolean {
    return infoServicio(servicio).valor !== SERVICIO_MANTENCION;
  }

  trackPorId(_: number, cliente: ClienteDelDia): string {
    return cliente.id;
  }

  /** Abre la dirección en la app de mapas (en Android ofrece Google Maps) */
  urlMapa(direccion: string): string {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(direccion || '');
  }

  /** "09:30" desde lo que se haya guardado como hora preferida */
  horaCorta(hora: string): string {
    if (!this.tieneHorario(hora)) return '';
    if (hora.includes('T')) {
      const fecha = new Date(hora);
      if (!isNaN(fecha.getTime())) return fecha.toTimeString().substring(0, 5);
    }
    return hora;
  }

  /** Suspende la mantención del día seleccionado (se puede restaurar desde "Suspendidos"). */
  private ejecutarSuspension(cliente: ClienteDelDia) {
    // Actualizar UI inmediatamente para evitar que se vea el cliente re-aparecer
    this.clientesPendientes = this.clientesPendientes.filter(c => c.id !== cliente.id);
    // Añadir al contador local y lista de suspendidos
    this.deletedClientsList.push({ id: cliente.id, nombre: cliente.nombre });
    this.deletedTodayCount = this.deletedClientsList.length;

    this.maintenanceCount = this.clientesPendientes.length;
    this.maintenanceWord = this.maintenanceCount === 1 ? 'mantención' : 'mantenciones';
    this.calcularProgreso();
    this.actualizarEventosCalendario();

    // Luego persistir como registro saltado en la base de datos (si falla, revertimos)
    this.agregarRegistroSaltado(cliente);

    this.showToast(`Mantención de ${cliente.nombre} suspendida ❌`, 'danger');
  }

  // Abre el selector de fecha para "cambiar de día"
  async abrirSelectorCambioDia(cliente: ClienteDelDia) {
    this.clienteCambioDia = cliente;
    this.fechaNuevaCandidata = this.formatearFechaLocal(this.fechaSeleccionada);
    this.mostrarSelectorDia = true;
  }

  // Al pulsar una fecha en el calendario se pregunta el alcance del cambio
  seleccionarFechaNueva(event: any) {
    const valor = event?.detail?.value;
    if (!valor || !this.clienteCambioDia) return;

    const fecha = this.parseFechaIso(String(valor));
    if (!fecha) return;

    this.mostrarSelectorDia = false;
    this.preguntarCambioDia(this.clienteCambioDia, fecha);
  }

  cerrarSelectorDia() {
    this.mostrarSelectorDia = false;
    this.clienteCambioDia = null;
  }

  // ¿Quieres cambiar a {cliente} al {día}? Cancelar / Solo por este día / Para siempre
  async preguntarCambioDia(cliente: ClienteDelDia, fechaNueva: Date) {
    const texto = fechaNueva.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    const leido = texto.charAt(0).toUpperCase() + texto.slice(1);

    const alert = await this.alertController.create({
      header: 'Cambiar de día',
      message: `¿Quieres cambiar a ${cliente.nombre} al ${leido}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Solo por este día',
          handler: () => {
            this.aplicarCambioDia(cliente, fechaNueva, 'una_vez');
          }
        },
        {
          text: 'Para siempre',
          handler: () => {
            this.aplicarCambioDia(cliente, fechaNueva, 'para_siempre');
          }
        }
      ]
    });

    await alert.present();
  }

  // Aplica el cambio de día según el alcance elegido
  private aplicarCambioDia(cliente: ClienteDelDia, fechaNueva: Date, alcance: 'una_vez' | 'para_siempre') {
    const fechaOrigenStr = this.formatearFechaLocal(this.fechaSeleccionada);
    const fechaNuevaStr = this.formatearFechaLocal(fechaNueva);

    if (fechaNuevaStr === fechaOrigenStr) {
      this.showToast('La fecha elegida es el mismo día', 'warning');
      return;
    }

    this.clienteService.getClienteById(cliente.id).subscribe({
      next: (clienteCompleto) => {
        // 1. Marcar el día original como saltado/cambiado
        const ahora = new Date();
        const nuevoRegistro = {
          id: nuevoIdRegistro(),
          fecha: fechaOrigenStr,
          servicio: `Mantención ${this.getServicioTipo(clienteCompleto.programacion?.frecuencia || 'semanal')} - Cambio de día`,
          cloro: 0,
          ph: 0,
          cantidadCloro: 0,
          cantidadBajaPh: 0,
          cantidadSubePh: 0,
          cantidadPastillas: 0,
          tipoPh: null,
          estadoCloro: 'saltada',
          estadoPh: 'saltada',
          // Para que el historial diga a qué día se cambió
          movidaA: fechaNuevaStr,
          hora: ahora.toTimeString().split(' ')[0].substring(0, 5),
          [CAMPO_UNIDAD_MASA]: UNIDAD_MASA
        };
        clienteCompleto.historial = clienteCompleto.historial || [];
        clienteCompleto.historial.unshift(nuevoRegistro);

        clienteCompleto.skippedDates = clienteCompleto.skippedDates || [];
        if (!clienteCompleto.skippedDates.includes(fechaOrigenStr)) {
          clienteCompleto.skippedDates.push(fechaOrigenStr);
        }

        // Si la fecha nueva estaba suspendida, se quita la suspensión: el cliente
        // movido debe quedar pendiente ese día
        clienteCompleto.skippedDates = clienteCompleto.skippedDates.filter(f => f !== fechaNuevaStr);
        clienteCompleto.historial = clienteCompleto.historial.filter(
          h => !(h.fecha === fechaNuevaStr && esMantencionSaltada(h))
        );

        // 2. Según el alcance
        if (alcance === 'una_vez') {
          // Solo este día: aparece una vez en la fecha nueva
          clienteCompleto.serviciosExtra = clienteCompleto.serviciosExtra || [];
          if (!clienteCompleto.serviciosExtra.some(s => s.fecha === fechaNuevaStr)) {
            clienteCompleto.serviciosExtra.push({ fecha: fechaNuevaStr, servicio: 'Mantención de piscina' });
          }
        } else {
          // Para siempre: cambia el día recurrente de la semana
          const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
          const diaOrigen = diasSemana[this.fechaSeleccionada.getDay()];
          const diaNuevo = diasSemana[fechaNueva.getDay()];

          clienteCompleto.programacion = clienteCompleto.programacion || {
            frecuencia: 'semanal',
            cantidadPorPeriodo: 1,
            diasSemana: [],
            horaPreferida: '',
            notas: ''
          };
          const dias = clienteCompleto.programacion.diasSemana || [];
          const sinOrigen = dias.filter(d => d !== diaOrigen);
          if (!sinOrigen.includes(diaNuevo)) {
            sinOrigen.push(diaNuevo);
          }
          clienteCompleto.programacion.diasSemana = sinOrigen;
        }

        // 3. Persistir y recargar
        this.clienteService.updateCliente(clienteCompleto).subscribe({
          next: () => {
            const texto = fechaNueva.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
            this.seccionActiva = 'porRealizar';
            this.showToast(`${cliente.nombre} movido a ${texto} ✅`, 'success');
            this.cargarClientesDelDia();
          },
          error: (err) => {
            console.error('Error al cambiar de día:', err);
            this.showToast('Error al cambiar de día ❌', 'danger');
          }
        });
      },
      error: (err) => {
        console.error('Error obteniendo cliente:', err);
        this.showToast('Error al obtener cliente ❌', 'danger');
      }
    });
  }

  // Convierte 'YYYY-MM-DD...' a Date local al mediodía local del día indicado
  private parseFechaIso(valor: string): Date | null {
    const match = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  removeHistorialEntry(clienteId: string, fecha: string) {
    this.clienteService.getClienteById(clienteId).subscribe({
      next: (clienteCompleto) => {
        if (clienteCompleto.historial) {
          clienteCompleto.historial = clienteCompleto.historial.filter(h => h.fecha !== fecha);
        }

        this.clienteService.updateCliente(clienteCompleto).subscribe({
          next: () => {
            console.log('Entrada del historial removida para cliente:', clienteId, 'fecha:', fecha);
          },
          error: (err) => {
            console.error('Error al remover entrada del historial:', err);
          }
        });
      },
      error: (err) => {
        console.error('Error al obtener cliente completo para remover historial:', err);
      }
    });
  }

  agregarRegistroSaltado(cliente: ClienteDelDia) {
    const fechaSeleccionadaStr = this.formatearFechaLocal(this.fechaSeleccionada);
    const ahora = new Date();

    this.clienteService.getClienteById(cliente.id).subscribe({
      next: (clienteCompleto) => {
        const nuevoRegistro = {
          id: nuevoIdRegistro(),
          fecha: fechaSeleccionadaStr,
          servicio: `Mantención ${this.getServicioTipo(clienteCompleto.programacion?.frecuencia || 'semanal')} - Saltada`,
          cloro: 0,
          ph: 0,
          cantidadCloro: 0,
          cantidadSubePh: 0,
          cantidadBajaPh: 0,
          cantidadPastillas: 0,
          tipoPh: null,
          estadoCloro: 'saltada',
          estadoPh: 'saltada',
          hora: ahora.toTimeString().split(' ')[0].substring(0, 5),
          [CAMPO_UNIDAD_MASA]: UNIDAD_MASA
        };

        clienteCompleto.historial = clienteCompleto.historial || [];
        // Añadir al inicio para que sea el más reciente
        clienteCompleto.historial.unshift(nuevoRegistro);

        // Marca explícita para evitar reaparición — array de fechas marcadas como saltadas
        (clienteCompleto as any).skippedDates = (clienteCompleto as any).skippedDates || [];
        if (!(clienteCompleto as any).skippedDates.includes(fechaSeleccionadaStr)) {
          (clienteCompleto as any).skippedDates.push(fechaSeleccionadaStr);
        }

        this.clienteService.updateCliente(clienteCompleto).subscribe({
          next: () => {
            console.log('Registro de mantención saltada agregado para cliente:', cliente.nombre);
            // Verificar en DB que skippedDates fue persistido
            this.clienteService.getClienteById(cliente.id).subscribe({
              next: (verif) => console.log(`Verificación DB skippedDates para ${cliente.nombre}:`, (verif as any).skippedDates || []),
              error: (vErr) => console.error('Error verificando skippedDates en DB:', vErr)
            });

            // Recargar clientes para aplicar filtro y actualizar contador de borrados
            this.cargarClientesDelDia();
            this.showToast(`Mantención de ${cliente.nombre} suspendida ❌`, 'danger');
          },
          error: (err) => {
            console.error('Error al agregar registro saltado:', err);
            // Revertir cambio local si falla la persistencia
            this.deletedClientsList = this.deletedClientsList.filter(d => d.id !== cliente.id);
            this.deletedTodayCount = this.deletedClientsList.length;
            // Re-agregar el cliente a pendientes para que vuelva a mostrarse en UI
            this.clientesPendientes.push(cliente);
            this.maintenanceCount = this.clientesPendientes.length;
            this.maintenanceWord = this.maintenanceCount === 1 ? 'mantención' : 'mantenciones';
            this.calcularProgreso();
            this.actualizarEventosCalendario();
            this.showToast('Error al marcar mantención como borrada', 'danger');
          }
        });
      },
      error: (err) => {
        console.error('Error al obtener cliente completo para registro saltado:', err);
      }
    });
  }

  // Método para obtener el color del progreso
  getColorProgreso(): string {
    if (this.progresoDelDia === 100) return 'success';
    if (this.progresoDelDia >= 50) return 'secondary';
    return 'primary';
  }

  // Método para formatear la hora
  tieneHorario(hora: string): boolean {
    return !!hora && hora !== 'Sin horario específico';
  }

  /** Detalle de un ícono de la tarjeta, en un aviso corto */
  async mostrarDetalle(texto: string) {
    await this.toastController.dismiss().catch(() => {});
    const toast = await this.toastController.create({
      message: texto,
      duration: 1600,
      position: 'top',
      cssClass: 'toast-detalle'
    });
    toast.present();
  }

  formatearHora(hora: string): string {
    if (!hora || hora === 'Sin horario específico') {
      return 'Sin horario específico';
    }

    // Extraer la hora del string (manejar diferentes formatos)
    let horaFormateada = hora;

    // Si es un string ISO completo, extraer solo la hora
    if (hora.includes('T')) {
      try {
        const fecha = new Date(hora);
        horaFormateada = fecha.toTimeString().split(' ')[0].substring(0, 5); // HH:mm
      } catch (e) {
        // Si falla el parseo, usar el string original
        horaFormateada = hora;
      }
    }

    // Obtener la fecha actual en formato DD/MM/AAAA
    const today = new Date();
    const dia = today.getDate().toString().padStart(2, '0');
    const mes = (today.getMonth() + 1).toString().padStart(2, '0');
    const anio = today.getFullYear();
    const fechaFormateada = `${dia}/${mes}/${anio}`;

    return `${fechaFormateada} a las ${horaFormateada}`;
  }
}