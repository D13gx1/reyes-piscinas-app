import { Injectable, computed, inject, signal } from '@angular/core';
import { filter, take } from 'rxjs/operators';
import { EstadisticasService, IngresosAnio } from './estadisticas.service';

/** Lo que muestra la tarjeta de cierre de mes */
export interface ResumenMes {
  /** "2026-09": identifica el mes */
  clave: string;
  /** "Octubre" */
  mes: string;
  /** "septiembre" (en minúscula: va dentro de frases) */
  mesAnterior: string;
  /** "noviembre" */
  mesSiguiente: string;
  /** Mes que cerró (0 = enero), para el consejo de temporada */
  indiceMes: number;
  total: number;
  totalAnterior: number;
  cantidad: number;
  cantidadAnterior: number;
  /** El mes que cerró es el que más recaudó en lo que va del año */
  mejorDelAnio: boolean;
  /** Abierto desde Perfil: no marca el mes como visto */
  ejemplo?: boolean;
}

const CLAVE_VISTO = 'resumenMesVisto';
/** Versión anterior: solo guardaba el último resumen abierto */
const CLAVE_LEIDO = 'resumenMesLeido';
/** Meses cuyo resumen ya se abrió: los demás de la campana son nuevos */
const CLAVE_LEIDOS = 'resumenMesLeidos';
/** Cuántos meses recientes se listan en la campana (los más antiguos no) */
const MESES_EN_AVISOS = 3;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * Tarjeta de cierre de mes: al abrir la app en un mes nuevo compara lo
 * recaudado en el mes que terminó con el anterior (mismo cálculo que el gráfico
 * de Estadísticas) y la muestra una sola vez por mes. Además deja los
 * resúmenes de los últimos meses en la campana del encabezado: los que aún no
 * se abren van marcados como nuevos y encienden el punto rojo, que se apaga al
 * tocarlos (los antiguos no se listan).
 */
@Injectable({ providedIn: 'root' })
export class ResumenMesService {
  private estadisticas = inject(EstadisticasService);

  /** Resumen visible; null = oculto */
  readonly actual = signal<ResumenMes | null>(null);

  /** Resúmenes de los meses recientes, del más nuevo al más antiguo (campana del encabezado) */
  readonly avisos = signal<ResumenMes[]>([]);
  /** Panel de la campana abierto */
  readonly panelAbierto = signal(false);
  /** Meses ya abiertos; null = aún no se guarda ninguno (se arma al cargar la lista) */
  private leidos = signal<string[] | null>(this.leerLeidos());

  /** Punto rojo en la campana: hay algún resumen sin abrir */
  readonly sinLeer = computed(() => this.avisos().some(a => this.esNuevo(a)));

  private avisosCargados = false;

  /** Al entrar a la app: si cerró un mes que aún no se mostró, aparece su resumen */
  revisarAlEntrar() {
    this.cargarAvisos();

    const cerrado = this.mesCerrado();
    const clave = this.clave(cerrado);
    const visto = this.leerVisto();
    if (visto === clave) return;

    // Primera vez con esta función: se empieza a contar desde aquí sin mostrar
    // el resumen de un mes que ya pasó hace rato (queda igual en la campana)
    if (visto === null) {
      this.guardarVisto(clave);
      return;
    }

    this.cargar(cerrado, resumen => {
      // Sin nada que comparar (meses vacíos) no se muestra, pero queda visto
      if (!resumen || (resumen.total === 0 && resumen.totalAnterior === 0)) {
        this.guardarVisto(clave);
        return;
      }
      this.actual.set(resumen);
    });
  }

  /** Desde Perfil: el resumen real del mes pasado, aunque ya se haya visto */
  verMesPasado(): Promise<boolean> {
    return new Promise(resolver => {
      this.cargar(this.mesCerrado(), resumen => {
        if (resumen) this.actual.set({ ...resumen, ejemplo: true });
        resolver(!!resumen);
      });
    });
  }

  cerrar() {
    const resumen = this.actual();
    if (resumen && !resumen.ejemplo && resumen.clave === this.clave(this.mesCerrado())) {
      this.guardarVisto(resumen.clave);
      // Ya se vio entero: deja de ser nuevo en la campana
      this.marcarLeido(resumen.clave);
    }
    this.actual.set(null);
  }

  // ===== Campana del encabezado =====

  alternarPanel() {
    this.panelAbierto.set(!this.panelAbierto());
  }

  /** Aún no se abre: lleva la etiqueta "Nuevo" y enciende el punto de la campana */
  esNuevo(resumen: ResumenMes): boolean {
    const leidos = this.leidos();
    return !!leidos && !leidos.includes(resumen.clave);
  }

