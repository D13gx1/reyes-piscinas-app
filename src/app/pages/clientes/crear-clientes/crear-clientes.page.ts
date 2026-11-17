import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButton,
  IonIcon,
  IonInput,
  IonTextarea,
  IonToggle,
  IonSpinner,
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { Router, ActivatedRoute } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { EncabezadoComponent } from '../../../components/encabezado/encabezado.component';
import { ClienteService, Cliente } from '../../../services/cliente.service';
import { addIcons } from 'ionicons';
import {
  trashOutline,
  locationOutline,
  personOutline,
  callOutline,
  mailOutline,
  waterOutline,
  cashOutline,
  calendarOutline,
  navigate,
  navigateOutline,
  alertCircleOutline,
  cubeOutline,
  addOutline,
  removeOutline,
  saveOutline,
  checkmarkCircleOutline,
  pauseCircleOutline,
} from 'ionicons/icons';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

// Registrar los iconos
addIcons({
  'trash-outline': trashOutline,
  'location-outline': locationOutline,
  'person-outline': personOutline,
  'call-outline': callOutline,
  'mail-outline': mailOutline,
  'water-outline': waterOutline,
  'cash-outline': cashOutline,
  'calendar-outline': calendarOutline,
  'navigate': navigate,
  'navigate-outline': navigateOutline,
  'alert-circle-outline': alertCircleOutline,
  'cube-outline': cubeOutline,
  'add-outline': addOutline,
  'remove-outline': removeOutline,
  'save-outline': saveOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'pause-circle-outline': pauseCircleOutline,
});

// Interfaz para los días de la semana
interface DiaSemana {
  valor: string;
  nombre: string;
  corto: string;
  seleccionado: boolean;
}

@Component({
  selector: 'app-crear-clientes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButton,
    IonIcon,
    IonInput,
    IonTextarea,
    IonToggle,
    IonSpinner,
    EncabezadoComponent,
  ],
  templateUrl: './crear-clientes.page.html',
  styleUrls: ['./crear-clientes.page.scss'],
})
export class CrearClientesPage implements OnInit {
  @ViewChild(IonContent) ionContent?: IonContent;
  @ViewChild('clienteForm') formulario?: NgForm;
  
  private auth = inject(Auth);
  
  // ⭐ VARIABLE PARA MANTENER EL USER ID SEGURO
  private currentUserId: string = '';
  private authStateSubscription: any;
  
  nuevoCliente: Cliente = {
    userId: '',
    nombre: '',
    direccion: '',
    telefono: '',
    email: '',
    medidas: {
      largo: 0,
      ancho: 0,
      profundidad: 0,
    },
    precio: 0,
    programacion: {
      frecuencia: '',
      cantidadPorPeriodo: 1,
      diasSemana: [],
      horaPreferida: '',
      notas: ''
    },
    historial: [],
    activo: true,
  };

  diasSemana: DiaSemana[] = [
    { valor: 'lunes', nombre: 'Lunes', corto: 'Lun', seleccionado: false },
    { valor: 'martes', nombre: 'Martes', corto: 'Mar', seleccionado: false },
    { valor: 'miercoles', nombre: 'Miércoles', corto: 'Mié', seleccionado: false },
    { valor: 'jueves', nombre: 'Jueves', corto: 'Jue', seleccionado: false },
    { valor: 'viernes', nombre: 'Viernes', corto: 'Vie', seleccionado: false },
    { valor: 'sabado', nombre: 'Sábado', corto: 'Sáb', seleccionado: false },
    { valor: 'domingo', nombre: 'Domingo', corto: 'Dom', seleccionado: false }
  ];

  readonly frecuencias = [
    { valor: 'semanal', texto: 'Semanal' },
    { valor: 'quincenal', texto: 'Cada 15 días' },
    { valor: 'mensual', texto: 'Mensual' },
  ];

  /** Se activa al pulsar Guardar: desde ahí se marcan frecuencia y días si faltan. */
  intentoGuardar = false;

  isEditing = false;
  clienteId: string | null = null;
  pageTitle = 'Crear Cliente';
  isLoading = false;
  isLoadingUbicacion = false;

