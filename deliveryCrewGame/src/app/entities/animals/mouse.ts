import { Tile } from '../../shared/models/tile.model';
import { Animal } from './animal';
import { GameConstants } from '../../shared/config/GameConstants';

export class Mouse extends Animal
{

  constructor(sprite: HTMLImageElement, startRow: number, startCol: number)
  {
    super(sprite, startRow, startCol);
    this.speed = 3.0; // Son rápidos
  }

  update(grid: Tile[][], buildingGrid: number[][])
  {
    this.handleWandering(grid, buildingGrid);
  }

  protected override setNewWait()
  {
    this.waitTimer = 0;
    this.waitDuration = Math.floor(Math.random() * 60) + 30;
  }

  // Mice are fast, so they use the fast animation speed even when wandering
  protected override updateAnimation(): void
  {
    this.animationTimer++;
    if (this.animationTimer > GameConstants.Timers.ANIMAL_FAST_ANIMATION_SPEED_FRAMES)
    {
      this.animationFrame = (this.animationFrame + 1) % 3;
      this.animationTimer = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D)
  {
    if (!this.spriteSheet || !this.spriteSheet.complete || this.spriteSheet.naturalWidth === 0) return;

    const spriteW = 64; // 192 / 3
    const spriteH = 64; // 256 / 4

    const rowIdx = this.getSpriteRow();
    // Escalar para que parezca un ratón (pequeño)
    const scale = GameConstants.Visuals.SCALE.MOUSE;
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
}