import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { homeOutline, peopleOutline, barChartOutline, personOutline } from 'ionicons/icons';

addIcons({
  'home-outline': homeOutline,
  'people-outline': peopleOutline,
  'bar-chart-outline': barChartOutline,
  'person-outline': personOutline,
});

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss']
})
export class TabsComponent {}
