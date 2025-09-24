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
import { Auth } from '@angular/fire/auth';

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
  
  nuevoCliente: Cliente = {
    userId: this.auth.currentUser?.uid || '',
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
  isDevelopment = false; // Bandera para modo desarrollo

  constructor(
    private clienteService: ClienteService,
    private firebaseTestService: FirebaseTestService,
    private router: Router,
    private route: ActivatedRoute,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    // Detectar si estamos en modo desarrollo
    this.isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

    // Verificación simple de conexión (sin crear documentos)
    this.firebaseTestService.simpleConnectionTest().subscribe({
      next: (result) => {
        if (result.success) {
          console.log('✅ Conexión verificada:', result.message);
          this.showToast('Conexión con Firebase verificada ✅', 'success');
        } else {
          console.error('❌ Error de conexión:', result.message);
          this.showToast(`Error de conexión: ${result.message} ❌`, 'danger');

          // Mostrar detalles del error en consola
          if (result.details) {
            console.error('🔍 Detalles del error:', result.details);
          }
        }
      },
      error: (err: any) => {
        console.error('❌ Error en verificación:', err);
        this.showToast('Error en verificación de Firebase ❌', 'danger');
      }
    });

    // Verificar si estamos editando (hay un ID en la ruta)
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

  cargarDatosCliente() {
    if (this.clienteId) {
      this.isLoading = true;
      this.clienteService.getClienteById(this.clienteId).subscribe({
        next: (cliente) => {
          console.log('Datos del cliente cargados:', cliente);
          // Asegurar que todas las propiedades estén definidas
          this.nuevoCliente = {
            ...cliente,
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
          
          // Actualizar los días seleccionados
          this.actualizarDiasSeleccionados();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error al cargar datos del cliente:', err);
          this.showToast('Error al cargar datos del cliente ❌', 'danger');
          this.isLoading = false;
          this.router.navigate(['/tabs/clientes']);
        }
      });
    }
  }

  actualizarDiasSeleccionados() {
    // Resetear todos los días
    this.diasSemana.forEach(dia => dia.seleccionado = false);
    
    // Marcar los días guardados
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
    console.log('Formulario válido:', form?.valid || 'Sin formulario');
    console.log('Datos del cliente:', this.nuevoCliente);

    // Validaciones paso a paso
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

    // Actualizar los días seleccionados antes de enviar
    this.actualizarDiasEnCliente();

    this.isLoading = true;

    if (this.isEditing) {
      // Actualizar cliente existente
      console.log('Actualizando cliente con ID:', this.nuevoCliente.id);
      this.clienteService.updateCliente(this.nuevoCliente).subscribe({
        next: () => {
          console.log('Cliente actualizado exitosamente');
          this.showToast('Cliente actualizado con éxito ✅', 'success');
          this.isLoading = false;
          this.router.navigate(['/tabs/clientes']);
        },
        error: (err) => {
          console.error('Error al actualizar cliente:', err);
          this.showToast('Error al actualizar cliente ❌', 'danger');
          this.isLoading = false;
        },
      });
    } else {
      // Crear nuevo cliente
      console.log('Creando nuevo cliente');
      this.clienteService.addCliente(this.nuevoCliente).subscribe({
        next: () => {
          console.log('Cliente creado exitosamente');
          this.showToast('Cliente creado con éxito ✅', 'success');
          this.isLoading = false;
          this.router.navigate(['/tabs/clientes']);
        },
        error: (err) => {
          console.error('Error al crear cliente:', err);
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
    // Validar formato +56 9 1234 5678
    const regex = /^\+56\s[1-9]\s\d{4}\s\d{4}$/;
    const valido = regex.test(this.nuevoCliente.telefono);
    console.log('Validando teléfono:', this.nuevoCliente.telefono, 'Válido:', valido);
    return valido;
  }

  emailValido(): boolean {
    // Si el campo está vacío, es válido porque es opcional
    if (!this.nuevoCliente.email || this.nuevoCliente.email.trim() === '') {
      return true;
    }
    
    // Si tiene contenido, debe cumplir formato de email
    const regex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
    const valido = regex.test(this.nuevoCliente.email);
    console.log('Validando email:', this.nuevoCliente.email, 'Válido:', valido);
    return valido;
  }

  medidasValidas(): boolean {
    const valido = (
      this.nuevoCliente.medidas.largo > 0 &&
      this.nuevoCliente.medidas.ancho > 0 &&
      this.nuevoCliente.medidas.profundidad > 0
    );
    console.log('Validando medidas:', this.nuevoCliente.medidas, 'Válido:', valido);
    return valido;
  }

  precioValido(): boolean {
    const valido = (
      this.nuevoCliente.precio > 0 
    );
    console.log('Validando precio:', this.nuevoCliente.precio, 'Válido:', valido);
    return valido;
  }


  diasSeleccionadosValidos(): boolean {
    const diasSeleccionados = this.getDiasSeleccionados();
    return diasSeleccionados.length === this.nuevoCliente.programacion.cantidadPorPeriodo;
  }

  formatearTelefono(event: any) {
    let valor: string = event.target.value;
    
    // Quitar todo excepto números
    valor = valor.replace(/\D/g, '');
    
    // Si ya comienza con 56, quitamos para evitar duplicar
    if (valor.startsWith('56')) {
      valor = valor.substring(2);
    }
    
    // Limitar máximo a 9 dígitos después de +56
    valor = valor.substring(0, 9);
    
    // Construir el formato: +56 9 1234 5678
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
    
    // Actualizar valor en el input
    this.nuevoCliente.telefono = formateado.trim();
    
    // Forzar detección de cambios
    event.target.value = this.nuevoCliente.telefono;
  }

  // Métodos para la programación de servicios
  onFrecuenciaChange(event: any) {
    const frecuencia = event.target.value;
    this.nuevoCliente.programacion.frecuencia = frecuencia;
    
    // Resetear cantidad y días cuando cambia la frecuencia
    this.nuevoCliente.programacion.cantidadPorPeriodo = 1;
    this.resetearDiasSeleccionados();
    
    console.log('Frecuencia cambiada a:', frecuencia);
  }

  // Método para manejar cambios en la frecuencia del precio


  onDiaChange(dia: DiaSemana, event: any) {
    const seleccionado = event.target.checked;
    dia.seleccionado = seleccionado;
    
    const diasSeleccionados = this.getDiasSeleccionados();
    
    // Si se seleccionó un día y ya hay suficientes días seleccionados, deseleccionar el más antiguo
    if (seleccionado && diasSeleccionados.length > this.nuevoCliente.programacion.cantidadPorPeriodo) {
      // Encontrar el primer día seleccionado que no sea el actual y deseleccionarlo
      for (let i = 0; i < this.diasSemana.length; i++) {
        if (this.diasSemana[i].seleccionado && this.diasSemana[i].valor !== dia.valor) {
          this.diasSemana[i].seleccionado = false;
          break;
        }
      }
    }
    
    console.log('Días seleccionados:', this.getDiasSeleccionados());
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
        return 7; // Máximo 7 días por semana
      case 'quincenal':
        return 4; // Máximo 4 servicios cada 15 días
      case 'mensual':
        return 8; // Máximo 8 servicios por mes
      default:
        return 1;
    }
  }

  // Métodos auxiliares para depuración
  onInputChange(field: string, value: any) {
    console.log(`Campo ${field} cambió a:`, value);
  }

  // Método para validar en tiempo real
  validarFormulario(): boolean {
    return this.nuevoCliente.nombre.trim() !== '' &&
           this.nuevoCliente.direccion.trim() !== '' &&
           this.telefonoValido() &&
           this.emailValido() &&
           this.medidasValidas() &&
           this.precioValido();
  }

  // Método para forzar la detección de cambios en el formulario
  private triggerFormValidation() {
    // Forzar validación del formulario después de autocompletar
    setTimeout(() => {
      if (this.nuevoCliente.direccion.trim() !== '') {
        // Trigger validation for address field
        const direccionControl = document.querySelector('ion-input[name="direccion"]') as any;
        if (direccionControl) {
          direccionControl.value = this.nuevoCliente.direccion;
        }
      }
    }, 100);
  }

  // Método para eliminar cliente
  async eliminarCliente() {
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
    console.log('Eliminando cliente con ID:', this.clienteId);

    this.clienteService.deleteCliente(this.clienteId).subscribe({
      next: () => {
        console.log('Cliente eliminado exitosamente');
        this.showToast('Cliente eliminado con éxito ✅', 'success');
        this.isLoading = false;
        this.router.navigate(['/tabs/clientes']);
      },
      error: (err) => {
        console.error('Error al eliminar cliente:', err);
        this.showToast('Error al eliminar cliente ❌', 'danger');
        this.isLoading = false;
      }
    });
  }

  // Método para obtener la ubicación actual
  async obtenerUbicacionActual() {
    // Verificar si estamos en un navegador que soporta geolocalización
    if (!navigator.geolocation) {
      this.showToast('Geolocalización no soportada en este navegador ❌', 'danger');
      return;
    }

    // Verificar si estamos en HTTPS (requerido para geolocalización en la mayoría de navegadores)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      this.showToast('Se requiere HTTPS para acceder a la ubicación GPS ❌', 'danger');
      return;
    }

    this.isLoadingUbicacion = true;

    try {
      let latitude: number, longitude: number, accuracy: number;

      if (this.isDevelopment) {
        // Coordenadas simuladas para Santiago, Chile (modo desarrollo)
        latitude = -33.4489;
        longitude = -70.6693;
        accuracy = 10; // Precisión perfecta para simulación

        console.log('Modo desarrollo: Usando coordenadas simuladas de Santiago, Chile');
        this.showToast('Modo desarrollo: Ubicación simulada obtenida', 'primary');
      } else {
        // Mostrar mensaje informativo
        this.showToast('Obteniendo ubicación GPS...', 'primary');

        const position = await this.getCurrentPosition();
        ({ latitude, longitude, accuracy } = position.coords);

        console.log('Ubicación obtenida:', { latitude, longitude, accuracy });

        // Verificar precisión (si es muy baja, advertir al usuario)
        if (accuracy > 100) {
          this.showToast('Ubicación obtenida (precisión baja)', 'warning');
        }
      }

      // Obtener dirección usando geocodificación inversa
      await this.geocodificarCoordenadas(latitude, longitude);

    } catch (error: any) {
      console.error('Error obteniendo ubicación:', error);

      let mensaje = 'Error al obtener ubicación ❌';
      let sugerencia = '';

      if (this.isDevelopment) {
        mensaje = 'Modo desarrollo: GPS no disponible ❌';
        sugerencia = 'Usando coordenadas simuladas de Santiago, Chile';
        // Intentar usar coordenadas simuladas como fallback
        console.log('Modo desarrollo: Intentando usar coordenadas simuladas');
        await this.geocodificarCoordenadas(-33.4489, -70.6693);
        return;
      } else {
        if (error.code === 1) {
          mensaje = 'Permiso de ubicación denegado ❌';
          sugerencia = 'Activa GPS en configuración del navegador/dispositivo';
        } else if (error.code === 2) {
          mensaje = 'Posición no disponible ❌';
          sugerencia = 'Verifica que GPS esté activado y tengas señal';
        } else if (error.code === 3) {
          mensaje = 'Tiempo agotado ❌';
          sugerencia = 'Verifica conexión a internet y señal GPS';
        }
      }

      this.showToast(`${mensaje}\n${sugerencia}`, 'danger');
    } finally {
      this.isLoadingUbicacion = false;
    }
  }

  // Promesa para obtener posición actual
  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      // Configuración más permisiva para mejor compatibilidad
      const options: PositionOptions = {
        enableHighAccuracy: false, // Cambiar a false para mejor compatibilidad
        timeout: 15000, // Aumentar timeout
        maximumAge: 600000 // 10 minutos de cache
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('GPS exitoso:', {
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            timestamp: position.timestamp
          });
          resolve(position);
        },
        (error) => {
          console.error('GPS error:', error);
          reject(error);
        },
        options
      );
    });
  }

  // Geocodificación inversa usando Nominatim (OpenStreetMap)
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
        // Limpiar y formatear la dirección
        let direccion = data.display_name;

        // Remover información de país si es Chile
        if (direccion.includes(', Chile')) {
          direccion = direccion.replace(', Chile', '');
        }

        // Remover códigos postales y otros detalles innecesarios
        direccion = direccion.split(',')[0] + ', ' + (data.address?.city || data.address?.town || data.address?.village || '');

        this.nuevoCliente.direccion = direccion.trim();
        this.triggerFormValidation();
        this.showToast('Dirección obtenida exitosamente ✅', 'success');

        console.log('Dirección geocodificada:', direccion);
      } else {
        throw new Error('No se pudo obtener la dirección');
      }

    } catch (error) {
      console.error('Error en geocodificación:', error);
      this.showToast('Error al obtener dirección. Intenta nuevamente ❌', 'danger');
    }
  }
}