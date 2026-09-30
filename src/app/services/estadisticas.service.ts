import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { Auth, user } from '@angular/fire/auth';
import { ClienteService } from './cliente.service';
import { esMantencionPagada, esMantencionSaltada, precioEfectivoMantencion } from '../utils/mantencion';

export interface EstadisticasRecaudacion {
  total: number;
  cantidadMantenciones: number;
  promedioPorMantencion: number;
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface EstadisticasQuimicas {
  /** Nivel de cloro promedio en ppm */
  promedioCloro: number;
  /** Nivel de pH promedio */
  promedioPh: number;
  /** Total de cloro granulado en KILOS */
  totalCloro: number;
  totalPh: number;
  /** Total de sube pH en KILOS */
  totalSubePh: number;
  /** Total de baja pH en KILOS */
  totalBajaPh: number;
  /** Total de pastillas de cloro en UNIDADES */
  totalPastillas: number;
  /** Promedios por mantención (kg / unidades) */
  promedioCloroKg: number;
  promedioSubePhKg: number;
  promedioBajaPhKg: number;
  /** Promedio de kilos de producto pH (baja + sube) por mantención */
  promedioPhKg: number;
  promedioPastillas: number;
  cantidadMantenciones: number;
}

export interface Mantencion {
  id: string;
  /** `id` del registro en el historial (ausente en registros antiguos) */
  registroId?: string;
  clienteId: string;
  clienteNombre: string;
  fecha: string;
  precio: number;
  cloro: number;
  ph: number;
  /** Kilos */
  cantidadCloro?: number;
  /** Kilos */
  cantidadBajaPh?: number;
  /** Kilos */
  cantidadSubePh?: number;
  /** Unidades */
  cantidadPastillas?: number;
  servicio: string;
  hora?: string;
  tipoPh?: 'Sube pH' | 'Baja pH';
  // Campos relacionados a pago
  pagado?: boolean | string;
  pago?: boolean | string;
  estadoPago?: string;
  fechaPago?: string;
  // Mantención suspendida (no realizada, precio 0)
  suspendida?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class EstadisticasService {
  private auth: Auth = inject(Auth);
  private currentUserId: string | null = null;

  constructor(private clienteService: ClienteService) {
    console.log('🔄 Inicializando EstadisticasService...');

    // Suscribirse a cambios en la autenticación
    user(this.auth).subscribe(user => {
      console.log('👤 Cambio en estado de autenticación:', user ? 'Usuario autenticado' : 'Usuario no autenticado');
      this.currentUserId = user?.uid || null;
      console.log('🆔 ID de usuario actualizado:', this.currentUserId);
    });
  }

  private ensureUserId(): string {
    console.log('🔐 Verificando autenticación...');
    console.log('ID de usuario actual:', this.currentUserId);
    console.log('Estado de autenticación:', this.auth.currentUser);

    if (!this.currentUserId) {
      console.error('❌ Error: Usuario no autenticado');
      throw new Error('Usuario no autenticado');
    }
    return this.currentUserId;
  }

  // Obtener estadísticas por día
  getEstadisticasDia(fecha: string): Observable<EstadisticasRecaudacion> {
    return this.getMantencionesPorFecha(fecha).pipe(
      map(mantenciones => this.calcularEstadisticas(mantenciones, 'día', fecha, fecha))
    );
  }

  // Obtener estadísticas por mes
  getEstadisticasMes(anio: number, mes: number): Observable<EstadisticasRecaudacion> {
    const mesTexto = mes.toString().padStart(2, '0');
    const fechaInicio = `${anio}-${mesTexto}-01`;

    // Calcular el último día correcto del mes (mes es 0-based, así que el día 0 del mes siguiente)
    const ultimoDiaMes = new Date(anio, mes + 1, 0).getDate();
    const fechaFin = `${anio}-${mesTexto}-${ultimoDiaMes.toString().padStart(2, '0')}`;

    console.log(`Estadísticas mes ${mes + 1}/${anio}: ${fechaInicio} a ${fechaFin}`);

    return this.getMantencionesPorRango(fechaInicio, fechaFin).pipe(
      map(mantenciones => this.calcularEstadisticas(mantenciones, 'mes', fechaInicio, fechaFin))
    );
  }

  // Obtener estadísticas por año
  getEstadisticasAnio(anio: number): Observable<EstadisticasRecaudacion> {
    const fechaInicio = `${anio}-01-01`;
    const fechaFin = `${anio}-12-31`;
    
    return this.getMantencionesPorRango(fechaInicio, fechaFin).pipe(
      map(mantenciones => this.calcularEstadisticas(mantenciones, 'año', fechaInicio, fechaFin))
    );
  }

  // Obtener todas las mantenciones de una fecha específica
  private getMantencionesPorFecha(fecha: string): Observable<Mantencion[]> {
    return this.getMantencionesPorRango(fecha, fecha);
  }

  // Obtener mantenciones en un rango de fechas (desde el caché compartido de clientes)
  private getMantencionesPorRango(fechaInicio: string, fechaFin: string): Observable<Mantencion[]> {
    return this.clienteService.clientes$.pipe(
      take(1),
      map(clientes => {
        const mantenciones: Mantencion[] = [];

        for (const cliente of clientes) {
          for (const mantencion of cliente.historial as any[]) {
            if (mantencion.fecha < fechaInicio || mantencion.fecha > fechaFin) continue;

            mantenciones.push({
              id: `${cliente.id}_${mantencion.fecha}_${mantencion.hora || '00:00'}`,
              registroId: mantencion.id,
              clienteId: cliente.id!,
              clienteNombre: cliente.nombre || 'Cliente sin nombre',
              fecha: mantencion.fecha,
              precio: precioEfectivoMantencion(mantencion, cliente.precio || 0),
              cloro: mantencion.cloro || 0,
              ph: mantencion.ph || 0,
              servicio: mantencion.servicio || 'Mantención',
              hora: mantencion.hora,
              cantidadCloro: mantencion.cantidadCloro || 0,
              cantidadBajaPh: mantencion.cantidadBajaPh || 0,
              cantidadSubePh: mantencion.cantidadSubePh || 0,
              cantidadPastillas: mantencion.cantidadPastillas || 0,
              tipoPh: mantencion.tipoPh,
              // incluir campos de pago si existen en el historial
              pagado: mantencion.pagado,
              pago: mantencion.pago,
              estadoPago: mantencion.estadoPago,
              fechaPago: mantencion.fechaPago,
              suspendida: esMantencionSaltada(mantencion) || undefined
            });
          }
        }

        return mantenciones;
      })
    );
  }

  // Calcular estadísticas a partir de las mantenciones
  private calcularEstadisticas(
    mantenciones: Mantencion[], 
    periodo: string, 
    fechaInicio: string, 
    fechaFin: string
  ): EstadisticasRecaudacion {
    // Las suspendidas no generan dinero, se excluyen de los totales
    const reales = mantenciones.filter(m => !m.suspendida);
    const total = reales.reduce((sum, mantencion) => sum + mantencion.precio, 0);
    const cantidadMantenciones = reales.length;
    const promedioPorMantencion = cantidadMantenciones > 0 ? total / cantidadMantenciones : 0;

    return {
      total,
      cantidadMantenciones,
      promedioPorMantencion,
      periodo,
      fechaInicio,
      fechaFin
    };
  }

  // Obtener mantenciones detalladas para mostrar en la lista
  getMantencionesDetalladas(fechaInicio: string, fechaFin: string): Observable<Mantencion[]> {
    return this.getMantencionesPorRango(fechaInicio, fechaFin).pipe(
      map(mantenciones => mantenciones.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()))
    );
  }

