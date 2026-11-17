import { Component, OnInit, DestroyRef, ElementRef, ChangeDetectorRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { IonicModule, IonItemSliding, AlertController, ToastController, ActionSheetController } from '@ionic/angular';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ClienteService, Cliente } from '../../services/cliente.service';
import { esMantencionSaltada, precioEfectivoMantencion } from '../../utils/mantencion';
import { defineCustomElement as defineIonFab } from '@ionic/core/components/ion-fab.js';
import { defineCustomElement as defineIonFabButton } from '@ionic/core/components/ion-fab-button.js';
import { defineCustomElement as defineIonBadge } from '@ionic/core/components/ion-badge.js';
import { defineCustomElement as defineIonRefresher } from '@ionic/core/components/ion-refresher.js';
import { defineCustomElement as defineIonRefresherContent } from '@ionic/core/components/ion-refresher-content.js';
import { defineCustomElement as defineIonItemSliding } from '@ionic/core/components/ion-item-sliding.js';
import { defineCustomElement as defineIonItemOptions } from '@ionic/core/components/ion-item-options.js';
import { defineCustomElement as defineIonItemOption } from '@ionic/core/components/ion-item-option.js';
import { defineCustomElement as defineIonItem } from '@ionic/core/components/ion-item.js';
import { EncabezadoComponent } from '../../components/encabezado/encabezado.component';
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
  searchOutline,
  chevronDownOutline,
  checkmarkOutline,
  ellipsisHorizontal,
  cashOutline,
  closeCircle,
  timeOutline
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
  'chevron-down-outline': chevronDownOutline,
  'checkmark-outline': checkmarkOutline,
  'ellipsis-horizontal': ellipsisHorizontal,
  'cash-outline': cashOutline,
  'close-circle': closeCircle,
  'time-outline': timeOutline,
});

export interface GrupoClientes {
  /** Letra inicial cuando se ordena por nombre; vacío si no se agrupa */
  letra: string;
  clientes: Cliente[];
}

// La app arranca con provideIonicAngular() (standalone), que solo registra los
// componentes importados desde '@ionic/angular/standalone'. ion-fab no se usa en
// ningún otro lado, así que sin esto queda como etiqueta sin definir: sin
// círculo, sin posición fija y sin poder tocarse. Lo mismo con ion-badge.
defineIonFab();
defineIonFabButton();
defineIonBadge();
defineIonRefresher();
defineIonRefresherContent();
defineIonItemSliding();
defineIonItemOptions();
defineIonItemOption();
defineIonItem();

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, EncabezadoComponent],
  templateUrl: './clientes.page.html',
  styleUrls: ['./clientes.page.scss'],
})
export class ClientesPage implements OnInit {
  private destroyRef = inject(DestroyRef);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private cdr = inject(ChangeDetectorRef);
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
      .filter(c => !termino ||
        this.normalizar(c.nombre).includes(termino) ||
        this.normalizar(c.direccion).includes(termino))
      .sort((a, b) => this.comparar(a, b));

