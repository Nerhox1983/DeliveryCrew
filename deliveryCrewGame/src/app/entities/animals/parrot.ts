import { Animal } from './animal';
import { Tile } from '../../shared/models/tile.model';
import { SpriteConfig } from '../../shared/models/sprite-config.model';
import { GameConstants } from '../../shared/config/GameConstants';
import { Cat } from './cat';

export class Parrot extends Animal
{
    private frameWidth: number;
    private frameHeight: number;

    // Propiedades de Vuelo
    private walkSprite: HTMLImageElement;
    private flySprite: HTMLImageElement;
    private isFlying: boolean = false;
    private flyTimer: number = 0;
    private readonly FLY_DURATION: number = 180; // 3 segundos volando (a 60fps) antes de reaparecer
    private readonly SQUAWK_SOUNDS = ['parrot_squawking_01.mp3', 'parrot_squawking_02.mp3'];
    private readonly CAT_FEAR_RADIUS: number = 192; // 3 tiles de distancia

    constructor(walkSprite: HTMLImageElement, flySprite: HTMLImageElement, r: number, c: number, config?: SpriteConfig)
    {
        super(walkSprite, r, c, config);

        this.walkSprite = walkSprite;
        this.flySprite = flySprite;

        // Asumimos una hoja de sprites de 3x4 (3 frames de anim, 4 direcciones)
        this.frameWidth = this.spriteSheet.naturalWidth / 3;
        this.frameHeight = this.spriteSheet.naturalHeight / 4;

        this.speed = 1.2; // Velocidad normal
    }

    public update(grid: Tile[][], buildingGrid: number[][], cats: Cat[] = []): void
    {
        // Estado: Volando (Despegue y Reubicación)
        if (this.isFlying)
        {
            this.handleFlight(grid);
            return;
        }

        // Estado: Tierra (Verificar gatos)
        if (this.shouldCheckAI())
        {
            if (this.checkForCats(cats))
            {
                this.startFlight();
                return;
            }
        }

        // Comportamiento básico de deambular
        this.handleWandering(grid, buildingGrid);
    }

    private checkForCats(cats: Cat[]): boolean
    {
        for (const cat of cats)
        {
            const dx = cat.x - this.x;
            const dy = cat.y - this.y;
            // Si un gato está demasiado cerca, despegar
            if ((dx * dx + dy * dy) < (this.CAT_FEAR_RADIUS * this.CAT_FEAR_RADIUS))
            {
                return true;
            }
        }
        return false;
    }

    private startFlight()
    {
        this.isFlying = true;
        this.flyTimer = 0;
        this.spriteSheet = this.flySprite;
        this.isMoving = false; // Detener movimiento en grid
        this.checkProximityAndSquawk(this.x, this.y); // Sonido al despegar
    }

    private handleFlight(grid: Tile[][])
    {
        this.flyTimer++;
        this.animationTimer++;

        // Animación rápida de aleteo
        if (this.animationTimer > 5) 
        {
            this.animationFrame = (this.animationFrame + 1) % 3;
            this.animationTimer = 0;
        }

        // Efecto visual: Subir verticalmente (simular altura)
        // Solo visual, no cambiamos this.y lógico para no romper lógica de renderizado por capas

        if (this.flyTimer >= this.FLY_DURATION)
        {
            this.relocate(grid);
        }
    }

    private relocate(grid: Tile[][])
    {
        // Buscar un tile aleatorio caminable
        let attempts = 0;
        while (attempts < 20)
        {
            const r = Math.floor(Math.random() * grid.length);
            const c = Math.floor(Math.random() * grid[0].length);
            const tile = grid[r][c];

            if (tile && tile.walkable && !tile.fileName.includes('water'))
            {
                this.x = c * GameConstants.TILE_SIZE;
                this.y = r * GameConstants.TILE_SIZE;
                this.row = r;
                this.col = c;
                this.targetX = this.x;
                this.targetY = this.y;

                // Aterrizar
                this.isFlying = false;
                this.spriteSheet = this.walkSprite;
                this.setNewWait();
                break;
            }
            attempts++;
        }
    }

    draw(ctx: CanvasRenderingContext2D)
    {
        if (!this.spriteSheet) return;

        const rowIdx = this.getSpriteRow();

        // Usar la escala del JSON si está disponible, si no, usar 1.0
        const scale = this.config ? this.config.scale : 1.0;
        const drawW = this.frameWidth * scale;
        const drawH = this.frameHeight * scale;

        // Centrar el sprite en el tile
        const offsetX = (GameConstants.TILE_SIZE - drawW) / 2;
        const offsetY = (GameConstants.TILE_SIZE - drawH) / 2;

        let drawY = this.y + offsetY;

        // Si está volando, añadir offset vertical negativo para simular altura
        if (this.isFlying)
        {
            // Subir hasta 100px gradualmente
            const flightHeight = Math.min(this.flyTimer * 2, 100);
            drawY -= flightHeight;
        }

        ctx.drawImage(
            this.spriteSheet,
            this.animationFrame * this.frameWidth,
            rowIdx * this.frameHeight,
            this.frameWidth,
            this.frameHeight,
            this.x + offsetX,
            drawY,
            drawW,
            drawH
        );

        this.drawHungerIndicator(ctx);
    }

    /**
     * Sobrescribe el método base para reproducir uno de varios sonidos de graznido de forma aleatoria.
     */
    public override checkProximityAndPlaySound(pcX: number, pcY: number): void
    {
        const dx = this.x - pcX;
        const dy = this.y - pcY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < GameConstants.AI.SOUND_PROXIMITY)
        {
            const now = Date.now();
            if (now - this.lastSoundTime > GameConstants.Timers.ANIMAL_SOUND_COOLDOWN_MS)
            {
                const soundFile = this.SQUAWK_SOUNDS[Math.floor(Math.random() * this.SQUAWK_SOUNDS.length)];
                const audio = new Audio(`/assets/sounds/${soundFile}`);
                audio.volume = GameConstants.Visuals.DEFAULT_SOUND_VOLUME;
                audio.play().catch(() => { }); // Ignore autoplay errors
                this.lastSoundTime = now;
            }
        }
    }

    public checkProximityAndSquawk(x: number, y: number)
    {
        this.checkProximityAndPlaySound(x, y);
    }
}