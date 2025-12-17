import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonCard,
  IonCardContent,
  IonText,
  IonSpinner
} from '@ionic/angular/standalone';
import { Platform } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonItem, IonLabel, IonInput, IonButton, IonCard, IonCardContent, IonText, IonSpinner
  ]
})
export class LoginPage implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly platform = inject(Platform);
  private loadingSubscription?: Subscription;

  email: string = '';
  password: string = '';
  errorMessage: string | null = null;
  isLoading: boolean = false;
  isMobile: boolean = false;

  ngOnInit() {
    // AGREGAR LOGS
    console.log('Platform detection:', {
      isMobile: this.platform.is('mobile'),
      isTablet: this.platform.is('tablet'),
      isCapacitor: this.platform.is('capacitor'),
      isAndroid: this.platform.is('android'),
      platforms: this.platform.platforms()
    });

    // Detectar si es móvil
    this.isMobile = this.platform.is('mobile') || this.platform.is('tablet');

    // Manejar el resultado de la redirección de Google (para móviles)
    this.auth.handleRedirectResult();

    // Suscribirse al estado de carga
    this.loadingSubscription = this.auth.getLoadingState().subscribe(loading => {
      this.isLoading = loading;
    });
  }

  ngOnDestroy() {
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
  }

  async loginWithGoogle(): Promise<void> {
  // ALERT TEMPORAL PARA DEBUG
  console.log('Login button clicked');
  const error = await this.auth.googleLogin();
  if (error) {
    this.errorMessage = error.message;
    console.error('Login error:', error);
  }
}

}