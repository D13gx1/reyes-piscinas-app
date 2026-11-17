import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonIcon,
  IonToggle,
  ToastController,
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { EncabezadoComponent } from '../../components/encabezado/encabezado.component';
import { ClienteService } from '../../services/cliente.service';
import { ConfigNotificaciones, NotificacionesService } from '../../services/notificaciones.service';
import { addIcons } from 'ionicons';
import {
  timeOutline,
  calendarOutline,
  paperPlaneOutline,
  megaphoneOutline,
  moonOutline,
  notificationsOutline,
  scaleOutline,
  chevronForwardOutline,
  chevronUpOutline,
  chevronDownOutline,
  buildOutline,
  syncOutline,
  informationCircleOutline,
  logOutOutline,
  calendarNumberOutline,
} from 'ionicons/icons';
import { MigracionUnidadesService } from '../../services/migracion-unidades.service';
import { EstadisticasService } from '../../services/estadisticas.service';
import { ResumenMesService } from '../../services/resumen-mes.service';

addIcons({
  'time-outline': timeOutline,
  'calendar-outline': calendarOutline,
  'paper-plane-outline': paperPlaneOutline,
  'megaphone-outline': megaphoneOutline,
  'moon-outline': moonOutline,
  'notifications-outline': notificationsOutline,
  'scale-outline': scaleOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'calendar-number-outline': calendarNumberOutline,
  'chevron-up-outline': chevronUpOutline,
  'chevron-down-outline': chevronDownOutline,
  'build-outline': buildOutline,
  'sync-outline': syncOutline,
  'information-circle-outline': informationCircleOutline,
  'log-out-outline': logOutOutline,
});

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonIcon,
    IonToggle,
    EncabezadoComponent
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

  // Tarjeta de cuenta
  email = '';
  foto = '';
  /** La foto de Google no cargó (sin conexión, etc.): se muestran las iniciales */
  fotoFallo = false;
  clientesActivos = 0;
  mantencionesMes = 0;
  gananciaMes = 0;
  gananciaAnio = 0;
  gananciaTotal = 0;
  /** Qué muestra el recuadro de ganancia: 0 = este mes, 1 = este año, 2 = total general */
  periodoGanancia = 0;
  private readonly formatoMonto = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

  private authService = inject(AuthService);
  private router = inject(Router);
  private clienteService = inject(ClienteService);
  private notificacionesService = inject(NotificacionesService);
  private toastController = inject(ToastController);
  private migracionService = inject(MigracionUnidadesService);
  private estadisticasService = inject(EstadisticasService);
  private resumenMes = inject(ResumenMesService);

  get iniciales(): string {
    const partes = (this.userName || '').trim().split(/\s+/).filter(Boolean);
    return partes.slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('') || '?';
  }

  get gananciaActual(): { monto: number; etiqueta: string } {
    switch (this.periodoGanancia) {
      case 1: return { monto: this.gananciaAnio, etiqueta: 'este año' };
      case 2: return { monto: this.gananciaTotal, etiqueta: 'en total' };
      default: return { monto: this.gananciaMes, etiqueta: 'este mes' };
    }
  }

  siguientePeriodoGanancia() {
    this.periodoGanancia = (this.periodoGanancia + 1) % 3;
  }

  formatearMonto(valor: number): string {
    return '$' + this.formatoMonto.format(valor || 0);
  }

  ngOnInit() {
    this.userSub = this.authService.getUserName().subscribe(name => {
      this.userName = name;
    });

    this.userSub.add(
      this.authService.getCurrentUser().subscribe(u => {
        if (u) this.revisarEstadoUnidades(u.uid);
        this.email = u?.email || '';
        this.foto = u?.photoURL || '';
        this.fotoFallo = false;
      })
    );

    // Números de la tarjeta de cuenta (en vivo)
    this.userSub.add(
      this.clienteService.clientes$.subscribe(clientes => {
        this.clientesActivos = clientes.filter(c => c.activo).length;
      })
    );
    const hoy = new Date();
    this.userSub.add(
      this.estadisticasService.getIngresosPorAnio().subscribe(anios => {
        const anio = anios.find(a => a.anio === hoy.getFullYear());
        const mes = anio?.meses[hoy.getMonth()];
        this.mantencionesMes = mes?.cantidad ?? 0;
        this.gananciaMes = mes?.total ?? 0;
        this.gananciaAnio = anio?.total ?? 0;
        this.gananciaTotal = anios.reduce((suma, a) => suma + a.total, 0);
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

  // ===== Cierre de mes =====

  async verResumenMesPasado() {
    const hay = await this.resumenMes.verMesPasado();
    if (!hay) await this.mostrarToast('Aún no hay mantenciones para armar el resumen');
  }

  irARecordatorios() {
    this.router.navigate(['/tabs/perfil/recordatorios']);
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
