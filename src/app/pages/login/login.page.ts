import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonButton, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline } from 'ionicons/icons';
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
    IonContent, IonButton, IonSpinner, IonIcon
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

  constructor() {
    addIcons({ alertCircleOutline });
  }

  async ngOnInit() {
    this.isMobile = this.platform.is('mobile') || this.platform.is('tablet');

    // Suscribirse al estado de carga
    this.loadingSubscription = this.auth.getLoadingState().subscribe(loading => {
      this.isLoading = loading;
    });

    // Resultado del login por redirección (navegador en móvil)
    const error = await this.auth.handleRedirectResult();
    if (error) {
      this.errorMessage = error.message;
    }
  }

  ngOnDestroy() {
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
  }

  async loginWithGoogle(): Promise<void> {
    this.errorMessage = null;
    const error = await this.auth.googleLogin();
    if (error) {
      this.errorMessage = error.message;
    }
  }
}
