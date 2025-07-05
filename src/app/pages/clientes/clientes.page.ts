import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ClienteService, Cliente } from '../../services/cliente.service';
import { addIcons } from 'ionicons';
import { addOutline, pencil } from 'ionicons/icons';

addIcons({
  'add-outline': addOutline,
  'pencil': pencil,
});

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './clientes.page.html',
  styleUrls: ['./clientes.page.scss'],
})
export class ClientesPage implements OnInit {
  clientes: Cliente[] = [];

  constructor(
    private clienteService: ClienteService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.cargarClientes();
  }

  cargarClientes() {
    this.clienteService.getClientes().subscribe({
      next: (data) => (this.clientes = data),
      error: (err) => console.error('Error al cargar clientes', err),
    });
  }

  // Método debug - añade logs para ver si se ejecuta
  editarCliente(cliente: Cliente) {
    console.log('Editando cliente:', cliente);
    try {
      this.router.navigate(['crear-clientes', cliente.id], { relativeTo: this.route });
      console.log('✅ Navegación a edición exitosa');
    } catch (error) {
      console.error('❌ Error al navegar a edición:', error);
    }
  }

  irACrearCliente() {
    console.log('Botón presionado - irACrearCliente()');
    console.log('Router disponible:', !!this.router);
    console.log('Route disponible:', !!this.route);
    
    try {
      this.router.navigate(['crear-clientes'], { relativeTo: this.route });
      console.log('✅ Navegación exitosa');
    } catch (error) {
      console.error('❌ Error en navegación:', error);
    }
  }
}