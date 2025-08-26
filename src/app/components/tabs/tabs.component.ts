import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { homeOutline, peopleOutline, barChartOutline, personOutline, logOutOutline } from 'ionicons/icons';
import { AuthService } from 'src/app/services/auth.service';

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
export class TabsComponent {
  private readonly auth = inject(AuthService);

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}
