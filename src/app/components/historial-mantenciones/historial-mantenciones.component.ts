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
  checkmarkOutline,
  searchOutline,
  swapVerticalOutline,
  arrowUpOutline,
  arrowDownOutline,
  leafOutline,
  layersOutline,
  constructOutline,
  chevronDownOutline,
  closeCircle,
  alertCircleOutline,
  cashOutline
} from 'ionicons/icons';
import { Mantencion } from '../../services/estadisticas.service';
import { formatearKgValor, formatearGramos, formatearUnidades } from '../../utils/unidades';
import { esMantencionPagada } from '../../utils/mantencion';
import { MUESTRA_CLORO, MUESTRA_PH, estadoCloroDe, estadoPhDe, etiquetaNivel } from '../../utils/niveles';
import { OpcionServicio, ProductoUsado, infoServicio, productosUsados } from '../../utils/servicios';

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
  'search-outline': searchOutline,
  'swap-vertical-outline': swapVerticalOutline,
  'arrow-up-outline': arrowUpOutline,
  'arrow-down-outline': arrowDownOutline,
  'leaf-outline': leafOutline,
  'layers-outline': layersOutline,
  'construct-outline': constructOutline,
  'chevron-down-outline': chevronDownOutline,
  'close-circle': closeCircle,
  'alert-circle-outline': alertCircleOutline,
  'cash-outline': cashOutline,
});

/** Mantenciones de un mes, con su total, para los separadores de la lista */
export interface GrupoHistorial {
  clave: string;
  titulo: string;
  cantidad: number;
  total: number;
  items: Mantencion[];
}

type CriterioOrden = 'fecha' | 'nombre' | 'precio';

/** Cada opción del menú ya trae su sentido: no hace falta un botón aparte para invertir */
interface OpcionOrden { criterio: CriterioOrden; ascendente: boolean; texto: string; }

