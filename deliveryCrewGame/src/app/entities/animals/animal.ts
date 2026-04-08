import { Tile } from '../../shared/models/tile.model';
import { GameConstants } from '../../shared/config/GameConstants';
import { SpriteConfig } from '../../shared/models/sprite-config.model';
import type { Worm } from './worm';


export abstract class Animal
{
    public x: number;
    public y: number;
    public row: number;
    public col: number;
    public speed: number = GameConstants.Physics.DEFAULT_SPEED;
    public direction: 'north' | 'south' | 'east' | 'west' = 'south';
    public animationFrame: number = 0;
    public animationTimer: number = 0;
    public spriteSheet: HTMLImageElement;
    public isMoving: boolean = false;
    public chasingTarget: any | null = null;

    // Propiedades de necesidades (Similar al Player)
    public hunger: number = 100;
    protected hungerTimer: number = 0;

    // Configuración de renderizado desde JSON
    protected config?: SpriteConfig;
    // Define qué archivos de imagen considera comida este animal (sobreescribir en hijos)
    protected diet: string[] = [];

    protected targetX: number;
    protected targetY: number;
    protected waitTimer: number = 0;
    protected waitDuration: number = 0;

    // Sound properties
    protected sound: string | undefined;
    protected lastSoundTime: number = 0;

    // Optimización: Timer para no ejecutar lógica de búsqueda pesada en cada frame
    protected aiCheckTimer: number = Math.floor(Math.random() * 15); // Desfase inicial aleatorio
    protected readonly AI_CHECK_INTERVAL: number = 15; // Chequear cada 15 frames (~250ms)

    constructor(sprite: HTMLImageElement, startRow: number, startCol: number, config?: SpriteConfig)
    {
        this.spriteSheet = sprite;
        this.row = startRow;
        this.col = startCol;
        this.x = startCol * GameConstants.TILE_SIZE;
        this.y = startRow * GameConstants.TILE_SIZE;
        this.targetX = this.x;
        this.targetY = this.y;
        this.config = config;
        this.setNewWait();
    }

    abstract update(...args: any[]): void;
    abstract draw(ctx: CanvasRenderingContext2D): void;

    /**
     * Dibuja un indicador (emoji) sobre el animal si tiene hambre.
     * @param ctx El contexto del canvas.
     */
    protected drawHungerIndicator(ctx: CanvasRenderingContext2D): void
    {
        if (this.hunger < 25)
        {
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🤤', this.x + (GameConstants.TILE_SIZE / 2), this.y - 5);
        }
    }

    /**
     * Determina si el animal debe ejecutar lógica costosa de IA en este frame.
     * Ayuda a distribuir la carga de CPU.
     */
    protected shouldCheckAI(): boolean
    {
        this.aiCheckTimer++;
        if (this.aiCheckTimer >= this.AI_CHECK_INTERVAL)
        {
            this.aiCheckTimer = 0;
            return true;
        }
        return false;
    }

    /**
     * Alimenta al animal restaurando su nivel de hambre.
     * @param amount Cantidad de hambre a restaurar (0-100).
     */
    public feed(amount: number): void
    {
        this.hunger = Math.min(100, this.hunger + amount);
    }

    protected updateHunger(): void
    {
        this.hungerTimer++;
        // Asumiendo 60 FPS, 3600 frames son aprox 1 minuto de juego
        if (this.hungerTimer >= 3600)
        {
            this.hunger = Math.max(0, this.hunger - 1);
            this.hungerTimer = 0;
        }
    }

    protected setNewWait(): void
    {
        this.waitTimer = 0;
        this.waitDuration = Math.floor(Math.random() * GameConstants.Timers.MAX_WAIT_VARIATION_FRAMES) + GameConstants.Timers.MIN_WAIT_FRAMES;
    }

