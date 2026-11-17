import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular/standalone';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonIcon,
  IonToggle,
  IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  saveOutline,
  waterOutline,
  flaskOutline,
  arrowDownCircleOutline,
  arrowUpCircleOutline,
  discOutline,
  locationOutline,
  resizeOutline,
  checkmarkOutline,
  buildOutline,
  documentTextOutline,
  timeOutline,
  scaleOutline,
  closeOutline,
  informationCircleOutline,
  alertCircleOutline,
  leafOutline,
  layersOutline,
  constructOutline,
  cashOutline,
  addOutline,
  removeOutline,
  checkmarkCircleOutline,
  checkmarkCircle
} from 'ionicons/icons';
import { ClienteService, Cliente } from '../../../services/cliente.service';
import { CAMPO_UNIDAD_MASA, UNIDAD_MASA } from '../../../utils/unidades';
import { nuevoIdRegistro } from '../../../utils/mantencion';
import {
  SERVICIOS,
  SERVICIO_MANTENCION,
  SERVICIO_RECUPERACION,
  SERVICIO_CUARZO,
  SERVICIO_BOMBA,
  TIPOS_CUARZO,
  REPARACIONES_BOMBA,
  OpcionServicio,
  CamposServicio,
  servicioRequiereNiveles
} from '../../../utils/servicios';

addIcons({
  'save-outline': saveOutline,
  'water-outline': waterOutline,
  'flask-outline': flaskOutline,
  'arrow-down-circle-outline': arrowDownCircleOutline,
  'arrow-up-circle-outline': arrowUpCircleOutline,
  'disc-outline': discOutline,
  'location-outline': locationOutline,
  'resize-outline': resizeOutline,
  'checkmark-outline': checkmarkOutline,
  'build-outline': buildOutline,
  'document-text-outline': documentTextOutline,
  'time-outline': timeOutline,
  'scale-outline': scaleOutline,
  'close-outline': closeOutline,
  'information-circle-outline': informationCircleOutline,
  'alert-circle-outline': alertCircleOutline,
  'leaf-outline': leafOutline,
  'layers-outline': layersOutline,
  'construct-outline': constructOutline,
  'cash-outline': cashOutline,
  'add-outline': addOutline,
  'remove-outline': removeOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'checkmark-circle': checkmarkCircle
});

/** Una opción de nivel de cloro o pH, con su color para pintar el botón. */
interface OpcionNivel {
  estado: string;
  etiqueta: string;
  rango: string;
  valor: number;
  color: string;
  /** Color que toma el agua en el tester (para compararlo a simple vista) */
  muestra: string;
}

/** Un producto químico que se puede aplicar, con su control del formulario. */
interface ProductoQuimico {
  control: string;
  nombre: string;
  unidad: string;
  icono: string;
  color: string;
  paso: string;
  atajos: number[];
}

/**
 * Colores de los niveles del agua: los mismos que usa el resto de la app para
 * los estados del agua (ámbar = bajo, verde = ideal, rojo = alto), que es la
 * paleta de `historial-mantenciones` y `estadisticas`.
 * Los dos niveles "ideal" extra quedan dentro de la familia verde.
 *
 * El orden va de mayor a menor: arriba "Alto" y abajo del todo "Bajo".
 */
const OPCIONES_CLORO: OpcionNivel[] = [
  { estado: 'alto', etiqueta: 'Alto', rango: '> 3.0', valor: 3.5, color: '#dc2626', muestra: '#e39a17' },
  { estado: 'ideal alto', etiqueta: 'Ideal Alto', rango: '2.1 - 3.0', valor: 2.5, color: '#16a34a', muestra: '#f0bd34' },
  { estado: 'ideal', etiqueta: 'Ideal', rango: '1.5 - 2.0', valor: 1.7, color: '#15803d', muestra: '#f6d65e' },
  { estado: 'ideal bajo', etiqueta: 'Ideal Bajo', rango: '1.0 - 1.4', valor: 1.2, color: '#4ade80', muestra: '#f9e797' },
  { estado: 'bajo', etiqueta: 'Bajo', rango: '< 1.0', valor: 0.5, color: '#d97706', muestra: '#fcf6d2' }
];

