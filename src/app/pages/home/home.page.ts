import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  refreshOutline, 
  checkmarkCircleOutline, 
  timeOutline, 
  locationOutline,
  chevronBackOutline,
  chevronForwardOutline,
  cashOutline,
  arrowUndoOutline
} from 'ionicons/icons';
import { ClienteService } from '../../services/cliente.service';

interface ClienteDelDia {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  horaPreferida: string;
  precio: number; // Agregamos el precio
  realizado: boolean;
  mantenimiento?: {
    estadoCloro: string;
    estadoPh: string;
    cantidadCloro: number;
    cantidadPh: number;
    fecha: string;
    hora: string;
  };
}

interface DiaCalendario {
  fecha: Date;
  numero: number;
  diaSemana: string;
  esHoy: boolean;
  seleccionado: boolean;
  tieneEventos: boolean;
}

addIcons({
  'refresh-outline': refreshOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'time-outline': timeOutline,
  'location-outline': locationOutline,
  'chevron-back-outline': chevronBackOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'cash-outline': cashOutline,
  'arrow-undo-outline': arrowUndoOutline
});

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  @ViewChild('calendarioScroll') calendarioScroll!: ElementRef;
  
  fechaHoy!: string;
  diaHoy!: string;
  clientesPendientes: ClienteDelDia[] = [];
  clientesRealizados: ClienteDelDia[] = [];
  isLoading = false;
  progresoDelDia = 0;
  
  // Propiedades del calendario
  fechaActual = new Date();
  fechaSeleccionada = new Date();
  mesVista = new Date();
  diasDelMes: DiaCalendario[] = [];
  mesAnioActual = '';
  diasConEventos: number[] = []; // Días que tienen mantenimientos programados

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private clienteService: ClienteService
  ) {
    this.configurarFecha();
    this.generarCalendario();
  }

  ngOnInit() {
    this.cargarClientesDelDia();
    // Scroll al día actual después de que se inicialice la vista
    setTimeout(() => {
      this.scrollAlDiaActual();
    }, 500);
  }

  configurarFecha() {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    const today = new Date();
    const formattedDate = today.toLocaleDateString('es-ES', options)
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    this.fechaHoy = formattedDate;
    
    // Obtener el día de la semana para filtrar clientes
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    this.diaHoy = diasSemana[today.getDay()];
    
    // Configurar fechas del calendario
    this.fechaActual = new Date(today);
    this.fechaSeleccionada = new Date(today);
    this.mesVista = new Date(today);
  }

  generarCalendario() {
    this.diasDelMes = [];
    
    // Actualizar header del mes
    const mesAnio = this.mesVista.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric'
    });
    this.mesAnioActual = mesAnio.charAt(0).toUpperCase() + mesAnio.slice(1);

    // Generar días del mes
    const primerDia = new Date(this.mesVista.getFullYear(), this.mesVista.getMonth(), 1);
    const ultimoDia = new Date(this.mesVista.getFullYear(), this.mesVista.getMonth() + 1, 0);
    
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const fecha = new Date(this.mesVista.getFullYear(), this.mesVista.getMonth(), dia);
      const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'short' });
      
      this.diasDelMes.push({
        fecha: fecha,
        numero: dia,
        diaSemana: diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
        esHoy: this.esMismaFecha(fecha, this.fechaActual),
        seleccionado: this.esMismaFecha(fecha, this.fechaSeleccionada),
        tieneEventos: this.diasConEventos.includes(dia) && this.esMesActual()
      });
    }
  }

  seleccionarDia(dia: DiaCalendario) {
    // Actualizar selección
    this.diasDelMes.forEach(d => d.seleccionado = false);
    dia.seleccionado = true;
    
    this.fechaSeleccionada = new Date(dia.fecha);
    
    // Actualizar día seleccionado para filtrar clientes
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    this.diaHoy = diasSemana[dia.fecha.getDay()];
    
    // Recargar clientes para el día seleccionado
    this.cargarClientesDelDia();
    
    this.showToast(`Día seleccionado: ${dia.numero} de ${this.mesAnioActual}`, 'primary');
  }

  cambiarMes(direccion: number) {
    this.mesVista.setMonth(this.mesVista.getMonth() + direccion);
    this.generarCalendario();
  }

  scrollAlDiaActual() {
    if (this.calendarioScroll && this.esMesActual()) {
      const diaActualIndex = this.diasDelMes.findIndex(dia => dia.esHoy);
      if (diaActualIndex !== -1) {
        const scrollElement = this.calendarioScroll.nativeElement;
        const diaWidth = 68; // Ancho aproximado de cada día (60px + 8px gap)
        const scrollLeft = (diaActualIndex * diaWidth) - (scrollElement.offsetWidth / 2) + (diaWidth / 2);
        
        scrollElement.scrollTo({
          left: Math.max(0, scrollLeft),
          behavior: 'smooth'
        });
      }
    }
  }

  actualizarEventosCalendario() {
    // Simular días con eventos basados en los clientes pendientes
    // En tu implementación real, esto vendría de tus datos de clientes
    this.diasConEventos = [];
    
    if (this.esMesActual()) {
      // Agregar días con mantenimientos programados
      for (let i = 0; i < 7; i++) {
        const dia = this.fechaActual.getDate() + i;
        if (dia <= new Date(this.fechaActual.getFullYear(), this.fechaActual.getMonth() + 1, 0).getDate()) {
          this.diasConEventos.push(dia);
        }
      }
    }
    
    this.generarCalendario();
  }

  cargarClientesDelDia() {
    this.isLoading = true;
    
    this.clienteService.getClientes().subscribe({
      next: (clientes) => {
        console.log('Clientes cargados:', clientes);
        console.log('Día seleccionado:', this.diaHoy);
        
        // Filtrar clientes que tienen mantenimiento en el día seleccionado
        const clientesDelDia = clientes.filter(cliente => {
          if (!cliente.activo || !cliente.programacion) {
            return false;
          }
          
          const diasProgramados = cliente.programacion.diasSemana || [];
          const tieneMantenimientoHoy = diasProgramados.includes(this.diaHoy);
          
          return tieneMantenimientoHoy;
        });

        // Convertir a formato ClienteDelDia
        this.clientesPendientes = clientesDelDia.map(cliente => ({
          id: cliente.id,
          nombre: cliente.nombre,
          direccion: cliente.direccion,
          telefono: cliente.telefono,
          horaPreferida: cliente.programacion?.horaPreferida || 'Sin horario específico',
          precio: cliente.precio || 0, // Agregamos el precio
          realizado: false
        }));

        this.clientesRealizados = [];
        this.calcularProgreso();
        this.actualizarEventosCalendario();
        this.isLoading = false;
        
        console.log('Clientes para el día seleccionado:', this.clientesPendientes);
      },
      error: (err) => {
        console.error('Error al cargar clientes:', err);
        this.showToast('Error al cargar clientes del día ❌', 'danger');
        this.isLoading = false;
      }
    });
  }

  // Método para formatear el precio
  formatearPrecio(precio: number): string {
    if (!precio || precio === 0) {
      return '0';
    }
    
    return precio.toLocaleString('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  // Métodos auxiliares
  esMismaFecha(fecha1: Date, fecha2: Date): boolean {
    return fecha1.getDate() === fecha2.getDate() &&
           fecha1.getMonth() === fecha2.getMonth() &&
           fecha1.getFullYear() === fecha2.getFullYear();
  }

  esMesActual(): boolean {
    return this.mesVista.getMonth() === this.fechaActual.getMonth() &&
           this.mesVista.getFullYear() === this.fechaActual.getFullYear();
  }

  // Resto de métodos existentes...
  async marcarRealizado(cliente: ClienteDelDia) {
    const alert = await this.alertController.create({
      header: 'Mantención de Piscina',
      subHeader: `Cliente: ${cliente.nombre}`,
      message: 'Por favor, completa los datos del mantenimiento:',
      inputs: [
        {
          name: 'estadoCloro',
          type: 'text',
          placeholder: 'Estado actual del cloro (ej: Bajo, Normal, Alto)'
        },
        {
          name: 'estadoPh',
          type: 'text',
          placeholder: 'Estado actual del pH (ej: 7.2, Ácido, Básico)'
        },
        {
          name: 'cantidadCloro',
          type: 'text',
          placeholder: 'Cantidad de cloro agregada (kg)'
        },
        {
          name: 'cantidadPh',
          type: 'text',
          placeholder: 'Cantidad de pH agregado/corregido (kg)'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Completar Mantención',
          cssClass: 'primary',
          handler: (data) => {
            return this.completarMantenimiento(cliente, data);
          }
        }
      ]
    });

    await alert.present();
  }

  completarMantenimiento(cliente: ClienteDelDia, data: any): boolean {
    // Validar que se hayan llenado los campos obligatorios
    if (!data.estadoCloro || !data.estadoPh) {
      this.showToast('Por favor, completa el estado del cloro y pH ❌', 'danger');
      return false;
    }

    if (data.cantidadCloro < 0 || data.cantidadPh < 0) {
      this.showToast('Las cantidades no pueden ser negativas ❌', 'danger');
      return false;
    }

    // Crear registro de mantenimiento
    const ahora = new Date();
    cliente.mantenimiento = {
      estadoCloro: data.estadoCloro,
      estadoPh: data.estadoPh,
      cantidadCloro: parseFloat(data.cantidadCloro) || 0,
      cantidadPh: parseFloat(data.cantidadPh) || 0,
      fecha: ahora.toISOString().split('T')[0],
      hora: ahora.toTimeString().split(' ')[0].substring(0, 5)
    };

    cliente.realizado = true;

    // Mover cliente a realizados
    this.clientesRealizados.push(cliente);
    this.clientesPendientes = this.clientesPendientes.filter(c => c.id !== cliente.id);

    // Actualizar historial del cliente en el servicio
    this.actualizarHistorialCliente(cliente);

    this.calcularProgreso();
    this.showToast(`Mantención de ${cliente.nombre} completada ✅`, 'success');

    return true;
  }

  actualizarHistorialCliente(cliente: ClienteDelDia) {
    if (!cliente.mantenimiento) return;

    this.clienteService.getClienteById(cliente.id).subscribe({
      next: (clienteCompleto) => {
        const nuevoRegistro = {
          fecha: cliente.mantenimiento!.fecha,
          servicio: `Mantención ${this.getServicioTipo(clienteCompleto.programacion?.frecuencia || 'semanal')}`,
          cloro: cliente.mantenimiento!.cantidadCloro,
          ph: cliente.mantenimiento!.cantidadPh,
          estadoCloro: cliente.mantenimiento!.estadoCloro,
          estadoPh: cliente.mantenimiento!.estadoPh,
          hora: cliente.mantenimiento!.hora
        };

        clienteCompleto.historial = clienteCompleto.historial || [];
        clienteCompleto.historial.push(nuevoRegistro);

        this.clienteService.updateCliente(clienteCompleto).subscribe({
          next: () => {
            console.log('Historial actualizado para cliente:', cliente.nombre);
          },
          error: (err) => {
            console.error('Error al actualizar historial:', err);
          }
        });
      },
      error: (err) => {
        console.error('Error al obtener cliente completo:', err);
      }
    });
  }

  getServicioTipo(frecuencia: string): string {
    switch (frecuencia) {
      case 'semanal': return 'semanal';
      case 'quincenal': return 'quincenal';
      case 'mensual': return 'mensual';
      default: return 'regular';
    }
  }

  calcularProgreso() {
    const total = this.clientesPendientes.length + this.clientesRealizados.length;
    if (total === 0) {
      this.progresoDelDia = 0;
      return;
    }
    this.progresoDelDia = (this.clientesRealizados.length / total) * 100;
  }

  async refrescarClientes() {
    this.isLoading = true;
    
    // Simular delay para mostrar loading
    setTimeout(() => {
      this.cargarClientesDelDia();
      this.showToast('Lista actualizada ✅', 'success');
    }, 1000);
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

  // Método para deshacer una mantención (por si se marca por error)
  async deshacerMantenimiento(cliente: ClienteDelDia) {
    const alert = await this.alertController.create({
      header: 'Deshacer Mantención',
      message: `¿Estás seguro de que quieres deshacer la mantención de ${cliente.nombre}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Deshacer',
          cssClass: 'danger',
          handler: () => {
            cliente.realizado = false;
            cliente.mantenimiento = undefined;
            
            this.clientesPendientes.push(cliente);
            this.clientesRealizados = this.clientesRealizados.filter(c => c.id !== cliente.id);
            
            this.calcularProgreso();
            this.showToast('Mantención deshecha ✅', 'success');
          }
        }
      ]
    });

    await alert.present();
  }

  // Método para obtener el color del progreso
  getColorProgreso(): string {
    if (this.progresoDelDia === 100) return 'success';
    if (this.progresoDelDia >= 50) return 'secondary';
    return 'primary';
  }

  // Método para formatear la hora
  formatearHora(hora: string): string {
    if (!hora || hora === 'Sin horario específico') {
      return 'Sin horario específico';
    }
    return hora;
  }
}