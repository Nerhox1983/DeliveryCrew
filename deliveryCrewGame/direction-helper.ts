import { GameTile } from './src/app/shared/models/tile.model';

export function getAdjustedFacing(tileConfig: GameTile, isMirrored: boolean): string 
{
  // Hacemos un cast de tipo intersección para indicar que 'facing' es una propiedad posible
  const baseDirection = (tileConfig as GameTile & { facing?: string }).facing || 'south';
  let finalDirection = baseDirection;

  // Si el sprite del sofá está espejeado (mirrored), su dirección visual es la opuesta a la original.
  if (isMirrored) 
  {
    if (baseDirection === 'east') {
      finalDirection = 'west'; // Un sofá que apunta al 'este' pero está espejeado, visualmente apunta al 'oeste'.
    }
    if (baseDirection === 'west') {
      finalDirection = 'east'; // Un sofá que apunta al 'oeste' pero está espejeado, visualmente apunta al 'este'.
    }
  }

  return finalDirection;
}