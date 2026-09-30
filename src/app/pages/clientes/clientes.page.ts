import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController, ActionSheetController } from '@ionic/angular';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ClienteService, Cliente } from '../../services/cliente.service';
import { esMantencionSaltada, precioEfectivoMantencion } from '../../utils/mantencion';
import { defineCustomElement as defineIonFab } from '@ionic/core/components/ion-fab.js';
import { defineCustomElement as defineIonFabButton } from '@ionic/core/components/ion-fab-button.js';
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
  peopleOutline,
  funnelOutline,
  arrowUpOutline,
  arrowDownOutline,
  searchOutline
} from 'ionicons/icons';

type CriterioOrden = 'nombre' | 'valor' | 'precio' | 'antiguedad';

const CRITERIOS_ORDEN: { valor: CriterioOrden; texto: string }[] = [
  { valor: 'nombre', texto: 'Nombre' },
  { valor: 'valor', texto: 'Valor (total generado)' },
  { valor: 'precio', texto: 'Precio por mantención' },
  { valor: 'antiguedad', texto: 'Antigüedad' },
];

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
  'funnel-outline': funnelOutline,
  'arrow-up-outline': arrowUpOutline,
  'arrow-down-outline': arrowDownOutline,
  'search-outline': searchOutline,
});

// La app arranca con provideIonicAngular() (standalone), que solo registra los
// componentes importados desde '@ionic/angular/standalone'. ion-fab no se usa en
// ningún otro lado, así que sin esto queda como etiqueta sin definir: sin
// círculo, sin posición fija y sin poder tocarse.
defineIonFab();
defineIonFabButton();

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './clientes.page.html',
  styleUrls: ['./clientes.page.scss'],
})
export class ClientesPage implements OnInit {
  private destroyRef = inject(DestroyRef);
  clientes: Cliente[] = [];
  clientesActivos: Cliente[] = [];
  clientesInactivos: Cliente[] = [];
  isLoading = false;

  busqueda = '';
  criterioOrden: CriterioOrden = 'nombre';
  ascendente = true;

  constructor(
    private clienteService: ClienteService,
    private router: Router,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController
  ) {}

  private readonly precioFormatter = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

  formatearPrecio(precio: number): string {
    return this.precioFormatter.format(precio || 0);
  }

  get textoCriterio(): string {
    return CRITERIOS_ORDEN.find(c => c.valor === this.criterioOrden)!.texto.split(' ')[0];
  }

  ngOnInit() {
    this.cargarClientes();
  }

  // Lista en vivo: se actualiza sola al volver a la página o cuando cambia algo
  cargarClientes() {
    this.isLoading = this.clientes.length === 0;

    this.clienteService.clientes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          // Copia: esta pantalla modifica `activo` antes de guardar
          this.clientes = structuredClone(data);
          this.organizarClientes();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error al cargar clientes', err);
          this.showToast('Error al cargar clientes ❌', 'danger');
          this.isLoading = false;
        }
      });
  }

  organizarClientes() {
    const termino = this.normalizar(this.busqueda.trim());
    const visibles = this.clientes
      .filter(c => !termino || this.normalizar(c.nombre).includes(termino))
      .sort((a, b) => this.comparar(a, b));

    this.clientesActivos = visibles.filter(cliente => cliente.activo);
    this.clientesInactivos = visibles.filter(cliente => !cliente.activo);
  }

  onBusqueda(valor: string | null | undefined) {
    this.busqueda = valor || '';
    this.organizarClientes();
  }

  async elegirOrden() {
    const sheet = await this.actionSheetController.create({
      header: 'Ordenar clientes por',
      buttons: [
        ...CRITERIOS_ORDEN.map(c => ({
          text: c.texto + (c.valor === this.criterioOrden ? '  ✓' : ''),
          handler: () => {
            this.criterioOrden = c.valor;
            this.organizarClientes();
          }
        })),
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    await sheet.present();
  }

  alternarDireccion() {
    this.ascendente = !this.ascendente;
    this.organizarClientes();
  }

  // Sin tildes ni mayúsculas, para que "maria" encuentre a "María"
  private normalizar(texto: string): string {
    return (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private comparar(a: Cliente, b: Cliente): number {
    let r: number;
    switch (this.criterioOrden) {
      case 'valor':
        r = this.valorTotal(a) - this.valorTotal(b);
        break;
      case 'precio':
        r = (a.precio || 0) - (b.precio || 0);
        break;
      case 'antiguedad':
        // Ascendente = el más antiguo primero
        r = this.fechaAlta(a).localeCompare(this.fechaAlta(b));
        break;
      default:
        r = 0;
    }
    if (r === 0) {
      r = a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
    }
    return this.ascendente ? r : -r;
  }

  /** Lo que ha generado el cliente: suma de lo cobrado en sus mantenciones realizadas. */
  private valorTotal(cliente: Cliente): number {
    return (cliente.historial || [])
      .filter(m => !esMantencionSaltada(m))
      .reduce((total, m) => total + precioEfectivoMantencion(m, cliente.precio), 0);
  }

  /**
   * Fecha desde la que se considera cliente. Los creados antes de existir
   * `fechaCreacion` usan su primera mantención; sin ninguna, van al final.
   */
  private fechaAlta(cliente: Cliente): string {
    if (cliente.fechaCreacion) return cliente.fechaCreacion.slice(0, 10);
    const fechas = (cliente.historial || []).map(m => m.fecha).filter(Boolean).sort();
    return fechas[0] || '9999-12-31';
  }

  // La lista ya está al día; el botón solo lo confirma
  refrescarClientes() {
    this.showToast('Lista actualizada ✅', 'success');
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
      this.router.navigate(['/tabs/clientes/historial-cliente', cliente.id])
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

  // Tocar la etiqueta Activo/Inactivo ofrece el cambio contrario
  alternarEstado(cliente: Cliente) {
    if (cliente.activo) {
      this.desactivarCliente(cliente);
    } else {
      this.activarCliente(cliente);
    }
  }

  async activarCliente(cliente: Cliente) {
    const alert = await this.alertController.create({
      header: 'Activar Cliente',
      message: `¿Quieres volver a activar a ${cliente.nombre}?`,
      subHeader: 'El cliente volverá a aparecer en los mantenimientos programados.',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'secondary' },
        { text: 'Activar', handler: () => this.procederActivarCliente(cliente) }
      ]
    });

    await alert.present();
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
