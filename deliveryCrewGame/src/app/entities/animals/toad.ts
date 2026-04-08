import { GameTile } from '../../shared/models/tile.model';
import { Animal } from './animal';
import { Worm } from './worm';
import { GameConstants } from '../../shared/config/GameConstants';
import { SpriteConfig } from '../../shared/models/sprite-config.model';

/**
 * Representa un sapo en el juego.
 * Reacciona a la proximidad del jugador saltando para alejarse.
 */
export class Toad extends Animal
{
    private frameWidth: number;
    private frameHeight: number;
    public spriteWidth: number;
    public spriteHeight: number;

    private currentFrame: number = 0;
    // direction hereda de Animal
    private frameTimer: number = 0;
    private readonly animationSpeed = 0.5; // Segundos para cambiar de frame (más lento)

    // --- Estado de Salto ---
    private isJumping: boolean = false;
    private isPreparingJump: boolean = false; // Nuevo estado de preparación
    private prepareTimer: number = 0;
    private readonly PREPARE_DURATION: number = 0.25; // Tiempo para rotar antes de saltar (un poco más lento que la rana)
    private jumpTimer: number = 0;
    private readonly jumpDuration: number = 0.5; // Duración del salto en segundos (más lento)
    private readonly jumpHeight: number = 40;    // Altura del salto en píxeles (salto más bajo)
    private jumpCooldown: number = 0;
    private readonly JUMP_COOLDOWN_TIME = 2.0; // Segundos de espera entre saltos (más tiempo de descanso)

    // --- Hambre y Caza ---
    // hunger hereda de Animal
    override chasingTarget: Worm | null = null;
    private aiTimer: number = 0; // Timer propio para el sapo
    private readonly AI_INTERVAL: number = 20;

    // --- Deambular ---
    private wanderTimer: number = 0;
    private readonly WANDER_COOLDOWN: number = 4; // Segundos entre saltos aleatorios (más perezoso)

    // Propiedades para el movimiento durante el salto
    private jumpStartX: number = 0;
    private jumpStartY: number = 0;
    private jumpTargetX: number = 0;
    private jumpTargetY: number = 0;
    private readonly JUMP_DISTANCE = 56; // Distancia que recorre en un salto (un poco menos que 1 tile)

    constructor(private image: HTMLImageElement, r: number, c: number, config?: SpriteConfig)
    {
        super(image, r, c, config);

        // Ajustes específicos de Sapo sobreescritos tras el super()
        this.spriteWidth = 32;
        this.spriteHeight = 32;

        // Calcula las dimensiones de cada frame dinámicamente a partir de la hoja de sprites.
        this.frameWidth = this.image.naturalWidth / 3;  // La hoja tiene 3 columnas (animación)
        this.frameHeight = this.image.naturalHeight / 4; // La hoja tiene 4 filas (direcciones)

        this.sound = 'toad_croaking.mp3';
    }

    /**
     * Actualiza el estado del sapo.
     * @param tileGrid Grid del mapa para colisiones.
     * @param buildingGrid Grid de edificios para colisiones.
     * @param playerX Posición X del jugador.
     * @param playerY Posición Y del jugador.
     * @param dt Delta time para movimiento y animaciones fluidas.
     */
    public update(tileGrid: GameTile[][], buildingGrid: number[][], playerX: number, playerY: number, dt: number, worms: Worm[] = []): void
    {
        this.updateHungerLogic(dt);

        // 1. Manejo del Cooldown
        if (this.jumpCooldown > 0)
        {
            this.jumpCooldown -= dt;
        }

        // 2. Lógica de estados activos (preparación y salto)
        if (this.isPreparingJump)
        {
            this.prepareTimer -= dt;
            if (this.prepareTimer <= 0)
            {
                this.isPreparingJump = false;
                this.isJumping = true;
                this.jumpTimer = 0;
                this.jumpStartX = this.x;
                this.jumpStartY = this.y;
            }
            return;
        }

        if (this.isJumping)
        {
            this.jumpTimer += dt;
            const progress = Math.min(this.jumpTimer / this.jumpDuration, 1);

            this.x = this.jumpStartX + (this.jumpTargetX - this.jumpStartX) * progress;
            this.y = this.jumpStartY + (this.jumpTargetY - this.jumpStartY) * progress;

            if (progress >= 1)
            {
                this.isJumping = false;
                this.jumpCooldown = this.JUMP_COOLDOWN_TIME;
            }
            return;
        }

        // 3. Toma de Decisiones (Solo si no está saltando o en cooldown)
        if (this.jumpCooldown <= 0)
        {
            // Prioridad 1: Huir del jugador
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);

            if (distanceToPlayer < 128)
            {
                if (this.tryToFlee(dx, dy, tileGrid)) return;
            }

            // Prioridad 2: Cazar gusanos si tiene hambre
            if (this.hunger < 75)
            {
                this.aiTimer++;
                if (!this.chasingTarget && this.aiTimer > this.AI_INTERVAL)
                {
                    this.chasingTarget = this.findClosestWorm(worms);
                    this.aiTimer = 0;
                }

                if (this.chasingTarget)
                {
                    const wormDx = this.chasingTarget.x - this.x;
                    const wormDy = this.chasingTarget.y - this.y;
                    const distanceToWorm = Math.sqrt(wormDx * wormDx + wormDy * wormDy);

                    if (distanceToWorm < 32)
                    { // Suficientemente cerca para comer
                        const index = worms.indexOf(this.chasingTarget);
                        if (index > -1) worms.splice(index, 1);
                        this.hunger = 100; // Saciado
                        this.chasingTarget = null;
                        this.jumpCooldown = 0.5; // Pequeña pausa digestiva
                        return;
                    } else
                    {
                        // Saltar hacia el gusano
                        if (this.tryToJumpTowards(wormDx, wormDy, tileGrid)) return;
                    }
                }
            }

            // Prioridad 3: Deambular
            this.wanderTimer += dt;
            if (this.wanderTimer > this.WANDER_COOLDOWN)
            {
                this.wanderTimer = 0;
                if (this.tryToWander(tileGrid)) return;
            }
        }

