import { Injectable } from '@angular/core';
import { getAdjustedFacing } from '../../../direction-helper';
import { GameTile } from '../shared/models/tile.model';

// Estas son interfaces de ejemplo, debes usar las tuyas
interface Player {
  direction: string;
  state: 'walking' | 'sitting';
  // ... otras propiedades del jugador
}

interface TileOnMap {
  tileConfig: GameTile; // La configuración del tile desde el manifest
  isMirrored: boolean; // El estado de si está espejeado en el mapa
  // ... otras propiedades del tile en el mapa
}

@Injectable({
  providedIn: 'root'
})
export class InteractionService {

  constructor() { }

  /**
   * Esta función se llamaría cuando el jugador presiona el botón de acción frente a un sofá.
   */
  onPlayerSit(player: Player, sofa: TileOnMap): void {
    // ¡AQUÍ ES DONDE SE LLAMA A LA FUNCIÓN!
    const finalDirection = getAdjustedFacing(sofa.tileConfig, sofa.isMirrored);
    player.direction = finalDirection;
    player.state = 'sitting';
  }
}