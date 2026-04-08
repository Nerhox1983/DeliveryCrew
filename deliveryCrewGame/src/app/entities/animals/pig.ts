import { Animal } from './animal';
import { Tile } from '../../shared/models/tile.model';
import { GameConstants } from '../../shared/config/GameConstants';
import { SpriteConfig } from '../../shared/models/sprite-config.model';

export class Pig extends Animal
{
    private frameWidth: number;
    private frameHeight: number;

    constructor(image: HTMLImageElement, r: number, c: number, config?: SpriteConfig)
    {
        super(image, r, c, config);

        // Configuración de dimensiones basada en la hoja de sprites 4x5
        this.frameWidth = this.spriteSheet.naturalWidth / 5;  // 5 columnas
        this.frameHeight = this.spriteSheet.naturalHeight / 4; // 4 filas

        // Ajustamos la velocidad para que sea un poco más lento que otros animales
        this.speed = 1.0;

        // Definir dieta: Frutas del mercado, panes, etc.
        this.diet = [
            'red_apple.png', 'banana.png', 'orange.png', // Frutas
            'bread.png', 'carrot.png', // Otros
            'garbage_bag.png' // Quizás basura también?
        ];

        // Sonido inicial (asumimos que empieza sin hambre)
        this.sound = 'pig-oinking.mp3';
    }

    public update(dt: number, tileGrid: Tile[][], buildingGrid: number[][]): void
    {
        // Actualizar sonido dinámicamente según el hambre
        this.sound = this.hunger < 25 ? 'pig-grunting.mp3' : 'pig-oinking.mp3';

        // Usamos la lógica base de deambular
        this.handleWandering(tileGrid, buildingGrid);
    }

    // Sobrescribimos la animación porque el cerdo tiene 5 frames, no 3 como el defecto de Animal
    protected override updateAnimation(fast: boolean = false): void
    {
        this.animationTimer++;
        const speed = fast ? GameConstants.Timers.ANIMAL_FAST_ANIMATION_SPEED_FRAMES : GameConstants.Timers.ANIMAL_ANIMATION_SPEED_FRAMES;

        if (this.animationTimer > speed)
        {
            // Ciclo de 0 a 4 (5 frames)
            this.animationFrame = (this.animationFrame + 1) % 5;
            this.animationTimer = 0;
        }
    }

    draw(ctx: CanvasRenderingContext2D)
    {
        if (!this.spriteSheet) return;

        const rowIdx = this.getSpriteRow();

        // Escala del cerdo
        const scale = this.config ? this.config.scale : 1.0;
        const drawW = this.frameWidth * scale;
        const drawH = this.frameHeight * scale;

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

        // Dibujar indicador de hambre si es necesario
        this.drawHungerIndicator(ctx);
    }

    public checkProximityAndOink(x: number, y: number)
    {
        this.checkProximityAndPlaySound(x, y);
    }
}