import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Cliente {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  medidas: {
    largo: number;
    ancho: number;
    profundidad: number;
  };
  precio: number;
  programacion: {
    frecuencia: string; // 'semanal', 'quincenal', 'mensual'
    cantidadPorPeriodo: number; // cuántos servicios por período
    diasSemana: string[]; // ['lunes', 'miercoles', 'viernes']
    horaPreferida: string; // formato HH:mm
    notas: string; // instrucciones adicionales
  };
  historial: {
    fecha: string;
    servicio: string;
    cloro: number;
    ph: number;
    estadoCloro?: string; // Nuevo campo para estado del cloro
    estadoPh?: string; // Nuevo campo para estado del pH
    hora?: string; // Nuevo campo para la hora del mantenimiento
  }[];
  activo: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ClienteService {
  private apiUrl = 'http://localhost:3000/clientes';

  constructor(private http: HttpClient) {}

  getClientes(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(this.apiUrl);
  }

  getClienteById(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.apiUrl}/${id}`);
  }

  addCliente(cliente: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(this.apiUrl, cliente);
  }

  updateCliente(cliente: Cliente): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.apiUrl}/${cliente.id}`, cliente);
  }

  deleteCliente(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Método auxiliar para obtener clientes por día de la semana
  getClientesPorDia(dia: string): Observable<Cliente[]> {
    return new Observable(observer => {
      this.getClientes().subscribe({
        next: (clientes) => {
          const clientesDelDia = clientes.filter(cliente => 
            cliente.activo && 
            cliente.programacion && 
            cliente.programacion.diasSemana.includes(dia)
          );
          observer.next(clientesDelDia);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  
}