        // 4. Animación de reposo (si no se tomó ninguna acción)
        this.frameTimer += dt;
        if (this.frameTimer > this.animationSpeed)
        {
            this.frameTimer += dt;
            this.currentFrame = (this.currentFrame + 1) % 2;
        }
    }

    // Renombramos para no chocar con updateHunger() de Animal que cuenta frames
    private updateHungerLogic(dt: number): void
    {
        this.hungerTimer += dt;
        if (this.hungerTimer >= 30)
        { // Los sapos tienen metabolismo similar, -1% cada 30s
            this.hunger = Math.max(0, this.hunger - 1);
            this.hungerTimer = 0;
        }
    }

    protected override findClosestWorm(worms: Worm[]): Worm | null
    {
        let closest: Worm | null = null;
        let minDistSq = 160 * 160; // Visión de ~2.5 tiles

        for (const w of worms)
        {
            const distSq = Math.pow(w.x - this.x, 2) + Math.pow(w.y - this.y, 2);
            if (distSq < minDistSq)
            {
                minDistSq = distSq;
                closest = w;
            }
        }
        return closest;
    }

    private initiateJump(targetX: number, targetY: number, direction: number): void
    {
        switch (direction)
        {
            case 0: this.direction = 'north'; break;
            case 1: this.direction = 'west'; break;
            case 2: this.direction = 'south'; break;
            case 3: this.direction = 'east'; break;
        }

        this.jumpTargetX = targetX;
        this.jumpTargetY = targetY;

        this.isPreparingJump = true;
        this.prepareTimer = this.PREPARE_DURATION;
    }

    private tryToJump(directionsToTry: number[], tileGrid: GameTile[][]): boolean
    {
        for (const dir of directionsToTry)
        {
            let targetX = this.x;
            let targetY = this.y;
            switch (dir)
            {
                case 0: targetY -= this.JUMP_DISTANCE; break; // Arriba
                case 1: targetX -= this.JUMP_DISTANCE; break; // Izquierda
                case 2: targetY += this.JUMP_DISTANCE; break; // Abajo
                case 3: targetX += this.JUMP_DISTANCE; break; // Derecha
            }

            const targetTileC = Math.floor(targetX / 64);
            const targetTileR = Math.floor(targetY / 64);

            if (tileGrid[targetTileR]?.[targetTileC]?.walkable)
            {
                this.initiateJump(targetX, targetY, dir);
                return true;
            }
        }
        return false;
    }

    private tryToFlee(playerDx: number, playerDy: number, tileGrid: GameTile[][]): boolean
    {
        const preferredDir = Math.abs(playerDx) > Math.abs(playerDy) ? (playerDx > 0 ? 1 : 3) : (playerDy > 0 ? 0 : 2);
        const directions = [preferredDir, (preferredDir + 1) % 4, (preferredDir + 3) % 4, (preferredDir + 2) % 4];
        return this.tryToJump(directions, tileGrid);
    }

    private tryToJumpTowards(targetDx: number, targetDy: number, tileGrid: GameTile[][]): boolean
    {
        const preferredDir = Math.abs(targetDx) > Math.abs(targetDy) ? (targetDx > 0 ? 3 : 1) : (targetDy > 0 ? 2 : 0);
        const directions = [preferredDir, (preferredDir + 1) % 4, (preferredDir + 3) % 4];
        return this.tryToJump(directions, tileGrid);
    }

    private tryToWander(tileGrid: GameTile[][]): boolean
    {
        const directions = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
        return this.tryToJump(directions, tileGrid);
    }

    protected override getSpriteRow(): number
    {
        // El spritesheet del sapo tiene un orden diferente: 0:N, 1:W, 2:S, 3:E
        switch (this.direction)
        {
            case 'north': return 0;
            case 'west': return 1;
            case 'south': return 2;
            case 'east': return 3;
            default: return 2; // Default to 'south'
        }
    }

    /**
     * Dibuja el sapo en el canvas.
     * @param ctx El contexto 2D del canvas.
     */
    public draw(ctx: CanvasRenderingContext2D): void
    {
        let frameX = this.currentFrame;
        let frameY = this.getSpriteRow();
        let drawY = this.y;

        if (this.isJumping)
        {
            // Frame de salto (asumimos que es el tercer frame, índice 2)
            frameX = 2;

            // Arco parabólico para la altura del salto
            const jumpProgress = this.jumpTimer / this.jumpDuration;
            const parabola = 4 * jumpProgress * (1 - jumpProgress); // Fórmula de parábola de 0 a 1 y de vuelta a 0
            drawY = this.y - (parabola * this.jumpHeight);
        }

        const scale = this.config ? this.config.scale : 1.0;
        const drawW = this.spriteWidth * scale;
        const drawH = this.spriteHeight * scale;

        ctx.drawImage(
            this.image,
            frameX * this.frameWidth,
            frameY * this.frameHeight,
            this.frameWidth,
            this.frameHeight,
            this.x,
            drawY, // Usamos la posición Y modificada para el efecto de salto
            drawW,
            drawH
        );

        // Indicador de hambre heredado de Animal
        this.drawHungerIndicator(ctx);
    }
}