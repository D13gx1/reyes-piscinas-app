import { Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonIcon,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logoWhatsapp,
  personOutline,
  peopleOutline,
  chatbubbleEllipsesOutline,
  addOutline,
  trashOutline,
  alarmOutline,
  checkmarkCircle,
  ellipseOutline,
  sendOutline,
  playSkipForwardOutline,
  closeOutline,
  bookmarkOutline,
  shieldCheckmarkOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { AuthService } from '../../../services/auth.service';
import { ClienteService } from '../../../services/cliente.service';
import { NotificacionesService } from '../../../services/notificaciones.service';
import {
  AvisoProgramado,
  MARCADOR_NOMBRE,
  PLANTILLAS_PREDEFINIDAS,
  Plantilla,
  armarMensaje,
  guardarAvisos,
  guardarMiNumero,
  guardarPlantillasPropias,
  leerAvisos,
  leerMiNumero,
  leerPlantillasPropias,
  nuevoId,
  telefonoValido,
  urlWhatsApp,
} from '../../../utils/recordatorios';

addIcons({
  'logo-whatsapp': logoWhatsapp,
  'person-outline': personOutline,
  'people-outline': peopleOutline,
  'chatbubble-ellipses-outline': chatbubbleEllipsesOutline,
  'add-outline': addOutline,
  'trash-outline': trashOutline,
  'alarm-outline': alarmOutline,
  'checkmark-circle': checkmarkCircle,
  'ellipse-outline': ellipseOutline,
  'send-outline': sendOutline,
  'play-skip-forward-outline': playSkipForwardOutline,
  'close-outline': closeOutline,
  'bookmark-outline': bookmarkOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'information-circle-outline': informationCircleOutline,
});

interface Destinatario {
  id: string;
  nombre: string;
  telefono: string;
  seleccionado: boolean;
}

/** Envío a varios clientes: WhatsApp se abre una vez por cliente. */
interface Cola {
  lista: Destinatario[];
  indice: number;
  enviados: number;
}

import { EncabezadoComponent } from '../../../components/encabezado/encabezado.component';

@Component({
  selector: 'app-recordatorios',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonContent, IonIcon, EncabezadoComponent],
  templateUrl: './recordatorios.page.html',
  styleUrls: ['./recordatorios.page.scss'],
})
export class RecordatoriosPage implements OnInit {
  @ViewChild('areaTexto') areaTexto?: ElementRef<HTMLTextAreaElement>;

