import { Component, OnInit, OnDestroy, inject } from '@angular/core';
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
import { NotificacionesService } from '../../services/notificaciones.service';

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
  notificacionesActivadas = false;
  private userSub: Subscription | undefined;

  private authService = inject(AuthService);
  private router = inject(Router);
  private clienteService = inject(ClienteService);
  private notificacionesService = inject(NotificacionesService);
  private toastController = inject(ToastController);

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

    this.notificacionesActivadas = this.notificacionesService.notificacionesActivadas();
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

  async toggleNotificaciones(event: any) {
    const activadas = !!event?.detail?.checked;

    if (activadas) {
      try {
        const concedido = await this.notificacionesService.activar();
        if (!concedido) {
          this.notificacionesActivadas = false;
          await this.mostrarToast(
            'Para recibir notificaciones debes permitirlas en los ajustes del teléfono 😕'
          );
          return;
        }
        this.notificacionesActivadas = true;
        await this.mostrarToast('Notificaciones activadas ✅');
      } catch (error) {
        this.notificacionesActivadas = false;
        await this.mostrarToast('Las notificaciones solo funcionan en la app móvil');
      }
    } else {
      await this.notificacionesService.desactivar();
      this.notificacionesActivadas = false;
      await this.mostrarToast('Notificaciones desactivadas');
    }
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
