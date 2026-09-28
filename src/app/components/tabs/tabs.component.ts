import { Component, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { addIcons } from 'ionicons';
import { homeOutline, peopleOutline, barChartOutline, personOutline, logOutOutline } from 'ionicons/icons';
import { AuthService } from 'src/app/services/auth.service';
import { NotificacionesService } from 'src/app/services/notificaciones.service';

addIcons({
  'home-outline': homeOutline,
  'people-outline': peopleOutline,
  'bar-chart-outline': barChartOutline,
  'person-outline': personOutline,
  'log-out-outline': logOutOutline
});

interface TabItem {
  tab: string;
  icono: string;
}

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss']
})
export class TabsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly router = inject(Router);

  readonly tabs: TabItem[] = [
    { tab: 'home', icono: 'home-outline' },
    { tab: 'clientes', icono: 'people-outline' },
    { tab: 'estadisticas', icono: 'bar-chart-outline' },
    { tab: 'perfil', icono: 'person-outline' }
  ];

  /**
   * Tab resaltada. La sacamos de la URL en vez de confiar en el estado interno
   * de ion-tabs: así el fondo seleccionado y su animación se muestran siempre,
   * también dentro de páginas hijas (completar mantención, historial, etc.).
   */
  tabActivo = 'home';

  constructor() {
    this.tabActivo = this.tabDesdeUrl(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((event) => {
        this.tabActivo = this.tabDesdeUrl(event.urlAfterRedirects);
      });
  }

  ngOnInit(): void {
    // Cada vez que se abre la app se re-programan los recordatorios
    // (si están activados).
    this.notificaciones.programarSiActivadas();
  }

  esActivo(tab: string): boolean {
    return this.tabActivo === tab;
  }

  /** Toma el primer segmento después de /tabs/: /tabs/estadisticas -> estadisticas */
  private tabDesdeUrl(url: string): string {
    const segmentos = url.split('?')[0].split('/').filter(Boolean);
    const indice = segmentos.indexOf('tabs');
    const tab = indice !== -1 ? segmentos[indice + 1] : undefined;
    return this.tabs.some(t => t.tab === tab) ? tab! : 'home';
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}