const OPCIONES_PH: OpcionNivel[] = [
  { estado: 'alto', etiqueta: 'Alto', rango: '> 7.8', valor: 8.0, color: '#dc2626', muestra: '#b01f62' },
  { estado: 'ideal alto', etiqueta: 'Ideal Alto', rango: '7.7 - 7.8', valor: 7.75, color: '#16a34a', muestra: '#d3365c' },
  { estado: 'ideal', etiqueta: 'Ideal', rango: '7.4 - 7.6', valor: 7.5, color: '#15803d', muestra: '#e5564f' },
  { estado: 'ideal bajo', etiqueta: 'Ideal Bajo', rango: '7.2 - 7.3', valor: 7.25, color: '#4ade80', muestra: '#ef844a' },
  { estado: 'bajo', etiqueta: 'Bajo', rango: '< 7.2', valor: 7.0, color: '#d97706', muestra: '#f4b443' }
];

/**
 * Se muestran en una grilla de 2 x 2, en este orden:
 * cloro granulado | sube pH
 * pastillas       | baja pH
 */
const PRODUCTOS: ProductoQuimico[] = [
  {
    control: 'cantidadCloro',
    nombre: 'Cloro granulado',
    unidad: 'kg',
    icono: 'flask-outline',
    color: 'var(--ion-color-primary)',
    paso: '0.01',
    atajos: [0.25, 0.5, 1, 2]
  },
  {
    control: 'cantidadSubePh',
    nombre: 'Sube pH',
    unidad: 'kg',
    icono: 'arrow-up-circle-outline',
    color: 'var(--ion-color-primary)',
    paso: '0.01',
    atajos: [0.25, 0.5, 1, 2]
  },
  {
    control: 'cantidadPastillas',
    nombre: 'Cloro en pastilla',
    unidad: 'uni.',
    icono: 'disc-outline',
    color: 'var(--ion-color-primary)',
    paso: '1',
    atajos: [1, 2, 3, 5]
  },
  {
    control: 'cantidadBajaPh',
    nombre: 'Baja pH',
    unidad: 'kg',
    icono: 'arrow-down-circle-outline',
    color: 'var(--ion-color-primary)',
    paso: '0.01',
    atajos: [0.25, 0.5, 1, 2]
  }
];

/** Solo en recuperación de agua. Se registra en litros. */
const PRODUCTO_ALGICIDA: ProductoQuimico = {
  control: 'cantidadAlgicida',
  nombre: 'Algicida',
  unidad: 'L',
  icono: 'leaf-outline',
  color: 'var(--ion-color-primary)',
  paso: '0.1',
  atajos: [0.25, 0.5, 1, 2]
};

import { EncabezadoComponent } from '../../../components/encabezado/encabezado.component';

@Component({
  selector: 'app-completar-mantencion',
  templateUrl: './completar_mantencion.page.html',
  styleUrls: ['./completar_mantencion.page.scss'],
  standalone: true,
  imports: [
    EncabezadoComponent,
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonButton,
    IonIcon,
    IonToggle,
    IonSpinner
  ]
})
export class CompletarMantencionPage implements OnInit, OnDestroy {
  cliente: Cliente | null = null;
  clienteId: string | null = null;
  mantencionForm: FormGroup;
  cargando = true;
  guardando = false;

  /** Se activa al intentar guardar: desde ahí se marcan en rojo los campos que faltan. */
  intentoGuardar = false;
  /** Campo al que se acaba de llevar al usuario, para sacudirlo. */
  campoResaltado: string | null = null;

  @ViewChild('campoCloro', { read: ElementRef }) campoCloro?: ElementRef<HTMLElement>;
  @ViewChild('campoPh', { read: ElementRef }) campoPh?: ElementRef<HTMLElement>;
  @ViewChild('campoHoraCorte', { read: ElementRef }) campoHoraCorte?: ElementRef<HTMLElement>;
  @ViewChild('campoCuarzoTipo', { read: ElementRef }) campoCuarzoTipo?: ElementRef<HTMLElement>;
  @ViewChild('campoCuarzoKilos', { read: ElementRef }) campoCuarzoKilos?: ElementRef<HTMLElement>;
  @ViewChild('campoBombaReparaciones', { read: ElementRef }) campoBombaReparaciones?: ElementRef<HTMLElement>;

  // Variables para controlar la selección de botones
  cloroSeleccionado: string | null = null;
  phSeleccionado: string | null = null;