  /**
   * Obtener estadísticas de químicos del rango.
   * Los totales de cloro / baja pH / sube pH están en KILOS, las pastillas en unidades.
   */
  getEstadisticasQuimicas(fechaInicio: string, fechaFin: string): Observable<EstadisticasQuimicas> {
    return this.getMantencionesPorRango(fechaInicio, fechaFin).pipe(
      map(mantenciones => {
        // Las suspendidas no usaron productos, se excluyen de los promedios
        const reales = mantenciones.filter(m => !m.suspendida);
        const totalCloro = reales.reduce((sum, m) => sum + (m.cantidadCloro || 0), 0);
        const totalPh = reales.reduce((sum, m) => sum + m.ph, 0);
        const totalSubePh = reales.reduce((sum, m) => sum + (m.cantidadSubePh || 0), 0);
        const totalBajaPh = reales.reduce((sum, m) => sum + (m.cantidadBajaPh || 0), 0);
        const totalPastillas = reales.reduce((sum, m) => sum + (m.cantidadPastillas || 0), 0);
        const cantidad = reales.length;
        const porMantencion = (total: number) => (cantidad > 0 ? total / cantidad : 0);

        return {
          // Niveles medidos (ppm / pH)
          promedioCloro: cantidad > 0 ? reales.reduce((sum, m) => sum + m.cloro, 0) / cantidad : 0,
          promedioPh: porMantencion(totalPh),
          // Totales de consumo
          totalCloro,
          totalPh,
          totalSubePh,
          totalBajaPh,
          totalPastillas,
          // Promedios por mantención
          promedioCloroKg: porMantencion(totalCloro),
          promedioSubePhKg: porMantencion(totalSubePh),
          promedioBajaPhKg: porMantencion(totalBajaPh),
          promedioPhKg: porMantencion(totalSubePh + totalBajaPh),
          promedioPastillas: porMantencion(totalPastillas),
          cantidadMantenciones: cantidad
        };
      })
    );
  }

  // Devuelve las mantenciones pagadas en el rango y el total de dinero pagado
  clientePagoListo(fechaInicio: string, fechaFin: string): Observable<{ dineroPagado: number; mantenciones: Mantencion[] }> {
    return this.getMantencionesPorRango(fechaInicio, fechaFin).pipe(
      map(mantenciones => {
        // Las suspendidas no son deudas ni pagos
        const reales = mantenciones.filter(m => !m.suspendida);

        const pagadas = reales.filter(m => esMantencionPagada(m));
        const dineroPagado = pagadas.reduce((sum, m) => sum + (m.precio || 0), 0);
        return { dineroPagado, mantenciones: pagadas };
      })
    );
  }

  // Devuelve las mantenciones pendientes de pago en el rango y el total pendiente
  clientesPagoPendiente(fechaInicio: string, fechaFin: string): Observable<{ dineroPendiente: number; mantenciones: Mantencion[] }> {
    return this.getMantencionesPorRango(fechaInicio, fechaFin).pipe(
      map(mantenciones => {
        // Las suspendidas no son deudas ni pagos
        const reales = mantenciones.filter(m => !m.suspendida);

        const pendientes = reales.filter(m => !esMantencionPagada(m));
        const dineroPendiente = pendientes.reduce((sum, m) => sum + (m.precio || 0), 0);
        return { dineroPendiente, mantenciones: pendientes };
      })
    );
  }
}