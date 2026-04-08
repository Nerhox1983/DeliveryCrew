import { Tile } from '../../shared/models/tile.model';
import { Duck } from './duck';
import { GameConstants } from '../../shared/config/GameConstants';
import { Worm } from './worm';
import { Animal } from './animal';

export class Duckling extends Animal
{
  // Nuevas propiedades para manejo de estados
  walkSprite: HTMLImageElement;
  swimSprite: HTMLImageElement;
  isSwimming: boolean = false;
  override chasingTarget: Worm | null = null;

  constructor(walkSprite: HTMLImageElement, swimSprite: HTMLImageElement, startRow: number, startCol: number)
  {
    super(walkSprite, startRow, startCol);
    this.walkSprite = walkSprite;
    this.swimSprite = swimSprite;
    this.sound = 'ducklin_cheeping.mp3';
  }

  update(grid: Tile[][], buildingGrid: number[][], ducks: Duck[] = [], worms: Worm[] = [])
  {
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
      this.updateStateBasedOnPosition(grid);
      return; // Prioridad sobre seguir a la madre
    }

    this.handleWandering(grid, buildingGrid, ducks);
    this.updateStateBasedOnPosition(grid);
  }

  protected override canTraverse(grid: Tile[][], buildingGrid: number[][], r: number, c: number): boolean
  {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return false;
    const tile = grid[r][c];
    if (!tile || buildingGrid[r][c] !== 0) return false;

    const isWater = tile.fileName.includes('water');
    // Es caminable si es tierra normal O si es agua (exclusivo para patos)
    return (tile.walkable && !tile.fileName.includes('wall') && !tile.fileName.includes('window')) || isWater;
  }

  private updateStateBasedOnPosition(grid: Tile[][]): void
  {
    const r = Math.floor((this.y + GameConstants.TILE_SIZE / 2) / GameConstants.TILE_SIZE);
    const c = Math.floor((this.x + GameConstants.TILE_SIZE / 2) / GameConstants.TILE_SIZE);

    if (grid[r] && grid[r][c])
    {
      const tile = grid[r][c];
      const isWater = tile.fileName.includes('water');
      if (this.isSwimming !== isWater)
      {
        this.isSwimming = isWater;
        this.spriteSheet = this.isSwimming ? this.swimSprite : this.walkSprite;
      }
    }
  }

  protected override updateAnimation(fast: boolean = false): void
  {
    this.animationTimer++;
    const speed = fast ? GameConstants.Timers.ANIMAL_FAST_ANIMATION_SPEED_FRAMES : GameConstants.Timers.ANIMAL_ANIMATION_SPEED_FRAMES;
    if (this.animationTimer > speed)
    {
      const maxFrames = this.isSwimming ? 2 : 3; // 2 frames for swim, 3 for walk
      this.animationFrame = (this.animationFrame + 1) % maxFrames;
      this.animationTimer = 0;
    }
  }

  protected override pickNewMove(grid: Tile[][], buildingGrid: number[][], ...args: any[]): void
  {
    const ducks: Duck[] = args[0] || [];
    let movedTowardsDuck = false;
    if (ducks.length > 0)
    {
      const adults = ducks.filter(d => d.isAdult);
      if (adults.length > 0)
      {
        const closest = this.shouldCheckAI() ? this.findClosestDuck(adults) : null;
        if (closest)
        {
          movedTowardsDuck = this.moveToLocation(closest.x, closest.y, grid, buildingGrid);
        }
      }
    }

    if (!movedTowardsDuck)
    {
      super.pickNewMove(grid, buildingGrid);
    }
  }

  private findClosestDuck(ducks: Duck[]): Duck | null
  {
    let closest: Duck | null = null;
    let minDistSq = GameConstants.AI.MOTHER_VISION_RADIUS * GameConstants.AI.MOTHER_VISION_RADIUS;

    for (const d of ducks)
    {
      const distSq = Math.pow(d.x - this.x, 2) + Math.pow(d.y - this.y, 2);
      if (distSq < minDistSq)
      {
        minDistSq = distSq;
        closest = d;
      }
    }
    return closest;
  }

  private moveToLocation(targetX: number, targetY: number, grid: Tile[][], buildingGrid: number[][]): boolean
  {
    const dx = targetX - this.x;
    const dy = targetY - this.y;

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
    // Calculamos columnas dinámicamente: 2 para nado, 3 para caminar
    const cols = this.isSwimming ? 2 : 3;
    // Si la imagen no ha cargado, usamos valores por defecto seguros
    const spriteW = this.spriteSheet.naturalWidth > 0 ? this.spriteSheet.naturalWidth / cols : 32;
    const spriteH = this.spriteSheet.naturalHeight > 0 ? this.spriteSheet.naturalHeight / 4 : 32;

    const rowIdx = this.getSpriteRow();
    // Escalar al 35% (más pequeño que el pollo)
    const scale = GameConstants.Visuals.SCALE.DUCKLING;
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

  public checkProximityAndCheep(x: number, y: number)
  {
    this.checkProximityAndPlaySound(x, y);
  }
}