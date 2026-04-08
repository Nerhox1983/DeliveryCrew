import { GameTile } from './tile.model';

export interface SceneState {
  id: string;               // 'world_map', 'house_1', etc.
  grid: GameTile[][];       // La matriz de tiles actual
  playerPosition: { x: number, y: number }; // Dónde aparece el jugador
  entities?: { player: any; npcs: any[]; objects: any[]; };
}