  cerrarPanel() {
    this.panelAbierto.set(false);
  }

  /** Abre la tarjeta completa de un mes de la lista; deja de ser nuevo */
  abrirAviso(resumen: ResumenMes) {
    this.panelAbierto.set(false);
    this.marcarLeido(resumen.clave);
    this.actual.set(resumen);
  }

  private marcarLeido(clave: string) {
    const leidos = this.leidos() ?? [];
    if (leidos.includes(clave)) return;
    this.guardarLeidos([...leidos, clave]);
  }

  private guardarLeidos(leidos: string[]) {
    // Basta recordar los meses que todavía pueden salir en la campana
    const recientes = leidos.sort().slice(-12);
    this.leidos.set(recientes);
    this.guardar(CLAVE_LEIDOS, JSON.stringify(recientes));
  }

  private leerLeidos(): string[] | null {
    try {
      const guardados = JSON.parse(this.leer(CLAVE_LEIDOS) || 'null');
      return Array.isArray(guardados) ? guardados : null;
    } catch {
      return null;
    }
  }

  /** Sigue en vivo los cambios de los clientes (un pago viejo, una mantención registrada tarde…) */
  private cargarAvisos() {
    if (this.avisosCargados) return;
    this.avisosCargados = true;
    this.estadisticas.getIngresosPorAnio().subscribe(anios => {
      const cerrado = this.mesCerrado();
      const lista: ResumenMes[] = [];
      for (let i = 0; i < MESES_EN_AVISOS; i++) {
        const resumen = this.armar(anios, new Date(cerrado.getFullYear(), cerrado.getMonth() - i, 1));
        // Meses sin nada que contar no se listan
        if (resumen.total > 0 || resumen.totalAnterior > 0) lista.push(resumen);
      }
      // Primera vez: los meses anteriores ya se dan por vistos; el del mes
      // pasado sigue nuevo salvo que ya se hubiera abierto (versión anterior)
      if (this.leidos() === null && lista.length) {
        const ultimo = this.clave(cerrado);
        const vistos = lista.map(a => a.clave).filter(c => c !== ultimo || this.leer(CLAVE_LEIDO) === c);
        this.guardarLeidos(vistos);
      }
      this.avisos.set(lista);
    });
  }

  private cargar(cerrado: Date, listo: (resumen: ResumenMes | null) => void) {
    this.estadisticas.getIngresosPorAnio()
      // La primera emisión puede llegar vacía mientras cargan los clientes
      .pipe(filter(anios => anios.length > 0), take(1))
      .subscribe(anios => listo(this.armar(anios, cerrado)));
  }

  private armar(anios: IngresosAnio[], cerrado: Date): ResumenMes {
    const anterior = new Date(cerrado.getFullYear(), cerrado.getMonth() - 1, 1);
    const datosDe = (fecha: Date) =>
      anios.find(a => a.anio === fecha.getFullYear())?.meses[fecha.getMonth()] ?? { total: 0, cantidad: 0 };

    const mes = datosDe(cerrado);
    const previo = datosDe(anterior);
    const delAnio = anios.find(a => a.anio === cerrado.getFullYear())?.meses.slice(0, cerrado.getMonth() + 1) ?? [];

    return {
      ...this.nombres(cerrado),
      total: mes.total,
      totalAnterior: previo.total,
      cantidad: mes.cantidad,
      cantidadAnterior: previo.cantidad,
      mejorDelAnio: mes.total > 0 && delAnio.every(m => m.total <= mes.total),
    };
  }

  private nombres(cerrado: Date) {
    const mesIndice = cerrado.getMonth();
    const nombre = MESES[mesIndice];
    return {
      clave: this.clave(cerrado),
      mes: nombre.charAt(0).toUpperCase() + nombre.slice(1),
      mesAnterior: MESES[(mesIndice + 11) % 12],
      mesSiguiente: MESES[(mesIndice + 1) % 12],
      indiceMes: mesIndice,
    };
  }

  /** Primer día del mes que ya terminó (el anterior al actual) */
  private mesCerrado(): Date {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  }

  private clave(fecha: Date): string {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
  }

  private leerVisto(): string | null {
    return this.leer(CLAVE_VISTO);
  }

  private guardarVisto(clave: string) {
    this.guardar(CLAVE_VISTO, clave);
  }

  private leer(llave: string): string | null {
    try {
      return localStorage.getItem(llave);
    } catch {
      return null;
    }
  }

  private guardar(llave: string, valor: string) {
    try {
      localStorage.setItem(llave, valor);
    } catch {
      // Sin almacenamiento solo se vuelve a mostrar en la próxima apertura
    }
  }
}
