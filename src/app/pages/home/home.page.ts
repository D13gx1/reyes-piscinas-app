import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { refreshOutline } from 'ionicons/icons'; 


interface Cliente {
  id: number;
  nombre: string;
  direccion: string;
  horario: string; // Ej: "Mañana", "Tarde"
  realizado: boolean;
}

addIcons({
  'refresh-outline': refreshOutline,
});

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage {
  fechaHoy: string;
  clientesPendientes: Cliente[] = [
    { id: 1, nombre: 'Juan Pérez', direccion: 'Av. Las Palmas 123', horario: 'Mañana', realizado: false },
    { id: 2, nombre: 'María López', direccion: 'Calle Los Robles 45', horario: 'Tarde', realizado: false },
  ];
  clientesRealizados: Cliente[] = [];

  constructor(private alertController: AlertController) {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const today = new Date();
    // Format the date in Spanish and capitalize first letter of each word
    const formattedDate = today.toLocaleDateString('es-ES', options)
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    this.fechaHoy = `${formattedDate}`;
  }

  async marcarRealizado(cliente: Cliente) {
    const alert = await this.alertController.create({
      header: 'Mantención Piscina',
      subHeader: `Cliente: ${cliente.nombre}`,
      inputs: [
        { name: 'estadoCloro', type: 'text', placeholder: 'Niveles de Cloro' },
        { name: 'estadoPh', type: 'text', placeholder: 'Niveles de pH' },
        { name: 'cloro', type: 'number', placeholder: 'Cantidad de Cloro (kilos)' },
        { name: 'ph', type: 'number', placeholder: 'pH agregado o corregido' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            console.log('Datos ingresados:', data);
            cliente.realizado = true;
            this.clientesRealizados.push(cliente);
            this.clientesPendientes = this.clientesPendientes.filter((c) => c.id !== cliente.id);
          },
        },
      ],
    });

    await alert.present();
  }
}