  private readonly authService = inject(AuthService);
  private readonly clienteService = inject(ClienteService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly MARCADOR_NOMBRE = MARCADOR_NOMBRE;

  miNombre = '';
  miNumero = leerMiNumero();

  /** "prueba" = solo a mi número. Es el modo por defecto: enviar a clientes es explícito. */
  modo: 'prueba' | 'clientes' = 'prueba';
  destinatarios: Destinatario[] = [];
  clientesSinTelefono = 0;

  plantillasPropias: Plantilla[] = leerPlantillasPropias();
  plantillaId: string | null = PLANTILLAS_PREDEFINIDAS[0].id;
  texto = PLANTILLAS_PREDEFINIDAS[0].texto;

  cola: Cola | null = null;

  avisos: AvisoProgramado[] = [];
  avisoFecha = '';
  avisoHora = '09:00';
  notificacionesActivas = false;

  ngOnInit() {
    this.authService
      .getUserName()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((nombre) => (this.miNombre = nombre || ''));

    this.clienteService.clientes$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((clientes) => {
      // Conserva lo que ya estaba desmarcado si la lista se actualiza
      const desmarcados = new Set(this.destinatarios.filter((d) => !d.seleccionado).map((d) => d.id));
      const activos = clientes.filter((c) => c.activo);
      this.destinatarios = activos
        .filter((c) => telefonoValido(c.telefono))
        .map((c) => ({
          id: c.id || '',
          nombre: c.nombre,
          telefono: c.telefono,
          seleccionado: !desmarcados.has(c.id || ''),
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
      this.clientesSinTelefono = activos.length - this.destinatarios.length;
    });

    this.notificacionesActivas = this.notificaciones.notificacionesActivadas();
    this.avisos = this.ordenarAvisos(leerAvisos());

    // Abierta desde la notificación de un aviso: cargar su mensaje
    const avisoId = this.route.snapshot.queryParamMap.get('aviso');
    const aviso = this.avisos.find((a) => a.id === avisoId);
    if (aviso) {
      this.plantillaId = null;
      this.texto = aviso.texto;
      this.mostrarToast(`Mensaje "${aviso.titulo}" listo para enviar`, 'primary');
    }
  }

  // ===== Frases =====

  get plantillas(): Plantilla[] {
    return [...PLANTILLAS_PREDEFINIDAS, ...this.plantillasPropias];
  }

  get tituloMensaje(): string {
    return this.plantillas.find((p) => p.id === this.plantillaId)?.titulo || 'Mensaje personalizado';
  }

  elegirPlantilla(plantilla: Plantilla) {
    this.plantillaId = plantilla.id;
    this.texto = plantilla.texto;
  }

  // Al editar se conserva la frase elegida: su título sigue identificando el mensaje
  onTexto(valor: string) {
    this.texto = valor;
  }

  /** Inserta el marcador donde está el cursor. */
  insertarMarcador(marcador: string) {
    const area = this.areaTexto?.nativeElement;
    const inicio = area?.selectionStart ?? this.texto.length;
    const fin = area?.selectionEnd ?? this.texto.length;
    this.texto = this.texto.slice(0, inicio) + marcador + this.texto.slice(fin);
    setTimeout(() => {
      area?.focus();
      area?.setSelectionRange(inicio + marcador.length, inicio + marcador.length);
    });
  }

  async guardarComoFrase() {
    if (!this.texto.trim()) return;
    const alert = await this.alertController.create({
      header: 'Guardar frase',
      message: 'Quedará en tu lista para usarla otra vez.',
      inputs: [{ name: 'titulo', type: 'text', placeholder: 'Nombre (ej: Aviso de lluvias)' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            const titulo = (data?.titulo || '').trim();
            if (!titulo) {
              this.mostrarToast('Ponle un nombre a la frase', 'warning');
              return false;
            }
            const nueva: Plantilla = { id: nuevoId(), titulo, texto: this.texto.trim() };
            this.plantillasPropias = [...this.plantillasPropias, nueva];
            guardarPlantillasPropias(this.plantillasPropias);
            this.plantillaId = nueva.id;
            this.mostrarToast('Frase guardada ✅', 'success');
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async borrarFrase(plantilla: Plantilla, evento: Event) {
    evento.stopPropagation();
    const alert = await this.alertController.create({
      header: 'Borrar frase',
      message: `¿Borrar "${plantilla.titulo}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Borrar',
          role: 'destructive',
          handler: () => {
            this.plantillasPropias = this.plantillasPropias.filter((p) => p.id !== plantilla.id);
            guardarPlantillasPropias(this.plantillasPropias);
            if (this.plantillaId === plantilla.id) this.plantillaId = null;
          },
        },
      ],
    });
    await alert.present();
  }

  // ===== Destinatarios =====

  get seleccionados(): Destinatario[] {
    return this.destinatarios.filter((d) => d.seleccionado);
  }

  get miNumeroValido(): boolean {
    return telefonoValido(this.miNumero);
  }

  /** Nombre que se usa en la vista previa: yo en modo prueba, el primer cliente si no. */
  get vistaPrevia(): string {
    const nombre = this.modo === 'prueba' ? this.miNombre : this.seleccionados[0]?.nombre || 'Juan';
    return armarMensaje(this.texto, nombre, this.miNombre);
  }

  toggleDestinatario(d: Destinatario) {
    d.seleccionado = !d.seleccionado;
  }

  marcarTodos(valor: boolean) {
    this.destinatarios.forEach((d) => (d.seleccionado = valor));
  }

  /** Formatea mientras se escribe: +56 9 1234 5678 */
  onMiNumero(valor: string) {
    let digitos = (valor || '').replace(/\D/g, '');
    if (digitos.startsWith('56')) digitos = digitos.slice(2);
    digitos = digitos.slice(0, 9);
    let formateado = digitos ? '+56 ' + digitos.slice(0, 1) : '';
    if (digitos.length > 1) formateado += ' ' + digitos.slice(1, 5);
    if (digitos.length > 5) formateado += ' ' + digitos.slice(5, 9);
    this.miNumero = formateado;
    if (this.miNumeroValido) guardarMiNumero(this.miNumero);
  }

  // ===== Envío =====

  enviarPrueba() {
    if (!this.texto.trim()) {
      this.mostrarToast('Escribe o elige un mensaje', 'warning');
      return;
    }
    if (!this.miNumeroValido) {
      this.mostrarToast('Escribe tu número como +56 9 1234 5678', 'warning');
      return;
    }
    window.open(urlWhatsApp(this.miNumero, armarMensaje(this.texto, this.miNombre, this.miNombre)), '_blank');
  }

  /** Enviar a clientes es sensible: se confirma antes y luego se va de a uno. */
  async empezarEnvioClientes() {
    const lista = this.seleccionados;
    if (!this.texto.trim()) {
      this.mostrarToast('Escribe o elige un mensaje', 'warning');
      return;
    }
    if (lista.length === 0) {
      this.mostrarToast('Elige al menos un cliente', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Enviar a clientes',
      message:
        `Vas a enviar "${this.tituloMensaje}" a ${lista.length} ${lista.length === 1 ? 'cliente' : 'clientes'}. ` +
        'WhatsApp se abrirá una vez por cliente y tú confirmas cada envío.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Empezar',
          handler: () => {
            this.cola = { lista: [...lista], indice: 0, enviados: 0 };
          },
        },
      ],
    });
    await alert.present();
  }

  get actual(): Destinatario | null {
    return this.cola ? this.cola.lista[this.cola.indice] ?? null : null;
  }

  enviarActual() {
    const d = this.actual;
    if (!d || !this.cola) return;
    window.open(urlWhatsApp(d.telefono, armarMensaje(this.texto, d.nombre, this.miNombre)), '_blank');
    this.cola.enviados++;
    this.cola.indice++;
  }

  saltarActual() {
    if (this.cola) this.cola.indice++;
  }

  terminarEnvio() {
    if (this.cola && this.cola.indice >= this.cola.lista.length) {
      this.mostrarToast(`Listo: se abrió WhatsApp para ${this.cola.enviados} de ${this.cola.lista.length}`, 'success');
    }
    this.cola = null;
  }

  // ===== Avisos programados =====

  async agregarAviso() {
    if (!this.avisoFecha) {
      this.mostrarToast('Elige la fecha del aviso', 'warning');
      return;
    }
    if (!this.texto.trim()) {
      this.mostrarToast('Escribe o elige un mensaje', 'warning');
      return;
    }
    const [anio, mes, dia] = this.avisoFecha.split('-').map(Number);
    const [h, m] = this.avisoHora.split(':').map(Number);
    if (new Date(anio, mes - 1, dia, h || 0, m || 0).getTime() <= Date.now()) {
      this.mostrarToast('Elige una fecha y hora futura', 'warning');
      return;
    }

    const aviso: AvisoProgramado = {
      id: nuevoId(),
      fecha: this.avisoFecha,
      hora: this.avisoHora || '09:00',
      titulo: this.tituloMensaje,
      texto: this.texto.trim(),
    };
    this.avisos = this.ordenarAvisos([...this.avisos, aviso]);
    guardarAvisos(this.avisos);
    this.avisoFecha = '';
    await this.reprogramar();
    this.mostrarToast(
      this.notificacionesActivas ? 'Aviso programado 🔔' : 'Aviso guardado. Activa las notificaciones en Perfil para recibirlo',
      this.notificacionesActivas ? 'success' : 'warning'
    );
  }

  async borrarAviso(aviso: AvisoProgramado) {
    this.avisos = this.avisos.filter((a) => a.id !== aviso.id);
    guardarAvisos(this.avisos);
    await this.reprogramar();
  }

  usarAviso(aviso: AvisoProgramado) {
    this.plantillaId = null;
    this.texto = aviso.texto;
  }

  esPasado(aviso: AvisoProgramado): boolean {
    return `${aviso.fecha} ${aviso.hora}` < this.ahoraTexto();
  }

  formatearFechaAviso(aviso: AvisoProgramado): string {
    const [anio, mes, dia] = aviso.fecha.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    const texto = fecha.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
    return `${texto} · ${aviso.hora}`;
  }

  get hoy(): string {
    return this.ahoraTexto().slice(0, 10);
  }

  private ahoraTexto(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  private ordenarAvisos(avisos: AvisoProgramado[]): AvisoProgramado[] {
    return [...avisos].sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
  }

  private async reprogramar() {
    try {
      await this.notificaciones.programarSiActivadas();
    } catch (error) {
      console.error('❌ Error al programar avisos:', error);
    }
  }

  private async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastController.create({ message: mensaje, duration: 2200, position: 'top', color });
    await toast.present();
  }
}
