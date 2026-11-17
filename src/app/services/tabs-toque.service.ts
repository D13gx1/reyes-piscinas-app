import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Avisa cuando se vuelve a tocar la pestaña en la que ya se está
 * (p. ej. tocar "Inicio" estando en el inicio lo lleva al día de hoy).
 */
@Injectable({ providedIn: 'root' })
export class TabsToqueService {
  private readonly retoque = new Subject<string>();
  readonly retoque$ = this.retoque.asObservable();

  avisar(tab: string) {
    this.retoque.next(tab);
  }
}
