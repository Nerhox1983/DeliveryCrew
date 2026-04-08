import { Tile } from '../../shared/models/tile.model';
import { Animal } from './animal';
import { GameConstants } from '../../shared/config/GameConstants';

export class Dog extends Animal
{
  isMale: boolean;
  isAdult: boolean;

  constructor(sprite: HTMLImageElement, startRow: number, startCol: number)
  {
    super(sprite, startRow, startCol);
    this.isMale = Math.random() < 0.5;
    this.isAdult = Math.random() < 0.5;

    // Velocidad: Cachorros más rápidos (2.5) que adultos (1.5)
    this.speed = this.isAdult ? 1.5 : 2.5;

    // Asignar sonido de ladrido
    if (!this.isAdult)
    {
      this.sound = 'dog_puppy_barking.mp3';
    } else
    {
      this.sound = this.isMale ? 'dog_male_barking.mp3' : 'dog_female_barking.mp3';
    }
  }

  update(grid: Tile[][], buildingGrid: number[][])
  {
    this.handleWandering(grid, buildingGrid);
  }

  protected override pickNewMove(grid: Tile[][], buildingGrid: number[][]): void
  {
    // Intentar caminata larga por caminos (30% probabilidad)
    if (Math.random() < GameConstants.AI.LONG_MOVE_CHANCE)
    {
      if (this.trySetLongMove(grid, buildingGrid)) return;
    }

    super.pickNewMove(grid, buildingGrid);
  }

  private trySetLongMove(grid: Tile[][], buildingGrid: number[][]): boolean
  {
    const currentTile = grid[this.row][this.col];
    // Solo deambular lejos si está en un camino (dirtpath o cobblestone)
    if (!currentTile || (!currentTile.fileName.includes('dirtpath') && !currentTile.fileName.includes('cobblestone')))
    {
      return false;
    }

    const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'south', 'east', 'west'];
    // Preferir mantener la dirección actual (70%)
    if (Math.random() < GameConstants.AI.DIRECTION_PERSISTENCE_CHANCE)
    {
      directions.sort((a, b) => a === this.direction ? -1 : 1);
    } else
    {
      directions.sort(() => Math.random() - 0.5);
    }

    for (const dir of directions)
    {
      const dist = Math.floor(Math.random() * 6) + 4; // 4 a 9 tiles
      let r = this.row;
      let c = this.col;
      let valid = true;

      // Verificar todo el trayecto
      for (let i = 1; i <= dist; i++)
      {
        if (dir === 'north') r--;
        if (dir === 'south') r++;
        if (dir === 'east') c++;
        if (dir === 'west') c--;

        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length)
        {
          valid = false; break;
        }
        const t = grid[r][c];
        const b = buildingGrid[r][c];
        // Debe ser caminable y preferiblemente camino, pero aceptamos cualquier walkable para cruzar
        if (!t || !t.walkable || b !== 0)
        {
          valid = false; break;
        }
      }

      if (valid)
      {
        this.direction = dir;
        this.targetX = c * GameConstants.TILE_SIZE;
        this.targetY = r * GameConstants.TILE_SIZE;
        this.isMoving = true;
        return true;
      }
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D)
  {
    const spriteW = 32; // 96px / 3 frames
    const spriteH = 32; // 128px / 4 directions

    const rowIdx = this.getSpriteRow();
    // Escalar si es adulto (150%)
    const scale = this.isAdult ? GameConstants.Visuals.SCALE.DOG_ADULT : GameConstants.Visuals.SCALE.DOG_KITTEN;
    const drawW = spriteW * scale;
    const drawH = spriteH * scale;

    // Centrar el sprite de 32px en la celda de 64px
    const offsetX = (GameConstants.TILE_SIZE - drawW) / 2;
    const offsetY = (GameConstants.TILE_SIZE - drawH) / 2;

    ctx.drawImage(
      this.spriteSheet,
      this.animationFrame * spriteW,
      rowIdx * spriteH,
      spriteW,
      spriteH,
      this.x + offsetX,
      this.y + offsetY,
      drawW,
      drawH
    );

    // Dibujar indicador de hambre si es necesario
    this.drawHungerIndicator(ctx);
  }

  public checkProximityAndBark(x: number, y: number)
  {
    this.checkProximityAndPlaySound(x, y);
  }
}