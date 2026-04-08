import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Player } from '../../entities/player';
import { GameTile } from '../../shared/models/tile.model';
import { QuestManager } from './quest-manager.service';

@Injectable({ providedIn: 'root' })
export class PlayerInteractionService
{
  private readonly TILE_SIZE = 64;

  // BehaviorSubject para que otros componentes puedan reaccionar al estado
  public isSitting = new BehaviorSubject<boolean>(false);

  constructor(private questManager: QuestManager) { }

  /**
   * Lógica principal que se llama al presionar la tecla de interacción.
   * Alterna entre sentarse y levantarse.
   */
  public attemptInteraction(player: Player, grid: GameTile[][]): void
  {
    if (player.isSitting)
    {
      this.standUp(player);
      return;
    }

    // 1. Intentar buscar enfrente
    let { r, c } = this.getTileInFront(player);
    let targetTile = this.getTileSafe(grid, r, c);

    // 2. Si enfrente no hay nada recolectable, buscar BAJO los pies (común en juegos 2D)
    if (!targetTile || !this.isCollectable(targetTile))
    {
      const under = this.getTileUnderFeet(player);
      const tileUnder = this.getTileSafe(grid, under.r, under.c);

      if (tileUnder && this.isCollectable(tileUnder))
      {
        // Cambiamos el objetivo al tile de abajo
        r = under.r;
        c = under.c;
        targetTile = tileUnder;
      }
    }

    if (!targetTile) return;

    // 1. Prioridad: Recoger objetos (Misiones / Loot)
    if (targetTile && this.isCollectable(targetTile))
    {
      this.collectItem(targetTile, r, c, grid);
      return; // Si recogemos algo, no intentamos sentarnos en el mismo frame
    }

    // Verificamos si el tile es un sofá
    if (targetTile && (targetTile.type.startsWith('couch_') || targetTile.type.startsWith('chair_')))
    {
      this.sitOnCouch(player, targetTile, r, c);
    }
  }

  /**
   * Determina si un tile es un objeto que se puede recoger para una misión o inventario.
   */
  private isCollectable(tile: GameTile): boolean
  {
    const collectableTypes = [
      'cardboardbox', 'woodbox', 'lemon', 'pitcher_full', 'worm',
      'coin', 'bill' // También incluimos dinero si el sistema de loot lo genera como tile
    ];
    // Verificamos si el tipo exacto está en la lista o si empieza con prefijos conocidos (ej. coin_50)
    return collectableTypes.includes(tile.type) || tile.type.startsWith('coin_') || tile.type.startsWith('bill_');
  }

  /**
   * Procesa la recolección del ítem, actualiza la misión y limpia el grid.
   */
  private collectItem(tile: GameTile, r: number, c: number, grid: GameTile[][]): void
  {
    //console.log(`[PlayerInteraction] Recogiendo objeto: ${tile.type}`);

    // 1. Notificar al QuestManager
    // Mapeo especial: Si el tile es 'woodbox' pero la misión pide 'cardboardbox', ajustamos aquí si es necesario.
    // Por ahora pasamos el tipo directo.
    if (tile.type === 'worm')
    {
      this.questManager.updateKillCount('worm'); // Las lombrices suelen ser de tipo 'kill'
    } else
    {
      this.questManager.updateCollectCount(tile.type);
    }

    // 2. Eliminar el objeto del mundo (Visual)
    if (tile.underlyingTile)
    {
      // Restaurar lo que había debajo (ej. suelo)
      grid[r][c] = { ...tile.underlyingTile };
    } else
    {
      // Fallback: Poner un suelo genérico si no había memoria del tile anterior
      grid[r][c] = {
        fileName: 'floor_type01.png',
        type: 'floor',
        walkable: true
      } as GameTile;
    }
  }

  private sitOnCouch(player: Player, couchTile: GameTile, r: number, c: number): void
  {
    // 1. Detener cualquier movimiento residual
    player.isMoving = false;
    player.isSitting = true;

    // 2. "Snap": Teletransportar al jugador a la posición exacta del tile del sofá
    // Esto garantiza una alineación visual perfecta con la animación.
    player.x = c * this.TILE_SIZE;
    player.y = r * this.TILE_SIZE;

    // 3. Sincronizar la dirección del jugador con la del sofá para la animación correcta
    switch (couchTile.type)
    {
      case 'couch_front':
      case 'chair_front':
        player.direction = 2; // Sentado mirando hacia abajo (al frente)
        break;
      case 'couch_back':
      case 'chair_back':
        player.direction = 0; // Sentado mirando hacia arriba (de espaldas)
        break;
      case 'couch_right': // El sofá está a la derecha, el jugador mira a la izquierda
        player.direction = 1;
        break;
      case 'chair_right': // La silla mira a la derecha, el jugador mira a la derecha
        player.direction = 3;
        break;
      case 'couch_left': // El sofá está a la izquierda, el jugador mira a la derecha
        player.direction = 3;
        break;
      case 'chair_left': // La silla mira a la izquierda, el jugador mira a la izquierda
        player.direction = 1;
        break;
    }

    // 4. Actualizar el estado global
    this.isSitting.next(true);
  }

  private standUp(player: Player): void
  {
    player.isSitting = false;
    this.isSitting.next(false);
    // El game loop se encargará de reanudar el movimiento.
  }

  /**
   * Calcula las coordenadas del tile que está directamente en frente del jugador.
   */
  private getTileInFront(player: Player): { r: number, c: number }
  {
    const playerCenterX = player.x + player.spriteWidth / 2;
    const playerFeetY = player.y + player.spriteHeight - 1; // -1 para estar justo en la base

    let targetR = Math.floor(playerFeetY / this.TILE_SIZE);
    let targetC = Math.floor(playerCenterX / this.TILE_SIZE);

    // Ajustar según la dirección
    switch (player.direction)
    {
      case 0: targetR--; break; // Arriba
      case 1: targetC--; break; // Izquierda
      case 2: targetR++; break; // Abajo
      case 3: targetC++; break; // Derecha
    }
    return { r: targetR, c: targetC };
  }

  /**
   * Calcula el tile exacto donde está parado el jugador.
   */
  private getTileUnderFeet(player: Player): { r: number, c: number }
  {
    const playerCenterX = player.x + player.spriteWidth / 2;
    const playerFeetY = player.y + player.spriteHeight - 1;
    return {
      r: Math.floor(playerFeetY / this.TILE_SIZE),
      c: Math.floor(playerCenterX / this.TILE_SIZE)
    };
  }

  private getTileSafe(grid: GameTile[][], r: number, c: number): GameTile | null
  {
    if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length)
    {
      return grid[r][c];
    }
    return null;
  }
}