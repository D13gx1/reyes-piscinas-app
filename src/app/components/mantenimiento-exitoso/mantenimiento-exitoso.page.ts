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
    lines.push('*Detalles de la Mantención de Piscina 🏊‍♂️*\n');
    lines.push(`Hola ${this.cliente?.nombre || ''},`);
    lines.push('te envío el resumen de la mantención realizada:\n');
    
    if (this.mantencion) {
      // Fecha y hora (formato DD/MM/YYYY)
      if (this.mantencion?.fecha) {
        const fechaRaw = this.mantencion.fecha;
        let fechaStr = '';
        const fechaDate = new Date(fechaRaw);
        if (!isNaN(fechaDate.getTime())) {
          fechaStr = ('0' + fechaDate.getDate()).slice(-2) + '/' + ('0' + (fechaDate.getMonth() + 1)).slice(-2) + '/' + fechaDate.getFullYear();
        } else {
          fechaStr = String(fechaRaw);
        }
        lines.push('*Fecha: ' + fechaStr + '*');
      } else {
        lines.push('*Fecha: ' + '' + '*');
      }
      if (this.mantencion.hora) {
        lines.push('*Hora: ' + this.mantencion.hora + '*');
      }
      lines.push('');
      
      // Parámetros del agua
      lines.push('*Parámetros del agua:*');
      lines.push('• Cloro: ' + (this.mantencion.estadoCloro || ''));
      lines.push('• pH: ' + (this.mantencion.estadoPh || ''));
      lines.push('');
      
      // Químicos utilizados
      lines.push('*Químicos utilizados:*');
      if (this.mantencion.cantidadCloro !== undefined && this.mantencion.cantidadCloro !== null) {
        lines.push('• Cloro: ' + this.mantencion.cantidadCloro + ' g');
      }
      if (this.mantencion.cantidadSubePh !== undefined && this.mantencion.cantidadSubePh !== null) {
        lines.push('• Sube pH: ' + this.mantencion.cantidadSubePh + ' g');
      }
      if (this.mantencion.cantidadBajaPh !== undefined && this.mantencion.cantidadBajaPh !== null) {
        lines.push('• Baja pH: ' + this.mantencion.cantidadBajaPh + ' g');
      }
      if (this.mantencion.cantidadPastillas !== undefined && this.mantencion.cantidadPastillas !== null) {
        lines.push('• Pastillas: ' + this.mantencion.cantidadPastillas + ' unidad(es)');
      }
      lines.push('');
      
      // Estado de la piscina
      if (this.mantencion.piscinarLlenando || this.mantencion.horaCorte) {
        lines.push('*Estado de la piscina:*');
        if (this.mantencion.piscinarLlenando) {
          lines.push('• Piscina llenando');
        }
        if (this.mantencion.horaCorte) {
          lines.push('• Cortar agua a las ' + this.mantencion.horaCorte + ' hrs');
        }
        lines.push('');
      }
      
      // Notas adicionales
      if (this.mantencion.notas && this.mantencion.notas.trim()) {
        lines.push('* Notas:*');
        lines.push('• ' + this.mantencion.notas);
        lines.push('');
      }
    }

    // Valor
    if (this.cliente?.precio) {
      lines.push('* Valor de la mantención:*');
      lines.push('$' + new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0 }).format(this.cliente.precio));
    }
    

    const text = encodeURIComponent(lines.join('\n'));
    const phone = telefono.replace(/[^+0-9]/g, '');
    const url = `https://wa.me/${phone}?text=${text}`;
    window.open(url, '_blank');
  }

}
