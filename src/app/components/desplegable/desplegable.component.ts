import { Component, ElementRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronDownOutline, checkmarkOutline } from 'ionicons/icons';

addIcons({
  'chevron-down-outline': chevronDownOutline,
  'checkmark-outline': checkmarkOutline,
});

export interface OpcionDesplegable<T = unknown> {
  valor: T;
  texto: string;
}

/**
 * Campo de selección cuyas opciones se despliegan justo debajo del mismo campo
 * (en vez de una alerta u hoja aparte). Mismo estilo que el menú de orden de Clientes.
 */
@Component({
  selector: 'app-desplegable',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './desplegable.component.html',
  styleUrls: ['./desplegable.component.scss'],
})
export class DesplegableComponent<T = unknown> {
  @Input() etiqueta = '';
  @Input() opciones: OpcionDesplegable<T>[] = [];
  @Input() valor: T | null = null;
  @Output() cambio = new EventEmitter<T>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  abierto = false;

  get textoSeleccionado(): string {
    return this.opciones.find((o) => o.valor === this.valor)?.texto ?? 'Elegir';
  }

  alternar() {
    this.abierto = !this.abierto;
    if (this.abierto) {
      // Lista larga (12 meses): deja visible la opción elegida
      setTimeout(() =>
        this.host.nativeElement.querySelector('.opcion.activa')?.scrollIntoView({ block: 'nearest' })
      );
    }
  }

  elegir(opcion: OpcionDesplegable<T>) {
    this.abierto = false;
    if (opcion.valor !== this.valor) {
      this.cambio.emit(opcion.valor);
    }
  }
}
