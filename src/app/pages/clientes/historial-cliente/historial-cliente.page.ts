import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonLabel, IonSpinner, IonBadge, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonChip, IonIcon, IonButton, AlertController, ToastController } from '@ionic/angular/standalone';
import { ActivatedRoute } from '@angular/router';
import { ClienteService, Cliente } from '../../../services/cliente.service';
import { addIcons } from 'ionicons';
import { timeOutline, constructOutline, beakerOutline, flaskOutline, cashOutline, trashOutline, logoWhatsapp } from 'ionicons/icons';

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
    IonButton,
    IonLabel, IonSpinner, IonBadge,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonChip, IonIcon,
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
    private clienteService: ClienteService
    ,
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
    lines.push(`Hola ${this.cliente.nombre || ''}, te envío los detalles de la mantención:`);
    lines.push(`Fecha: ${item.fecha}${item.hora ? ' ' + item.hora : ''}`);

    const cloroMedido = item.cloro !== undefined ? item.cloro : '';
    const cantidadCloro = item.cantidadCloro ? `, Cloro usado: ${item.cantidadCloro}g` : '';
    lines.push(`Cloro: ${item.estadoCloro || cloroMedido}${cantidadCloro}`);

    const phMedido = item.ph !== undefined ? item.ph : '';
    const ajustesPh: string[] = [];
    if (item.cantidadSubePh) ajustesPh.push(`Sube pH: ${item.cantidadSubePh}g`);
    if (item.cantidadBajaPh) ajustesPh.push(`Baja pH: ${item.cantidadBajaPh}g`);
    lines.push(`pH: ${item.estadoPh || phMedido}${ajustesPh.length ? ' (' + ajustesPh.join(', ') + ')' : ''}`);

    const quimicos: string[] = [];
    if (item.cantidadCloro) quimicos.push(`Cloro: ${item.cantidadCloro}g`);
    if (item.cantidadSubePh) quimicos.push(`Sube pH: ${item.cantidadSubePh}g`);
    if (item.cantidadBajaPh) quimicos.push(`Baja pH: ${item.cantidadBajaPh}g`);
    if (item.cantidadPastillas) quimicos.push(`Pastillas: ${item.cantidadPastillas}`);
    if (quimicos.length) lines.push(`Químicos usados: ${quimicos.join(', ')}`);

    if (this.cliente.precio) {
      lines.push(`Valor mantención: ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(this.cliente.precio)}`);
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

  async confirmarBorrado(item: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar borrado',
      message: `¿Está seguro que desea borrar el registro del ${item.fecha}${item.hora ? ' a las ' + item.hora : ''}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Borrar', role: 'destructive', handler: () => this.borrarRegistro(item) }
      ]
    });

    await alert.present();
  }

  borrarRegistro(item: any) {
    if (!this.clienteId) return;
    const hora = item.hora || '00:00';
    this.clienteService.borrarRegistroHistorial(this.clienteId, item.fecha, hora).subscribe({
      next: () => {
        this.clienteService.getClienteById(this.clienteId).subscribe({
          next: (cliente) => {
            this.cliente = cliente;
            this.historialOrdenado = this.ordenarHistorial(cliente.historial || []);
            this.mostrarToast('Registro eliminado correctamente');
          },
          error: (err) => console.error('Error recargando cliente después de borrar:', err)
        });
      },
      error: (err) => {
        console.error('Error borrando registro:', err);
        this.mostrarToast('Error al eliminar registro');
      }
    });
  }

  async confirmarPago(item: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar pago',
      message: `¿Marcar como pagado el servicio del ${item.fecha}${item.hora ? ' a las ' + item.hora : ''}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Marcar pago', handler: () => this.marcarPago(item) }
      ]
    });

    await alert.present();
  }

  marcarPago(item: any) {
    if (!this.clienteId) return;
    const hora = item.hora || '00:00';
    this.clienteService.marcarPagoHistorial(this.clienteId, item.fecha, hora).subscribe({
      next: () => {
        this.clienteService.getClienteById(this.clienteId).subscribe({
          next: (cliente) => {
            this.cliente = cliente;
            this.historialOrdenado = this.ordenarHistorial(cliente.historial || []);
            this.mostrarToast('Pago registrado correctamente');
          },
          error: (err) => {
            console.error('Error recargando cliente:', err);
          }
        });
      },
      error: (err) => {
        console.error('Error marcando pago:', err);
        this.mostrarToast('Error al registrar pago');
      }
    });
  }

  async confirmarDeshacerPago(item: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar deshacer pago',
      message: `¿Deshacer pago del servicio del ${item.fecha}${item.hora ? ' a las ' + item.hora : ''}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Deshacer pago', handler: () => this.deshacerPago(item) }
      ]
    });

    await alert.present();
  }

  deshacerPago(item: any) {
    if (!this.clienteId) return;
    const hora = item.hora || '00:00';
    this.clienteService.deshacerPagoHistorial(this.clienteId, item.fecha, hora).subscribe({
      next: () => {
        this.clienteService.getClienteById(this.clienteId).subscribe({
          next: (cliente) => {
            this.cliente = cliente;
            this.historialOrdenado = this.ordenarHistorial(cliente.historial || []);
            this.mostrarToast('Pago deshecho correctamente');
          },
          error: (err) => {
            console.error('Error recargando cliente:', err);
          }
        });
      },
      error: (err) => {
        console.error('Error deshaciendo pago:', err);
        this.mostrarToast('Error al deshacer pago');
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
