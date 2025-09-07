import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ClienteService, Cliente } from '../../services/cliente.service';
import { addIcons } from 'ionicons';
import { 
  addOutline, 
  pencilOutline, 
  refreshOutline, 
  checkmarkCircleOutline, 
  pauseCircleOutline, 
  locationOutline, 
  resizeOutline, 
  callOutline, 
  mailOutline, 
  peopleOutline 
} from 'ionicons/icons';

addIcons({
  'add-outline': addOutline,
  'pencil-outline': pencilOutline,
  'refresh-outline': refreshOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'pause-circle-outline': pauseCircleOutline,
  'location-outline': locationOutline,
  'resize-outline': resizeOutline,
  'call-outline': callOutline,
  'mail-outline': mailOutline,
  'people-outline': peopleOutline,
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
  clientesActivos: Cliente[] = [];
  clientesInactivos: Cliente[] = [];
  isLoading = false;

  constructor(
    private clienteService: ClienteService,
    private router: Router,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.cargarClientes();
  }

  // Agregar ionViewWillEnter para refrescar cuando se vuelve a la página
  ionViewWillEnter() {
    this.cargarClientes();
  }

  cargarClientes() {
    this.isLoading = true;
    
    this.clienteService.getClientes().subscribe({
      next: (data) => {
        this.clientes = data;
        this.organizarClientes();
        this.isLoading = false;
        console.log('Clientes cargados:', data.length);
      },
      error: (err) => {
        console.error('Error al cargar clientes', err);
        this.showToast('Error al cargar clientes ❌', 'danger');
        this.isLoading = false;
      }
    });
  }

  organizarClientes() {
    this.clientesActivos = this.clientes.filter(cliente => cliente.activo);
    this.clientesInactivos = this.clientes.filter(cliente => !cliente.activo);
  }

  async refrescarClientes() {
    this.isLoading = true;
    
    // Simular delay para mostrar loading
    setTimeout(() => {
      this.cargarClientes();
      this.showToast('Lista actualizada ✅', 'success');
    }, 1000);
  }

  editarCliente(cliente: Cliente) {
    console.log('Editando cliente:', cliente);
    try {
      this.router.navigate(['/tabs/clientes/crear-clientes', cliente.id]);
      console.log('✅ Navegación a edición exitosa');
    } catch (error) {
      console.error('❌ Error al navegar a edición:', error);
      this.showToast('Error al navegar a edición ❌', 'danger');
    }
  }

  verHistorial(cliente: Cliente){
    try{
      this.router.navigate(['/tabs/clientes/historial-cliente', cliente])
    } catch (error){
      console.error('❌ Error en navegación:', error);
      this.showToast('Error al navegar al historial ❌', 'danger');
    }
  }

  irACrearCliente() {
    console.log('Botón presionado - irACrearCliente()');
    try {
      this.router.navigate(['/tabs/clientes/crear-clientes']);
      console.log('✅ Navegación exitosa');
    } catch (error) {
      console.error('❌ Error en navegación:', error);
      this.showToast('Error al navegar al crear cliente ❌', 'danger');
    }
  }
  
  procederActivarCliente(cliente: Cliente) {
    cliente.activo = true;
    
    this.clienteService.updateCliente(cliente).subscribe({
      next: () => {
        this.organizarClientes();
        this.showToast(`${cliente.nombre} activado exitosamente ✅`, 'success');
      },
      error: (err) => {
        console.error('Error al activar cliente:', err);
        this.showToast('Error al activar cliente ❌', 'danger');
        // Revertir cambio en caso de error
        cliente.activo = false;
      }
    });
  }

  async desactivarCliente(cliente: Cliente) {
    const alert = await this.alertController.create({
      header: 'Desactivar Cliente',
      message: `¿Estás seguro de que quieres desactivar a ${cliente.nombre}?`,
      subHeader: 'El cliente no aparecerá en los mantenimientos programados.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Desactivar',
          cssClass: 'danger',
          handler: () => {
            this.procederDesactivarCliente(cliente);
          }
        }
      ]
    });

    await alert.present();
  }

  procederDesactivarCliente(cliente: Cliente) {
    cliente.activo = false;
    
    this.clienteService.updateCliente(cliente).subscribe({
      next: () => {
        this.organizarClientes();
        this.showToast(`${cliente.nombre} desactivado exitosamente ✅`, 'success');
      },
      error: (err) => {
        console.error('Error al desactivar cliente:', err);
        this.showToast('Error al desactivar cliente ❌', 'danger');
        // Revertir cambio en caso de error
        cliente.activo = true;
      }
    });
  }


  

  procederEliminarCliente(cliente: Cliente) {
    if (!cliente.id) {
      this.showToast('Error: ID de cliente no válido ❌', 'danger');
      return;
    }
    this.clienteService.deleteCliente(cliente.id).subscribe({
      next: () => {
        this.cargarClientes();
        this.showToast(`${cliente.nombre} eliminado exitosamente ✅`, 'success');
      },
      error: (err) => {
        console.error('Error al eliminar cliente:', err);
        this.showToast('Error al eliminar cliente ❌', 'danger');
      }
    });
  }

  async showToast(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  // Método para obtener el estado formateado del cliente
  getEstadoCliente(cliente: Cliente): string {
    return cliente.activo ? 'Activo' : 'Inactivo';
  }

  // Método para obtener el color del chip según el estado
  getColorEstado(cliente: Cliente): string {
    return cliente.activo ? 'success' : 'danger';
  }

  // Método para formatear las dimensiones de la piscina
  formatearDimensiones(medidas: any): string {
    if (!medidas) return 'Sin dimensiones';
    
    const { largo, ancho, profundidad } = medidas;
    return `${largo || 0}x${ancho || 0}x${profundidad || 0}m`;
  }

  // Método para formatear el teléfono
  formatearTelefono(telefono: string): string {
    if (!telefono) return 'Sin teléfono';
    return telefono;
  }

  // Método para formatear el email
  formatearEmail(email: string): string {
    if (!email) return 'Sin email';
    return email;
  }

  // Método para obtener información adicional del cliente
  getInfoAdicional(cliente: Cliente): any {
    return {
      telefono: this.formatearTelefono(cliente.telefono),
      email: this.formatearEmail(cliente.email),
      dimensiones: this.formatearDimensiones(cliente.medidas),
      frecuencia: cliente.programacion?.frecuencia || 'Sin programación',
      diasSemana: cliente.programacion?.diasSemana?.length || 0
    };
  }

  // Método para trackear elementos en *ngFor para mejor rendimiento
  trackByClienteId(index: number, cliente: Cliente): string {
    return cliente.id || '';
  }
}

