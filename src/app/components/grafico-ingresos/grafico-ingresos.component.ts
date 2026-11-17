import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { barChartOutline, chevronBackOutline, chevronForwardOutline, arrowUp, arrowDown } from 'ionicons/icons';
import { EstadisticasService, IngresosAnio, IngresoPeriodo } from '../../services/estadisticas.service';

addIcons({
  'bar-chart-outline': barChartOutline,
  'chevron-back-outline': chevronBackOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'arrow-up': arrowUp,
  'arrow-down': arrowDown,
});

type Vista = 'mes' | 'anio';

interface Barra {
  /** Etiqueta corta bajo la barra ("E", "2025") */
  etiqueta: string;
  /** Nombre completo para el detalle y el lector de pantalla ("Marzo 2026") */
  nombre: string;
  total: number;
  cantidad: number;
  /** Alto de la barra en % del máximo de la escala */
  alto: number;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Gráfico de barras con el dinero ganado por mes (de un año) o por año.
 * Tocar una barra (o pasar el mouse) muestra su detalle arriba del gráfico.
 */
@Component({
  selector: 'app-grafico-ingresos',
  standalone: true,
  imports: [CommonModule, IonIcon, IonSpinner],
  templateUrl: './grafico-ingresos.component.html',
  styleUrls: ['./grafico-ingresos.component.scss'],
})
export class GraficoIngresosComponent implements OnInit {
  /** Año con el que abre la vista mensual. */
  @Input() set anio(valor: number | null | undefined) {
    if (valor && valor !== this.anioVista) {
      this.anioVista = valor;
      this.seleccion = null;
      this.recalcular();
    }
  }

