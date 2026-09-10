import { inject, Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
  LocalNotificationSchema,
} from '@capacitor/local-notifications';
import { Cliente, ClienteService } from './cliente.service';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NotificacionesService {
  static readonly CLAVE_PREFERENCIA = 'notificaciones_activadas';

  /** Hora (24h) a la que se recuerdan las mantenciones del día siguiente. */
  private readonly HORA_RECORDATORIO = 20;

  /** Día del mes en que se avisa para empezar a cobrar los pagos. */
  private readonly DIA_FIN_DE_MES = 25;

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

    await LocalNotifications.createChannel({
      id: 'recordatorios',
      name: 'Recordatorios',
      description: 'Recordatorios de mantenciones y pagos',
      importance: 5,
      visibility: 1,
      lights: true,
    });

    await this.cancelarTodas();

    const usuario = await firstValueFrom(this.authService.getUserName());
    let clientes: Cliente[] = [];
    try {
      clientes = await firstValueFrom(this.clienteService.getClientes());
    } catch (error) {
      console.error('❌ Error cargando clientes para notificaciones:', error);
    }

    const notificaciones: LocalNotificationSchema[] = [];

    notificaciones.push(...this.notificacionesDiarias(usuario, clientes));
    notificaciones.push(...this.notificacionesFinDeMes(usuario));

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

  /** Recordatorios diarios a las 20:00 con las mantenciones del día siguiente. */
  private notificacionesDiarias(
    usuario: string,
    clientes: Cliente[]
  ): LocalNotificationSchema[] {
    const notificaciones: LocalNotificationSchema[] = [];
    const ahora = new Date();

    for (let offset = 1; offset <= this.DIAS_A_PROGRAMAR; offset++) {
      // El recordatorio se dispara la noche anterior a las 20:00
      // y avisa sobre las mantenciones del día siguiente.
      const fechaObjetivo = this.fechaLimpia(ahora);
      fechaObjetivo.setDate(fechaObjetivo.getDate() + offset);

      const fechaDisparo = new Date(fechaObjetivo);
      fechaDisparo.setDate(fechaDisparo.getDate() - 1);
      fechaDisparo.setHours(this.HORA_RECORDATORIO, 0, 0, 0);

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

  /** Aviso de fin de mes (día 25) para empezar a cobrar los pagos. */
  private notificacionesFinDeMes(usuario: string): LocalNotificationSchema[] {
    const notificaciones: LocalNotificationSchema[] = [];
    const ahora = new Date();

    for (let i = 0; i < 6; i++) {
      const mesReferencia = new Date(ahora.getFullYear(), ahora.getMonth() + i, 1);
      const fechaDisparo = new Date(
        mesReferencia.getFullYear(),
        mesReferencia.getMonth(),
        this.DIA_FIN_DE_MES,
        this.HORA_RECORDATORIO,
        0,
        0
      );

      if (fechaDisparo.getTime() <= ahora.getTime()) {
        continue;
      }

      notificaciones.push({
        id: 2000 + i,
        title: `¡Hola ${usuario}! 📆`,
        body: `Ya casi es fin de mes. Recuerda empezar a cobrar los pagos pendientes de tus clientes.`,
        schedule: { at: fechaDisparo, allowWhileIdle: true },
        channelId: 'recordatorios',
      });
    }

    return notificaciones;
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