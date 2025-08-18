import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonButtons, 
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonButton,
  IonIcon,
  IonListHeader
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { saveOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { ClienteService, Cliente } from '../../../services/cliente.service';

addIcons({
  'save-outline': saveOutline,
  'checkmark-circle-outline': checkmarkCircleOutline
});

@Component({
  selector: 'app-completar-mantencion',
  templateUrl: './completar_mantencion.page.html',
  styleUrls: ['./completar_mantencion.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonButton,
    IonIcon,
    IonListHeader
  ]
})
export class CompletarMantencionPage implements OnInit {
  cliente: Cliente | null = null;
  clienteId: string | null = null;
  mantencionForm: FormGroup;
  
  // Variables para controlar la selección de botones
  cloroSeleccionado: string | null = null;
  phSeleccionado: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clienteService: ClienteService,
    private formBuilder: FormBuilder,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    this.mantencionForm = this.formBuilder.group({
      cloro: ['', [Validators.required, Validators.min(0), Validators.max(10)]],
      ph: ['', [Validators.required, Validators.min(0), Validators.max(14)]],
      servicio: ['Mantenimiento general', Validators.required],
      notas: ['']
    });
  }
  
  // Método para seleccionar el nivel de cloro
  seleccionarCloro(estado: string, valor: number) {
    this.cloroSeleccionado = estado;
    this.mantencionForm.get('cloro')?.setValue(valor);
  }
  
  // Método para seleccionar el nivel de pH
  seleccionarPh(estado: string, valor: number) {
    this.phSeleccionado = estado;
    this.mantencionForm.get('ph')?.setValue(valor);
  }

  ngOnInit() {
    this.clienteId = this.route.snapshot.paramMap.get('id');
    
    if (this.clienteId) {
      this.cargarCliente(this.clienteId);
    } else {
      this.mostrarAlerta('Error', 'No se ha especificado un cliente');
      this.router.navigate(['/home']);
    }
  }

  cargarCliente(id: string) {
    this.clienteService.getClienteById(id).subscribe({
      next: (cliente) => {
        this.cliente = cliente;
      },
      error: (error) => {
        console.error('Error al cargar cliente:', error);
        this.mostrarAlerta('Error', 'No se pudo cargar la información del cliente');
        this.router.navigate(['/home']);
      }
    });
  }

  guardarMantencion() {
    if (!this.mantencionForm.valid || !this.cliente || !this.clienteId) {
      return;
    }

    // Verificar que se hayan seleccionado los niveles de cloro y pH
    if (!this.cloroSeleccionado || !this.phSeleccionado) {
      this.mostrarAlerta('Datos incompletos', 'Por favor seleccione los niveles de cloro y pH');
      return;
    }

    const formValues = this.mantencionForm.value;
    
    const nuevoRegistro = {
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toTimeString().split(' ')[0].substring(0, 5),
      servicio: formValues.servicio,
      cloro: formValues.cloro,
      ph: formValues.ph,
      estadoCloro: this.cloroSeleccionado,
      estadoPh: this.phSeleccionado,
      notas: formValues.notas
    };

    // Asegurarse de que el cliente tenga un array de historial
    if (!this.cliente.historial) {
      this.cliente.historial = [];
    }

    // Añadir el nuevo registro al historial
    this.cliente.historial.unshift(nuevoRegistro);

    // Asegurarse de que el cliente tenga un ID antes de actualizarlo
    if (!this.cliente.id) {
      this.cliente.id = this.clienteId;
    }
    
    // Actualizar el cliente en la base de datos
    this.clienteService.updateCliente(this.cliente).subscribe({
      next: () => {
        this.mostrarToast('Mantención registrada con éxito');
        this.router.navigate(['/home']);
      },
      error: (error) => {
        console.error('Error al guardar mantención:', error);
        this.mostrarAlerta('Error', 'No se pudo guardar el registro de mantención');
      }
    });
  }

  evaluarEstadoCloro(valor: number): string {
    if (valor < 1.0) return 'bajo';
    if (valor >= 1.0 && valor <= 1.4) return 'ideal bajo';
    if (valor >= 1.5 && valor <= 2.0) return 'ideal';
    if (valor >= 2.1 && valor <= 3.0) return 'ideal alto';
    if (valor > 3.0) return 'alto';
    return 'ideal'; // valor por defecto
  }

  evaluarEstadoPh(valor: number): string {
    if (valor < 7.2) return 'bajo';
    if (valor >= 7.2 && valor <= 7.3) return 'ideal bajo';
    if (valor >= 7.4 && valor <= 7.6) return 'ideal';
    if (valor >= 7.7 && valor <= 7.8) return 'ideal alto';
    if (valor > 7.8) return 'alto';
    return 'ideal'; // valor por defecto
  }

  async mostrarToast(mensaje: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    toast.present();
  }

  async mostrarAlerta(titulo: string, mensaje: string) {
    const alert = await this.alertController.create({
      header: titulo,
      message: mensaje,
      buttons: ['OK']
    });
    await alert.present();
  }
}