    protected handleWandering(grid: Tile[][], buildingGrid: number[][], ...args: any[]): void
    {
        this.updateHunger();

        if (this.isMoving)
        {
            // Si se está moviendo y tiene hambre, verificamos si llegó a la comida
            if (this.hunger < 25)
            {
                const r = Math.floor((this.y + GameConstants.TILE_SIZE / 2) / GameConstants.TILE_SIZE);
                const c = Math.floor((this.x + GameConstants.TILE_SIZE / 2) / GameConstants.TILE_SIZE);

                // Intentar comer si ya llegó al tile destino
                if (Math.abs(this.targetX - this.x) < 4 && Math.abs(this.targetY - this.y) < 4)
                {
                    this.tryEatFood(grid, r, c);
                }
            }
            this.moveTowardsTarget(grid, buildingGrid);
        } else
        {
            this.waitTimer++;
            if (this.waitTimer >= this.waitDuration)
            {
                // PRIORIDAD 1: Si tiene hambre, busca comida antes de moverse al azar
                let foundFood = false;
                if (this.hunger < 25)
                {
                    // Primero revisa si ya está parado sobre comida
                    if (this.tryEatFood(grid, this.row, this.col))
                    {
                        return;
                    }
                    // Si no, busca alrededor
                    foundFood = this.scanForFood(grid, buildingGrid);
                }

                // PRIORIDAD 2: Movimiento normal
                if (!foundFood)
                {
                    this.pickNewMove(grid, buildingGrid, ...args);
                }
            }
            this.animationFrame = 1; // Idle frame
        }
    }

    /**
     * Busca comida en un radio alrededor del animal.
     * Si encuentra, configura el movimiento hacia ella.
     */
    protected scanForFood(grid: Tile[][], buildingGrid: number[][]): boolean
    {
        if (this.diet.length === 0) return false;

        const searchRadius = 10; // Radio de búsqueda en tiles
        const startR = Math.max(0, this.row - searchRadius);
        const endR = Math.min(grid.length - 1, this.row + searchRadius);
        const startC = Math.max(0, this.col - searchRadius);
        const endC = Math.min(grid[0].length - 1, this.col + searchRadius);

        // Búsqueda simple del más cercano
        let closestFood: { r: number, c: number, dist: number } | null = null;

        for (let r = startR; r <= endR; r++)
        {
            for (let c = startC; c <= endC; c++)
            {
                const tile = grid[r][c];
                if (!tile) continue;

                // Verifica si el nombre del archivo coincide con la dieta
                const fileName = tile.fileName.split('/').pop(); // Extraer solo nombre archivo
                if (fileName && this.diet.includes(fileName))
                {
                    // Verificar si es accesible
                    if (this.canTraverse(grid, buildingGrid, r, c))
                    {
                        const dist = Math.abs(this.row - r) + Math.abs(this.col - c);
                        if (!closestFood || dist < closestFood.dist)
                        {
                            closestFood = { r, c, dist };
                        }
                    }
                }
            }
        }

        if (closestFood)
        {
            this.targetX = closestFood.c * GameConstants.TILE_SIZE;
            this.targetY = closestFood.r * GameConstants.TILE_SIZE;
            this.isMoving = true;
            this.updateDirection(closestFood.c - this.col, closestFood.r - this.row);
            return true;
        }

        return false;
    }

    /**
     * Intenta comer lo que hay en el tile actual.
     * Retorna true si comió algo.
     */
    protected tryEatFood(grid: Tile[][], r: number, c: number): boolean
    {
        const tile = grid[r][c];
        if (!tile) return false;

        const fileName = tile.fileName.split('/').pop();
        if (fileName && this.diet.includes(fileName))
        {
            // ¡COMER!
            this.feed(50); // Recuperar 50% de hambre

            // Reproducir sonido de comer (opcional) o efecto visual

            // Eliminar la comida del mundo (restaurar tile base o poner suelo)
            const t = tile as any;
            if (t.underlyingTile)
            {
                grid[r][c] = { ...t.underlyingTile };
            } else
            {
                // Fallback a suelo por defecto si no hay historia
                grid[r][c] = {
                    fileName: 'floor_type01.png',
                    type: 'floor',
                    walkable: true
                } as Tile;
            }

            this.isMoving = false;
            this.setNewWait(); // Pausa digestiva
            return true;
        }
        return false;
    }