    this.clientesActivos = this.filtroEstado === 'inactivos' ? [] : visibles.filter(cliente => cliente.activo);
    this.clientesInactivos = this.filtroEstado === 'activos' ? [] : visibles.filter(cliente => !cliente.activo);
    this.gruposActivos = this.agrupar(this.clientesActivos);
  }

  /** Activos agrupados por letra (solo al ordenar por nombre, como una agenda) */
  gruposActivos: GrupoClientes[] = [];

  private agrupar(clientes: Cliente[]): GrupoClientes[] {
    if (this.criterioOrden !== 'nombre' || this.busqueda.trim()) return [{ letra: '', clientes }];
    const grupos: GrupoClientes[] = [];
    for (const cliente of clientes) {
      const letra = this.normalizar(cliente.nombre).charAt(0).toUpperCase() || '#';
      const ultimo = grupos[grupos.length - 1];
      if (ultimo?.letra === letra) ultimo.clientes.push(cliente);
      else grupos.push({ letra, clientes: [cliente] });
    }
    return grupos;
  }

  iniciales(nombre: string): string {
    const partes = (nombre || '').trim().split(/\s+/).filter(Boolean);
    return ((partes[0]?.[0] || '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() || '?';
  }

  limpiarBusqueda() {
    this.onBusqueda('');
  }

  /** "⋯" de cada fila: lo mismo que al deslizar, para quien no conoce el gesto */
  async abrirOpciones(cliente: Cliente) {
    const botones: any[] = [
      { text: 'Ver historial', icon: 'time-outline', handler: () => this.verHistorial(cliente) },
      { text: 'Editar cliente', icon: 'pencil-outline', handler: () => this.editarCliente(cliente) },
      { text: 'Cambiar precio', icon: 'cash-outline', handler: () => { this.editarPrecio(cliente); } },
    ];
    if (cliente.telefono) {
      botones.push({ text: 'Llamar', icon: 'call-outline', handler: () => { window.location.href = 'tel:' + cliente.telefono; } });
    }
    botones.push(cliente.activo
      ? { text: 'Desactivar', icon: 'pause-circle-outline', role: 'destructive', handler: () => { this.desactivarCliente(cliente); } }
      : { text: 'Activar', icon: 'checkmark-circle-outline', handler: () => { this.activarCliente(cliente); } });
    botones.push({ text: 'Cancelar', role: 'cancel' });

    const hoja = await this.actionSheetController.create({ header: cliente.nombre, buttons: botones });
    await hoja.present();
  }

  /** Acciones del deslizable: lo cierran antes de actuar */
  accionDeslizando(deslizable: IonItemSliding, accion: () => void) {
    deslizable.close();
    accion();
  }

  /** Qué clientes se listan, elegido desde el resumen */
  filtroEstado: 'todos' | 'activos' | 'inactivos' = 'todos';

  get totalInactivos(): number {
    return this.clientes.length - this.totalActivos;
  }

  cambiarFiltroEstado(filtro: 'todos' | 'activos' | 'inactivos') {
    if (filtro === this.filtroEstado) return;
    this.filtroEstado = filtro;
    this.animarCambio(() => this.organizarClientes());
  }

  onBusqueda(valor: string | null | undefined) {
    this.busqueda = valor || '';
    this.animarCambio(() => this.organizarClientes());
  }

  readonly criterios = CRITERIOS_ORDEN;
  /** Menú de "Ordenar por" desplegado bajo su botón */
  menuOrdenAbierto = false;

  seleccionarCriterio(criterio: CriterioOrden) {
    this.menuOrdenAbierto = false;
    if (criterio === this.criterioOrden) return;
    this.criterioOrden = criterio;
    this.animarCambio(() => this.organizarClientes());
  }

  alternarDireccion() {
    this.ascendente = !this.ascendente;
    this.animarCambio(() => this.organizarClientes());
  }

  trackPorId(_: number, cliente: Cliente) {
    return cliente.id;
  }

  /**
   * Animación al reordenar (técnica FLIP): se mide dónde estaba cada tarjeta,
   * se aplica el cambio y cada una se desliza desde su lugar anterior al nuevo.
   * Las tarjetas que aparecen (p. ej. al borrar la búsqueda) entran con un fundido.
   */
  private animarCambio(cambio: () => void) {
    const reducirMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const tarjetas = () =>
      Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('.cliente-fila[data-id]'));

    const antes = new Map<string, DOMRect>();
    if (!reducirMovimiento) {
      tarjetas().forEach(el => antes.set(el.dataset['id']!, el.getBoundingClientRect()));
    }

    cambio();
    if (reducirMovimiento) return;
    this.cdr.detectChanges();

    tarjetas().forEach((el, i) => {
      const previo = antes.get(el.dataset['id']!);
      if (!previo) {
        el.animate(
          [{ opacity: 0, transform: 'translateY(8px) scale(0.98)' }, { opacity: 1, transform: 'none' }],
          { duration: 220, delay: Math.min(i, 8) * 20, easing: 'ease-out', fill: 'backwards' }
        );
        return;
      }
      const ahora = el.getBoundingClientRect();
      const dx = previo.left - ahora.left;
      const dy = previo.top - ahora.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: 320, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
      );
    });
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
  valorTotal(cliente: Cliente): number {
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

  /** "14 oct 2025" para la fila cuando se ordena por antigüedad */
  fechaAltaTexto(cliente: Cliente): string {
    const [a, m, d] = this.fechaAlta(cliente).split('-').map(Number);
    if (!a || a === 9999) return 'Sin registro';
    return new Date(a, m - 1, d)
      .toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
      .replace('.', '');
  }

  // La lista ya está al día; el botón solo lo confirma
  get totalActivos(): number {
    return this.clientes.filter(c => c.activo).length;
  }

  /** Deslizar hacia abajo: la lista ya llega en vivo, así que se reordena y se cierra el indicador */
  onRefrescar(evento: any) {
    this.organizarClientes();
    setTimeout(() => evento.target.complete(), 600);
  }

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

  // Tocar el precio permite cambiarlo para siempre (los precios de un solo día
  // se ponen desde el inicio)
  async editarPrecio(cliente: Cliente) {
    const alert = await this.alertController.create({
      header: 'Cambiar precio',
      subHeader: cliente.nombre,
      message: 'Se aplicará en todas las mantenciones desde ahora. Las ya registradas mantienen lo que se cobró.',
      inputs: [
        {
          name: 'nuevoPrecio',
          type: 'number',
          min: '1',
          placeholder: 'Nuevo precio (CLP)',
          value: cliente.precio || ''
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            const nuevoPrecio = Math.round(parseFloat(data?.nuevoPrecio));
            if (!nuevoPrecio || nuevoPrecio <= 0) {
              this.showToast('Ingresa un precio válido ❌', 'danger');
              return false;
            }
            this.guardarPrecio(cliente, nuevoPrecio);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private guardarPrecio(cliente: Cliente, nuevoPrecio: number) {
    const precioAnterior = cliente.precio;
    if (nuevoPrecio === precioAnterior) return;

    cliente.precio = nuevoPrecio;
    this.clienteService.updateCliente(cliente).subscribe({
      next: () => {
        this.organizarClientes();
        this.showToast(`Nuevo precio de ${cliente.nombre}: $${this.formatearPrecio(nuevoPrecio)} ✅`, 'success');
      },
      error: (err) => {
        console.error('Error al actualizar precio:', err);
        cliente.precio = precioAnterior;
        this.showToast('Error al actualizar precio ❌', 'danger');
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