  readonly opcionesCloro = OPCIONES_CLORO;
  readonly opcionesPh = OPCIONES_PH;
  readonly tiposCuarzo = TIPOS_CUARZO;
  readonly reparacionesBomba = REPARACIONES_BOMBA;
  readonly SERVICIO_RECUPERACION = SERVICIO_RECUPERACION;
  readonly SERVICIO_CUARZO = SERVICIO_CUARZO;
  readonly SERVICIO_BOMBA = SERVICIO_BOMBA;
  readonly atajosKilosCuarzo = [25, 50, 75, 100];

  private servicioSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clienteService: ClienteService,
    private formBuilder: FormBuilder,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    this.mantencionForm = this.formBuilder.group({
      cloro: [null as number | null, [Validators.required, Validators.min(0), Validators.max(10)]],
      ph: [null as number | null, [Validators.required, Validators.min(0), Validators.max(14)]],
      cantidadCloro: [0, [Validators.min(0)]],
      cantidadBajaPh: [0, [Validators.min(0)]],
      cantidadSubePh: [0, [Validators.min(0)]],
      cantidadPastillas: [0, [Validators.min(0)]],
      cantidadAlgicida: [0, [Validators.min(0)]],
      servicio: [SERVICIO_MANTENCION, Validators.required],
      notas: [''],
      piscinarLlenando: [false],
      horaCorte: [''],
      // Cambio de cuarzo / reparación de bomba: ¿se cobra también la mantención?
      incluirMantencion: [true],
      cuarzo: this.formBuilder.group({
        tipo: [''],
        tipoOtro: [''],
        kilos: [0, [Validators.min(0)]],
        // Vacío = el cliente ya pagó el cuarzo aparte: solo se cobra la mano de obra
        precioCuarzo: [null, [Validators.min(0)]],
        manoObra: [0, [Validators.min(0)]]
      }),
      bomba: this.formBuilder.group({
        marcaModelo: [''],
        reparaciones: [[] as string[]],
        repuestos: [''],
        costoRepuestos: [0, [Validators.min(0)]],
        manoObra: [0, [Validators.min(0)]],
        quedoFuncionando: [true]
      })
    });

