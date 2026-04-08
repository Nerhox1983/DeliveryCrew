export interface ItemInstance
{
  localX: number;
  localY: number;
  rotation: number;
}

export interface Tile
{
  fileName: string; // Obligatorio
  type: string;
  walkable: boolean;
  color?: string | null;
  quantity?: number;
}

export type GameTile = Tile & {
  underlyingTile?: Tile;
  houseId?: number;
  value?: number;    // <-- Esto corrige el error en game-board.ts
  instances?: ItemInstance[]; // <-- Esto permite los múltiples limones
};