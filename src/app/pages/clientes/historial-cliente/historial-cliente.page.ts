import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonSpinner, IonIcon, AlertController, ToastController } from '@ionic/angular/standalone';
import { ActivatedRoute } from '@angular/router';
import { ClienteService, Cliente } from '../../../services/cliente.service';
import { addIcons } from 'ionicons';
import { timeOutline, constructOutline, beakerOutline, flaskOutline, cashOutline, trashOutline, logoWhatsapp } from 'ionicons/icons';
import { HistorialMantencionesComponent } from '../../../components/historial-mantenciones/historial-mantenciones.component';
import { ResumenDeudaComponent } from '../../../components/resumen-deuda/resumen-deuda.component';

addIcons({
  'time-outline': timeOutline,
  'construct-outline': constructOutline,
  'beaker-outline': beakerOutline,
  'flask-outline': flaskOutline,
  'cash-outline': cashOutline,
  'trash-outline': trashOutline,
  'logo-whatsapp': logoWhatsapp,
});

@Component({
  selector: 'app-historial-cliente',
  templateUrl: './historial-cliente.page.html',
  styleUrls: ['./historial-cliente.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton,
    IonSpinner, IonIcon,
    HistorialMantencionesComponent,
    ResumenDeudaComponent,
    CommonModule, FormsModule
  ]
})
export class HistorialClientePage implements OnInit {
  clienteId!: string;
  cliente?: Cliente;
  isLoading = true;
  error?: string;
  historialOrdenado: Cliente['historial'] = [];

  constructor(
    private route: ActivatedRoute,
    private clienteService: ClienteService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  enviarWhatsApp(item: any) {
    if (!this.cliente) {
      this.mostrarToast('No se encontró información del cliente');
      return;
    }

    const telefono = this.cliente.telefono || '';
    if (!telefono) {
      this.mostrarToast('Cliente no tiene teléfono registrado');
      return;
    }

    const lines: string[] = [];
    lines.push('*Detalles de la Mantención de Piscina 🏊‍♂️*\n');
    lines.push(`Hola ${this.cliente.nombre || ''},`);
    lines.push('te envío el resumen de la mantención realizada:\n');
    
    // Fecha y hora
    lines.push('*📅 Fecha: ' + (item.fecha || '') + '*');
    if (item.hora) {
      lines.push('*🕒 Hora: ' + item.hora + '*');
    }
    lines.push('');
    
    // Parámetros del agua
    lines.push('*🧪 Parámetros del agua:*');
    lines.push('• Cloro: ' + (item.estadoCloro || ''));
    lines.push('• pH: ' + (item.estadoPh || ''));
    lines.push('');
    
    // Químicos utilizados
    lines.push('*🧴 Químicos utilizados:*');
    if (item.cantidadCloro !== undefined && item.cantidadCloro !== null) {
      lines.push('• Cloro: ' + item.cantidadCloro + ' g');
    }
    if (item.cantidadSubePh !== undefined && item.cantidadSubePh !== null) {
      lines.push('• Sube pH: ' + item.cantidadSubePh + ' g');
    }
    if (item.cantidadBajaPh !== undefined && item.cantidadBajaPh !== null) {
      lines.push('• Baja pH: ' + item.cantidadBajaPh + ' g');
    }
    if (item.cantidadPastillas !== undefined && item.cantidadPastillas !== null) {
      lines.push('• Pastillas: ' + item.cantidadPastillas + ' unidad(es)');
    }
    lines.push('');
    
    // Estado de la piscina
    if (item.piscinarLlenando || item.horaCorte) {
      lines.push('*🚰 Estado de la piscina:*');
      if (item.piscinarLlenando) {
        lines.push('• Piscina llenando');
      }
      if (item.horaCorte) {
        lines.push('• ⛔ Cortar agua a las ' + item.horaCorte + ' hrs');
      }
      lines.push('');
    }
    
    // Notas adicionales
    if (item.notas && item.notas.trim()) {
      lines.push('*📝 Notas:*');
      lines.push('• ' + item.notas);
      lines.push('');
    }

    // Valor
    if (this.cliente.precio) {
      lines.push('*💰 Valor de la mantención:*');
      lines.push('$' + new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0 }).format(this.cliente.precio));
    }

