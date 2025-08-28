import { Component, inject } from '@angular/core';
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
  IonText 
} from '@ionic/angular/standalone';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonItem, IonLabel, IonInput, IonButton, IonCard, IonCardContent, IonText
  ]
})
export class LoginPage {
  private readonly auth = inject(AuthService);

  email: string = '';
  password: string = '';
  errorMessage: string | null = null;

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
