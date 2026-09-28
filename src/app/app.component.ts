import { Component, inject, OnInit } from '@angular/core';
import { Auth, user } from '@angular/fire/auth';
import { IonApp, IonRouterOutlet, ToastController } from '@ionic/angular/standalone';
import { MigracionUnidadesService } from './services/migracion-unidades.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  private auth = inject(Auth);
  private migracionService = inject(MigracionUnidadesService);
  private toastController = inject(ToastController);
  private migracionEjecutada = false;

  ngOnInit() {
    // Los registros antiguos de químicos se guardaban en gramos. Al primer ingreso
    // autenticado se convierten a kilos una sola vez (el servicio es idempotente).
    user(this.auth).subscribe((usuario) => {
      if (!usuario || this.migracionEjecutada) return;
      this.migracionEjecutada = true;
      this.ejecutarMigracionSilenciosa(usuario.uid);
    });
  }

  private async ejecutarMigracionSilenciosa(uid: string) {
    const resultado = await new Promise<string | null>((resolve) => {
      this.migracionService.ejecutarMigracion(uid).subscribe((r) => {
        if (r.ejecutada && r.camposConvertidos > 0) {
          resolve(r.mensaje);
        } else {
          resolve(null);
        }
      });
    });

    if (!resultado) return;

    const toast = await this.toastController.create({
      message: `Unidades actualizadas a kilos: ${resultado}`,
      duration: 4500,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }
}
