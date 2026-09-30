import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular/standalone';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
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
  alertCircleOutline
} from 'ionicons/icons';
import { ClienteService, Cliente } from '../../../services/cliente.service';
import { CAMPO_UNIDAD_MASA, UNIDAD_MASA } from '../../../utils/unidades';
import { nuevoIdRegistro } from '../../../utils/mantencion';

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
  'alert-circle-outline': alertCircleOutline
});

/** Una opción de nivel de cloro o pH, con su color para pintar el botón. */
interface OpcionNivel {
  estado: string;
  etiqueta: string;
  rango: string;
  valor: number;
  color: string;
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
  { estado: 'alto', etiqueta: 'Alto', rango: '> 3.0', valor: 3.5, color: '#dc2626' },
  { estado: 'ideal alto', etiqueta: 'Ideal Alto', rango: '2.1 - 3.0', valor: 2.5, color: '#16a34a' },
  { estado: 'ideal', etiqueta: 'Ideal', rango: '1.5 - 2.0', valor: 1.7, color: '#15803d' },
  { estado: 'ideal bajo', etiqueta: 'Ideal Bajo', rango: '1.0 - 1.4', valor: 1.2, color: '#4ade80' },
  { estado: 'bajo', etiqueta: 'Bajo', rango: '< 1.0', valor: 0.5, color: '#d97706' }
];

const OPCIONES_PH: OpcionNivel[] = [
  { estado: 'alto', etiqueta: 'Alto', rango: '> 7.8', valor: 8.0, color: '#dc2626' },
  { estado: 'ideal alto', etiqueta: 'Ideal Alto', rango: '7.7 - 7.8', valor: 7.75, color: '#16a34a' },
  { estado: 'ideal', etiqueta: 'Ideal', rango: '7.4 - 7.6', valor: 7.5, color: '#15803d' },
  { estado: 'ideal bajo', etiqueta: 'Ideal Bajo', rango: '7.2 - 7.3', valor: 7.25, color: '#4ade80' },
  { estado: 'bajo', etiqueta: 'Bajo', rango: '< 7.2', valor: 7.0, color: '#d97706' }
];

const PRODUCTOS: ProductoQuimico[] = [
  {
    control: 'cantidadCloro',
    nombre: 'Cloro granulado',
    unidad: 'kg',
    icono: 'flask-outline',
    color: '#0ea5e9',
    paso: '0.01',
    atajos: [0.25, 0.5, 1, 2]
  },
  {
    control: 'cantidadBajaPh',
    nombre: 'Baja pH',
    unidad: 'kg',
    icono: 'arrow-down-circle-outline',
    color: '#f97316',
    paso: '0.01',
    atajos: [0.25, 0.5, 1, 2]
  },
  {
    control: 'cantidadSubePh',
    nombre: 'Sube pH',
    unidad: 'kg',
    icono: 'arrow-up-circle-outline',
    color: '#8b5cf6',
    paso: '0.01',
    atajos: [0.25, 0.5, 1, 2]
  },
  {
    control: 'cantidadPastillas',
    nombre: 'Pastillas de cloro',
    unidad: 'uni.',
    icono: 'disc-outline',
    color: '#10b981',
    paso: '1',
    atajos: [1, 2, 3, 5]
  }
];

const SERVICIOS = [
  'Mantención de piscina',
  'Recuperación de agua',
  'Cambio de cuarzo',
  'Limpieza completa',
  'Ajuste químico',
  'Aspirado',
  'Mantenimiento general'
];

@Component({
  selector: 'app-completar-mantencion',
  templateUrl: './completar_mantencion.page.html',
  styleUrls: ['./completar_mantencion.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonButton,
    IonIcon,
    IonToggle,
    IonSpinner
  ]
})
export class CompletarMantencionPage implements OnInit {
  cliente: Cliente | null = null;
  clienteId: string | null = null;
  mantencionForm: FormGroup;
  cargando = true;
  guardando = false;

