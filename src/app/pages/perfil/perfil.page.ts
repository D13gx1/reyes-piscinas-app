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
import { ConfigNotificaciones, NotificacionesService } from '../../services/notificaciones.service';
import { addIcons } from 'ionicons';
import { timeOutline, calendarOutline, paperPlaneOutline } from 'ionicons/icons';

addIcons({
  'time-outline': timeOutline,
  'calendar-outline': calendarOutline,
  'paper-plane-outline': paperPlaneOutline,
});
import { MigracionUnidadesService } from '../../services/migracion-unidades.service';

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
  configNotif!: ConfigNotificaciones;
  enviandoPrueba = false;
  /** Hasta el 28 para que el aviso exista también en febrero. */
  readonly diasDelMes = Array.from({ length: 28 }, (_, i) => i + 1);
  /** true = las cantidades químicas ya están en kilos */
  unidadesEnKilos = true;
  unidadesCargando = false;
  private userSub: Subscription | undefined;

  private authService = inject(AuthService);
  private router = inject(Router);
  private clienteService = inject(ClienteService);
  private notificacionesService = inject(NotificacionesService);
  private toastController = inject(ToastController);
  private migracionService = inject(MigracionUnidadesService);

  ngOnInit() {
    this.userSub = this.authService.getUserName().subscribe(name => {
      this.userName = name;
    });

    this.userSub.add(
      this.authService.getCurrentUser().subscribe(u => {
        if (u) this.revisarEstadoUnidades(u.uid);
      })
    );

    const savedTheme = localStorage.getItem('theme-mode');
    const isExplicitDarkTheme = savedTheme === 'dark';
    this.isDarkMode = isExplicitDarkTheme;

    if (savedTheme === null) {
      localStorage.setItem('theme-mode', 'light');
    }

    this.applyTheme(this.isDarkMode);

    this.notificacionesActivadas = this.notificacionesService.notificacionesActivadas();
    this.configNotif = this.notificacionesService.obtenerConfig();
  }

  /** Texto bajo "Notificaciones" que resume lo que está configurado. */
  get resumenNotificaciones(): string {
    const partes: string[] = [];
    if (this.configNotif.recordatorioDiario) {
      partes.push(`Mantenciones a las ${this.configNotif.horaRecordatorio}`);
    }
    if (this.configNotif.avisoCobro) {
      partes.push(`cobro el día ${this.configNotif.diaCobro}`);
    }
    if (partes.length === 0) {
      return 'Ningún aviso activado';
    }
    const texto = partes.join(' · ');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  async cambiarConfig(cambios: Partial<ConfigNotificaciones>) {
    this.configNotif = { ...this.configNotif, ...cambios };
    try {
      await this.notificacionesService.guardarConfig(this.configNotif);
    } catch (error) {
      console.error('❌ Error al re-programar notificaciones:', error);
    }
  }

  /** Ignora el valor vacío que deja el selector de hora al borrarlo. */
  cambiarHora(campo: 'horaRecordatorio' | 'horaCobro', valor: string) {
    if (!valor) return;
    this.cambiarConfig({ [campo]: valor });
  }

  async enviarPrueba() {
    this.enviandoPrueba = true;
    try {
      const enviada = await this.notificacionesService.enviarPrueba();
      await this.mostrarToast(
        enviada
          ? 'Te llegará una notificación en unos segundos 🔔'
          : 'Para recibir notificaciones debes permitirlas en los ajustes del teléfono 😕'
      );
    } catch {
      await this.mostrarToast('Las notificaciones solo funcionan en la app móvil');
    } finally {
      this.enviandoPrueba = false;
    }
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

  private revisarEstadoUnidades(uid: string) {
    this.unidadesCargando = true;
    this.migracionService.yaMigrado(uid).subscribe((migrado) => {
      this.unidadesEnKilos = migrado;
      this.unidadesCargando = false;
    });
  }

  /** Convierte a mano las cantidades que quedaron en gramos (por si la migración automática falló). */
  async migrarUnidadesAKilos() {
    const usuario = await firstValueFrom(this.authService.getCurrentUser());
    if (!usuario) return;

    this.unidadesCargando = true;
    const resultado = await firstValueFrom(
      this.migracionService.ejecutarMigracion(usuario.uid, true)
    );

    this.unidadesEnKilos = await firstValueFrom(
      this.migracionService.yaMigrado(usuario.uid)
    );
    this.unidadesCargando = false;

    await this.mostrarToast(
      resultado.ejecutada
        ? `✅ ${resultado.mensaje}`
        : `ℹ️ ${resultado.mensaje}`
    );
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
