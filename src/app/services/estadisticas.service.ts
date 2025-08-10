import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';

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
  servicio: string;
  hora?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EstadisticasService {
  constructor(private firestore: Firestore) {}

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
    const clientesRef = collection(this.firestore, 'clientes');
    
    return from(getDocs(clientesRef)).pipe(
      map(snapshot => {
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
                hora: mantencion.hora
              });
            }
          });
        });
        
        return mantenciones;
      })
    );
  }

  // Obtener mantenciones en un rango de fechas
  private getMantencionesPorRango(fechaInicio: string, fechaFin: string): Observable<Mantencion[]> {
    const clientesRef = collection(this.firestore, 'clientes');
    
    return from(getDocs(clientesRef)).pipe(
      map(snapshot => {
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
                hora: mantencion.hora
              });
            }
          });
        });
        
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
        const totalCloro = mantenciones.reduce((sum, mantencion) => sum + mantencion.cloro, 0);
        const totalPh = mantenciones.reduce((sum, mantencion) => sum + mantencion.ph, 0);
        const cantidad = mantenciones.length;

        return {
          promedioCloro: cantidad > 0 ? totalCloro / cantidad : 0,
          promedioPh: cantidad > 0 ? totalPh / cantidad : 0,
          totalCloro,
          totalPh,
          cantidadMantenciones: cantidad
        };
      })
    );
  }
} 