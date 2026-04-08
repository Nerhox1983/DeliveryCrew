import { BreadCrumb } from '../../core/engine/renderer';
import { Tile } from '../../shared/models/tile.model';
import { Hen } from './hen';
import { Worm } from './worm';
import { Animal } from './animal';
import { GameConstants } from '../../shared/config/GameConstants';

export class Chicken extends Animal
{
  override chasingTarget: Worm | null = null;
  public targetCrumb: BreadCrumb | null = null;

  constructor(sprite: HTMLImageElement, startRow: number, startCol: number)
  {
    super(sprite, startRow, startCol);
    this.sound = 'chicken_chirping.mp3';
  }

  update(grid: Tile[][], buildingGrid: number[][], gallinas: Hen[] = [], worms: Worm[] = [], breadCrumbs: BreadCrumb[] = [])
  {
    // Check for breadcrumb and move towards it
    if (this.targetCrumb)
    {
      const dx = this.targetCrumb.x - this.x;
      const dy = this.targetCrumb.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5)
      {
        this.eatBreadCrumb(this.targetCrumb, breadCrumbs);
      } else
      {
        this.isMoving = true;
        this.targetX = this.targetCrumb.x;
        this.targetY = this.targetCrumb.y;
        this.moveTowardsTarget(grid, buildingGrid);
      }
      return; // Prioritize breadcrumb
    }

    // 1. Lógica de Depredador (Cazar lombrices)
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
      GameConstants.Physics.CHASE_SPEED_MULTIPLIER_FAST,
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
      return; // Prioridad sobre seguir a la madre
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
        movedTowardsHen = this.moveToLocation(closest.x, closest.y, grid, buildingGrid);
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

  private moveToLocation(targetX: number, targetY: number, grid: Tile[][], buildingGrid: number[][]): boolean
  {
    const dx = targetX - this.x;
    const dy = targetY - this.y;

    // Si ya está muy cerca, no forzar movimiento para evitar superposición exacta
    if (Math.abs(dx) < GameConstants.AI.MIN_SEPARATION_DISTANCE && Math.abs(dy) < GameConstants.AI.MIN_SEPARATION_DISTANCE) return false;

    const directions: ('north' | 'south' | 'east' | 'west')[] = [];

    // Priorizar el eje con mayor distancia
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

  private eatBreadCrumb(crumb: BreadCrumb, breadCrumbs: BreadCrumb[]): void
  {
    // remove breadcrumb
    const index = breadCrumbs?.indexOf(crumb);
    if (index > -1)
    {
      breadCrumbs.splice(index, 1);
    }
    this.targetCrumb = null;
  }

  draw(ctx: CanvasRenderingContext2D)
  {
    if (!this.spriteSheet || !this.spriteSheet.complete || this.spriteSheet.naturalWidth === 0) return;

    const spriteW = 56; // 168 / 3
    const spriteH = 56; // 224 / 4

    const rowIdx = this.getSpriteRow();
    // Escalar al 50%
    const scale = GameConstants.Visuals.SCALE.CHICKEN;
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

  public checkProximityAndChirp(x: number, y: number)
  {
    this.checkProximityAndPlaySound(x, y);
  }
}