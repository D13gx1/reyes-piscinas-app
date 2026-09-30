import { inject, Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
  LocalNotificationSchema,
} from '@capacitor/local-notifications';
import { Cliente, ClienteService } from './cliente.service';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';

/** Preferencias de notificaciones que el usuario ajusta desde Perfil. */
export interface ConfigNotificaciones {
  /** Recordatorio la noche anterior con las mantenciones del día siguiente. */
  recordatorioDiario: boolean;
  /** Hora del recordatorio diario, "HH:mm". */
  horaRecordatorio: string;
  /** Aviso mensual para empezar a cobrar. */
  avisoCobro: boolean;
  /** Día del mes del aviso de cobro (1-28, para que exista en todos los meses). */
  diaCobro: number;
  /** Hora del aviso de cobro, "HH:mm". */
  horaCobro: string;
}

export const CONFIG_NOTIFICACIONES_DEFECTO: ConfigNotificaciones = {
  recordatorioDiario: true,
  horaRecordatorio: '20:00',
  avisoCobro: true,
  diaCobro: 25,
  horaCobro: '20:00',
};

@Injectable({
  providedIn: 'root',
})
export class NotificacionesService {
  static readonly CLAVE_PREFERENCIA = 'notificaciones_activadas';
  static readonly CLAVE_CONFIG = 'notificaciones_config';

  /** Cuántas noches hacia adelante se programan los recordatorios diarios. */
  private readonly DIAS_A_PROGRAMAR = 7;

  private readonly diasSemana = [
    'domingo',
    'lunes',
    'martes',
    'miercoles',
    'jueves',
    'viernes',
    'sabado',
  ];

  private readonly clienteService = inject(ClienteService);
  private readonly authService = inject(AuthService);

  /** Lee la preferencia guardada en el dispositivo. */
  notificacionesActivadas(): boolean {
    return localStorage.getItem(NotificacionesService.CLAVE_PREFERENCIA) === 'true';
  }

  /** Lee la configuración guardada en el dispositivo (con valores por defecto). */
  obtenerConfig(): ConfigNotificaciones {
    try {
      const guardada = JSON.parse(localStorage.getItem(NotificacionesService.CLAVE_CONFIG) || '{}');
      return { ...CONFIG_NOTIFICACIONES_DEFECTO, ...guardada };
    } catch {
      return { ...CONFIG_NOTIFICACIONES_DEFECTO };
    }
  }

  /** Guarda la configuración y re-programa las notificaciones con los nuevos valores. */
  async guardarConfig(config: ConfigNotificaciones): Promise<void> {
    localStorage.setItem(NotificacionesService.CLAVE_CONFIG, JSON.stringify(config));
    await this.programarSiActivadas();
  }

