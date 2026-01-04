import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Firestore, collection, getDocs, query, where } from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';

export interface EstadisticasRecaudacion {
  total: number;
  cantidadMantenciones: number;
  promedioPorMantencion: number;
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface Mantencion {
  id: string;
  clienteId: string;
  clienteNombre: string;
  fecha: string;
  precio: number;
  cloro: number;
  ph: number;
  cantidadCloro?: number;
  cantidadBajaPh?: number;
  cantidadSubePh?: number;
  cantidadPastillas?: number;
  servicio: string;
  hora?: string;
  tipoPh?: 'Sube pH' | 'Baja pH';
  // Campos relacionados a pago
  pagado?: boolean | string;
  pago?: boolean | string;
  estadoPago?: string;
  fechaPago?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EstadisticasService {
  private auth: Auth = inject(Auth);
  private currentUserId: string | null = null;

  constructor(private firestore: Firestore) {
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
    const fechaInicio = `${anio}-${mes.toString().padStart(2, '0')}-01`;
    const fechaFin = `${anio}-${mes.toString().padStart(2, '0')}-31`;
    
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
    return new Observable<Mantencion[]>(subscriber => {
      const authSubscription = user(this.auth).subscribe({
        next: (user) => {
          if (!user) {
            console.warn('⚠️ No hay usuario autenticado');
            subscriber.next([]);
            subscriber.complete();
            return;
          }

          console.log('✅ Usuario autenticado con ID:', user.uid);
          const clientesRef = collection(this.firestore, 'clientes');
          const q = query(clientesRef, where('userId', '==', user.uid));

          console.log('🔎 Ejecutando consulta Firestore para fecha específica...');
          from(getDocs(q)).subscribe({
            next: (snapshot) => {
              const mantenciones: Mantencion[] = [];

              snapshot.docs.forEach(doc => {
                const data = doc.data();
                const historial = data['historial'] || [];

                historial.forEach((mantencion: any) => {
                  if (mantencion.fecha === fecha) {
                    mantenciones.push({
                      id: `${doc.id}_${mantencion.fecha}_${mantencion.hora || '00:00'}`,
                      clienteId: doc.id,
                      clienteNombre: data['nombre'] || 'Cliente sin nombre',
                      fecha: mantencion.fecha,
                      precio: data['precio'] || 0, // Usar el precio del cliente
                      cloro: mantencion.cloro || 0,
                      ph: mantencion.ph || 0,
                      servicio: mantencion.servicio || 'Mantención',
                      hora: mantencion.hora,
                      cantidadCloro: mantencion.cantidadCloro || 0,
                      cantidadBajaPh: mantencion.cantidadBajaPh || 0,
                      cantidadSubePh: mantencion.cantidadSubePh || 0,
                      cantidadPastillas: mantencion.cantidadPastillas || 0,
                      tipoPh: mantencion.tipoPh
                      ,
                      // incluir campos de pago si existen en el historial
                      pagado: mantencion.pagado,
                      pago: mantencion.pago,
                      estadoPago: mantencion.estadoPago,
                      fechaPago: mantencion.fechaPago
                    });
                  }
                });
              });

              console.log(`📊 Se encontraron ${mantenciones.length} mantenciones para la fecha ${fecha}`);
              subscriber.next(mantenciones);
              subscriber.complete();
            },
            error: (error) => {
              console.error('❌ Error al cargar mantenciones por fecha:', error);
              subscriber.error(error);
            }
          });
        },
        error: (error) => {
          console.error('❌ Error en la autenticación:', error);
          subscriber.error(error);
        },
        complete: () => {
          if (authSubscription) {
            authSubscription.unsubscribe();
          }
        }
      });
    });
  }

  // Obtener mantenciones en un rango de fechas
  private getMantencionesPorRango(fechaInicio: string, fechaFin: string): Observable<Mantencion[]> {
    return new Observable<Mantencion[]>(subscriber => {
      const authSubscription = user(this.auth).subscribe({
        next: (user) => {
          if (!user) {
            console.warn('⚠️ No hay usuario autenticado');
            subscriber.next([]);
            subscriber.complete();
            return;
          }

          console.log('✅ Usuario autenticado con ID:', user.uid);
          const clientesRef = collection(this.firestore, 'clientes');
          const q = query(clientesRef, where('userId', '==', user.uid));

          console.log('🔎 Ejecutando consulta Firestore para rango de fechas...');
          from(getDocs(q)).subscribe({
            next: (snapshot) => {
              const mantenciones: Mantencion[] = [];

              snapshot.docs.forEach(doc => {
                const data = doc.data();
                const historial = data['historial'] || [];

                historial.forEach((mantencion: any) => {
                  if (mantencion.fecha >= fechaInicio && mantencion.fecha <= fechaFin) {
                    mantenciones.push({
                      id: `${doc.id}_${mantencion.fecha}_${mantencion.hora || '00:00'}`,
                      clienteId: doc.id,
                      clienteNombre: data['nombre'] || 'Cliente sin nombre',
                      fecha: mantencion.fecha,
                      precio: data['precio'] || 0, // Usar el precio del cliente
                      cloro: mantencion.cloro || 0,
                      ph: mantencion.ph || 0,
                      servicio: mantencion.servicio || 'Mantención',
                      hora: mantencion.hora,
                      cantidadCloro: mantencion.cantidadCloro || 0,
                      cantidadBajaPh: mantencion.cantidadBajaPh || 0,
                      cantidadSubePh: mantencion.cantidadSubePh || 0,
                      cantidadPastillas: mantencion.cantidadPastillas || 0,
                      tipoPh: mantencion.tipoPh
                      ,
                      // incluir campos de pago si existen en el historial
                      pagado: mantencion.pagado,
                      pago: mantencion.pago,
                      estadoPago: mantencion.estadoPago,
                      fechaPago: mantencion.fechaPago
                    });
                  }
                });
              });

              console.log(`📊 Se encontraron ${mantenciones.length} mantenciones en el rango ${fechaInicio} - ${fechaFin}`);
              subscriber.next(mantenciones);
              subscriber.complete();
            },
            error: (error) => {
              console.error('❌ Error al cargar mantenciones por rango:', error);
              subscriber.error(error);
            }
          });
        },
        error: (error) => {
          console.error('❌ Error en la autenticación:', error);
          subscriber.error(error);
        },
        complete: () => {
          if (authSubscription) {
            authSubscription.unsubscribe();
          }
        }
      });
    });
  }

  // Calcular estadísticas a partir de las mantenciones
  private calcularEstadisticas(
    mantenciones: Mantencion[], 
    periodo: string, 
    fechaInicio: string, 
    fechaFin: string
  ): EstadisticasRecaudacion {
    const total = mantenciones.reduce((sum, mantencion) => sum + mantencion.precio, 0);
    const cantidadMantenciones = mantenciones.length;
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

  // Obtener estadísticas de cloro y pH
  getEstadisticasQuimicas(fechaInicio: string, fechaFin: string): Observable<any> {
    return this.getMantencionesPorRango(fechaInicio, fechaFin).pipe(
      map(mantenciones => {
        const totalCloro = mantenciones.reduce((sum, m) => sum + (m.cantidadCloro || 0), 0);
        const totalPh = mantenciones.reduce((sum, m) => sum + m.ph, 0);
        const totalSubePh = mantenciones.reduce((sum, m) => sum + (m.cantidadSubePh || 0), 0);
        const totalBajaPh = mantenciones.reduce((sum, m) => sum + (m.cantidadBajaPh || 0), 0);
        const totalPastillas = mantenciones.reduce((sum, m) => sum + (m.cantidadPastillas || 0), 0);
        const cantidad = mantenciones.length;

        return {
          promedioCloro: cantidad > 0 ? mantenciones.reduce((sum, m) => sum + m.cloro, 0) / cantidad : 0,
          promedioPh: cantidad > 0 ? totalPh / cantidad : 0,
          totalCloro,
          totalPh,
          totalSubePh,
          totalBajaPh,
          totalPastillas,
          cantidadMantenciones: cantidad
        };
      })
    );
  }

  // Devuelve las mantenciones pagadas en el rango y el total de dinero pagado
  clientePagoListo(fechaInicio: string, fechaFin: string): Observable<{ dineroPagado: number; mantenciones: Mantencion[] }> {
    return this.getMantencionesPorRango(fechaInicio, fechaFin).pipe(
      map(mantenciones => {
        const esPagado = (m: any) => {
          if (m == null) return false;
          // Soporta varias formas comunes de almacenar pago
          if (m.pagado === true) return true;
          if (typeof m.pagado === 'string' && /^(si|sí|true)$/i.test(m.pagado)) return true;
          if (m.pago === true) return true;
          if (typeof m.pago === 'string' && /^(si|sí|true)$/i.test(m.pago)) return true;
          if (m.estadoPago && typeof m.estadoPago === 'string' && /^(pagado|completado)$/i.test(m.estadoPago)) return true;
          return false;
        };

        const pagadas = mantenciones.filter(m => esPagado(m));
        const dineroPagado = pagadas.reduce((sum, m) => sum + (m.precio || 0), 0);
        return { dineroPagado, mantenciones: pagadas };
      })
    );
  }

  // Devuelve las mantenciones pendientes de pago en el rango y el total pendiente
  clientesPagoPendiente(fechaInicio: string, fechaFin: string): Observable<{ dineroPendiente: number; mantenciones: Mantencion[] }> {
    return this.getMantencionesPorRango(fechaInicio, fechaFin).pipe(
      map(mantenciones => {
        const esPagado = (m: any) => {
          if (m == null) return false;
          if (m.pagado === true) return true;
          if (typeof m.pagado === 'string' && /^(si|sí|true)$/i.test(m.pagado)) return true;
          if (m.pago === true) return true;
          if (typeof m.pago === 'string' && /^(si|sí|true)$/i.test(m.pago)) return true;
          if (m.estadoPago && typeof m.estadoPago === 'string' && /^(pagado|completado)$/i.test(m.estadoPago)) return true;
          return false;
        };

        const pendientes = mantenciones.filter(m => !esPagado(m));
        const dineroPendiente = pendientes.reduce((sum, m) => sum + (m.precio || 0), 0);
        return { dineroPendiente, mantenciones: pendientes };
      })
    );
  }
}