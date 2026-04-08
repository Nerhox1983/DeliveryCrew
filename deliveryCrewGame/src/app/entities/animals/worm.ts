import { Tile } from '../../shared/models/tile.model';
import { GameConstants } from '../../shared/config/GameConstants';
import { Animal } from './animal';


export class Worm extends Animal
{
  constructor(sprite: HTMLImageElement, startRow: number, startCol: number)
  {
    super(sprite, startRow, startCol);
    this.speed = 0.5; // Las lombrices son lentas
  }

  public update(grid: Tile[][], buildingGrid: number[][])
  {
    this.handleWandering(grid, buildingGrid);
  }

  // Las lombrices tienen una animación y velocidad diferente
  protected override updateAnimation(): void
  {
    this.animationTimer++;
    // 0.2s a 60fps son 12 frames
    if (this.animationTimer > 12)
    {
      this.animationFrame = (this.animationFrame + 1) % 3; // 3 frames de animación
      this.animationTimer = 0;
    }
  }

  // Las lombrices no pueden entrar al agua
  protected override canTraverse(grid: Tile[][], buildingGrid: number[][], r: number, c: number): boolean
  {
    const canParentTraverse = super.canTraverse(grid, buildingGrid, r, c);
    if (!canParentTraverse) return false;

    const tile = grid[r][c];
    return tile && !tile.fileName.includes('water');
  }

  public draw(ctx: CanvasRenderingContext2D)
  {
    if (!this.spriteSheet || !this.spriteSheet.complete || this.spriteSheet.naturalWidth === 0) return;

    const spriteW = 64;
    const spriteH = 64;

    const rowIdx = this.getSpriteRow();

    const scale = GameConstants.Visuals.SCALE.WORM;
    const drawW = spriteW * scale;
    const drawH = spriteH * scale;
    const offsetX = (GameConstants.TILE_SIZE - drawW) / 2; // Centrar en el tile de 64px
    const offsetY = (GameConstants.TILE_SIZE - drawH) / 2;

    ctx.drawImage(
      this.spriteSheet,
      this.animationFrame * spriteW,
      rowIdx * spriteH,
      spriteW,
      spriteH,
      this.x + offsetX, this.y + offsetY, drawW, drawH
    );

    // Dibujar indicador de hambre si es necesario
    this.drawHungerIndicator(ctx);
  }
}
