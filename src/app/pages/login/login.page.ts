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
    // Limpiar suscripción
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
  }

  /*
  async login(): Promise<void> {
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor complete todos los campos';
      return;
    }

    const error = await this.auth.loginWithEmail(this.email, this.password);
    if (error) {
      this.errorMessage = error.message;
    }
  }
  */
  async loginWithGoogle(): Promise<void> {
    const error = await this.auth.googleLogin();
    if (error) {
      this.errorMessage = error.message;
    }
  }
}
