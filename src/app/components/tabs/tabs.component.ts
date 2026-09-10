import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
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

  ngOnInit(): void {
    // Cada vez que se abre la app se re-programan los recordatorios
    // con los datos más recientes (si están activados).
    this.notificaciones.programarSiActivadas();
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}