    const text = encodeURIComponent(lines.join('\n'));
    const phone = telefono.replace(/[^+0-9]/g, '');
    const url = `https://wa.me/${phone}?text=${text}`;
    window.open(url, '_blank');
  }

  ngOnInit() {
    this.clienteId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.clienteId) {
      this.error = 'ID de cliente no proporcionado';
      this.isLoading = false;
      return;
    }

    this.clienteService.getClienteById(this.clienteId).subscribe({
      next: (cliente) => {
        this.cliente = cliente;
        this.historialOrdenado = this.ordenarHistorial(cliente.historial || []);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando cliente:', err);
        this.error = 'No se pudo cargar el historial del cliente';
        this.isLoading = false;
      }
    });
  }

  // Método para transformar los datos del historial al formato esperado por el componente
  transformarHistorialParaComponente(historial: any[]): any[] {
    return historial.map(item => ({
      id: `${item.fecha}_${item.hora || '00:00'}`,
      clienteId: this.clienteId || '',
      clienteNombre: this.cliente?.nombre || 'Cliente',
      precio: this.cliente?.precio || 0,
      fecha: item.fecha,
      servicio: item.servicio || 'Mantenimiento',
      cloro: item.cloro || 0,
      ph: item.ph || 0,
      cantidadCloro: item.cantidadCloro,
      cantidadBajaPh: item.cantidadBajaPh,
      cantidadSubePh: item.cantidadSubePh,
      cantidadPastillas: item.cantidadPastillas,
      hora: item.hora,
      pagado: item.pagado || false
    }));
  }

  // Métodos para manejar eventos del componente
  verDetalleMantencion(mantencion: any): void {
    console.log('Ver detalle de mantención:', mantencion);
  }

  togglePago(event: {mantencion: any, evento: Event}): void {
    const mantencion = event.mantencion;
    console.log('Toggle pago:', mantencion);
    
    if (mantencion.pagado) {
      this.confirmarDeshacerPago(mantencion);
    } else {
      this.confirmarPago(mantencion);
    }
  }

  borrarMantencion(event: {mantencion: any, evento: Event}): void {
    const mantencion = event.mantencion;
    console.log('Borrar mantención:', mantencion);
    this.confirmarBorrado(mantencion);
  }

  // Métodos de confirmación
  async confirmarPago(mantencion: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar pago',
      message: `¿Marcar como pagado el servicio para ${mantencion.clienteNombre} del ${new Date(mantencion.fecha).toLocaleDateString('es-CL')}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Marcar pago', handler: () => this.marcarPago(mantencion) }
      ]
    });

    await alert.present();
  }

  async confirmarDeshacerPago(mantencion: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar deshacer pago',
      message: `¿Deshacer pago del servicio para ${mantencion.clienteNombre} del ${new Date(mantencion.fecha).toLocaleDateString('es-CL')}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Deshacer pago', handler: () => this.deshacerPago(mantencion) }
      ]
    });

    await alert.present();
  }

  async confirmarBorrado(mantencion: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar borrado',
      message: `¿Está seguro que desea borrar el registro de mantención para ${mantencion.clienteNombre} del ${new Date(mantencion.fecha).toLocaleDateString('es-CL')}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Borrar',
          role: 'destructive',
          handler: () => {
            this.borrarRegistroHistorial(mantencion);
          }
        }
      ]
    });

    await alert.present();
  }

  // Métodos de operación con refresco completo
  marcarPago(mantencion: any) {
    this.clienteService.marcarPagoHistorial(this.clienteId, mantencion.fecha, mantencion.hora || '00:00').subscribe({
      next: () => {
        this.mostrarToast('Pago registrado correctamente');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      },
      error: (err) => {
        console.error('Error marcando pago:', err);
        this.mostrarToast('Error al registrar pago');
      }
    });
  }

  deshacerPago(mantencion: any) {
    this.clienteService.deshacerPagoHistorial(this.clienteId, mantencion.fecha, mantencion.hora || '00:00').subscribe({
      next: () => {
        this.mostrarToast('Pago deshecho correctamente');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      },
      error: (err) => {
        console.error('Error deshaciendo pago:', err);
        this.mostrarToast('Error al deshacer pago');
      }
    });
  }

  borrarRegistroHistorial(mantencion: any) {
    this.clienteService.borrarRegistroHistorial(this.clienteId, mantencion.fecha, mantencion.hora || '00:00').subscribe({
      next: () => {
        this.mostrarToast('Registro eliminado correctamente');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      },
      error: (error) => {
        console.error('Error al borrar el registro:', error);
        this.mostrarToast('Error al eliminar el registro');
      }
    });
  }

  async mostrarToast(mensaje: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  private ordenarHistorial(historial: Cliente['historial']): Cliente['historial'] {
    // Ordenar del más nuevo al más antiguo
    return [...historial].sort((a, b) => this.getTime(b) - this.getTime(a));
  }

  private getTime(item: { fecha?: string; hora?: string }): number {
    const fecha = (item.fecha || '').trim();
    const hora = (item.hora || '00:00').trim();

    if (!fecha) return 0;

    // Soporta formatos: YYYY-MM-DD, DD/MM/YYYY y DD-MM-YYYY
    let isoDate = fecha;
    if (fecha.includes('/')) {
      const [d, m, y] = fecha.split('/');
      if (d && m && y) isoDate = `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else if (fecha.includes('-')) {
      const [a, b, c] = fecha.split('-');
      if (a && b && c) {
        if (a.length === 4) {
          isoDate = fecha; // YYYY-MM-DD
        } else {
          isoDate = `${c.padStart(4, '0')}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`; // DD-MM-YYYY -> YYYY-MM-DD
        }
      }
    }

    const time = hora.length === 5 ? `${hora}:00` : hora; // asegurar HH:mm:ss
    const dateStr = `${isoDate}T${time}`;
    const t = Date.parse(dateStr);
    return isNaN(t) ? 0 : t;
  }

  // Helper para usar en el template en lugar de Math.abs
  abs(value: number | null | undefined): number {
    return Math.abs(Number(value) || 0);
  }
}