const OPCIONES_ORDEN: OpcionOrden[] = [
  { criterio: 'fecha', ascendente: false, texto: 'Más recientes' },
  { criterio: 'fecha', ascendente: true, texto: 'Más antiguas' },
  { criterio: 'precio', ascendente: false, texto: 'Mayor precio' },
  { criterio: 'precio', ascendente: true, texto: 'Menor precio' },
  { criterio: 'nombre', ascendente: true, texto: 'Nombre A-Z' },
  { criterio: 'nombre', ascendente: false, texto: 'Nombre Z-A' },
];

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
  /** Lista ya filtrada, separada por mes cuando se ordena por fecha */
  grupos: GrupoHistorial[] = [];
  /** Contadores del filtro (sin contar la búsqueda) */
  conteo = { todos: 0, pendientes: 0, pagados: 0 };
  /** Filas abiertas para ver el detalle */
  expandidos = new Set<string>();

  // Búsqueda y orden (mismo control que la lista de Clientes)
  busqueda = '';
  criterioOrden: CriterioOrden = 'fecha';
  /** Con "Más recientes" descendente = la más nueva primero */
  ascendente = false;
  /** Solo se ofrece buscar / ordenar por nombre si hay más de un cliente en la lista */
  variosClientes = false;


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
  }

  get textoOrden(): string {
    return this.opcionActual?.texto || 'Ordenar';
  }

  private get opcionActual(): OpcionOrden | undefined {
    return OPCIONES_ORDEN.find(o => o.criterio === this.criterioOrden && o.ascendente === this.ascendente);
  }

  esOrdenActual(o: OpcionOrden): boolean {
    return o === this.opcionActual;
  }

  onBusqueda(valor: string | null | undefined) {
    this.busqueda = valor || '';
    this.aplicarFiltro();
  }

  /** Menú de "Ordenar por" desplegado bajo su botón */
  menuOrdenAbierto = false;

  /** Con un solo cliente no tiene sentido ordenar por nombre */
  get opcionesDisponibles(): OpcionOrden[] {
    return OPCIONES_ORDEN.filter(o => o.criterio !== 'nombre' || this.variosClientes);
  }

  seleccionarOrden(o: OpcionOrden) {
    this.menuOrdenAbierto = false;
    if (this.esOrdenActual(o)) return;
    this.criterioOrden = o.criterio;
    this.ascendente = o.ascendente;
    this.aplicarFiltro();
  }

  private aplicarFiltro() {
    this.variosClientes = new Set(this.mantenciones.map((m: any) => m.clienteId)).size > 1;
    if (!this.variosClientes && this.criterioOrden === 'nombre') {
      this.criterioOrden = 'fecha';
      this.ascendente = false;
    }

    // "Por cobrar" son las hechas sin pagar: una suspendida no se cobra
    const porCobrar = (m: any) => !m.suspendida && !esMantencionPagada(m);
    this.conteo = {
      todos: this.mantenciones.length,
      pendientes: this.mantenciones.filter(porCobrar).length,
      pagados: this.mantenciones.filter((m: any) => esMantencionPagada(m)).length,
    };

    let lista: Mantencion[];
    switch (this.filtroActual) {
      case 'pagados':
        lista = this.mantenciones.filter((m: any) => esMantencionPagada(m));
        break;
      case 'pendientes':
        lista = this.mantenciones.filter(porCobrar);
        break;
      default:
        lista = [...this.mantenciones];
        break;
    }

    const termino = this.normalizar(this.busqueda.trim());
    if (termino && this.variosClientes) {
      lista = lista.filter(m => this.normalizar(m.clienteNombre).includes(termino));
    }

    this.mantencionesFiltradas = lista.sort((a, b) => this.comparar(a, b));
    this.grupos = this.agrupar(this.mantencionesFiltradas);
  }

  /** Por fecha: un separador por mes con cuántas y cuánto. Por otro criterio: una sola lista */
  private agrupar(lista: Mantencion[]): GrupoHistorial[] {
    if (this.criterioOrden !== 'fecha') {
      return [{ clave: 'todo', titulo: '', cantidad: lista.length, total: 0, items: lista }];
    }
    const grupos: GrupoHistorial[] = [];
    for (const m of lista) {
      const clave = String(m.fecha || '').slice(0, 7);
      let grupo = grupos[grupos.length - 1];
      if (!grupo || grupo.clave !== clave) {
        grupo = { clave, titulo: this.tituloMes(m.fecha), cantidad: 0, total: 0, items: [] };
        grupos.push(grupo);
      }
      grupo.items.push(m);
      if (!(m as any).suspendida) {
        grupo.cantidad++;
        grupo.total += m.precio || 0;
      }
    }
    return grupos;
  }

  private tituloMes(fecha: any): string {
    if (!fecha) return 'Sin fecha';
    const texto = this.parseFechaLocal(fecha).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    return texto.charAt(0).toUpperCase() + texto.slice(1).replace(' de ', ' ');
  }

  toggleExpandido(m: Mantencion) {
    if (!this.expandidos.delete(m.id)) this.expandidos.add(m.id);
  }

  limpiarBusqueda() {
    this.onBusqueda('');
  }

  /** Título de la fila: el cliente si hay varios; si es uno solo, el día (el servicio normal no aporta) */
  tituloFila(m: Mantencion): string {
    if (this.variosClientes) return m.clienteNombre;
    return this.esServicioEspecial(m) ? this.servicioDe(m).corto : this.detalleFecha(m.fecha);
  }

  /** Línea secundaria: hora, servicio especial o suspendida, sin repetir lo del título */
  subtituloFila(m: Mantencion): string {
    const partes: string[] = [];
    if (this.variosClientes || this.esServicioEspecial(m)) partes.push(this.detalleFecha(m.fecha));
    if (m.hora) partes.push(m.hora);
    if (this.variosClientes && this.esServicioEspecial(m) && !(m as any).suspendida) partes.push(this.servicioDe(m).corto);
    if ((m as any).suspendida) partes.push(this.textoNoRealizada(m));
    return partes.join(' · ');
  }

  /** Suspendida por "Otro día" (no por suspender sin más) */
  esCambioDia(m: Mantencion): boolean {
    return !!m.suspendida && (!!m.movidaA || /cambio de d[ií]a/i.test(m.servicio || ''));
  }

  /** "Cambiada al mié, 10 de mayo", "Cambiada de día" (registros antiguos) o "Suspendida" */
  textoNoRealizada(m: Mantencion): string {
    if (!this.esCambioDia(m)) return 'Suspendida';
    if (!m.movidaA) return 'Cambiada de día';
    const fecha = this.parseFechaLocal(m.movidaA).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'long' });
    return 'Cambiada al ' + fecha.replace('.', '');
  }

  /** Servicio especial (no la mantención normal): se muestra como etiqueta */
  esServicioEspecial(m: Mantencion): boolean {
    return !/^manten/i.test(infoServicio(m.servicio).corto);
  }

  private comparar(a: Mantencion, b: Mantencion): number {
    const porFecha = `${a.fecha} ${a.hora || ''}`.localeCompare(`${b.fecha} ${b.hora || ''}`);
    let r: number;
    switch (this.criterioOrden) {
      case 'nombre':
        r = (a.clienteNombre || '').localeCompare(b.clienteNombre || '', 'es', { sensitivity: 'base' });
        break;
      case 'precio':
        r = (a.precio || 0) - (b.precio || 0);
        break;
      default:
        r = porFecha;
    }
    if (r !== 0) return this.ascendente ? r : -r;
    // Empates: la más reciente primero
    return -porFecha;
  }

  // Sin tildes ni mayúsculas, para que "maria" encuentre a "María"
  private normalizar(texto: string): string {
    return (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  tieneProductos(m: Mantencion): boolean {
    return this.productosDe(m).length > 0;
  }

  servicioDe(m: Mantencion): OpcionServicio {
    return infoServicio(m.servicio);
  }

  /** Cuarzo o repuestos de la bomba, en CLP */
  costoMateriales(m: Mantencion): number {
    return m.cuarzo?.precioCuarzo || m.bomba?.costoRepuestos || 0;
  }

  costoManoObra(m: Mantencion): number {
    return m.cuarzo?.manoObra || m.bomba?.manoObra || 0;
  }

  /** Cloro y pH con el color de la muestra; vacío si no se midió */
  aguaDe(m: Mantencion): { nombre: string; estado: string; valor: string; muestra: string }[] {
    const agua = [];
    const cloro = estadoCloroDe(m.cloro, m.estadoCloro);
    if (cloro) {
      agua.push({ nombre: 'Cloro', estado: etiquetaNivel(cloro), valor: `${m.cloro} ppm`, muestra: MUESTRA_CLORO[cloro] });
    }
    const ph = estadoPhDe(m.ph, m.estadoPh);
    if (ph) {
      agua.push({ nombre: 'pH', estado: etiquetaNivel(ph), valor: String(m.ph), muestra: MUESTRA_PH[ph] });
    }
    return agua;
  }

  /** Lo que se usó en la visita (químicos y materiales del servicio), sin los que quedaron en 0. */
  productosDe(m: Mantencion): ProductoUsado[] {
    return productosUsados(m);
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

  private readonly mesFormatter = new Intl.DateTimeFormat('es-CL', { month: 'short' });
  private readonly diaSemanaFormatter = new Intl.DateTimeFormat('es-CL', { weekday: 'long' });

  /** Número del día para el recuadro tipo calendario */
  diaDe(fecha: any): string {
    return fecha ? String(this.parseFechaLocal(fecha).getDate()) : '–';
  }

  /** Mes abreviado ("sep") para el recuadro tipo calendario */
  mesDe(fecha: any): string {
    return fecha ? this.mesFormatter.format(this.parseFechaLocal(fecha)).replace('.', '').slice(0, 3) : '';
  }

  /** Día de la semana ("Martes"): el número va en el recuadro y el mes/año en el separador */
  detalleFecha(fecha: any): string {
    if (!fecha) return 'Sin fecha';
    const dia = this.diaSemanaFormatter.format(this.parseFechaLocal(fecha));
    return dia.charAt(0).toUpperCase() + dia.slice(1);
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
