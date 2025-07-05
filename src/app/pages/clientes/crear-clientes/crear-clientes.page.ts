import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { ClienteService, Cliente } from '../../../services/cliente.service';

@Component({
  selector: 'app-crear-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  templateUrl: './crear-clientes.page.html',
  styleUrls: ['./crear-clientes.page.scss'],
})
export class CrearClientesPage {
  nuevoCliente: Cliente = {
    id: 0,
    nombre: '',
    direccion: '',
    telefono: '',
    email: '',
    medidas: {
      largo: 0,
      ancho: 0,
      profundidad: 0,
    },
    historial: [],
    activo: true,
  };

  constructor(
    private clienteService: ClienteService,
    private router: Router,
    private toastController: ToastController
  ) {}

  crearCliente(form: NgForm) {
    if (form.invalid) {
      this.showToast('Por favor completa todos los campos correctamente ❌', 'danger');
      return;
    }

    this.clienteService.addCliente(this.nuevoCliente).subscribe({
      next: async () => {
        this.showToast('Cliente creado con éxito ✅', 'success');
        this.router.navigate(['/clientes']);
      },
      error: () => {
        this.showToast('Error al crear cliente ❌', 'danger');
      },
    });
  }

  async showToast(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      color,
    });
    toast.present();
  }

  telefonoValido(): boolean {
    // Validar formato +56 9 1234 5678
    const regex = /^\+56\s[1-9]{1}\s\d{4}\s\d{4}$/;
    return regex.test(this.nuevoCliente.telefono);
  }
  
  
  emailValido(): boolean {
    // Si el campo está vacío, es válido porque es opcional
    if (!this.nuevoCliente.email) return true;
  
    // Si tiene contenido, debe cumplir formato de email
    const regex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    return regex.test(this.nuevoCliente.email);
  }
  
  medidasValidas(): boolean {
    return (
      this.nuevoCliente.medidas.largo > 0 &&
      this.nuevoCliente.medidas.ancho > 0 &&
      this.nuevoCliente.medidas.profundidad > 0
    );
  }

  formatearTelefono(event: any) {
    let valor: string = event.target.value;
  
    // Quitar todo excepto números
    valor = valor.replace(/\D/g, '');
  
    // Si ya comienza con 56, quitamos para evitar duplicar
    if (valor.startsWith('56')) {
      valor = valor.substring(2);
    }
  
    // Limitar máximo a 9 dígitos después de +56
    valor = valor.substring(0, 9);
  
    // Construir el formato: +56 9 1234 5678
    let formateado = '+56';
  
    if (valor.length > 0) {
      formateado += ' ' + valor.substring(0, 1); // Primer dígito (normalmente 9)
    }
  
    if (valor.length > 1) {
      formateado += ' ' + valor.substring(1, 5); // Siguiente bloque de 4 números
    }
  
    if (valor.length > 5) {
      formateado += ' ' + valor.substring(5, 9); // Último bloque de 4 números
    }
  
    // Actualizar valor en el input
    this.nuevoCliente.telefono = formateado.trim();
  }
  
  
  
  
}
