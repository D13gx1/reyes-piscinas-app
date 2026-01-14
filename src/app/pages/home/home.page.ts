import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController, ActionSheetController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  refreshOutline,
  checkmarkCircleOutline,
  timeOutline,
  locationOutline,
  chevronBackOutline,
  chevronForwardOutline,
  cashOutline,
  arrowUndoOutline,
  trashOutline
} from 'ionicons/icons';
import { ClienteService } from '../../services/cliente.service';

interface ClienteDelDia {
  id: string;
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
  cantidadPiscinas: number;
}

addIcons({
  'refresh-outline': refreshOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'time-outline': timeOutline,
  'location-outline': locationOutline,
  'chevron-back-outline': chevronBackOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'cash-outline': cashOutline,
  'arrow-undo-outline': arrowUndoOutline,
  'trash-outline': trashOutline
});

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {

  fechaHoy!: string;
  diaHoy!: string;
  dayNumber!: number;
  dayShort!: string;
  maintenanceCount = 0;
  maintenanceWord = 'mantenciones';
  isToday = true;
  clientesPendientes: ClienteDelDia[] = [];
  clientesRealizados: ClienteDelDia[] = [];
  isLoading = false;
  progresoDelDia = 0;
  // Contador de clientes borrados (saltados) para la fecha seleccionada
  deletedTodayCount = 0;
  deletedClientsList: { id: string; nombre: string }[] = [];
  
  // Propiedades del calendario
  fechaActual = new Date();
  fechaSeleccionada = new Date();
  mesVista = new Date();
  diasDelMes: DiaCalendario[] = [];
  mesAnioActual = '';

  // Selector de mes
  mesSeleccionado: number = this.fechaActual.getMonth();
  meses = [
    { value: 0, nombre: 'Enero' },
    { value: 1, nombre: 'Febrero' },
    { value: 2, nombre: 'Marzo' },
    { value: 3, nombre: 'Abril' },
    { value: 4, nombre: 'Mayo' },
    { value: 5, nombre: 'Junio' },
    { value: 6, nombre: 'Julio' },
    { value: 7, nombre: 'Agosto' },
    { value: 8, nombre: 'Septiembre' },
    { value: 9, nombre: 'Octubre' },
    { value: 10, nombre: 'Noviembre' },
    { value: 11, nombre: 'Diciembre' }
  ];

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController,
    private clienteService: ClienteService
  ) {
    this.configurarFecha();
    this.generarCalendario();
  }

  ngOnInit() {
    this.cargarClientesDelDia();
  }

  async deshacerBorrado(clienteId: string) {
    if (!this.fechaSeleccionada) return;
    const fechaSeleccionadaStr = this.fechaSeleccionada.toISOString().split('T')[0];

    this.clienteService.getClienteById(clienteId).subscribe({
      next: (clienteCompleto) => {
        // Remover la fecha de skippedDates
        (clienteCompleto as any).skippedDates = (clienteCompleto as any).skippedDates || [];
        (clienteCompleto as any).skippedDates = (clienteCompleto as any).skippedDates.filter((d: string) => d !== fechaSeleccionadaStr);

        // Remover entradas 'saltada' del historial para esa fecha
        clienteCompleto.historial = (clienteCompleto.historial || []).filter(h => !(h.fecha === fechaSeleccionadaStr && (h.estadoCloro === 'saltada' || (h.servicio && h.servicio.toLowerCase().includes('saltada')))));

        this.clienteService.updateCliente(clienteCompleto).subscribe({
          next: () => {
            this.showToast('Borrado deshecho ✅', 'success');
            this.cargarClientesDelDia();
          },
          error: (err) => {
            console.error('Error al deshacer borrado:', err);
            this.showToast('Error al deshacer borrado', 'danger');
          }
        });
      },
      error: (err) => {
        console.error('Error obteniendo cliente para deshacer:', err);
        this.showToast('Error al deshacer borrado', 'danger');
      }
    });
  }

  async mostrarClientesBorrados() {
    if (!this.deletedClientsList || this.deletedClientsList.length === 0) {
      this.showToast('No hay clientes borrados para esta fecha', 'primary');
      return;
    }

    // Usar ActionSheet para permitir deshacer por cliente
    const buttons = this.deletedClientsList.map(c => ({
      text: `${c.nombre} — Deshacer`,
      handler: () => this.deshacerBorrado(c.id)
    }));
    buttons.push({ text: 'Cancelar', role: 'cancel' } as any);

    const action = await this.actionSheetController.create({
      header: `Clientes borrados (${this.deletedTodayCount})`,
      buttons
    });
    await action.present();
  }

  configurarFecha() {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };

    // Formatear la fecha en español
    const formatter = new Intl.DateTimeFormat('es-ES', options);
    let formattedDate = formatter.format(today);

    // Capitalizar la primera letra de cada palabra
    formattedDate = formattedDate
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Reemplazar la coma por un salto de línea para mejor presentación
    this.fechaHoy = formattedDate.replace(',', '\n');

    // Obtener el día de la semana para filtrar clientes
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    this.diaHoy = diasSemana[today.getDay()];

    // Set day number and short day name
    this.dayNumber = today.getDate();
    this.dayShort = this.diaHoy.substring(0, 3).toUpperCase();

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

    // Generar días del mes con grid layout
    const primerDia = new Date(this.mesVista.getFullYear(), this.mesVista.getMonth(), 1);
    const ultimoDia = new Date(this.mesVista.getFullYear(), this.mesVista.getMonth() + 1, 0);

    // Día de la semana del primer día (0 = Domingo, 1 = Lunes, etc.)
    const diaSemanaPrimerDia = primerDia.getDay();

    // Agregar celdas vacías antes del primer día para alinear con el día de la semana
    for (let i = 0; i < diaSemanaPrimerDia; i++) {
      this.diasDelMes.push({
        fecha: new Date(), // Fecha dummy
        numero: 0, // Indica celda vacía
        diaSemana: '',
        esHoy: false,
        seleccionado: false,
        cantidadPiscinas: 0
      });
    }

    // Generar días del mes
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const fecha = new Date(this.mesVista.getFullYear(), this.mesVista.getMonth(), dia);
      const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'short' });

      this.diasDelMes.push({
        fecha: fecha,
        numero: dia,
        diaSemana: diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
        esHoy: this.esMismaFecha(fecha, this.fechaActual),
        seleccionado: this.esMismaFecha(fecha, this.fechaSeleccionada),
        cantidadPiscinas: 0 // Will be set later in actualizarEventosCalendario
      });
    }

    // Agregar celdas vacías al final para completar la última fila (opcional, pero mantiene consistencia)
    const totalCeldas = this.diasDelMes.length;
    const celdasFaltantes = (7 - (totalCeldas % 7)) % 7;
    for (let i = 0; i < celdasFaltantes; i++) {
      this.diasDelMes.push({
        fecha: new Date(), // Fecha dummy
        numero: 0, // Indica celda vacía
        diaSemana: '',
        esHoy: false,
        seleccionado: false,
        cantidadPiscinas: 0
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

    // Update display properties
    this.dayNumber = dia.fecha.getDate();
    this.dayShort = this.diaHoy.substring(0, 3).toUpperCase();
    this.isToday = this.esMismaFecha(this.fechaSeleccionada, this.fechaActual);

    // Recargar clientes para el día seleccionado
    this.cargarClientesDelDia();

    
  }

  cambiarMes(direccion: number) {
    this.mesVista.setMonth(this.mesVista.getMonth() + direccion);
    this.mesSeleccionado = this.mesVista.getMonth();
    this.generarCalendario();
    this.actualizarEventosCalendario();
  }

  cambiarMesSeleccionado() {
    this.mesVista.setMonth(this.mesSeleccionado);
    this.generarCalendario();
    this.actualizarEventosCalendario();
  }

  async mostrarSelectorMes() {
    const buttons = this.meses.map(mes => ({
      text: mes.nombre,
      handler: () => {
        this.mesSeleccionado = mes.value;
        this.cambiarMesSeleccionado();
      }
    }));

    const actionSheet = await this.actionSheetController.create({
      header: 'Seleccionar Mes',
      buttons: [
        ...buttons,
        {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }


  actualizarEventosCalendario() {
    // Obtener todos los clientes
    this.clienteService.getClientes().subscribe({
      next: (clientes) => {
        // Para cada día del mes actual en diasDelMes
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        this.diasDelMes.forEach(dia => {
          if (dia.numero === 0) return; // Skip empty cells

          const fechaDia = new Date(dia.fecha);
          fechaDia.setHours(0, 0, 0, 0);
          const diaSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][fechaDia.getDay()];

          // Contar clientes con mantenimiento programado para este día y pendiente
          let count = 0;
          clientes.forEach(cliente => {
            if (!cliente.activo || !cliente.programacion) return;
            const diasProgramados = cliente.programacion.diasSemana || [];
            if (!diasProgramados.includes(diaSemana)) return;
            // Verificar si no hay historial para esta fecha (mantenimiento pendiente)
            const fechaStr = fechaDia.toISOString().split('T')[0];
            const hasHistorial = cliente.historial.some(h => h.fecha === fechaStr);
            if (!hasHistorial && fechaDia >= hoy) {
              count++;
            }
          });

          dia.cantidadPiscinas = Math.min(count, 3); // Cap at 3
        });
      },
      error: (err) => {
        console.error('Error al cargar eventos del calendario:', err);
      }
    });
  }

  cargarClientesDelDia() {
    this.isLoading = true;
    
    this.clienteService.getClientes().subscribe({
      next: (clientes) => {
        console.log('Clientes cargados:', clientes);
        console.log('Día seleccionado:', this.diaHoy);
        
        // Fecha seleccionada en formato string
        const fechaSeleccionadaStr = this.fechaSeleccionada.toISOString().split('T')[0];

        // Filtrar clientes que tienen mantenimiento en el día seleccionado y no han sido completados o marcados como saltados
        const clientesDelDia = clientes.filter(cliente => {
          if (!cliente.activo || !cliente.programacion) {
            return false;
          }

          const diasProgramados = cliente.programacion.diasSemana || [];
          const tieneMantenimientoHoy = diasProgramados.includes(this.diaHoy);

          // Verificar que no haya un registro de mantenimiento para el día seleccionado
          const yaCompletado = (cliente.historial || []).some(h => h.fecha === fechaSeleccionadaStr && h.estadoCloro !== 'saltada');

          // Verificar marcados como saltados mediante historial o skippedDates
          const estaSaltadoHist = (cliente.historial || []).some(h => h.fecha === fechaSeleccionadaStr && (h.estadoCloro === 'saltada' || (h.servicio && h.servicio.toLowerCase().includes('saltada'))));
          const estaSaltadoArray = (cliente as any).skippedDates ? (cliente as any).skippedDates.includes(fechaSeleccionadaStr) : false;

          const estaSaltado = estaSaltadoHist || estaSaltadoArray;

          return tieneMantenimientoHoy && !yaCompletado && !estaSaltado;
        });

        // Convertir a formato ClienteDelDia
        this.clientesPendientes = clientesDelDia.map(cliente => ({
          id: cliente.id || '',
          nombre: cliente.nombre,
          direccion: cliente.direccion,
          telefono: cliente.telefono,
          horaPreferida: cliente.programacion?.horaPreferida || 'Sin horario específico',
          precio: cliente.precio || 0, // Agregamos el precio
          realizado: false
        }));

        // Cargar clientes realizados (que tienen historial para el día seleccionado)
        this.clientesRealizados = clientes.filter(cliente => {
          return cliente.historial.some(h => h.fecha === fechaSeleccionadaStr);
        }).map(cliente => {
          const historialDia = cliente.historial.find(h => h.fecha === fechaSeleccionadaStr);
          return {
            id: cliente.id || '',
            nombre: cliente.nombre,
            direccion: cliente.direccion,
            telefono: cliente.telefono,
            horaPreferida: cliente.programacion?.horaPreferida || 'Sin horario específico',
            precio: cliente.precio || 0,
            realizado: true,
            mantenimiento: historialDia ? {
              estadoCloro: historialDia.estadoCloro || '',
              estadoPh: historialDia.estadoPh || '',
              cantidadCloro: historialDia.cantidadCloro || 0,
              cantidadPh: (historialDia.cantidadBajaPh || 0) + (historialDia.cantidadSubePh || 0),
              fecha: fechaSeleccionadaStr,
              hora: historialDia.hora || ''
            } : undefined
          };
        });

        this.maintenanceCount = this.clientesPendientes.length;
        this.maintenanceWord = this.maintenanceCount === 1 ? 'mantención' : 'mantenciones';

        // Calcular clientes borrados (saltados) para la fecha seleccionada
        const fechaSeleccionadaStrLocal = fechaSeleccionadaStr; // alias local
        this.deletedClientsList = clientes.filter(c => {
          const saltadoHist = (c.historial || []).some(h => h.fecha === fechaSeleccionadaStrLocal && (h.estadoCloro === 'saltada' || (h.servicio && h.servicio.toLowerCase().includes('saltada'))));
          const saltadoArr = (c as any).skippedDates ? (c as any).skippedDates.includes(fechaSeleccionadaStrLocal) : false;
          return saltadoHist || saltadoArr;
        }).map(c => ({ id: c.id || '', nombre: c.nombre }));
        this.deletedTodayCount = this.deletedClientsList.length;
        console.log('Deleted clients computed:', this.deletedTodayCount, this.deletedClientsList);
        console.log('Deleted clients computed:', this.deletedTodayCount, this.deletedClientsList);

        this.calcularProgreso();
        this.actualizarEventosCalendario();
        this.isLoading = false;

        console.log('Clientes para el día seleccionado:', this.clientesPendientes);
        console.log('Clientes borrados para la fecha:', this.deletedClientsList);
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
    // Primero mostramos un alert para seleccionar el estado del cloro
    const alertCloro = await this.alertController.create({
      header: 'Mantención de Piscina',
      subHeader: `Cliente: ${cliente.nombre}`,
      message: 'Selecciona el estado actual del cloro:',
      inputs: [
        {
          name: 'bajo',
          type: 'radio',
          label: 'Bajo: < 1.0 ppm',
          value: 'bajo'
        },
        {
          name: 'ideal_bajo',
          type: 'radio',
          label: 'Ideal Bajo: 1.0 - 1.4 ppm',
          value: 'ideal bajo'
        },
        {
          name: 'ideal',
          type: 'radio',
          label: 'Ideal: 1.5 - 2.0 ppm',
          value: 'ideal',
          checked: true
        },
        {
          name: 'ideal_alto',
          type: 'radio',
          label: 'Ideal Alto: 2.1 - 3.0 ppm',
          value: 'ideal alto'
        },
        {
          name: 'alto',
          type: 'radio',
          label: 'Alto: > 3.0 ppm',
          value: 'alto'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Siguiente',
          handler: (estadoCloro) => {
            this.mostrarAlertPh(cliente, estadoCloro);
          }
        }
      ]
    });

    await alertCloro.present();
  }

  async mostrarAlertPh(cliente: ClienteDelDia, estadoCloro: string) {
    // Luego mostramos un alert para seleccionar el estado del pH
    const alertPh = await this.alertController.create({
      header: 'Mantención de Piscina',
      subHeader: `Cliente: ${cliente.nombre}`,
      message: 'Selecciona el estado actual del pH:',
      inputs: [
        {
          name: 'bajo',
          type: 'radio',
          label: 'Bajo: < 7.2',
          value: 'bajo'
        },
        {
          name: 'ideal_bajo',
          type: 'radio',
          label: 'Ideal Bajo: 7.2 - 7.3',
          value: 'ideal bajo'
        },
        {
          name: 'ideal',
          type: 'radio',
          label: 'Ideal: 7.4 - 7.6',
          value: 'ideal',
          checked: true
        },
        {
          name: 'ideal_alto',
          type: 'radio',
          label: 'Ideal Alto: 7.7 - 7.8',
          value: 'ideal alto'
        },
        {
          name: 'alto',
          type: 'radio',
          label: 'Alto: > 7.8',
          value: 'alto'
        }
      ],
      buttons: [
        {
          text: 'Atrás',
          handler: () => {
            this.marcarRealizado(cliente);
          }
        },
        {
          text: 'Siguiente',
          handler: (estadoPh) => {
            this.mostrarAlertCantidades(cliente, estadoCloro, estadoPh);
          }
        }
      ]
    });

    await alertPh.present();
  }

  async mostrarAlertCantidades(cliente: ClienteDelDia, estadoCloro: string, estadoPh: string) {
    // Finalmente mostramos un alert para ingresar las cantidades
    const alertCantidades = await this.alertController.create({
      header: 'Mantención de Piscina',
      subHeader: `Cliente: ${cliente.nombre}`,
      message: 'Ingresa las cantidades:',
      inputs: [
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
          text: 'Atrás',
          handler: () => {
            this.mostrarAlertPh(cliente, estadoCloro);
          }
        },
        {
          text: 'Completar Mantención',
          cssClass: 'primary',
          handler: (data) => {
            // Combinamos los datos de los tres alerts
            const datosCompletos = {
              estadoCloro: estadoCloro,
              estadoPh: estadoPh,
              cantidadCloro: data.cantidadCloro,
              cantidadPh: data.cantidadPh
            };
            return this.completarMantenimiento(cliente, datosCompletos);
          }
        }
      ]
    });

    await alertCantidades.present();
  }

  completarMantenimiento(cliente: ClienteDelDia, data: any): boolean {
    // Validar que se hayan llenado los campos obligatorios
    if (!data.estadoCloro || !data.estadoPh) {
      this.showToast('Por favor, completa el estado del cloro y pH ❌', 'danger');
      return false;
    }

    // Convertir a números y validar que no sean negativos
    const cantidadCloro = parseFloat(data.cantidadCloro) || 0;
    const cantidadPh = parseFloat(data.cantidadPh) || 0;
    
    if (cantidadCloro < 0 || cantidadPh < 0) {
      this.showToast('Las cantidades no pueden ser negativas ❌', 'danger');
      return false;
    }

    // Crear registro de mantenimiento
    const ahora = new Date();
    cliente.mantenimiento = {
      estadoCloro: data.estadoCloro,
      estadoPh: data.estadoPh,
      cantidadCloro: cantidadCloro,
      cantidadPh: cantidadPh,
      fecha: this.fechaSeleccionada.toISOString().split('T')[0],
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

    // Determinar el tipo de ajuste de pH basado en el estado seleccionado
    let cantidadSubePh = 0;
    let cantidadBajaPh = 0;
    let tipoPh: 'Sube pH' | 'Baja pH' | undefined;

    const estadoPh = cliente.mantenimiento.estadoPh;
    const cantidadPh = cliente.mantenimiento.cantidadPh;

    if (estadoPh === 'bajo' || estadoPh === 'ideal_bajo') {
      cantidadSubePh = cantidadPh;
      tipoPh = 'Sube pH';
    } else if (estadoPh === 'alto' || estadoPh === 'ideal_alto') {
      cantidadBajaPh = cantidadPh;
      tipoPh = 'Baja pH';
    }
    // Si es 'ideal', no se asigna cantidad ni tipo

    this.clienteService.getClienteById(cliente.id).subscribe({
      next: (clienteCompleto) => {
        const nuevoRegistro = {
          fecha: cliente.mantenimiento!.fecha,
          servicio: `Mantención ${this.getServicioTipo(clienteCompleto.programacion?.frecuencia || 'semanal')}`,
          cloro: cliente.mantenimiento!.cantidadCloro,
          ph: cliente.mantenimiento!.cantidadPh,
          cantidadCloro: cliente.mantenimiento!.cantidadCloro,
          cantidadSubePh: cantidadSubePh,
          cantidadBajaPh: cantidadBajaPh,
          tipoPh: tipoPh,
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

            // Remover la entrada del historial para la fecha seleccionada
            this.removeHistorialEntry(cliente.id, this.fechaSeleccionada.toISOString().split('T')[0]);

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

  // Método para borrar una mantención pendiente
  async borrarMantenimiento(cliente: ClienteDelDia) {
    const alert = await this.alertController.create({
      header: 'Borrar Mantención',
      message: `¿Estás seguro de que quieres borrar la mantención de ${cliente.nombre} para hoy?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Borrar',
          cssClass: 'danger',
          handler: () => {
            // Actualizar UI inmediatamente para evitar que se vea el cliente re-aparecer
            this.clientesPendientes = this.clientesPendientes.filter(c => c.id !== cliente.id);
            // Añadir al contador local y lista de borrados
            this.deletedClientsList.push({ id: cliente.id, nombre: cliente.nombre });
            this.deletedTodayCount = this.deletedClientsList.length;

            this.maintenanceCount = this.clientesPendientes.length;
            this.maintenanceWord = this.maintenanceCount === 1 ? 'mantención' : 'mantenciones';
            this.calcularProgreso();
            this.actualizarEventosCalendario();

            // Luego persistir como registro saltado en la base de datos (si falla, revertimos)
            
            this.agregarRegistroSaltado(cliente);

            this.showToast(`Mantención de ${cliente.nombre} borrada ❌`, 'danger');
          }
        }
      ]
    });

    await alert.present();
  }

  removeHistorialEntry(clienteId: string, fecha: string) {
    this.clienteService.getClienteById(clienteId).subscribe({
      next: (clienteCompleto) => {
        if (clienteCompleto.historial) {
          clienteCompleto.historial = clienteCompleto.historial.filter(h => h.fecha !== fecha);
        }

        this.clienteService.updateCliente(clienteCompleto).subscribe({
          next: () => {
            console.log('Entrada del historial removida para cliente:', clienteId, 'fecha:', fecha);
          },
          error: (err) => {
            console.error('Error al remover entrada del historial:', err);
          }
        });
      },
      error: (err) => {
        console.error('Error al obtener cliente completo para remover historial:', err);
      }
    });
  }

  agregarRegistroSaltado(cliente: ClienteDelDia) {
    const fechaSeleccionadaStr = this.fechaSeleccionada.toISOString().split('T')[0];
    const ahora = new Date();

    this.clienteService.getClienteById(cliente.id).subscribe({
      next: (clienteCompleto) => {
        const nuevoRegistro = {
          fecha: fechaSeleccionadaStr,
          servicio: `Mantención ${this.getServicioTipo(clienteCompleto.programacion?.frecuencia || 'semanal')} - Saltada`,
          cloro: 0,
          ph: 0,
          cantidadCloro: 0,
          cantidadSubePh: 0,
          cantidadBajaPh: 0,
          cantidadPastillas: 0,
          tipoPh: undefined,
          estadoCloro: 'saltada',
          estadoPh: 'saltada',
          hora: ahora.toTimeString().split(' ')[0].substring(0, 5)
        };

        clienteCompleto.historial = clienteCompleto.historial || [];
        // Añadir al inicio para que sea el más reciente
        clienteCompleto.historial.unshift(nuevoRegistro);

        // Marca explícita para evitar reaparición — array de fechas marcadas como saltadas
        (clienteCompleto as any).skippedDates = (clienteCompleto as any).skippedDates || [];
        if (!(clienteCompleto as any).skippedDates.includes(fechaSeleccionadaStr)) {
          (clienteCompleto as any).skippedDates.push(fechaSeleccionadaStr);
        }

        this.clienteService.updateCliente(clienteCompleto).subscribe({
          next: () => {
            console.log('Registro de mantención saltada agregado para cliente:', cliente.nombre);
            // Verificar en DB que skippedDates fue persistido
            this.clienteService.getClienteById(cliente.id).subscribe({
              next: (verif) => console.log(`Verificación DB skippedDates para ${cliente.nombre}:`, (verif as any).skippedDates || []),
              error: (vErr) => console.error('Error verificando skippedDates en DB:', vErr)
            });

            // Recargar clientes para aplicar filtro y actualizar contador de borrados
            this.cargarClientesDelDia();
            this.showToast(`Mantención de ${cliente.nombre} marcada como borrada ❌`, 'danger');
          },
          error: (err) => {
            console.error('Error al agregar registro saltado:', err);
            // Revertir cambio local si falla la persistencia
            this.deletedClientsList = this.deletedClientsList.filter(d => d.id !== cliente.id);
            this.deletedTodayCount = this.deletedClientsList.length;
            // Re-agregar el cliente a pendientes para que vuelva a mostrarse en UI
            this.clientesPendientes.push(cliente);
            this.maintenanceCount = this.clientesPendientes.length;
            this.maintenanceWord = this.maintenanceCount === 1 ? 'mantención' : 'mantenciones';
            this.calcularProgreso();
            this.actualizarEventosCalendario();
            this.showToast('Error al marcar mantención como borrada', 'danger');
          }
        });
      },
      error: (err) => {
        console.error('Error al obtener cliente completo para registro saltado:', err);
      }
    });
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

    // Extraer la hora del string (manejar diferentes formatos)
    let horaFormateada = hora;

    // Si es un string ISO completo, extraer solo la hora
    if (hora.includes('T')) {
      try {
        const fecha = new Date(hora);
        horaFormateada = fecha.toTimeString().split(' ')[0].substring(0, 5); // HH:mm
      } catch (e) {
        // Si falla el parseo, usar el string original
        horaFormateada = hora;
      }
    }

    // Obtener la fecha actual en formato DD/MM/AAAA
    const today = new Date();
    const dia = today.getDate().toString().padStart(2, '0');
    const mes = (today.getMonth() + 1).toString().padStart(2, '0');
    const anio = today.getFullYear();
    const fechaFormateada = `${dia}/${mes}/${anio}`;

    return `${fechaFormateada} a las ${horaFormateada}`;
  }
}