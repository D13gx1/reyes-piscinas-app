import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Sonido y vibración cortos para cuando avanza el progreso del día.
 * El sonido se sintetiza con Web Audio (sin archivos): un "ding" de dos notas
 * al completar una mantención y un acorde ascendente al terminar el día.
 */

let contexto: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    contexto ??= new Ctx();
    if (contexto.state === 'suspended') {
      contexto.resume().catch(() => undefined);
    }
    return contexto;
  } catch {
    return null;
  }
}

/** Una nota suave (seno con ataque rápido y caída) */
function nota(ctx: AudioContext, frecuencia: number, inicio: number, duracion: number, volumen = 0.18) {
  const osc = ctx.createOscillator();
  const ganancia = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frecuencia;
  ganancia.gain.setValueAtTime(0.0001, inicio);
  ganancia.gain.exponentialRampToValueAtTime(volumen, inicio + 0.015);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
  osc.connect(ganancia).connect(ctx.destination);
  osc.start(inicio);
  osc.stop(inicio + duracion + 0.05);
}

/**
 * Celebra un avance del día.
 * @param completo true cuando se completaron todas las mantenciones del día
 */
export function celebrarProgreso(completo: boolean) {
  const ctx = audio();
  if (ctx) {
    const t = ctx.currentTime + 0.02;
    if (completo) {
      // Acorde ascendente: Do - Mi - Sol - Do
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => nota(ctx, f, t + i * 0.09, 0.5, 0.16));
    } else {
      // "Ding" de dos notas: Mi - La
      nota(ctx, 659.25, t, 0.25);
      nota(ctx, 880, t + 0.1, 0.35);
    }
  }

  if (Capacitor.isNativePlatform()) {
    const vibracion = completo
      ? Haptics.notification({ type: NotificationType.Success })
      : Haptics.impact({ style: ImpactStyle.Light });
    vibracion.catch(() => undefined);
  }
}

/** "Cling" de moneda al cobrar: dos notas agudas y cortas + vibración leve */
export function sonidoMoneda() {
  const ctx = audio();
  if (ctx) {
    const t = ctx.currentTime + 0.02;
    nota(ctx, 1318.5, t, 0.12, 0.14);
    nota(ctx, 1975.5, t + 0.07, 0.3, 0.12);
  }
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
  }
}

/** Lo que muestra el chip de dinero del encabezado mientras está visible */
export interface EstadoGanancia {
  /** Monto que se ve ahora (va subiendo) */
  mostrado: number;
  /** Lo recién cobrado, para el "+$" que sube flotando */
  monto: number;
  /** Ya apareció el "+$" y el total está subiendo */
  sumando: boolean;
  saliendo: boolean;
}

/** Cuánto se ve el total de antes, antes de sumar */
const ESPERA_ANTES = 1000;
/** Lo que tarda el conteo hasta el total nuevo */
const DURACION_CONTEO = 900;
/** Cuánto se ve el total nuevo antes de irse */
const ESPERA_DESPUES = 1000;
/** Lo que dura la animación de salida (igual que gananciaSale en el encabezado) */
const DURACION_SALIDA = 400;

/**
 * Chip "cobrado" del encabezado: muestra el total de antes 1 s, aparece el
 * "+$" con la moneda y cuenta hasta el total nuevo frenando al final, lo deja
 * 1 s más y se va. Lo usan el inicio, Estadísticas y el historial del cliente.
 */
export class ContadorGanancia {
  estado: EstadoGanancia | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];

  mostrar(total: number, monto: number) {
    this.timers.forEach(t => clearTimeout(t));
    const desde = Math.max(0, total - monto);
    this.estado = { mostrado: desde, monto, sumando: false, saliendo: false };

    const sumar = () => {
      if (!this.estado) return;
      this.estado.sumando = true;
      sonidoMoneda();

      const inicio = performance.now();
      const paso = (ahora: number) => {
        if (!this.estado) return;
        const t = Math.min(1, (ahora - inicio) / DURACION_CONTEO);
        const suave = 1 - Math.pow(1 - t, 3);
        this.estado.mostrado = Math.round(desde + (total - desde) * suave);
        if (t < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    };

    const salida = ESPERA_ANTES + DURACION_CONTEO + ESPERA_DESPUES;
    this.timers = [
      setTimeout(sumar, ESPERA_ANTES),
      setTimeout(() => this.estado && (this.estado.saliendo = true), salida),
      setTimeout(() => (this.estado = null), salida + DURACION_SALIDA),
    ];
  }
}