  /** Se activa al intentar guardar: desde ahí se marcan en rojo los campos que faltan. */
  intentoGuardar = false;
  /** Campo al que se acaba de llevar al usuario, para sacudirlo. */
  campoResaltado: 'cloro' | 'ph' | 'horaCorte' | null = null;

  @ViewChild('campoCloro', { read: ElementRef }) campoCloro?: ElementRef<HTMLElement>;
  @ViewChild('campoPh', { read: ElementRef }) campoPh?: ElementRef<HTMLElement>;
  @ViewChild('campoHoraCorte', { read: ElementRef }) campoHoraCorte?: ElementRef<HTMLElement>;

  // Variables para controlar la selección de botones
  cloroSeleccionado: string | null = null;
  phSeleccionado: string | null = null;

  readonly opcionesCloro = OPCIONES_CLORO;
  readonly opcionesPh = OPCIONES_PH;
  readonly productos = PRODUCTOS;
  readonly servicios = SERVICIOS;

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
      servicio: ['Mantención de piscina', Validators.required],
      notas: [''],
      piscinarLlenando: [false],
      horaCorte: ['']
    });
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
    return this.intentoGuardar && !this.cloroSeleccionado;
  }

  get faltaPh(): boolean {
    return this.intentoGuardar && !this.phSeleccionado;
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
        const fechaHoy = this.formatearFechaLocal(new Date());
        const extra = cliente.serviciosExtra?.find((s: any) => s.fecha === fechaHoy);
        if (extra) {
          this.mantencionForm.get('servicio')?.setValue(extra.servicio);
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

    if (this.irAlPrimerCampoFaltante() || !this.cloroSeleccionado || !this.phSeleccionado) {
      return;
    }

    if (!this.mantencionForm.valid) {
      this.mostrarAlerta('Datos incompletos', 'Revisa los campos obligatorios antes de guardar');
      return;
    }

    const formValues = this.mantencionForm.value;

    const fechaHoy = this.formatearFechaLocal(new Date());
    const precioEspecial = this.cliente.preciosEspeciales?.[fechaHoy];
    const precioCobrado = precioEspecial ?? this.cliente.precio;

    const nuevoRegistro = {
      id: nuevoIdRegistro(),
      fecha: fechaHoy,
      hora: new Date().toTimeString().split(' ')[0].substring(0, 5),
      servicio: formValues.servicio,
      cloro: formValues.cloro,
      ph: formValues.ph,
      // Las cantidades se guardan en kilos (cantidadPastillas va en unidades)
      cantidadCloro: this.toNumberOrZero(formValues.cantidadCloro),
      cantidadBajaPh: this.toNumberOrZero(formValues.cantidadBajaPh),
      cantidadSubePh: this.toNumberOrZero(formValues.cantidadSubePh),
      cantidadPastillas: this.toNumberOrZero(formValues.cantidadPastillas),
      estadoCloro: this.cloroSeleccionado,
      estadoPh: this.phSeleccionado,
      notas: formValues.notas,
      piscinarLlenando: this.piscinaLlenando,
      horaCorte: formValues.horaCorte || null,
      // Marca de unidad: evita que una futura migración divida estos kilos otra vez
      [CAMPO_UNIDAD_MASA]: UNIDAD_MASA,
      precioCobrado: precioCobrado // Guardar el precio que se cobra (especial del día o el del cliente)
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

  /**
   * Busca el primer campo obligatorio sin completar (en el orden en que aparecen
   * en pantalla), hace scroll hasta él y lo sacude. Devuelve true si faltaba alguno.
   */
  private irAlPrimerCampoFaltante(): boolean {
    const faltantes: { campo: 'cloro' | 'ph' | 'horaCorte'; ref?: ElementRef<HTMLElement>; mensaje: string }[] = [];
    if (!this.cloroSeleccionado) {
      faltantes.push({ campo: 'cloro', ref: this.campoCloro, mensaje: 'Falta el nivel de cloro' });
    }
    if (!this.phSeleccionado) {
      faltantes.push({ campo: 'ph', ref: this.campoPh, mensaje: 'Falta el nivel de pH' });
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
