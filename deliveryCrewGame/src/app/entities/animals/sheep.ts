import { Animal } from './animal';
import { Tile } from '../../shared/models/tile.model';
import { SpriteConfig } from '../../shared/models/sprite-config.model';
import { GameConstants } from '../../shared/config/GameConstants';

export class Sheep extends Animal
{
    private frameWidth: number;
    private frameHeight: number;

    constructor(sprite: HTMLImageElement, r: number, c: number, config?: SpriteConfig)
    {
        super(sprite, r, c, config);

        // Configuración de dimensiones basada en la hoja de sprites 4x5
        // 5 columnas (animación) x 4 filas (direcciones: E, N, S, W)
        this.frameWidth = this.spriteSheet.naturalWidth / 5;
        this.frameHeight = this.spriteSheet.naturalHeight / 4;

        this.speed = 1.0; // Velocidad moderada
        this.sound = 'sheep_baa.mp3'; // Nombre sugerido para el archivo de sonido
    }

    public update(grid: Tile[][], buildingGrid: number[][]): void
    {
        // Comportamiento básico de deambular
        this.handleWandering(grid, buildingGrid);
    }

    protected override updateAnimation(fast: boolean = false): void
    {
        this.animationTimer++;
        const speed = fast ? GameConstants.Timers.ANIMAL_FAST_ANIMATION_SPEED_FRAMES : GameConstants.Timers.ANIMAL_ANIMATION_SPEED_FRAMES;

        if (this.animationTimer > speed)
        {
            // Ciclo de 0 a 4 (5 frames de animación)
            this.animationFrame = (this.animationFrame + 1) % 5;
            this.animationTimer = 0;
        }
    }

    draw(ctx: CanvasRenderingContext2D)
    {
        if (!this.spriteSheet) return;

        const rowIdx = this.getSpriteRow();

        // Usar la escala del JSON si está disponible, si no, usar 1.0 (tamaño original)
        const scale = this.config ? this.config.scale : 1.0;
        const drawW = this.frameWidth * scale;
        const drawH = this.frameHeight * scale;

        // Centrar el sprite escalado dentro del tile de 64x64
        const offsetX = (GameConstants.TILE_SIZE - drawW) / 2;
        const offsetY = (GameConstants.TILE_SIZE - drawH) / 2;

        ctx.drawImage(
            this.spriteSheet,
            this.animationFrame * this.frameWidth,
            rowIdx * this.frameHeight,
            this.frameWidth,
            this.frameHeight,
            this.x + offsetX,
            this.y + offsetY,
            drawW,
            drawH
        );

        this.drawHungerIndicator(ctx);
    }

    public checkProximityAndBaa(x: number, y: number)
    {
        this.checkProximityAndPlaySound(x, y);
    }
}