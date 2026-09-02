import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cashOutline, logoWhatsapp, chevronDownOutline, chevronUpOutline } from 'ionicons/icons';

addIcons({
  'cash-outline': cashOutline,
  'logo-whatsapp': logoWhatsapp,
  'chevron-down-outline': chevronDownOutline,
  'chevron-up-outline': chevronUpOutline,
});

export interface DeudaSummary {
  totalPendiente: number;
  cantidadPendientes: number;
  clienteNombre: string;
  clienteTelefono: string;
  mantencionesPendientes: any[];
}

@Component({
  selector: 'app-resumen-deuda',
  templateUrl: './resumen-deuda.component.html',
  styleUrls: ['./resumen-deuda.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    IonButton
  ]
})
export class ResumenDeudaComponent implements OnChanges {
  @Input() mantenciones: any[] = [];
  @Input() clienteNombre: string = '';
  @Input() clienteTelefono: string = '';

  resumenDeuda: DeudaSummary = {
    totalPendiente: 0,
    cantidadPendientes: 0,
    clienteNombre: '',
    clienteTelefono: '',
    mantencionesPendientes: []
  };

  expandido = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['mantenciones'] || changes['clienteNombre'] || changes['clienteTelefono']) {
      this.calcularResumen();
    }
  }

  toggleExpandido() {
    this.expandido = !this.expandido;
  }

  private calcularResumen() {
    const mantencionesPendientes = this.mantenciones.filter(m => !m.pagado);
    const totalPendiente = mantencionesPendientes.reduce((sum, m) => sum + (m.precio || 0), 0);

    this.resumenDeuda = {
      totalPendiente,
      cantidadPendientes: mantencionesPendientes.length,
      clienteNombre: this.clienteNombre,
      clienteTelefono: this.clienteTelefono,
      mantencionesPendientes
    };
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(precio);
  }

  enviarPorWhatsApp() {
    if (!this.resumenDeuda.clienteTelefono) {
      console.warn('El cliente no tiene teléfono registrado');
      return;
    }

    const lines: string[] = [];
    lines.push('*📊 Resumen de Dinero pendiente*\n');
    lines.push(`Hola ${this.resumenDeuda.clienteNombre},`);
    lines.push('te envío el resumen de tus mantenciones pendientes de pago:\n');
    
    lines.push('*💰 Total pendiente:*');
    lines.push(this.formatearPrecio(this.resumenDeuda.totalPendiente));
    lines.push('');
    
    lines.push('*🧾 Mantenciones sin pagar:*');
    lines.push(`${this.resumenDeuda.cantidadPendientes} servicio(s)`);
    lines.push('');

    if (this.resumenDeuda.mantencionesPendientes.length > 0) {
      lines.push('*📋 Detalle de mantenciones:*');
      this.resumenDeuda.mantencionesPendientes.forEach((mantencion, index) => {
        const fecha = new Date(mantencion.fecha).toLocaleDateString('es-CL');
        lines.push(`${index + 1}. ${fecha} - ${this.formatearPrecio(mantencion.precio)}`);
      });
      lines.push('');
    }

    lines.push('¿Te gustaría coordinar el pago de estas mantenciones?');
    lines.push('\n*Gracias por tu preferencia!* 🏊‍♂️');

    const text = encodeURIComponent(lines.join('\n'));
    const phone = this.resumenDeuda.clienteTelefono.replace(/[^+0-9]/g, '');
    const url = `https://wa.me/${phone}?text=${text}`;
    window.open(url, '_blank');
  }
}
