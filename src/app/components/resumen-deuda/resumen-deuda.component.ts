import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cashOutline, logoWhatsapp, chevronDownOutline, chevronUpOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { esMantencionPagada } from '../../utils/mantencion';

addIcons({
  'cash-outline': cashOutline,
  'logo-whatsapp': logoWhatsapp,
  'chevron-down-outline': chevronDownOutline,
  'chevron-up-outline': chevronUpOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
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
  // Solo depende de sus @Input y de su propio estado: no necesita re-renderizarse
  // cuando el padre hace cualquier otra cosa.
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon
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
    const mantencionesPendientes = this.mantenciones.filter(m => !esMantencionPagada(m) && !m.suspendida);
    const totalPendiente = mantencionesPendientes.reduce((sum, m) => sum + (m.precio || 0), 0);

    this.resumenDeuda = {
      totalPendiente,
      cantidadPendientes: mantencionesPendientes.length,
      clienteNombre: this.clienteNombre,
      clienteTelefono: this.clienteTelefono,
      mantencionesPendientes
    };
  }

  private readonly currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  });

  formatearPrecio(precio: number): string {
    return this.currencyFormatter.format(precio);
  }

  /** "mar 14 oct" a partir de "2026-10-14" (sin desfase de zona horaria) */
  formatearFecha(fecha: string): string {
    const [a, m, d] = String(fecha || '').split('-').map(Number);
    if (!a || !m || !d) return fecha || '';
    return new Date(a, m - 1, d).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
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
    
    lines.push('*🧾 Servicios Pendientes de pago:*');
    lines.push(`${this.resumenDeuda.cantidadPendientes} servicio(s)`);
    lines.push('');

    if (this.resumenDeuda.mantencionesPendientes.length > 0) {
      lines.push('*📋 Detalle de mantenciones:*');
      this.resumenDeuda.mantencionesPendientes.forEach((mantencion, index) => {
        // "2026-10-14" con new Date() se lee en UTC y en Chile quedaba un día antes
        const [an, me, di] = String(mantencion.fecha || '').split('-').map(Number);
        const fecha = an ? new Date(an, me - 1, di).toLocaleDateString('es-CL') : mantencion.fecha;
        lines.push(`${index + 1}. ${fecha} - ${this.formatearPrecio(mantencion.precio)}`);
      });
      lines.push('');
    }

    lines.push('*💰 Total pendiente:*');
    lines.push(this.formatearPrecio(this.resumenDeuda.totalPendiente));
    lines.push('');

    lines.push('¿Te gustaría coordinar el pago de estas mantenciones?');
    lines.push('\n*Gracias por tu preferencia!* 🏊‍♂️');

    const text = encodeURIComponent(lines.join('\n'));
    const phone = this.resumenDeuda.clienteTelefono.replace(/[^+0-9]/g, '');
    const url = `https://wa.me/${phone}?text=${text}`;
    window.open(url, '_blank');
  }
}
