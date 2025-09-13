import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonLabel, IonSpinner, IonBadge, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonChip, IonIcon } from '@ionic/angular/standalone';
import { ActivatedRoute } from '@angular/router';
import { ClienteService, Cliente } from '../../../services/cliente.service';
import { addIcons } from 'ionicons';
import { timeOutline, constructOutline, beakerOutline, flaskOutline } from 'ionicons/icons';

addIcons({
  'time-outline': timeOutline,
  'construct-outline': constructOutline,
  'beaker-outline': beakerOutline,
  'flask-outline': flaskOutline,
});

@Component({
  selector: 'app-historial-cliente',
  templateUrl: './historial-cliente.page.html',
  styleUrls: ['./historial-cliente.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton,
    IonLabel, IonSpinner, IonBadge,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonChip, IonIcon,
    CommonModule, FormsModule
  ]
})
export class HistorialClientePage implements OnInit {
  clienteId!: string;
  cliente?: Cliente;
  isLoading = true;
  error?: string;
  historialOrdenado: Cliente['historial'] = [];

  constructor(
    private route: ActivatedRoute,
    private clienteService: ClienteService
  ) {}

  ngOnInit() {
    this.clienteId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.clienteId) {
      this.error = 'ID de cliente no proporcionado';
      this.isLoading = false;
      return;
    }

    this.clienteService.getClienteById(this.clienteId).subscribe({
      next: (cliente) => {
        this.cliente = cliente;
        this.historialOrdenado = this.ordenarHistorial(cliente.historial || []);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando cliente:', err);
        this.error = 'No se pudo cargar el historial del cliente';
        this.isLoading = false;
      }
    });
  }

  private ordenarHistorial(historial: Cliente['historial']): Cliente['historial'] {
    // Ordenar del más nuevo al más antiguo
    return [...historial].sort((a, b) => this.getTime(b) - this.getTime(a));
  }

  private getTime(item: { fecha?: string; hora?: string }): number {
    const fecha = (item.fecha || '').trim();
    const hora = (item.hora || '00:00').trim();

    if (!fecha) return 0;

    // Soporta formatos: YYYY-MM-DD, DD/MM/YYYY y DD-MM-YYYY
    let isoDate = fecha;
    if (fecha.includes('/')) {
      const [d, m, y] = fecha.split('/');
      if (d && m && y) isoDate = `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else if (fecha.includes('-')) {
      const [a, b, c] = fecha.split('-');
      if (a && b && c) {
        if (a.length === 4) {
          isoDate = fecha; // YYYY-MM-DD
        } else {
          isoDate = `${c.padStart(4, '0')}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`; // DD-MM-YYYY -> YYYY-MM-DD
        }
      }
    }

    const time = hora.length === 5 ? `${hora}:00` : hora; // asegurar HH:mm:ss
    const dateStr = `${isoDate}T${time}`;
    const t = Date.parse(dateStr);
    return isNaN(t) ? 0 : t;
  }

  // Helper para usar en el template en lugar de Math.abs
  abs(value: number | null | undefined): number {
    return Math.abs(Number(value) || 0);
  }
}
