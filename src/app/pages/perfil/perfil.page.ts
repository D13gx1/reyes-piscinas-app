import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
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
  ToastController,
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { ClienteService } from '../../services/cliente.service';

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
  isDarkMode = false;
  isMigrationExpanded = false;
  private userSub: Subscription | undefined;

  constructor(
    private authService: AuthService,
    private router: Router,
    private clienteService: ClienteService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.userSub = this.authService.getUserName().subscribe(name => {
      this.userName = name;
    });

    const savedTheme = localStorage.getItem('theme-mode');
    const isExplicitDarkTheme = savedTheme === 'dark';
    this.isDarkMode = isExplicitDarkTheme;

    if (savedTheme === null) {
      localStorage.setItem('theme-mode', 'light');
    }

    this.applyTheme(this.isDarkMode);
  }

  ngOnDestroy() {
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
  }

  toggleDarkMode(event: any) {
    this.isDarkMode = !!event?.detail?.checked;
    this.applyTheme(this.isDarkMode);
  }

  private applyTheme(isDark: boolean) {
    document.body.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light');
  }

  toggleMigration() {
    this.isMigrationExpanded = !this.isMigrationExpanded;
  }

  async migrarPreciosHistorial() {
    const clientes = await firstValueFrom(this.clienteService.getClientes());
    let migrados = 0;

    for (const cliente of clientes) {
      let modificado = false;

      cliente.historial = cliente.historial.map((registro: any) => {
        if (registro.precioCobrado === undefined || registro.precioCobrado === null) {
          modificado = true;
          return { ...registro, precioCobrado: cliente.precio };
        }
        return registro;
      });

      if (modificado) {
        await firstValueFrom(this.clienteService.updateCliente(cliente));
        migrados++;
      }
    }

    await this.mostrarToast(`✅ Migración completada: ${migrados} clientes actualizados`);
  }

  async mostrarToast(mensaje: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
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
