import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { NgModel } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ClienteService, Cliente } from '../../../services/cliente.service';
import { FirebaseTestService } from '../../../services/firebase-test.service';
import { addIcons } from 'ionicons';
import { trashOutline, locationOutline } from 'ionicons/icons';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

// Registrar los iconos
addIcons({
  'trash-outline': trashOutline,
  'location-outline': locationOutline,
});

// Interfaz para los días de la semana
interface DiaSemana {
  valor: string;
  nombre: string;
  seleccionado: boolean;
}

@Component({
  selector: 'app-crear-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  templateUrl: './crear-clientes.page.html',
  styleUrls: ['./crear-clientes.page.scss'],
})
export class CrearClientesPage implements OnInit {
  @ViewChild('cantidadPorPeriodo') cantidadPorPeriodoRef?: NgModel;
  
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
    { valor: 'lunes', nombre: 'Lunes', seleccionado: false },
    { valor: 'martes', nombre: 'Martes', seleccionado: false },
    { valor: 'miercoles', nombre: 'Miércoles', seleccionado: false },
    { valor: 'jueves', nombre: 'Jueves', seleccionado: false },
    { valor: 'viernes', nombre: 'Viernes', seleccionado: false },
    { valor: 'sabado', nombre: 'Sábado', seleccionado: false },
    { valor: 'domingo', nombre: 'Domingo', seleccionado: false }
  ];

  isEditing = false;
  clienteId: string | null = null;
  pageTitle = 'Crear Cliente';
  isLoading = false;
  isLoadingUbicacion = false;
  isDevelopment = false;

  constructor(
    private clienteService: ClienteService,
    private firebaseTestService: FirebaseTestService,
    private router: Router,
    private route: ActivatedRoute,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    this.isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

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

    // Verificación de conexión
    this.firebaseTestService.simpleConnectionTest().subscribe({
      next: (result) => {
        if (result.success) {
          console.log('✅ Conexión verificada:', result.message);
        } else {
          console.error('❌ Error de conexión:', result.message);
          this.showToast(`Error de conexión: ${result.message}`, 'warning');
        }
      },
      error: (err: any) => {
        console.error('❌ Error en verificación:', err);
      }
    });

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

    // Validaciones
    if (!this.nuevoCliente.nombre || this.nuevoCliente.nombre.trim() === '') {
      this.showToast('El nombre es obligatorio ❌', 'danger');
      return;
    }

    if (!this.nuevoCliente.direccion || this.nuevoCliente.direccion.trim() === '') {
      this.showToast('La dirección es obligatoria ❌', 'danger');
      return;
    }

    if (!this.telefonoValido()) {
      this.showToast('El teléfono debe tener el formato +56 9 1234 5678 ❌', 'danger');
      return;
    }

    if (!this.emailValido()) {
      this.showToast('El email no es válido ❌', 'danger');
      return;
    }

    if (!this.medidasValidas()) {
      this.showToast('Las medidas deben ser mayores a 0 ❌', 'danger');
      return;
    }

    if (!this.precioValido()) {
      this.showToast('El precio no es válido ❌', 'danger');
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

  onFrecuenciaChange(event: any) {
    const frecuencia = event.target.value;
    this.nuevoCliente.programacion.frecuencia = frecuencia;
    this.nuevoCliente.programacion.cantidadPorPeriodo = 1;
    this.resetearDiasSeleccionados();
  }

  onDiaChange(dia: DiaSemana, event: any) {
    const seleccionado = event.target.checked;
    dia.seleccionado = seleccionado;
    
    const diasSeleccionados = this.getDiasSeleccionados();
    
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

  onInputChange(field: string, value: any) {
    console.log(`Campo ${field} cambió a:`, value);
  }

  validarFormulario(): boolean {
    return this.nuevoCliente.nombre.trim() !== '' &&
           this.nuevoCliente.direccion.trim() !== '' &&
           this.telefonoValido() &&
           this.emailValido() &&
           this.medidasValidas() &&
           this.precioValido();
  }

  private triggerFormValidation() {
    setTimeout(() => {
      if (this.nuevoCliente.direccion.trim() !== '') {
        const direccionControl = document.querySelector('ion-input[name="direccion"]') as any;
        if (direccionControl) {
          direccionControl.value = this.nuevoCliente.direccion;
        }
      }
    }, 100);
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

  async obtenerUbicacionActual() {
    if (!navigator.geolocation) {
      this.showToast('Geolocalización no soportada en este navegador ❌', 'danger');
      return;
    }

    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      this.showToast('Se requiere HTTPS para acceder a la ubicación GPS ❌', 'danger');
      return;
    }

    this.isLoadingUbicacion = true;

    try {
      let latitude: number, longitude: number, accuracy: number;

      if (this.isDevelopment) {
        latitude = -33.4489;
        longitude = -70.6693;
        accuracy = 10;

        console.log('🧪 Modo desarrollo: Usando coordenadas simuladas');
        this.showToast('Modo desarrollo: Ubicación simulada', 'primary');
      } else {
        this.showToast('Obteniendo ubicación GPS...', 'primary');

        const position = await this.getCurrentPosition();
        ({ latitude, longitude, accuracy } = position.coords);

        if (accuracy > 100) {
          this.showToast('Ubicación obtenida (precisión baja)', 'warning');
        }
      }

      await this.geocodificarCoordenadas(latitude, longitude);

    } catch (error: any) {
      console.error('❌ Error obteniendo ubicación:', error);

      let mensaje = 'Error al obtener ubicación ❌';

      if (this.isDevelopment) {
        await this.geocodificarCoordenadas(-33.4489, -70.6693);
        return;
      } else {
        if (error.code === 1) {
          mensaje = 'Permiso de ubicación denegado';
        } else if (error.code === 2) {
          mensaje = 'Posición no disponible';
        } else if (error.code === 3) {
          mensaje = 'Tiempo agotado';
        }
      }

      this.showToast(mensaje, 'danger');
    } finally {
      this.isLoadingUbicacion = false;
    }
  }

  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      const options: PositionOptions = {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 600000
      };

      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
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
        let direccion = data.display_name;

        if (direccion.includes(', Chile')) {
          direccion = direccion.replace(', Chile', '');
        }

        direccion = direccion.split(',')[0] + ', ' + (data.address?.city || data.address?.town || data.address?.village || '');

        this.nuevoCliente.direccion = direccion.trim();
        this.triggerFormValidation();
        this.showToast('Dirección obtenida exitosamente ✅', 'success');
      } else {
        throw new Error('No se pudo obtener la dirección');
      }

    } catch (error) {
      console.error('❌ Error en geocodificación:', error);
      this.showToast('Error al obtener dirección', 'danger');
    }
  }
}