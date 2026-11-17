import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonButton, ToastController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, checkmarkCircle, cashOutline, ellipseOutline } from 'ionicons/icons';
import { logoWhatsapp } from 'ionicons/icons';
import { formatearKgParaTexto, formatearUnidades } from '../../utils/unidades';
import { SERVICIO_MANTENCION } from '../../utils/servicios';
import { ClienteService } from '../../services/cliente.service';
import { quitarPago, registrarPago } from '../../utils/pago-reciente';

addIcons({
  'checkmark-circle-outline': checkmarkCircleOutline,
  'checkmark-circle': checkmarkCircle,
  'cash-outline': cashOutline,
  'ellipse-outline': ellipseOutline,
  'logo-whatsapp': logoWhatsapp
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
  pagado = false;
  guardandoPago = false;

  private readonly clienteService = inject(ClienteService);
  private readonly toastController = inject(ToastController);
  private readonly formatoMonto = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

  /** Lo que quedó cobrado en el registro (incluye materiales y mano de obra) */
  get montoCobrado(): number {
    return this.mantencion?.precioCobrado ?? this.cliente?.precio ?? 0;
  }

  formatearMonto(valor: number): string {
    return '$' + this.formatoMonto.format(valor || 0);
  }

  /** Marca o desmarca como pagado el registro recién guardado (mismo servicio que el historial). */
  alternarPago() {
    if (!this.cliente?.id || !this.mantencion?.id || this.guardandoPago) return;
    const ref = { registroId: this.mantencion.id, fecha: this.mantencion.fecha, hora: this.mantencion.hora };
    const marcar = !this.pagado;
    this.guardandoPago = true;
    this.pagado = marcar; // Respuesta inmediata; se revierte si falla

    const operacion = marcar
      ? this.clienteService.marcarPagoHistorial(this.cliente.id, ref)
      : this.clienteService.deshacerPagoHistorial(this.cliente.id, ref);

    operacion.subscribe({
      next: () => {
        this.guardandoPago = false;
        // El inicio lo celebra al volver (chip con lo cobrado hoy)
        if (marcar) registrarPago(this.montoCobrado);
        else quitarPago(this.montoCobrado);
      },
      error: async (err) => {
        console.error('Error al actualizar el pago:', err);
        this.pagado = !marcar;
        this.guardandoPago = false;
        const toast = await this.toastController.create({
          message: 'No se pudo guardar el pago ❌',
          duration: 2200,
          position: 'top',
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

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

  private parseFechaLocal(fecha: string | Date): Date {
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const [year, month, day] = fecha.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    return new Date(fecha);
  }

  enviarWhatsApp() {
    const telefono = this.cliente?.telefono || this.cliente?.telefonoPrincipal || '';
    if (!telefono) {
      window.alert('No se encontró número de teléfono del cliente');
      return;
    }

    const lines: string[] = [];
    const servicio = this.mantencion?.servicio || SERVICIO_MANTENCION;
    const monto = (v: number) => '$' + new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(v || 0);

    lines.push(`*Detalles del servicio: ${servicio} 🏊‍♂️*\n`);
    lines.push(`Hola ${this.cliente?.nombre || ''},`);
    lines.push('te envío el resumen del trabajo realizado:\n');
    
    if (this.mantencion) {
      // Fecha y hora (formato DD/MM/YYYY)
      if (this.mantencion?.fecha) {
        const fechaRaw = this.mantencion.fecha;
        let fechaStr = '';
        const fechaDate = this.parseFechaLocal(fechaRaw);
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
      
      // Cambio de cuarzo
      const cuarzo = this.mantencion.cuarzo;
      if (cuarzo) {
        lines.push('*Cambio de cuarzo:*');
        if (cuarzo.tipo) lines.push('• Tipo: ' + cuarzo.tipo);
        if (cuarzo.kilos) lines.push('• Cantidad: ' + cuarzo.kilos + ' kg');
        if (cuarzo.precioCuarzo) lines.push('• Cuarzo: ' + monto(cuarzo.precioCuarzo));
        if (cuarzo.manoObra) lines.push('• Mano de obra: ' + monto(cuarzo.manoObra));
        lines.push('');
      }

      // Reparación de bomba
      const bomba = this.mantencion.bomba;
      if (bomba) {
        lines.push('*Reparación de bomba:*');
        if (bomba.marcaModelo) lines.push('• Bomba: ' + bomba.marcaModelo);
        if (bomba.reparaciones?.length) lines.push('• Reparado: ' + bomba.reparaciones.join(', '));
        if (bomba.repuestos) lines.push('• Repuestos: ' + bomba.repuestos);
        if (bomba.costoRepuestos) lines.push('• Costo repuestos: ' + monto(bomba.costoRepuestos));
        if (bomba.manoObra) lines.push('• Mano de obra: ' + monto(bomba.manoObra));
        lines.push('• Quedó funcionando: ' + (bomba.quedoFuncionando ? 'Sí ✅' : 'No ⚠️'));
        lines.push('');
      }

      // Parámetros del agua (cuarzo / bomba pueden no llevar medición)
      if (this.mantencion.estadoCloro || this.mantencion.estadoPh) {
        lines.push('*Parámetros del agua:*');
        lines.push('• Cloro: ' + (this.mantencion.estadoCloro || '—'));
        lines.push('• pH: ' + (this.mantencion.estadoPh || '—'));
        lines.push('');
      }

      // Químicos utilizados (kilos; pastillas en unidades; algicida en litros)
      const cloro = formatearKgParaTexto(this.mantencion.cantidadCloro);
      const subePh = formatearKgParaTexto(this.mantencion.cantidadSubePh);
      const bajaPh = formatearKgParaTexto(this.mantencion.cantidadBajaPh);
      const quimicos: string[] = [];
      if (cloro) quimicos.push('• Cloro granulado: ' + cloro);
      if (subePh) quimicos.push('• Sube pH: ' + subePh);
      if (bajaPh) quimicos.push('• Baja pH: ' + bajaPh);
      if (this.mantencion.cantidadPastillas) {
        quimicos.push('• Pastillas: ' + formatearUnidades(this.mantencion.cantidadPastillas) + ' unidad(es)');
      }
      if (this.mantencion.cantidadAlgicida) {
        quimicos.push('• Algicida: ' + formatearUnidades(this.mantencion.cantidadAlgicida) + ' L');
      }
      if (quimicos.length) {
        lines.push('*Químicos utilizados:*');
        lines.push(...quimicos);
        lines.push('');
      }
      
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

    // Valor: lo que quedó cobrado en el registro (incluye materiales y mano de obra)
    const valor = this.mantencion?.precioCobrado ?? this.cliente?.precio;
    if (valor) {
      lines.push('*Valor total:*');
      lines.push(monto(valor) + (this.pagado ? ' — Pagado ✅' : ''));
    }
    

    const text = encodeURIComponent(lines.join('\n'));
    const phone = telefono.replace(/[^+0-9]/g, '');
    const url = `https://wa.me/${phone}?text=${text}`;
    window.open(url, '_blank');
  }

}
