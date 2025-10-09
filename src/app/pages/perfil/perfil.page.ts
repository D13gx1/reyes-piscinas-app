import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonButton, 
  IonIcon, 
  IonItem, 
  IonList,
  IonLabel,
  IonToggle,
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    IonButton, 
    IonIcon, 
    IonItem, 
    IonList,
    IonLabel,
    IonToggle
  ]
})
export class PerfilPage implements OnInit, OnDestroy {
  userName: string = 'Usuario';
  private userSub: Subscription | undefined;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.userSub = this.authService.getUserName().subscribe(name => {
      this.userName = name;
    });
  }

  ngOnDestroy() {
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }
}
