import { BreadCrumb } from '../../core/engine/renderer';
import { Tile } from '../../shared/models/tile.model';
import { Worm } from './worm';
import { GameConstants } from '../../shared/config/GameConstants';
import { Animal } from './animal';

export class Duck extends Animal
{
  override chasingTarget: Worm | null = null;
  isMale: boolean;
  isAdult: boolean;
  public targetCrumb: BreadCrumb | null = null;

  constructor(sprite: HTMLImageElement, startRow: number, startCol: number)
  {
    super(sprite, startRow, startCol);
    this.isMale = Math.random() < 0.5;
    this.isAdult = true;

    this.sound = this.isMale ? 'duck_male_quacking.mp3' : 'duck_female_quacking.mp3';
  }

  update(grid: Tile[][], buildingGrid: number[][], worms: Worm[] = [], breadCrumbs: BreadCrumb[] = [])
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

      return; // Prioritize breadcrumb over other behaviors
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

    this.handleWandering(grid, buildingGrid);
  }

  private eatBreadCrumb(crumb: BreadCrumb, breadCrumbs: BreadCrumb[]): void
  {
    const index = breadCrumbs.indexOf(crumb);
    if (index > -1)
      breadCrumbs.splice(index, 1);

    this.targetCrumb = null;
  }

  draw(ctx: CanvasRenderingContext2D)
  {
    const spriteW = 64;
    const spriteH = 64;

    const rowIdx = this.getSpriteRow();
    // Escalar al 50%
    const scale = GameConstants.Visuals.SCALE.DUCK;
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

  public checkProximityAndQuack(x: number, y: number)
  {
    this.checkProximityAndPlaySound(x, y);
  }
}