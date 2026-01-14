import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonButton } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline } from 'ionicons/icons';
import { logoWhatsapp } from 'ionicons/icons';

addIcons({
  'checkmark-circle-outline': checkmarkCircleOutline
  , 'logo-whatsapp': logoWhatsapp
});

@Component({
  selector: 'app-mantenimiento-exitoso',
  templateUrl: './mantenimiento-exitoso.page.html',
  styleUrls: ['./mantenimiento-exitoso.page.scss'],
  standalone: true,
  imports: [IonIcon, IonButton, CommonModule, FormsModule]
})
export class MantenimientoExitosoPage implements OnInit {

  cliente: any = null;
  mantencion: any = null;

  constructor(private router: Router) {
    // intentar leer estado de navegación
    const navState: any = history.state || {};
    if (navState && (navState.cliente || navState.mantencion)) {
      this.cliente = navState.cliente || null;
      this.mantencion = navState.mantencion || null;
    }
  }

  ngOnInit() {
    // Do not auto-navigate; show buttons for user actions
  }

  volverHome() {
    this.router.navigate(['/tabs/home']);
  }

  enviarWhatsApp() {
    const telefono = this.cliente?.telefono || this.cliente?.telefonoPrincipal || '';
    if (!telefono) {
      window.alert('No se encontró número de teléfono del cliente');
      return;
    }

    const lines: string[] = [];
    lines.push(`Hola ${this.cliente?.nombre || ''}, te envío los detalles de la mantención:`);
    if (this.mantencion) {
      lines.push(`Fecha: ${this.mantencion.fecha}${this.mantencion.hora ? ' ' + this.mantencion.hora : ''}`);

      const cloroMedido = this.mantencion.cloro !== undefined ? this.mantencion.cloro : '';
      const cantidadCloro = (this.mantencion.cantidadCloro !== undefined && this.mantencion.cantidadCloro !== null) ? `, Cloro usado: ${this.mantencion.cantidadCloro}g` : '';
      lines.push(`Cloro: ${this.mantencion.estadoCloro}`);

      const phMedido = this.mantencion.ph !== undefined ? this.mantencion.ph : '';
      const ajustesPh: string[] = [];
      if (this.mantencion.cantidadSubePh !== undefined && this.mantencion.cantidadSubePh !== null) ajustesPh.push(`Sube pH: ${this.mantencion.cantidadSubePh}g`);
      if (this.mantencion.cantidadBajaPh !== undefined && this.mantencion.cantidadBajaPh !== null) ajustesPh.push(`Baja pH: ${this.mantencion.cantidadBajaPh}g`);
      lines.push(`pH: ${this.mantencion.estadoPh}`);

      const quimicos: string[] = [];
      if (this.mantencion.cantidadCloro !== undefined && this.mantencion.cantidadCloro !== null) quimicos.push(`Cloro: ${this.mantencion.cantidadCloro}g`);
      if (this.mantencion.cantidadSubePh !== undefined && this.mantencion.cantidadSubePh !== null) quimicos.push(`Sube pH: ${this.mantencion.cantidadSubePh}g`);
      if (this.mantencion.cantidadBajaPh !== undefined && this.mantencion.cantidadBajaPh !== null) quimicos.push(`Baja pH: ${this.mantencion.cantidadBajaPh}g`);
      if (this.mantencion.cantidadPastillas !== undefined && this.mantencion.cantidadPastillas !== null) quimicos.push(`Pastillas: ${this.mantencion.cantidadPastillas}`);
      if (quimicos.length) lines.push(`Químicos usados: ${quimicos.join(', ')}`);
    }

    if (this.cliente?.precio) {
      lines.push(`Valor mantención: ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(this.cliente.precio)}`);
    }

    const text = encodeURIComponent(lines.join('\n'));
    const phone = telefono.replace(/[^+0-9]/g, '');
    const url = `https://wa.me/${phone}?text=${text}`;
    window.open(url, '_blank');
  }

}
