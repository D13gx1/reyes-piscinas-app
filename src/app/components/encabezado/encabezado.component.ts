import { AfterViewInit, Component, ElementRef, Input, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonBackButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, notificationsOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { ResumenMesService } from '../../services/resumen-mes.service';

addIcons({ 'chevron-back-outline': chevronBackOutline, 'notifications-outline': notificationsOutline });

/**
 * Encabezado de las pestañas principales: línea de contexto + título grande a la
 * izquierda; a la derecha un dato rápido (proyectado con el atributo `chip`), la
 * campana con los resúmenes de cada mes y un avatar con mis iniciales que lleva a Perfil.
 *
 * Va dentro del ion-toolbar de cada página (ion-header debe seguir siendo hijo
 * directo de la página):
 *   <ion-header class="encabezado ion-no-border"><ion-toolbar>
 *     <app-encabezado titulo="Clientes" subtitulo="12 activos">
 *       <button chip>+ Nuevo</button>
 *     </app-encabezado>
 *   </ion-toolbar></ion-header>
 *
 * En pantallas internas (crear / editar cliente, etc.) se pasa `volver` con la
 * ruta de respaldo: aparece un botón para volver y no se muestra el avatar.
 *
 * Al bajar el contenido de la página le pone `elevado` al ion-header (línea y
 * sombra suave en global.scss); arriba del todo se funde con el fondo.
 */
@Component({
  selector: 'app-encabezado',
  standalone: true,
  imports: [CommonModule, IonBackButton, IonIcon],
  templateUrl: './encabezado.component.html',
  styleUrls: ['./encabezado.component.scss'],
})
export class EncabezadoComponent implements AfterViewInit, OnDestroy {
  @Input() titulo = '';
  @Input() subtitulo = '';
  /** En Perfil el avatar se muestra pero no navega */
  @Input() enPerfil = false;
  /** Ruta a la que vuelve si no hay historial; si se pasa, se muestra el botón de volver */
  @Input() volver = '';

  private readonly router = inject(Router);
  readonly nombre$ = inject(AuthService).getUserName();
  readonly resumenMes = inject(ResumenMesService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private quitarScroll?: () => void;

  ngAfterViewInit() {
    const header = this.host.nativeElement.closest('ion-header');
    const contenido = header?.parentElement?.querySelector(':scope > ion-content') as any;
    if (!header || !contenido) return;
    contenido.scrollEvents = true;
    const alBajar = (e: Event) =>
      header.classList.toggle('elevado', ((e as CustomEvent).detail?.scrollTop ?? 0) > 4);
    contenido.addEventListener('ionScroll', alBajar);
    this.quitarScroll = () => contenido.removeEventListener('ionScroll', alBajar);
  }

  ngOnDestroy() {
    this.quitarScroll?.();
  }

  iniciales(nombre: string | null | undefined): string {
    const partes = (nombre || '').trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    return partes
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }

  irAPerfil() {
    if (!this.enPerfil) {
      this.router.navigate(['/tabs/perfil']);
    }
  }
}