    // Los niveles del agua solo son obligatorios en mantención y recuperación
    this.servicioSub = this.mantencionForm.get('servicio')?.valueChanges.subscribe(() => {
      this.actualizarValidadoresNiveles();
    });
  }

  ngOnDestroy() {
    this.servicioSub?.unsubscribe();
  }

  get servicio(): string {
    return this.mantencionForm.get('servicio')?.value || SERVICIO_MANTENCION;
  }

  /** Servicios para elegir; incluye el preseleccionado si es uno antiguo fuera de la lista. */
  get serviciosDisponibles(): OpcionServicio[] {
    const actual = this.servicio;
    if (SERVICIOS.some((s) => s.valor === actual)) return SERVICIOS;
    return [...SERVICIOS, { valor: actual, corto: actual, icono: 'build-outline', color: 'var(--ion-color-primary)' }];
  }

  get nivelesObligatorios(): boolean {
    return servicioRequiereNiveles(this.servicio) || this.incluyeMantencion;
  }

  /**
   * Niveles del agua y productos solo tienen sentido si hubo mantención: en
   * cuarzo / bomba sin mantención se ocultan y no se guardan.
   */
  get muestraQuimicos(): boolean {
    return this.nivelesObligatorios;
  }

  /** Cuarzo y bomba son trabajos aparte: se puede sumar o no la mantención normal. */
  get esServicioConCobroExtra(): boolean {
    return this.servicio === SERVICIO_CUARZO || this.servicio === SERVICIO_BOMBA;
  }

  get incluyeMantencion(): boolean {
    return this.esServicioConCobroExtra && this.mantencionForm.get('incluirMantencion')?.value === true;
  }

  get productos(): ProductoQuimico[] {
    return this.servicio === SERVICIO_RECUPERACION ? [...PRODUCTOS, PRODUCTO_ALGICIDA] : PRODUCTOS;
  }

  /** Día al que corresponde la mantención (AAAA-MM-DD); por defecto hoy. */
  fechaMantencion = this.formatearFechaLocal(new Date());

  /** Precio de la mantención normal: el especial del día o el del cliente. */
  get precioBase(): number {
    if (!this.cliente) return 0;
    return this.cliente.preciosEspeciales?.[this.fechaMantencion] ?? this.cliente.precio ?? 0;
  }

  /** Materiales + mano de obra del servicio especial. */
  get montoServicioExtra(): number {
    const n = (ruta: string) => this.toNumberOrZero(this.mantencionForm.get(ruta)?.value);
    if (this.servicio === SERVICIO_CUARZO) return n('cuarzo.precioCuarzo') + n('cuarzo.manoObra');
    if (this.servicio === SERVICIO_BOMBA) return n('bomba.costoRepuestos') + n('bomba.manoObra');
    return 0;
  }

  /** Lo que se cobrará por esta visita. */
  get totalCobrar(): number {
    if (!this.esServicioConCobroExtra) return this.precioBase;
    return this.montoServicioExtra + (this.incluyeMantencion ? this.precioBase : 0);
  }

  get faltaTipoCuarzo(): boolean {
    return this.intentoGuardar && this.servicio === SERVICIO_CUARZO && !this.tipoCuarzoFinal;
  }

  get faltaKilosCuarzo(): boolean {
    return this.intentoGuardar && this.servicio === SERVICIO_CUARZO &&
      !(this.toNumberOrZero(this.mantencionForm.get('cuarzo.kilos')?.value) > 0);
  }

  get faltaReparacion(): boolean {
    return this.intentoGuardar && this.servicio === SERVICIO_BOMBA && this.reparacionesSeleccionadas.length === 0;
  }

  get tipoCuarzoSeleccionado(): string {
    return this.mantencionForm.get('cuarzo.tipo')?.value || '';
  }

  /** Tipo de cuarzo a guardar: el de la lista o el escrito en "Otro". */
  get tipoCuarzoFinal(): string {
    const tipo = this.tipoCuarzoSeleccionado;
    if (tipo === 'Otro') return (this.mantencionForm.get('cuarzo.tipoOtro')?.value || '').trim();
    return tipo;
  }

  get reparacionesSeleccionadas(): string[] {
    return this.mantencionForm.get('bomba.reparaciones')?.value || [];
  }

  seleccionarServicio(valor: string) {
    this.mantencionForm.get('servicio')?.setValue(valor);
  }

  seleccionarTipoCuarzo(tipo: string) {
    this.mantencionForm.get('cuarzo.tipo')?.setValue(tipo);
  }

  toggleReparacion(reparacion: string) {
    const actuales = this.reparacionesSeleccionadas;
    const nuevas = actuales.includes(reparacion)
      ? actuales.filter((r) => r !== reparacion)
      : [...actuales, reparacion];
    this.mantencionForm.get('bomba.reparaciones')?.setValue(nuevas);
  }

  actualizarValidadoresNiveles() {
    for (const [control, max] of [['cloro', 10], ['ph', 14]] as const) {
      const c = this.mantencionForm.get(control);
      c?.setValidators(
        this.nivelesObligatorios
          ? [Validators.required, Validators.min(0), Validators.max(max)]
          : [Validators.min(0), Validators.max(max)]
      );
      c?.updateValueAndValidity({ emitEvent: false });
    }
  }

  /** Iniciales para el avatar del cliente. */
  get iniciales(): string {
    const nombre = this.cliente?.nombre?.trim() || '';
    if (!nombre) return '?';
    return nombre
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }

  /** Dimensiones de la piscina en un solo string: "8 x 4 x 1.5 m". */
  get dimensiones(): string {
    const m = this.cliente?.medidas;
    if (!m) return 'Sin datos';
    return `${m.largo} x ${m.ancho} x ${m.profundidad} m`;
  }

  /** Valor de cloro seleccionado en ppm (o guion si no hay selección). */
  get cloroActual(): number | null {
    return this.mantencionForm.get('cloro')?.value ?? null;
  }

  get phActual(): number | null {
    return this.mantencionForm.get('ph')?.value ?? null;
  }

  get piscinaLlenando(): boolean {
    return this.mantencionForm.get('piscinarLlenando')?.value === true;
  }

  /** Suma total de kilos de productos en polvo/líquido, para el resumen del encabezado. */
  get kilosTotales(): number {
    return (['cantidadCloro', 'cantidadBajaPh', 'cantidadSubePh'] as const).reduce(
      (total, control) => total + (Number(this.mantencionForm.get(control)?.value) || 0),
      0
    );
  }

  get pastillasTotales(): number {
    return Number(this.mantencionForm.get('cantidadPastillas')?.value) || 0;
  }

  /** Marca el campo de hora de corte en rojo cuando falta y se pidió llenando la piscina. */
  get horaCorteInvalida(): boolean {
    const control = this.mantencionForm.get('horaCorte');
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  get faltaCloro(): boolean {
    return this.intentoGuardar && this.nivelesObligatorios && !this.cloroSeleccionado;
  }

  get faltaPh(): boolean {
    return this.intentoGuardar && this.nivelesObligatorios && !this.phSeleccionado;
  }

  // Método para seleccionar el nivel de cloro
  seleccionarCloro(opcion: OpcionNivel) {
    this.cloroSeleccionado = opcion.estado;
    this.mantencionForm.get('cloro')?.setValue(opcion.valor);
    this.mantencionForm.get('cloro')?.markAsDirty();
  }

  // Método para seleccionar el nivel de pH
  seleccionarPh(opcion: OpcionNivel) {
    this.phSeleccionado = opcion.estado;
    this.mantencionForm.get('ph')?.setValue(opcion.valor);
    this.mantencionForm.get('ph')?.markAsDirty();
  }

  /** Escribe un valor de atajo en el campo del producto. */
  usarAtajo(control: string, valor: number) {
    this.mantencionForm.get(control)?.setValue(valor);
    this.mantencionForm.get(control)?.markAsDirty();
  }

  /** ¿El valor actual del campo coincide con este atajo? (para pintarlo activo) */
  esAtajoActivo(control: string, valor: number): boolean {
    return Number(this.mantencionForm.get(control)?.value) === valor;
  }

  /** Cuánto suma cada toque de − / +: un cuarto de kilo o litro, o una pastilla */
  pasoBoton(producto: ProductoQuimico): number {
    return producto.unidad === 'uni.' ? 1 : 0.25;
  }

  /** Suma o resta al campo sin bajar de 0 (redondeado para evitar 0.30000000004) */
  sumar(control: string, delta: number) {
    const actual = this.toNumberOrZero(this.mantencionForm.get(control)?.value);
    const nuevo = Math.max(0, Math.round((actual + delta) * 100) / 100);
    this.mantencionForm.get(control)?.setValue(nuevo);
    this.mantencionForm.get(control)?.markAsDirty();
  }

  cantidad(control: string): number {
    return this.toNumberOrZero(this.mantencionForm.get(control)?.value);
  }


  /** Campos obligatorios del servicio elegido: cuántos hay y cuántos están listos */
  get requeridos(): { total: number; listos: number } {
    const campos: boolean[] = [];
    if (this.nivelesObligatorios) campos.push(!!this.cloroSeleccionado, !!this.phSeleccionado);
    if (this.servicio === SERVICIO_CUARZO) {
      campos.push(!!this.tipoCuarzoFinal, this.toNumberOrZero(this.mantencionForm.get('cuarzo.kilos')?.value) > 0);
    }
    if (this.servicio === SERVICIO_BOMBA) campos.push(this.reparacionesSeleccionadas.length > 0);
    if (this.piscinaLlenando) campos.push(!!this.mantencionForm.get('horaCorte')?.value);
    return { total: campos.length, listos: campos.filter(Boolean).length };
  }

  /** Pone en 0 el campo del producto. */
  limpiarCantidad(control: string) {
    this.mantencionForm.get(control)?.setValue(0);
    this.mantencionForm.get(control)?.markAsDirty();
  }

  // Método para manejar cambio en el toggle de llenado
  onLlenandoChange() {
    const llenando = this.piscinaLlenando;
    const horaCorteControl = this.mantencionForm.get('horaCorte');

    if (llenando) {
      horaCorteControl?.setValidators([Validators.required]);
    } else {
      horaCorteControl?.clearValidators();
      horaCorteControl?.setValue('');
    }
    horaCorteControl?.updateValueAndValidity();
  }

  ngOnInit() {
    this.clienteId = this.route.snapshot.paramMap.get('id');
    // El día elegido en el inicio (puede ser uno anterior que quedó sin marcar)
    const fecha = this.route.snapshot.queryParamMap.get('fecha');
    if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      this.fechaMantencion = fecha;
    }

    if (this.clienteId) {
      this.cargarCliente(this.clienteId);
    } else {
      this.mostrarAlerta('Error', 'No se ha especificado un cliente');
      this.router.navigate(['/tabs/home']);
    }
  }

  cargarCliente(id: string) {
    this.clienteService.getClienteById(id).subscribe({
      next: (cliente) => {
        this.cliente = cliente;
        // Si hay un servicio extra para hoy, preseleccionarlo
        const extra = cliente.serviciosExtra?.find((s: any) => s.fecha === this.fechaMantencion);
        // El servicio elegido al agregar la mantención desde el inicio manda sobre el del día
        const servicioElegido = this.route.snapshot.queryParamMap.get('servicio') || extra?.servicio;
        if (servicioElegido) {
          this.mantencionForm.get('servicio')?.setValue(servicioElegido);
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar cliente:', error);
        this.mostrarAlerta('Error', 'No se pudo cargar la información del cliente');
        this.router.navigate(['/tabs/home']);
      }
    });
  }

  async guardarMantencion() {
    this.mantencionForm.markAllAsTouched();

    if (!this.cliente || !this.clienteId) {
      return;
    }

    this.intentoGuardar = true;

    this.actualizarValidadoresNiveles();
    if (this.irAlPrimerCampoFaltante()) {
      return;
    }

    if (!this.mantencionForm.valid) {
      this.mostrarAlerta('Datos incompletos', 'Revisa los campos obligatorios antes de guardar');
      return;
    }

    const formValues = this.mantencionForm.value;
    // Sin mantención (cuarzo / bomba) no se guardan niveles ni químicos aunque se hayan tocado antes
    const q = this.muestraQuimicos;

    const precioCobrado = this.totalCobrar;

    const nuevoRegistro = {
      id: nuevoIdRegistro(),
      fecha: this.fechaMantencion,
      hora: new Date().toTimeString().split(' ')[0].substring(0, 5),
      servicio: formValues.servicio,
      cloro: q ? formValues.cloro ?? 0 : 0,
      ph: q ? formValues.ph ?? 0 : 0,
      // Las cantidades se guardan en kilos (cantidadPastillas va en unidades)
      cantidadCloro: q ? this.toNumberOrZero(formValues.cantidadCloro) : 0,
      cantidadBajaPh: q ? this.toNumberOrZero(formValues.cantidadBajaPh) : 0,
      cantidadSubePh: q ? this.toNumberOrZero(formValues.cantidadSubePh) : 0,
      cantidadPastillas: q ? this.toNumberOrZero(formValues.cantidadPastillas) : 0,
      ...this.camposDelServicio(),
      // Sin medición (cuarzo / bomba sin mantención) los estados no se incluyen:
      // Firestore rechaza guardar campos con valor undefined
      ...(q && this.cloroSeleccionado ? { estadoCloro: this.cloroSeleccionado } : {}),
      ...(q && this.phSeleccionado ? { estadoPh: this.phSeleccionado } : {}),
      notas: formValues.notas,
      piscinarLlenando: this.piscinaLlenando,
      horaCorte: formValues.horaCorte || null,
      // Marca de unidad: evita que una futura migración divida estos kilos otra vez
      [CAMPO_UNIDAD_MASA]: UNIDAD_MASA,
      precioCobrado: precioCobrado // Lo que se cobra: precio del día y, si aplica, materiales + mano de obra
    };

    // Asegurarse de que el cliente tenga un array de historial
    if (!this.cliente.historial) {
      this.cliente.historial = [];
    }

    // Añadir el nuevo registro al historial
    this.cliente.historial.unshift(nuevoRegistro);

    // Asegurarse de que el cliente tenga un ID antes de actualizarlo
    if (!this.cliente.id) {
      this.cliente.id = this.clienteId;
    }

    this.guardando = true;

    // Actualizar el cliente en la base de datos
    this.clienteService.updateCliente(this.cliente).subscribe({
      next: () => {
        // Navegar a la página de éxito pasando el cliente y el registro para poder enviar detalles
        this.router.navigate(['/mantenimiento-exitoso'], { state: { cliente: this.cliente, mantencion: nuevoRegistro } });
      },
      error: (error) => {
        console.error('Error al guardar mantención:', error);
        this.guardando = false;
        this.mostrarAlerta('Error', 'No se pudo guardar el registro de mantención');
      }
    });
  }

  /** Datos extra que se guardan en el registro según el servicio elegido. */
  private camposDelServicio(): CamposServicio {
    const v = this.mantencionForm.value;
    switch (this.servicio) {
      case SERVICIO_RECUPERACION:
        return { cantidadAlgicida: this.toNumberOrZero(v.cantidadAlgicida) };
      case SERVICIO_CUARZO:
        return {
          incluyeMantencion: this.incluyeMantencion,
          cuarzo: {
            tipo: this.tipoCuarzoFinal,
            kilos: this.toNumberOrZero(v.cuarzo?.kilos),
            precioCuarzo: this.toNumberOrZero(v.cuarzo?.precioCuarzo),
            manoObra: this.toNumberOrZero(v.cuarzo?.manoObra)
          }
        };
      case SERVICIO_BOMBA:
        return {
          incluyeMantencion: this.incluyeMantencion,
          bomba: {
            marcaModelo: (v.bomba?.marcaModelo || '').trim(),
            reparaciones: this.reparacionesSeleccionadas,
            repuestos: (v.bomba?.repuestos || '').trim(),
            costoRepuestos: this.toNumberOrZero(v.bomba?.costoRepuestos),
            manoObra: this.toNumberOrZero(v.bomba?.manoObra),
            quedoFuncionando: v.bomba?.quedoFuncionando !== false
          }
        };
      default:
        return {};
    }
  }

  /**
   * Busca el primer campo obligatorio sin completar (en el orden en que aparecen
   * en pantalla), hace scroll hasta él y lo sacude. Devuelve true si faltaba alguno.
   */
  private irAlPrimerCampoFaltante(): boolean {
    const faltantes: { campo: string; ref?: ElementRef<HTMLElement>; mensaje: string }[] = [];
    if (this.nivelesObligatorios && !this.cloroSeleccionado) {
      faltantes.push({ campo: 'cloro', ref: this.campoCloro, mensaje: 'Falta el nivel de cloro' });
    }
    if (this.nivelesObligatorios && !this.phSeleccionado) {
      faltantes.push({ campo: 'ph', ref: this.campoPh, mensaje: 'Falta el nivel de pH' });
    }
    if (this.faltaTipoCuarzo) {
      faltantes.push({ campo: 'cuarzoTipo', ref: this.campoCuarzoTipo, mensaje: 'Falta el tipo de cuarzo' });
    }
    if (this.faltaKilosCuarzo) {
      faltantes.push({ campo: 'cuarzoKilos', ref: this.campoCuarzoKilos, mensaje: 'Faltan los kilos de cuarzo' });
    }
    if (this.faltaReparacion) {
      faltantes.push({ campo: 'bombaReparaciones', ref: this.campoBombaReparaciones, mensaje: 'Indica qué se reparó en la bomba' });
    }
    if (this.piscinaLlenando && !this.mantencionForm.get('horaCorte')?.value) {
      faltantes.push({ campo: 'horaCorte', ref: this.campoHoraCorte, mensaje: 'Falta la hora para cortar el agua' });
    }

    if (faltantes.length === 0) {
      return false;
    }

    const primero = faltantes[0];
    primero.ref?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Se limpia antes y se vuelve a poner para que la sacudida se repita en cada intento
    this.campoResaltado = null;
    setTimeout(() => {
      this.campoResaltado = primero.campo;
      setTimeout(() => (this.campoResaltado = null), 500);
    }, 250);

    const mensaje = faltantes.length > 1
      ? `${primero.mensaje} y ${faltantes.length - 1} campo${faltantes.length > 2 ? 's' : ''} más`
      : primero.mensaje;
    this.mostrarAviso(mensaje);
    return true;
  }

  private async mostrarAviso(mensaje: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2200,
      position: 'top',
      color: 'danger',
      icon: 'alert-circle-outline'
    });
    toast.present();
  }

  private readonly formatoMonto = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

  formatearMonto(valor: number): string {
    return '$' + this.formatoMonto.format(valor || 0);
  }

  private formatearFechaLocal(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toNumberOrZero(val: any): number {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }

  async mostrarToast(mensaje: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    toast.present();
  }

  async mostrarAlerta(titulo: string, mensaje: string) {
    const alert = await this.alertController.create({
      header: titulo,
      message: mensaje,
      buttons: ['OK']
    });
    await alert.present();
  }
}