  constructor(
    private clienteService: ClienteService,
    private router: Router,
    private route: ActivatedRoute,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    // ⭐ MONITOREAR CAMBIOS EN EL ESTADO DE AUTENTICACIÓN
    this.authStateSubscription = onAuthStateChanged(this.auth, (user) => {
      if (user) {
        console.log('✅ Usuario autenticado detectado:', user.uid);
        this.currentUserId = user.uid;
        this.nuevoCliente.userId = user.uid;
      } else {
        console.error('❌ No hay usuario autenticado');
        this.showToast('Sesión perdida. Redirigiendo al login...', 'danger');
        this.router.navigate(['/login']);
      }
    });

    // Esperar a que el usuario esté disponible
    const usuarioListo = await this.esperarUsuario();
    
    if (!usuarioListo) {
      console.error('❌ No se pudo obtener el usuario');
      this.showToast('Error: No se pudo verificar la autenticación', 'danger');
      this.router.navigate(['/login']);
      return;
    }

    // Verificar si estamos editando
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.clienteId = id;
        this.isEditing = true;
        this.pageTitle = 'Editar Cliente';
        this.cargarDatosCliente();
      }
    });
  }

  ngOnDestroy() {
    // ⭐ LIMPIAR SUBSCRIPCIÓN
    if (this.authStateSubscription) {
      this.authStateSubscription();
    }
  }

  // ⭐ MÉTODO MEJORADO PARA ESPERAR AL USUARIO
  private async esperarUsuario(): Promise<boolean> {
    return new Promise((resolve) => {
      // Si ya hay un usuario, resolver inmediatamente
      if (this.auth.currentUser) {
        console.log('✅ Usuario disponible:', this.auth.currentUser.uid);
        this.currentUserId = this.auth.currentUser.uid;
        this.nuevoCliente.userId = this.currentUserId;
        resolve(true);
        return;
      }

      console.log('⏳ Esperando autenticación...');
      
      let attempts = 0;
      const maxAttempts = 20; // 10 segundos
      
      const interval = setInterval(() => {
        attempts++;
        
        if (this.auth.currentUser) {
          console.log('✅ Usuario autenticado:', this.auth.currentUser.uid);
          this.currentUserId = this.auth.currentUser.uid;
          this.nuevoCliente.userId = this.currentUserId;
          clearInterval(interval);
          resolve(true);
        } else if (attempts >= maxAttempts) {
          console.error('❌ Timeout esperando usuario');
          clearInterval(interval);
          resolve(false);
        }
      }, 500);
    });
  }

  // ⭐ MÉTODO PARA VERIFICAR QUE TENGAMOS USERID ANTES DE CUALQUIER OPERACIÓN
  private verificarUsuarioAutenticado(): boolean {
    if (!this.currentUserId) {
      // Intentar recuperar del auth
      if (this.auth.currentUser) {
        console.log('⚠️ Recuperando userId de auth.currentUser');
        this.currentUserId = this.auth.currentUser.uid;
        this.nuevoCliente.userId = this.currentUserId;
        return true;
      }
      
      console.error('❌ No hay userId disponible');
      this.showToast('Error: Sesión no válida. Redirigiendo...', 'danger');
      this.router.navigate(['/login']);
      return false;
    }
    
    return true;
  }

  cargarDatosCliente() {
    if (!this.verificarUsuarioAutenticado()) return;
    
    if (this.clienteId) {
      this.isLoading = true;
      this.clienteService.getClienteById(this.clienteId).subscribe({
        next: (cliente) => {
          console.log('✅ Datos del cliente cargados:', cliente);
          
          // Verificar que el cliente pertenezca al usuario actual
          if (cliente.userId !== this.currentUserId) {
            console.error('❌ Este cliente no pertenece al usuario actual');
            this.showToast('No tienes permiso para editar este cliente', 'danger');
            this.router.navigate(['/tabs/clientes']);
            return;
          }
          
          this.nuevoCliente = {
            ...cliente,
            userId: this.currentUserId, // Asegurar userId correcto
            medidas: {
              largo: cliente.medidas?.largo || 0,
              ancho: cliente.medidas?.ancho || 0,
              profundidad: cliente.medidas?.profundidad || 0,
            },
            precio: cliente.precio,
            programacion: {
              frecuencia: cliente.programacion?.frecuencia || '',
              cantidadPorPeriodo: cliente.programacion?.cantidadPorPeriodo || 1,
              diasSemana: cliente.programacion?.diasSemana || [],
              horaPreferida: cliente.programacion?.horaPreferida || '',
              notas: cliente.programacion?.notas || ''
            },
            historial: cliente.historial || [],
            email: cliente.email || '',
          };
          
          this.actualizarDiasSeleccionados();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('❌ Error al cargar cliente:', err);
          this.showToast('Error al cargar datos del cliente', 'danger');
          this.isLoading = false;
          this.router.navigate(['/tabs/clientes']);
        }
      });
    }
  }

  actualizarDiasSeleccionados() {
    this.diasSemana.forEach(dia => dia.seleccionado = false);
    
    if (this.nuevoCliente.programacion.diasSemana) {
      this.nuevoCliente.programacion.diasSemana.forEach(diaGuardado => {
        const dia = this.diasSemana.find(d => d.valor === diaGuardado);
        if (dia) {
          dia.seleccionado = true;
        }
      });
    }
  }

  async crearCliente(form?: NgForm) {
    console.log('🔄 Iniciando creación/actualización de cliente');
    
    // ⭐ VERIFICACIÓN CRÍTICA: Asegurar que tengamos userId
    if (!this.verificarUsuarioAutenticado()) {
      return;
    }

    // Asegurar que el cliente tenga el userId correcto
    this.nuevoCliente.userId = this.currentUserId;
    
    console.log('📋 UserId confirmado:', this.currentUserId);
    console.log('📋 Datos del cliente:', {
      nombre: this.nuevoCliente.nombre,
      userId: this.nuevoCliente.userId,
      isEditing: this.isEditing
    });

    this.intentoGuardar = true;
    this.formulario?.control.markAllAsTouched();

    // Validaciones
    if (!this.nuevoCliente.nombre || this.nuevoCliente.nombre.trim() === '') {
      this.rechazarCampo('nombre', 'El nombre es obligatorio ❌');
      return;
    }

    if (!this.nuevoCliente.direccion || this.nuevoCliente.direccion.trim() === '') {
      this.rechazarCampo('direccion', 'La dirección es obligatoria ❌');
      return;
    }

    if (!this.telefonoValido()) {
      this.rechazarCampo('telefono', 'El teléfono debe tener el formato +56 9 1234 5678 ❌');
      return;
    }

    if (!this.emailValido()) {
      this.rechazarCampo('email', 'El email no es válido ❌');
      return;
    }

    if (!this.medidasValidas()) {
      const campoMedida = this.nuevoCliente.medidas.largo <= 0 ? 'largo'
        : this.nuevoCliente.medidas.ancho <= 0 ? 'ancho'
        : 'profundidad';
      this.rechazarCampo(campoMedida, 'Las medidas deben ser mayores a 0 ❌');
      return;
    }

    if (!this.precioValido()) {
      this.rechazarCampo('monto', 'El precio no es válido ❌');
      return;
    }

    if (!this.nuevoCliente.programacion.frecuencia) {
      this.rechazarCampo('frecuencia', 'La frecuencia del servicio es obligatoria ❌');
      return;
    }

    if (!this.nuevoCliente.programacion.cantidadPorPeriodo ||
        this.nuevoCliente.programacion.cantidadPorPeriodo < 1 ||
        this.nuevoCliente.programacion.cantidadPorPeriodo > this.getMaxServicios()) {
      this.rechazarCampo('cantidadPorPeriodo', `Debe haber entre 1 y ${this.getMaxServicios()} servicios por ${this.getFrecuenciaText()} ❌`);
      return;
    }

    if (!this.diasSeleccionadosValidos()) {
      this.rechazarCampo('dias', `Debes seleccionar exactamente ${this.nuevoCliente.programacion.cantidadPorPeriodo} día(s) ❌`);
      return;
    }

    this.actualizarDiasEnCliente();

    // ⭐ VERIFICACIÓN FINAL ANTES DE ENVIAR
    if (!this.nuevoCliente.userId) {
      console.error('❌ CRÍTICO: userId se perdió antes de enviar');
      this.showToast('Error crítico: sesión inválida', 'danger');
      return;
    }

    console.log('📤 Enviando cliente con userId:', this.nuevoCliente.userId);
    this.isLoading = true;

    if (this.isEditing) {
      console.log('🔄 Actualizando cliente con ID:', this.nuevoCliente.id);
      this.clienteService.updateCliente(this.nuevoCliente).subscribe({
        next: () => {
          console.log('✅ Cliente actualizado exitosamente');
          this.showToast('Cliente actualizado con éxito ✅', 'success');
          this.isLoading = false;
          this.router.navigate(['/tabs/clientes']);
        },
        error: (err) => {
          console.error('❌ Error al actualizar cliente:', err);
          this.showToast('Error al actualizar cliente ❌', 'danger');
          this.isLoading = false;
        },
      });
    } else {
      console.log('➕ Creando nuevo cliente');
      this.clienteService.addCliente(this.nuevoCliente).subscribe({
        next: () => {
          console.log('✅ Cliente creado exitosamente');
          this.showToast('Cliente creado con éxito ✅', 'success');
          this.isLoading = false;
          this.router.navigate(['/tabs/clientes']);
        },
        error: (err) => {
          console.error('❌ Error al crear cliente:', err);
          console.error('🔍 Detalles:', {
            message: err.message,
            code: err.code,
            details: err
          });
          this.showToast('Error al crear cliente ❌', 'danger');
          this.isLoading = false;
        },
      });
    }
  }

  async crearClienteSinParametros() {
    await this.crearCliente();
  }

  cancelar() {
    this.router.navigate(['/tabs/clientes']);
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

  // Muestra el toast y hace scroll hasta el campo obligatorio que falta
  private rechazarCampo(campo: string, mensaje: string) {
    this.showToast(mensaje, 'danger');
    this.enfocarCampo(campo);
  }

  // Hace scroll hacia el campo indicado y lo resalta brevemente
  private async enfocarCampo(campo: string) {
    const el = this.obtenerElementoCampo(campo);
    if (!el) return;

    const item = el.closest('.campo') as HTMLElement | null;
    if (item) {
      item.classList.add('campo-invalido-local');
      setTimeout(() => item.classList.remove('campo-invalido-local'), 2500);
    }

    try {
      const scrollEl = await this.ionContent?.getScrollElement();
      if (scrollEl) {
        const top = el.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top + scrollEl.scrollTop;
        await this.ionContent!.scrollToPoint(0, Math.max(top - 120, 0), 400);
        return;
      }
    } catch (err) {
      console.warn('Scroll programático falló, usando scrollIntoView:', err);
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Selector del elemento según el campo lógico
  private obtenerElementoCampo(campo: string): HTMLElement | null {
    const selectores: Record<string, string> = {
      nombre: 'ion-input[name="nombre"]',
      direccion: 'ion-input[name="direccion"]',
      telefono: 'ion-input[name="telefono"]',
      email: 'ion-input[name="email"]',
      largo: 'ion-input[name="largo"]',
      ancho: 'ion-input[name="ancho"]',
      profundidad: 'ion-input[name="profundidad"]',
      monto: 'ion-input[name="monto"]',
      frecuencia: '.frecuencia-opciones',
      cantidadPorPeriodo: '.stepper',
      dias: '.dias-chips'
    };

    const selector = selectores[campo];
    if (!selector) return null;
    return document.querySelector(selector) as HTMLElement | null;
  }

  telefonoValido(): boolean {
    const regex = /^\+56\s[1-9]\s\d{4}\s\d{4}$/;
    const valido = regex.test(this.nuevoCliente.telefono);
    return valido;
  }

  emailValido(): boolean {
    if (!this.nuevoCliente.email || this.nuevoCliente.email.trim() === '') {
      return true;
    }
    
    const regex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
    const valido = regex.test(this.nuevoCliente.email);
    return valido;
  }

  medidasValidas(): boolean {
    const valido = (
      this.nuevoCliente.medidas.largo > 0 &&
      this.nuevoCliente.medidas.ancho > 0 &&
      this.nuevoCliente.medidas.profundidad > 0
    );
    return valido;
  }

  precioValido(): boolean {
    const valido = (this.nuevoCliente.precio > 0);
    return valido;
  }

  diasSeleccionadosValidos(): boolean {
    const diasSeleccionados = this.getDiasSeleccionados();
    return diasSeleccionados.length === this.nuevoCliente.programacion.cantidadPorPeriodo;
  }

  formatearTelefono(event: any) {
    let valor: string = event.target.value;
    valor = valor.replace(/\D/g, '');
    
    if (valor.startsWith('56')) {
      valor = valor.substring(2);
    }
    
    valor = valor.substring(0, 9);
    let formateado = '+56';
    
    if (valor.length > 0) {
      formateado += ' ' + valor.substring(0, 1);
    }
    
    if (valor.length > 1) {
      formateado += ' ' + valor.substring(1, 5);
    }
    
    if (valor.length > 5) {
      formateado += ' ' + valor.substring(5, 9);
    }
    
    this.nuevoCliente.telefono = formateado.trim();
    event.target.value = this.nuevoCliente.telefono;
  }

  seleccionarFrecuencia(frecuencia: string) {
    if (this.nuevoCliente.programacion.frecuencia === frecuencia) return;
    this.nuevoCliente.programacion.frecuencia = frecuencia;
    this.nuevoCliente.programacion.cantidadPorPeriodo = 1;
    this.resetearDiasSeleccionados();
  }

  /** Suma o resta servicios por período, dentro del rango permitido. */
  cambiarCantidad(delta: number) {
    const actual = this.nuevoCliente.programacion.cantidadPorPeriodo || 1;
    const nueva = Math.min(Math.max(actual + delta, 1), this.getMaxServicios());
    this.nuevoCliente.programacion.cantidadPorPeriodo = nueva;

    // Si bajó la cantidad, se quitan los últimos días marcados que sobran
    const marcados = this.diasSemana.filter((d) => d.seleccionado);
    marcados.slice(nueva).forEach((d) => (d.seleccionado = false));
  }

  toggleDia(dia: DiaSemana) {
    const seleccionado = !dia.seleccionado;
    dia.seleccionado = seleccionado;

    const diasSeleccionados = this.getDiasSeleccionados();

    // Si se pasó del máximo, se desmarca el primer día que ya estaba marcado
    if (seleccionado && diasSeleccionados.length > this.nuevoCliente.programacion.cantidadPorPeriodo) {
      for (let i = 0; i < this.diasSemana.length; i++) {
        if (this.diasSemana[i].seleccionado && this.diasSemana[i].valor !== dia.valor) {
          this.diasSemana[i].seleccionado = false;
          break;
        }
      }
    }
  }

  resetearDiasSeleccionados() {
    this.diasSemana.forEach(dia => dia.seleccionado = false);
  }

  getDiasSeleccionados(): string[] {
    return this.diasSemana.filter(dia => dia.seleccionado).map(dia => dia.valor);
  }

  actualizarDiasEnCliente() {
    this.nuevoCliente.programacion.diasSemana = this.getDiasSeleccionados();
  }

  getFrecuenciaText(): string {
    switch (this.nuevoCliente.programacion.frecuencia) {
      case 'semanal':
        return 'semana';
      case 'quincenal':
        return 'quincena';
      case 'mensual':
        return 'mes';
      default:
        return 'período';
    }
  }

  getMaxServicios(): number {
    switch (this.nuevoCliente.programacion.frecuencia) {
      case 'semanal':
        return 7;
      case 'quincenal':
        return 4;
      case 'mensual':
        return 8;
      default:
        return 1;
    }
  }

  /** Hora preferida como "HH:mm" (clientes antiguos pueden tenerla en formato ISO). */
  get horaPreferida(): string {
    const hora = this.nuevoCliente.programacion.horaPreferida || '';
    const coincide = hora.match(/(\d{2}):(\d{2})/);
    return coincide ? `${coincide[1]}:${coincide[2]}` : '';
  }

  set horaPreferida(valor: string) {
    this.nuevoCliente.programacion.horaPreferida = valor || '';
  }

  get volumenM3(): number {
    const { largo, ancho, profundidad } = this.nuevoCliente.medidas;
    const v = Number(largo) * Number(ancho) * Number(profundidad);
    return isFinite(v) && v > 0 ? v : 0;
  }

  get volumenLitros(): number {
    return this.volumenM3 * 1000;
  }

  validarFormulario(): boolean {
    return this.nuevoCliente.nombre.trim() !== '' &&
           this.nuevoCliente.direccion.trim() !== '' &&
           this.telefonoValido() &&
           this.emailValido() &&
           this.medidasValidas() &&
           this.precioValido();
  }

  async eliminarCliente() {
    if (!this.verificarUsuarioAutenticado()) return;
    
    if (!this.isEditing || !this.clienteId) {
      this.showToast('No se puede eliminar: cliente no encontrado ❌', 'danger');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de que quieres eliminar a este cliente?\n\n${this.nuevoCliente.nombre}\n\nEsta acción no se puede deshacer.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary',
        },
        {
          text: 'Eliminar',
          cssClass: 'danger',
          handler: () => {
            this.confirmarEliminacion();
          }
        }
      ]
    });

    await alert.present();
  }

  private confirmarEliminacion() {
    if (!this.clienteId) return;

    this.isLoading = true;
    console.log('🗑️ Eliminando cliente con ID:', this.clienteId);

    this.clienteService.deleteCliente(this.clienteId).subscribe({
      next: () => {
        console.log('✅ Cliente eliminado exitosamente');
        this.showToast('Cliente eliminado con éxito ✅', 'success');
        this.isLoading = false;
        this.router.navigate(['/tabs/clientes']);
      },
      error: (err) => {
        console.error('❌ Error al eliminar cliente:', err);
        this.showToast('Error al eliminar cliente ❌', 'danger');
        this.isLoading = false;
      }
    });
  }

  /**
   * Pide permiso de ubicación y, en Android, el diálogo del sistema para
   * encender el GPS si está apagado. Luego convierte las coordenadas en una
   * dirección y la escribe en el campo.
   */
  async obtenerUbicacionActual() {
    this.isLoadingUbicacion = true;

    try {
      if (Capacitor.isNativePlatform() && !(await this.asegurarPermisoUbicacion())) {
        return;
      }

      const posicion: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 30000,
      });

      const { latitude, longitude, accuracy } = posicion.coords;
      if (accuracy > 100) {
        this.showToast('Ubicación aproximada: revisa que la dirección sea correcta', 'warning');
      }

      await this.geocodificarCoordenadas(latitude, longitude);
    } catch (error: any) {
      console.error('❌ Error obteniendo ubicación:', error);
      await this.manejarErrorUbicacion(error);
    } finally {
      this.isLoadingUbicacion = false;
    }
  }

  /** Revisa el permiso y lo solicita si hace falta. Devuelve true si está concedido. */
  private async asegurarPermisoUbicacion(): Promise<boolean> {
    let estado: string;
    try {
      estado = (await Geolocation.checkPermissions()).location;
    } catch (error: any) {
      // Con el GPS apagado checkPermissions falla: getCurrentPosition se encarga
      // de pedir encenderlo, así que se sigue adelante.
      if (this.codigoError(error) === 'OS-PLUG-GLOC-0007') {
        return true;
      }
      throw error;
    }

    if (estado === 'granted') {
      return true;
    }

    estado = (await Geolocation.requestPermissions({ permissions: ['location'] })).location;
    if (estado === 'granted') {
      return true;
    }

    await this.alertaPermisoDenegado();
    return false;
  }

  private async manejarErrorUbicacion(error: any) {
    const codigo = this.codigoError(error);
    const mensaje = String(error?.message || '').toLowerCase();

    if (codigo === 'OS-PLUG-GLOC-0003' || error?.code === 1 || mensaje.includes('denied')) {
      await this.alertaPermisoDenegado();
    } else if (codigo === 'OS-PLUG-GLOC-0007' || codigo === 'OS-PLUG-GLOC-0009') {
      this.showToast('Enciende la ubicación del teléfono para usar esta opción 📍', 'warning');
    } else if (codigo === 'OS-PLUG-GLOC-0010' || error?.code === 3 || mensaje.includes('timeout')) {
      this.showToast('No se pudo obtener la ubicación a tiempo. Intenta de nuevo al aire libre', 'warning');
    } else {
      this.showToast('No se pudo obtener tu ubicación ❌', 'danger');
    }
  }

  private async alertaPermisoDenegado() {
    const alert = await this.alertController.create({
      header: 'Permiso de ubicación',
      message:
        'Para rellenar la dirección con tu ubicación, permite el acceso en Ajustes → Aplicaciones → Reyes Piscinas → Permisos → Ubicación.',
      buttons: ['Entendido'],
    });
    await alert.present();
  }

  private codigoError(error: any): string {
    return String(error?.code ?? '');
  }

  private async geocodificarCoordenadas(lat: number, lon: number) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=es`
      );

      if (!response.ok) {
        throw new Error('Error en la geocodificación');
      }

      const data = await response.json();

      if (data && data.display_name) {
        this.nuevoCliente.direccion = this.formatearDireccion(data);
        this.showToast('Dirección obtenida ✅ Revisa el número de casa', 'success');
      } else {
        throw new Error('No se pudo obtener la dirección');
      }

    } catch (error) {
      console.error('❌ Error en geocodificación:', error);
      this.showToast('Error al obtener dirección', 'danger');
    }
  }

  /** "Calle 123, Comuna" a partir de la respuesta de Nominatim. */
  private formatearDireccion(data: any): string {
    const a = data.address || {};
    const calle = [a.road || a.pedestrian || a.footway, a.house_number].filter(Boolean).join(' ');
    const comuna = a.suburb || a.city_district || a.city || a.town || a.village || '';

    if (calle) {
      return [calle, comuna].filter(Boolean).join(', ');
    }

    // Sin calle reconocida: primeras partes del nombre completo, sin el país
    return String(data.display_name)
      .split(',')
      .map((p: string) => p.trim())
      .filter((p: string) => p && p !== 'Chile')
      .slice(0, 2)
      .join(', ');
  }
}