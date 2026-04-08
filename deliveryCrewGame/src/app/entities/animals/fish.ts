import { BreadCrumb } from '../../core/engine/renderer';
import { Tile } from '../../shared/models/tile.model';

export class Fish {
  x: number;
  y: number;
  row: number;
  col: number;
  direction: 'north' | 'south' | 'east' | 'west' = 'south';
  animationFrame: number = 0;
  animationTimer: number = 0;
  spriteSheet: HTMLImageElement;
  
  private isAnimating: boolean = false;
  private visible: boolean = false;
  private frames: number[] = [0, 2]; // PUNTO 1: Frame 1 y 3 (índices 0 y 2), omitiendo el 2do
  private currentFrameIndex: number = 0;

  private activeTimer: number = 0;
  private readonly ACTIVE_DURATION = 600; // 10s a 60fps
  private readonly TILE_SIZE = 64;
  
  private spriteW: number;
  private spriteH: number;

  constructor(sprite: HTMLImageElement, startRow: number, startCol: number) {
    this.spriteSheet = sprite;
    // Dimensiones indicadas: 192 ancho (3 columnas) x 256 alto (4 filas)
    this.spriteW = 192 / 3; 
    this.spriteH = 256 / 4;
    
    this.row = startRow;
    this.col = startCol;
    this.x = startCol * this.TILE_SIZE;
    this.y = startRow * this.TILE_SIZE;
    
    // Mantenemos ocultos los peces al inicio
    this.visible = false;
    this.isAnimating = false;
  }

  update(grid: Tile[][], breadCrumbs: BreadCrumb[] = []) {
    if (this.visible) {
      this.animationTimer++;
      this.activeTimer++;

      // Velocidad de animación (ajustable)
      if (this.animationTimer > 15) {
        this.animationTimer = 0;
        // Animación en bucle mientras esté activo
        this.currentFrameIndex = (this.currentFrameIndex + 1) % this.frames.length;
        this.animationFrame = this.frames[this.currentFrameIndex];
      }

      // Ocultar después de 10 segundos
      if (this.activeTimer >= this.ACTIVE_DURATION) {
        this.visible = false;
        this.isAnimating = false;
        this.activeTimer = 0;
      }

    } else {
      // Si está oculto, buscar pan en el agua
      this.checkForBread(grid, breadCrumbs);
    }
  }

  private startAnimation(r: number, c: number) {
    this.row = r;
    this.col = c;
    this.x = c * this.TILE_SIZE;
    this.y = r * this.TILE_SIZE;
    
    this.visible = true;
    this.isAnimating = true;
    this.currentFrameIndex = 0;
    this.animationFrame = this.frames[0]; // Iniciar con el 1er frame
    this.animationTimer = 0;
    
    // Dirección aleatoria para variar la fila del sprite
    const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'south', 'east', 'west'];
    this.direction = directions[Math.floor(Math.random() * directions.length)];
  }

  private checkForBread(grid: Tile[][], breadCrumbs: BreadCrumb[]) {
    // Buscar si hay algún trozo de pan en el agua
    const index = breadCrumbs.findIndex(b => this.isValidWaterTarget(grid, b.x, b.y));
    
    if (index !== -1) {
      const crumb = breadCrumbs[index];
      const r = Math.floor(crumb.y / this.TILE_SIZE);
      const c = Math.floor(crumb.x / this.TILE_SIZE);
      
      // Aparecer en la posición del pan
      this.startAnimation(r, c);
      this.activeTimer = 0;

      // Consumir el pan (removerlo del array)
      breadCrumbs.splice(index, 1);
    }
  }

  private isValidWaterTarget(grid: Tile[][], x: number, y: number): boolean {
    const r = Math.floor(y / this.TILE_SIZE);
    const c = Math.floor(x / this.TILE_SIZE);
    
    if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length) {
      const tile = grid[r][c];
      // Verificar que sea agua y no una fuente
      return tile && tile.fileName.includes('water') && !tile.fileName.includes('fountain');
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.visible) return;

    let rowIdx = 2; // Default to 'south'
    // CORRECCIÓN: Se ajusta el mapeo de dirección a la fila del spritesheet
    // para que coincida con el estándar de la mayoría de los otros animales.
    switch (this.direction)
    {
        case 'east': rowIdx = 0; break;
        case 'north': rowIdx = 1; break;
        case 'south': rowIdx = 2; break;
        case 'west': rowIdx = 3; break;
    }

    // Escalar al 50%
    const scale = 0.5;
    const drawW = this.spriteW * scale;
    const drawH = this.spriteH * scale;

    // Centrar el sprite en el tile
    const offsetX = (this.TILE_SIZE - drawW) / 2;
    const offsetY = (this.TILE_SIZE - drawH) / 2;

    ctx.drawImage(
      this.spriteSheet,
      this.animationFrame * this.spriteW,
      rowIdx * this.spriteH,
      this.spriteW,
      this.spriteH,
      this.x + offsetX,
      this.y + offsetY,
      drawW,
      drawH
    );
  }
}