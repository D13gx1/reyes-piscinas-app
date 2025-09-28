import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline } from 'ionicons/icons';

addIcons({
  'checkmark-circle-outline': checkmarkCircleOutline
});

@Component({
  selector: 'app-mantenimiento-exitoso',
  templateUrl: './mantenimiento-exitoso.page.html',
  styleUrls: ['./mantenimiento-exitoso.page.scss'],
  standalone: true,
  imports: [IonIcon, CommonModule, FormsModule]
})
export class MantenimientoExitosoPage implements OnInit {

  constructor(private router: Router) { }

  ngOnInit() {
    // Navigate back to home after 3 seconds
    setTimeout(() => {
      this.router.navigate(['/tabs/home']);
    }, 3000);
  }

}
