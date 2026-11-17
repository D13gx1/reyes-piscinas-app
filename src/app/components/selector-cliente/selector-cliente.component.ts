import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonContent, IonFooter, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  closeOutline,
  checkmarkCircle,
  locationOutline,
  waterOutline,
  leafOutline,
  layersOutline,
  constructOutline,
  buildOutline,
  arrowForwardOutline,
  pauseCircleOutline,
  addCircleOutline,
} from 'ionicons/icons';
import { SERVICIOS, SERVICIO_MANTENCION } from '../../utils/servicios';

addIcons({
  'search-outline': searchOutline,
  'close-outline': closeOutline,
  'checkmark-circle': checkmarkCircle,
  'location-outline': locationOutline,
  'water-outline': waterOutline,
  'leaf-outline': leafOutline,
  'layers-outline': layersOutline,
  'construct-outline': constructOutline,
  'build-outline': buildOutline,
  'arrow-forward-outline': arrowForwardOutline,
  'pause-circle-outline': pauseCircleOutline,
  'add-circle-outline': addCircleOutline,
});

export interface OpcionCliente {
  id: string;
  nombre: string;
  direccion?: string;
  /** Etiqueta destacada, p. ej. "Programado hoy". Los que la tienen van primero. */
  etiqueta?: string;
}

export interface SeleccionCliente {
  clienteId: string;
  servicio: string;
}

/**
 * Hoja para elegir un cliente (con buscador) y, si se pide, el servicio.
 * Se usa dentro de un ion-modal tipo sheet.
 */
@Component({
  selector: 'app-selector-cliente',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonContent, IonFooter, IonIcon],
  templateUrl: './selector-cliente.component.html',
  styleUrls: ['./selector-cliente.component.scss'],
  // Raíz de página de Ionic: así el modal acomoda cabecera, contenido y pie
  host: { class: 'ion-page' },
})
export class SelectorClienteComponent implements OnChanges {
  @Input() titulo = 'Elegir cliente';
  @Input() subtitulo = '';
  @Input() clientes: OpcionCliente[] = [];
  @Input() pedirServicio = false;
  @Input() servicioInicial = SERVICIO_MANTENCION;
  @Input() textoConfirmar = 'Continuar';
  @Input() iconoConfirmar = 'arrow-forward-outline';
  /** Botón de confirmar en rojo (acciones como suspender) */
  @Input() peligro = false;

  @Output() confirmar = new EventEmitter<SeleccionCliente>();
  @Output() cerrar = new EventEmitter<void>();

  readonly servicios = SERVICIOS;

  busqueda = '';
  clienteId: string | null = null;
  servicio = SERVICIO_MANTENCION;
  visibles: OpcionCliente[] = [];

  ngOnChanges() {
    this.servicio = this.servicioInicial;
    // Si hay un solo cliente, ya queda elegido
    this.clienteId = this.clientes.length === 1 ? this.clientes[0].id : null;
    this.filtrar();
  }

  get clienteSeleccionado(): OpcionCliente | undefined {
    return this.clientes.find((c) => c.id === this.clienteId);
  }

  onBusqueda(valor: string) {
    this.busqueda = valor || '';
    this.filtrar();
  }

  elegir(cliente: OpcionCliente) {
    this.clienteId = cliente.id;
  }

  confirmarSeleccion() {
    if (!this.clienteId) return;
    this.confirmar.emit({ clienteId: this.clienteId, servicio: this.servicio });
  }

  iniciales(nombre: string): string {
    return (nombre || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }

  trackPorId(_: number, c: OpcionCliente) {
    return c.id;
  }

  private filtrar() {
    const termino = this.normalizar(this.busqueda.trim());
    this.visibles = this.clientes
      .filter((c) => !termino || this.normalizar(c.nombre).includes(termino) || this.normalizar(c.direccion || '').includes(termino))
      .sort((a, b) => {
        if (!!a.etiqueta !== !!b.etiqueta) return a.etiqueta ? -1 : 1;
        return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
      });
  }

  // Sin tildes ni mayúsculas, para que "maria" encuentre a "María"
  private normalizar(texto: string): string {
    return (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
}