  private readonly estadisticasService = inject(EstadisticasService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly moneda = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  });
  private readonly decimal = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });

  private readonly anioActual = new Date().getFullYear();
  private datos: IngresosAnio[] = [];

  cargando = true;
  vista: Vista = 'mes';
  anioVista = this.anioActual;
  /** Índice de la barra seleccionada; null = la por defecto de la vista. */
  seleccion: number | null = null;

  barras: Barra[] = [];
  /** Marcas del eje Y, de arriba hacia abajo, con su posición en %. */
  ticks: { valor: string; pos: number }[] = [];

  ngOnInit() {
    this.estadisticasService
      .getIngresosPorAnio()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((datos) => {
        this.datos = datos;
        this.cargando = false;
        this.recalcular();
      });
  }

  get primerAnio(): number {
    return this.datos.length ? Math.min(this.datos[0].anio, this.anioActual) : this.anioActual;
  }

  get puedeRetroceder(): boolean {
    return this.anioVista > this.primerAnio;
  }

  get puedeAvanzar(): boolean {
    return this.anioVista < this.anioActual;
  }

  get indiceSeleccionado(): number {
    if (this.seleccion !== null) return this.seleccion;
    if (this.vista === 'anio') return this.barras.length - 1;
    // Por defecto: el mes actual si es este año; si no, el último mes con ingresos
    if (this.anioVista === this.anioActual) return new Date().getMonth();
    const ultimoConDatos = this.barras.map((b) => b.total > 0).lastIndexOf(true);
    return ultimoConDatos >= 0 ? ultimoConDatos : 11;
  }

  get barraSeleccionada(): Barra | null {
    return this.barras[this.indiceSeleccionado] ?? null;
  }

  /** Variación contra el período anterior (mes o año), o null si no hay base. */
  get variacion(): { porcentaje: number; contra: string } | null {
    const i = this.indiceSeleccionado;
    const actual = this.barras[i];
    if (!actual) return null;

    let anterior: IngresoPeriodo | undefined;
    let contra = '';
    if (this.vista === 'anio') {
      const previo = this.barras[i - 1];
      anterior = previo;
      contra = previo?.nombre ?? '';
    } else if (i > 0) {
      anterior = this.barras[i - 1];
      contra = MESES[i - 1].toLowerCase();
    } else {
      // Enero se compara con diciembre del año anterior
      anterior = this.datosDe(this.anioVista - 1)?.meses[11];
      contra = `diciembre ${this.anioVista - 1}`;
    }

    if (!anterior || anterior.total <= 0) return null;
    return {
      porcentaje: Math.round(((actual.total - anterior.total) / anterior.total) * 100),
      contra,
    };
  }

  get totalAnioVista(): number {
    return this.datosDe(this.anioVista)?.total ?? 0;
  }

  get sinDatos(): boolean {
    return this.barras.every((b) => b.total === 0);
  }

  cambiarVista(vista: Vista) {
    if (this.vista === vista) return;
    this.vista = vista;
    this.seleccion = null;
    this.recalcular();
  }

  moverAnio(delta: number) {
    const nuevo = this.anioVista + delta;
    if (nuevo < this.primerAnio || nuevo > this.anioActual) return;
    this.anioVista = nuevo;
    this.seleccion = null;
    this.recalcular();
  }

  seleccionar(indice: number) {
    this.seleccion = indice;
  }

  /** En la vista por año, tocar dos veces un año abre su detalle mensual. */
  abrirAnio(indice: number) {
    if (this.vista !== 'anio') return;
    const anio = Number(this.barras[indice]?.etiqueta);
    if (!anio) return;
    this.anioVista = anio;
    this.vista = 'mes';
    this.seleccion = null;
    this.recalcular();
  }

  formatear(valor: number): string {
    return this.moneda.format(valor || 0);
  }

  descripcion(barra: Barra): string {
    const mantenciones = barra.cantidad === 1 ? 'mantención' : 'mantenciones';
    return `${barra.nombre}: ${this.formatear(barra.total)}, ${barra.cantidad} ${mantenciones}`;
  }

  trackPorEtiqueta(_: number, barra: Barra) {
    return barra.nombre;
  }

  private datosDe(anio: number): IngresosAnio | undefined {
    return this.datos.find((d) => d.anio === anio);
  }

  private recalcular() {
    let base: { etiqueta: string; nombre: string; total: number; cantidad: number }[];

    if (this.vista === 'mes') {
      const anio = this.datosDe(this.anioVista);
      base = MESES.map((nombre, i) => ({
        etiqueta: nombre.charAt(0),
        nombre: `${nombre} ${this.anioVista}`,
        total: anio?.meses[i].total ?? 0,
        cantidad: anio?.meses[i].cantidad ?? 0,
      }));
    } else {
      // Todos los años desde el primero con datos hasta el actual, sin huecos
      base = [];
      for (let anio = this.primerAnio; anio <= this.anioActual; anio++) {
        const d = this.datosDe(anio);
        base.push({ etiqueta: String(anio), nombre: String(anio), total: d?.total ?? 0, cantidad: d?.cantidad ?? 0 });
      }
    }

    const tope = this.escalaRedonda(Math.max(0, ...base.map((b) => b.total)));
    this.barras = base.map((b) => ({ ...b, alto: tope > 0 ? (b.total / tope) * 100 : 0 }));
    this.ticks = [tope, tope / 2, 0].map((v) => ({
      valor: this.compacto(v),
      pos: tope > 0 ? (v / tope) * 100 : 0,
    }));
  }

  /** Monto corto para el eje: "$0", "$450 mil", "$1,2 M". */
  private compacto(valor: number): string {
    if (valor >= 1_000_000) return `$${this.decimal.format(valor / 1_000_000)} M`;
    if (valor >= 1_000) return `$${this.decimal.format(valor / 1_000)} mil`;
    return `$${this.decimal.format(valor)}`;
  }

  /** Redondea el máximo hacia arriba a un número "limpio" (1, 2, 2.5 o 5 × 10ⁿ). */
  private escalaRedonda(maximo: number): number {
    if (maximo <= 0) return 0;
    const magnitud = Math.pow(10, Math.floor(Math.log10(maximo)));
    const paso = [1, 2, 2.5, 5, 10].find((p) => p * magnitud >= maximo) ?? 10;
    return paso * magnitud;
  }
}