  /** Envía una notificación a los pocos segundos para comprobar que llegan. */
  async enviarPrueba(): Promise<boolean> {
    if (!this.esNativo()) {
      throw new Error('Las notificaciones solo están disponibles en la app móvil');
    }
    if (!(await this.solicitarPermiso())) {
      return false;
    }
    await this.crearCanal();
    const usuario = await firstValueFrom(this.authService.getUserName());
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 9999,
          title: `¡Hola ${usuario}! 🔔`,
          body: 'Así se verán tus recordatorios. ¡Las notificaciones funcionan!',
          schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true },
          channelId: 'recordatorios',
        },
      ],
    });
    return true;
  }

  /**
   * Activa las notificaciones: pide permiso, guarda la preferencia y programa
   * los recordatorios. Devuelve true si el permiso fue concedido.
   */
  async activar(): Promise<boolean> {
    if (!this.esNativo()) {
      throw new Error('Las notificaciones solo están disponibles en la app móvil');
    }

    localStorage.setItem(NotificacionesService.CLAVE_PREFERENCIA, 'true');

    const permiso = await this.solicitarPermiso();
    if (!permiso) {
      localStorage.setItem(NotificacionesService.CLAVE_PREFERENCIA, 'false');
      return false;
    }

    await this.programarTodo();
    return true;
  }

  /** Desactiva las notificaciones y cancela las programadas. */
  async desactivar(): Promise<void> {
    localStorage.setItem(NotificacionesService.CLAVE_PREFERENCIA, 'false');
    await this.cancelarTodas();
  }

  /** Re-programa las notificaciones si el usuario las tiene activas. */
  async programarSiActivadas(): Promise<void> {
    if (!this.notificacionesActivadas() || !this.esNativo()) {
      return;
    }
    await this.programarTodo();
  }

  private async programarTodo(): Promise<void> {
    const permiso = await LocalNotifications.checkPermissions();
    if (permiso.display !== 'granted') {
      return;
    }

    await this.crearCanal();
    await this.cancelarTodas();

    const config = this.obtenerConfig();

    const usuario = await firstValueFrom(this.authService.getUserName());
    let clientes: Cliente[] = [];
    try {
      clientes = await firstValueFrom(this.clienteService.getClientes());
    } catch (error) {
      console.error('❌ Error cargando clientes para notificaciones:', error);
    }

    const notificaciones: LocalNotificationSchema[] = [];

    if (config.recordatorioDiario) {
      notificaciones.push(...this.notificacionesDiarias(usuario, clientes, config.horaRecordatorio));
    }
    if (config.avisoCobro) {
      notificaciones.push(...this.notificacionesFinDeMes(usuario, config.diaCobro, config.horaCobro));
    }

    if (notificaciones.length === 0) {
      return;
    }

    try {
      await LocalNotifications.schedule({ notifications: notificaciones });
      console.log(`🔔 Programadas ${notificaciones.length} notificaciones`);
    } catch (error) {
      console.error('❌ Error al programar notificaciones:', error);
    }
  }

  private async crearCanal(): Promise<void> {
    await LocalNotifications.createChannel({
      id: 'recordatorios',
      name: 'Recordatorios',
      description: 'Recordatorios de mantenciones y pagos',
      importance: 5,
      visibility: 1,
      lights: true,
    });
  }

  /** Recordatorios diarios, a la hora configurada, con las mantenciones del día siguiente. */
  private notificacionesDiarias(
    usuario: string,
    clientes: Cliente[],
    hora: string
  ): LocalNotificationSchema[] {
    const notificaciones: LocalNotificationSchema[] = [];
    const ahora = new Date();
    const [horas, minutos] = this.separarHora(hora);

    for (let offset = 1; offset <= this.DIAS_A_PROGRAMAR; offset++) {
      // El recordatorio se dispara la noche anterior a la hora configurada
      // y avisa sobre las mantenciones del día siguiente.
      const fechaObjetivo = this.fechaLimpia(ahora);
      fechaObjetivo.setDate(fechaObjetivo.getDate() + offset);

      const fechaDisparo = new Date(fechaObjetivo);
      fechaDisparo.setDate(fechaDisparo.getDate() - 1);
      fechaDisparo.setHours(horas, minutos, 0, 0);

      if (fechaDisparo.getTime() <= ahora.getTime()) {
        continue;
      }

      const clientesDelDia = this.clientesProgramados(clientes, fechaObjetivo);

      if (clientesDelDia.length === 0) {
        continue;
      }

      const cantidad = clientesDelDia.length;
      const palabra = cantidad === 1 ? 'mantención' : 'mantenciones';
      const nombres = clientesDelDia.map((c) => c.nombre).join(', ');

      notificaciones.push({
        id: 1000 + offset,
        title: `¡Hola ${usuario}! 🙌`,
        body: `Recuerda que mañana tienes ${cantidad} ${palabra} por hacer\n\n${nombres}`,
        schedule: { at: fechaDisparo, allowWhileIdle: true },
        channelId: 'recordatorios',
      });
    }

    return notificaciones;
  }

  /** Aviso mensual (día y hora configurados) para empezar a cobrar los pagos. */
  private notificacionesFinDeMes(usuario: string, dia: number, hora: string): LocalNotificationSchema[] {
    const notificaciones: LocalNotificationSchema[] = [];
    const ahora = new Date();
    const [horas, minutos] = this.separarHora(hora);

    for (let i = 0; i < 6; i++) {
      const mesReferencia = new Date(ahora.getFullYear(), ahora.getMonth() + i, 1);
      const fechaDisparo = new Date(
        mesReferencia.getFullYear(),
        mesReferencia.getMonth(),
        dia,
        horas,
        minutos,
        0
      );

      if (fechaDisparo.getTime() <= ahora.getTime()) {
        continue;
      }

      notificaciones.push({
        id: 2000 + i,
        title: `¡Hola ${usuario}! 📆`,
        body: `Es día de cobro. Recuerda cobrar los pagos pendientes de tus clientes.`,
        schedule: { at: fechaDisparo, allowWhileIdle: true },
        channelId: 'recordatorios',
      });
    }

    return notificaciones;
  }

  /** "HH:mm" → [horas, minutos]; si viene mal formada usa las 20:00. */
  private separarHora(hora: string): [number, number] {
    const [h, m] = (hora || '').split(':').map(Number);
    if (isNaN(h) || isNaN(m)) {
      return [20, 0];
    }
    return [h, m];
  }

  /** Hora y fecha limpias (sin minutos ni segundos) a partir de una base. */
  private fechaLimpia(base: Date): Date {
    return new Date(base.getFullYear(), base.getMonth(), base.getDate());
  }

  /** Clientes con mantención pendiente (no realizada ni saltada) para una fecha. */
  private clientesProgramados(clientes: Cliente[], fecha: Date): Cliente[] {
    const diaSemana = this.diasSemana[fecha.getDay()];
    const fechaStr = this.formatearFechaLocal(fecha);

    return clientes.filter((cliente) => {
      if (!cliente.activo || !cliente.programacion) {
        return false;
      }
      return this.hayMantencionEseDia(cliente, fecha, diaSemana, fechaStr);
    });
  }

  private hayMantencionEseDia(
    cliente: Cliente,
    fecha: Date,
    diaSemana?: string,
    fechaStr?: string
  ): boolean {
    const dSemana =
      diaSemana ?? this.diasSemana[fecha.getDay()];
    const fStr = fechaStr ?? this.formatearFechaLocal(fecha);

    const diasProgramados = cliente.programacion?.diasSemana || [];
    if (!diasProgramados.includes(dSemana)) {
      return false;
    }

    const completado = (cliente.historial || []).some(
      (h) => h.fecha === fStr && h.estadoCloro !== 'saltada'
    );
    const saltadoHist = (cliente.historial || []).some(
      (h) => h.fecha === fStr && h.estadoCloro === 'saltada'
    );
    const saltadoArr = (cliente.skippedDates || []).includes(fStr);

    return !completado && !saltadoHist && !saltadoArr;
  }

  private async solicitarPermiso(): Promise<boolean> {
    try {
      const check = await LocalNotifications.checkPermissions();
      if (check.display === 'granted') {
        return true;
      }
      const solicitud = await LocalNotifications.requestPermissions();
      return solicitud.display === 'granted';
    } catch (error) {
      console.error('❌ Error al solicitar permiso de notificaciones:', error);
      return false;
    }
  }

  private async cancelarTodas(): Promise<void> {
    try {
      const pendientes = await LocalNotifications.getPending();
      if (pendientes.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pendientes.notifications.map((n) => ({ id: n.id })),
        });
      }
    } catch (error) {
      console.warn('⚠️ No se pudieron cancelar notificaciones:', error);
    }
  }

  private esNativo(): boolean {
    return Capacitor.isNativePlatform();
  }

  private formatearFechaLocal(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}