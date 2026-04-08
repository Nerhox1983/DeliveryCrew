import { Tile } from '../../shared/models/tile.model';
import { Hen } from './hen';
import { Worm } from './worm';
import { Animal } from './animal';
import { GameConstants } from '../../shared/config/GameConstants';

export class Rooster extends Animal
{
  override chasingTarget: Worm | null = null;

  constructor(sprite: HTMLImageElement, startRow: number, startCol: number)
  {
    super(sprite, startRow, startCol);
    this.sound = 'rooster_crowing.mp3';
  }

  update(grid: Tile[][], buildingGrid: number[][], gallinas: Hen[] = [], worms: Worm[] = [])
  {
    // Lógica de Caza
    if (this.chasingTarget && !worms.includes(this.chasingTarget))
    {
      this.chasingTarget = null;
    }

    if (!this.chasingTarget && this.shouldCheckAI())
    {
      this.chasingTarget = this.findClosestWorm(worms);
    }

    const wasChasing = this.handleChase(
      this.chasingTarget,
      grid,
      buildingGrid,
      GameConstants.Physics.CHASE_SPEED_MULTIPLIER,
      () =>
      {
        if (this.chasingTarget)
        {
          worms.splice(worms.indexOf(this.chasingTarget), 1);
        }
      },
      GameConstants.AI.EAT_WORM_DISTANCE
    );

    if (wasChasing)
    {
      return;
    }

    this.handleWandering(grid, buildingGrid, gallinas);
  }

  protected override pickNewMove(grid: Tile[][], buildingGrid: number[][], ...args: any[]): void
  {
    const gallinas: Hen[] = args[0] || [];
    let movedTowardsHen = false;
    if (gallinas.length > 0)
    {
      const closest = this.shouldCheckAI() ? this.findClosestHen(gallinas) : null;
      if (closest)
      {
        movedTowardsHen = this.moveTowards(closest, grid, buildingGrid);
      }
    }
    if (!movedTowardsHen)
    {
      super.pickNewMove(grid, buildingGrid);
    }
  }

  private findClosestHen(gallinas: Hen[]): Hen | null
  {
    let closest: Hen | null = null;
    let minDistSq = GameConstants.AI.MOTHER_VISION_RADIUS * GameConstants.AI.MOTHER_VISION_RADIUS;

    for (const g of gallinas)
    {
      const distSq = Math.pow(g.x - this.x, 2) + Math.pow(g.y - this.y, 2);
      if (distSq < minDistSq)
      {
        minDistSq = distSq;
        closest = g;
      }
    }
    return closest;
  }

  private moveTowards(hen: Hen, grid: Tile[][], buildingGrid: number[][]): boolean
  {
    const dx = hen.x - this.x;
    const dy = hen.y - this.y;

    if (Math.abs(dx) < GameConstants.AI.MIN_SEPARATION_DISTANCE && Math.abs(dy) < GameConstants.AI.MIN_SEPARATION_DISTANCE) return false;

    const directions: ('north' | 'south' | 'east' | 'west')[] = [];

    if (Math.abs(dx) > Math.abs(dy))
    {
      directions.push(dx > 0 ? 'east' : 'west');
      directions.push(dy > 0 ? 'south' : 'north');
    } else
    {
      directions.push(dy > 0 ? 'south' : 'north');
      directions.push(dx > 0 ? 'east' : 'west');
    }

    for (const dir of directions)
    {
      if (this.trySetMove(dir, grid, buildingGrid)) return true;
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D)
  {
    const spriteW = 76; // 228 / 3
    const spriteH = 72; // 288 / 4

    const rowIdx = this.getSpriteRow();
    // Escalar al 50%
    const scale = GameConstants.Visuals.SCALE.ROOSTER;
    const drawW = spriteW * scale;
    const drawH = spriteH * scale;

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

  public checkProximityAndCrow(x: number, y: number)
  {
    this.checkProximityAndPlaySound(x, y);
  }
}