    /*protected moveTowardsTarget(grid: Tile[][], buildingGrid: number[][]): void
    {
        let nextX = this.x;
        let nextY = this.y;       

        if (this.x < this.targetX) nextX = Math.min(this.x + this.speed, this.targetX);
        else if (this.x > this.targetX) nextX = Math.max(this.x - this.speed, this.targetX);

        if (this.y < this.targetY) nextY = Math.min(this.y + this.speed, this.targetY);
        else if (this.y > this.targetY) nextY = Math.max(this.y - this.speed, this.targetY);

        const c = Math.floor((nextX + GameConstants.TILE_SIZE / 2) / GameConstants.TILE_SIZE);
        const r = Math.floor((nextY + GameConstants.TILE_SIZE / 2) / GameConstants.TILE_SIZE);

        if (this.canTraverse(grid, buildingGrid, r, c))
        {
            this.x = nextX;
            this.y = nextY;
        } else
        {
            this.isMoving = false;
            this.setNewWait();
            return;
        }

        if (this.x === this.targetX && this.y === this.targetY)
        {
            this.isMoving = false;
            this.col = Math.round(this.x / GameConstants.TILE_SIZE);
            this.row = Math.round(this.y / GameConstants.TILE_SIZE);
            this.setNewWait();
        }

        this.updateDirection(dx, dy);
        this.updateAnimation();
    }*/
    protected moveTowardsTarget(grid: Tile[][], buildingGrid: number[][]): void
    {
        let nextX = this.x;
        let nextY = this.y;

        // 1. Calculamos la posición potencial
        if (this.x < this.targetX) nextX = Math.min(this.x + this.speed, this.targetX);
        else if (this.x > this.targetX) nextX = Math.max(this.x - this.speed, this.targetX);

        if (this.y < this.targetY) nextY = Math.min(this.y + this.speed, this.targetY);
        else if (this.y > this.targetY) nextY = Math.max(this.y - this.speed, this.targetY);

        // 2. Calculamos dx y dy (la diferencia entre el siguiente punto y el actual)
        const dx = nextX - this.x;
        const dy = nextY - this.y;

        const c = Math.floor((nextX + GameConstants.TILE_SIZE / 2) / GameConstants.TILE_SIZE);
        const r = Math.floor((nextY + GameConstants.TILE_SIZE / 2) / GameConstants.TILE_SIZE);

        if (this.canTraverse(grid, buildingGrid, r, c))
        {
            this.x = nextX;
            this.y = nextY;
        } else
        {
            this.isMoving = false;
            this.setNewWait();
            return;
        }

        if (this.x === this.targetX && this.y === this.targetY)
        {
            this.isMoving = false;
            this.col = Math.round(this.x / GameConstants.TILE_SIZE);
            this.row = Math.round(this.y / GameConstants.TILE_SIZE);
            this.setNewWait();
            return; // Evitar actualizar dirección con dx=0, dy=0 (que forzaría Norte)
        }

        // Ahora dx y dy ya existen y pueden ser usados aquí
        this.updateDirection(dx, dy);
        this.updateAnimation();
    }

    protected canTraverse(grid: Tile[][], buildingGrid: number[][], r: number, c: number): boolean
    {
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return false;
        const tile = grid[r][c];
        const building = buildingGrid[r][c];
        return !!(tile && tile.walkable && building === 0 && !tile.fileName.includes('wall') && !tile.fileName.includes('window'));
    }

    protected updateAnimation(fast: boolean = false): void
    {
        this.animationTimer++;
        const speed = fast ? GameConstants.Timers.ANIMAL_FAST_ANIMATION_SPEED_FRAMES : GameConstants.Timers.ANIMAL_ANIMATION_SPEED_FRAMES;
        if (this.animationTimer > speed)
        {
            this.animationFrame = (this.animationFrame + 1) % 3; // Assuming 3 frames for most animals
            this.animationTimer = 0;
        }
    }

    protected pickNewMove(grid: Tile[][], buildingGrid: number[][], ...args: any[]): void
    {
        const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'south', 'east', 'west'];
        const pick = directions[Math.floor(Math.random() * directions.length)];

        if (this.trySetMove(pick, grid, buildingGrid))
        {
            // Direction is set inside trySetMove
        } else
        {
            this.waitDuration = GameConstants.Timers.SHORT_WAIT_FRAMES;
        }
    }

    protected trySetMove(dir: 'north' | 'south' | 'east' | 'west', grid: Tile[][], buildingGrid: number[][]): boolean
    {
        let nextRow = this.row;
        let nextCol = this.col;

        if (dir === 'north') nextRow--;
        if (dir === 'south') nextRow++;
        if (dir === 'east') nextCol++;
        if (dir === 'west') nextCol--;

        if (this.canTraverse(grid, buildingGrid, nextRow, nextCol))
        {
            this.direction = dir;
            this.targetX = nextCol * GameConstants.TILE_SIZE;
            this.targetY = nextRow * GameConstants.TILE_SIZE;
            this.isMoving = true;
            return true;
        }
        return false;
    }

    public checkProximityAndPlaySound(pcX: number, pcY: number): void
    {
        if (!this.sound) return;

        const dx = this.x - pcX;
        const dy = this.y - pcY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < GameConstants.AI.SOUND_PROXIMITY)
        {
            const now = Date.now();
            if (now - this.lastSoundTime > GameConstants.Timers.ANIMAL_SOUND_COOLDOWN_MS)
            {
                const audio = new Audio(`/assets/sounds/${this.sound}`);
                audio.volume = GameConstants.Visuals.DEFAULT_SOUND_VOLUME;
                audio.play().catch(() => { }); // Ignore autoplay errors
                this.lastSoundTime = now;
            }
        }
    }

    protected findClosestWorm(worms: Worm[]): Worm | null
    {
        let closest: Worm | null = null;
        let minDistSq = GameConstants.AI.WORM_VISION_RADIUS * GameConstants.AI.WORM_VISION_RADIUS;

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

    protected handleChase(target: any, grid: Tile[][], buildingGrid: number[][], chaseSpeedMultiplier: number, onCatch: () => void, catchDistance: number): boolean
    {
        if (!target) return false;
        this.updateHunger();

        const chaseSpeed = this.speed * chaseSpeedMultiplier;
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < catchDistance)
        {
            onCatch();
            this.chasingTarget = null;
            this.isMoving = false;
            this.setNewWait();
        } else
        {
            this.isMoving = true;
            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * chaseSpeed;
            this.y += Math.sin(angle) * chaseSpeed;
            this.updateDirection(dx, dy);
            this.updateAnimation(true);
        }
        return true;
    }

    protected updateDirection(dx: number, dy: number): void
    {
        if (Math.abs(dx) > Math.abs(dy))
        {
            this.direction = dx > 0 ? 'east' : 'west'; // Si dx es positivo, moverse a la derecha, sino a la izquierda
        } else
        {
            this.direction = dy > 0 ? 'south' : 'north'; // Si dy es positivo, moverse hacia abajo, sino hacia arriba
        }
    }

    /**
     * Obtiene el índice de la fila del spritesheet basado en la dirección actual.
     * Asume un orden estándar: 0:Sur, 1:Oeste, 2:Este, 3:Norte.
     * Este método puede ser sobreescrito por clases hijas si su spritesheet no sigue este orden.
     * @returns El índice de la fila (0-3).
     */
    protected getSpriteRow(): number
    {
        switch (this.direction)
        {
            case 'east': return 0;
            case 'north': return 1;
            case 'south': return 2;
            case 'west': return 3;
            default: return 2; // Default to 'south'
        }
    }
}