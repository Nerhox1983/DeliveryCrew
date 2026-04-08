import { AssetManager } from '../../core/services/asset-manager.service';
import { GameTile } from '../../shared/models/tile.model';
import { Pederestian } from './pederestian';

export type SalesmanState = 'IDLE' | 'WALK' | 'GO_HOME' | 'AT_HOME' | 'RETURN_TO_WORK';

export class Salesman extends Pederestian
{
    public profession: string;
    public state: SalesmanState = 'IDLE';
    public isVisible: boolean = true;

    // Animation
    private animationTimer: number = 0;
    private readonly ANIMATION_SPEED: number = 0.15;

    // Movement & Behavior
    private targetX: number;
    private targetY: number;
    private anchorX: number;
    private anchorY: number;
    private homeX: number;
    private homeY: number;
    private stateTimer: number = 0;
    private readonly IDLE_DURATION = 4; // seconds
    private readonly WALK_RADIUS = 96; // pixels around the market stand

    // Assets
    private idleImage!: HTMLImageElement;

    // Sprite Sets
    private workWalkImage: HTMLImageElement;
    private workIdleImage: HTMLImageElement;
    private normalWalkImage: HTMLImageElement;
    private normalIdleImage: HTMLImageElement;


    constructor(
        assetManager: AssetManager,
        x: number,
        y: number,
        profession: 'salesman' | 'saleswoman'
    )
    {
        // Determine initial assets for super constructor
        const initialWalkImage = profession === 'salesman' ? assetManager.grandpa01_walk_sell : assetManager.grandma01_walk_sell;

        // Calculate grid position for super (approximate)
        const r = Math.floor(y / 64);
        const c = Math.floor(x / 64);

        super(initialWalkImage, r, c);

        this.speed = 40; // Slower than player (Inherited property)
        // Override exact position
        this.x = x;
        this.y = y;

        this.anchorX = x;
        this.anchorY = y;
        this.targetX = x;
        this.targetY = y;
        this.profession = profession;

        // Assign assets based on profession
        if (profession === 'salesman')
        {
            this.workWalkImage = assetManager.grandpa01_walk_sell;
            this.workIdleImage = assetManager.grandpa01_idle_sell;
            this.normalWalkImage = assetManager.grandpa01_walk;
            this.normalIdleImage = assetManager.grandpa01_idle;
            this.name = 'Abuelo Vendedor';
            this.sex = 'male';
        } else
        {
            this.workWalkImage = assetManager.grandma01_walk_sell;
            this.workIdleImage = assetManager.grandma01_idle_sell;
            this.normalWalkImage = assetManager.grandma01_walk;
            this.normalIdleImage = assetManager.grandma01_idle;
            this.name = 'Abuela Vendedora';
            this.sex = 'female';
        }

        // Inicializar con ropa de trabajo por defecto
        this.walkImage = this.workWalkImage;
        this.idleImage = this.workIdleImage;

        // Asignar una ubicación de "casa" aleatoria lejos del puesto (simulación de irse de la ciudad)
        const angle = Math.random() * Math.PI * 2;
        const dist = 2000; // Suficientemente lejos para salir de pantalla
        this.homeX = this.anchorX + Math.cos(angle) * dist;
        this.homeY = this.anchorY + Math.sin(angle) * dist;
    }

    public updateRoutine(dt: number, gameTimeMinutes: number, grid: GameTile[][])
    {
        // Lógica de Horario Laboral (8:00 AM - 8:00 PM)
        const hour = gameTimeMinutes / 60;
        const isWorkingHours = hour >= 8 && hour < 20;

        this.walkImage = isWorkingHours ? this.workWalkImage : this.normalWalkImage;
        this.idleImage = isWorkingHours ? this.workIdleImage : this.normalIdleImage;

        // Transiciones de Estado según Horario
        if (isWorkingHours)
        {
            if (this.state === 'AT_HOME')
            {
                this.state = 'RETURN_TO_WORK';
                this.isVisible = true;
                this.targetX = this.anchorX;
                this.targetY = this.anchorY;
            } else if (this.state === 'GO_HOME')
            {
                // Si el turno empieza mientras iba a casa, regresa
                this.state = 'RETURN_TO_WORK';
                this.targetX = this.anchorX;
                this.targetY = this.anchorY;
            }
        } else
        {
            // Fuera de horario: Ir a casa
            if (this.state !== 'GO_HOME' && this.state !== 'AT_HOME')
            {
                this.state = 'GO_HOME';
                this.targetX = this.homeX;
                this.targetY = this.homeY;
            }
        }

        this.stateTimer += dt;
        this.animationTimer += dt;

        // --- State Machine ---
        if (this.state === 'IDLE')
        {
            // Deambular solo si está trabajando
            if (this.stateTimer >= this.IDLE_DURATION)
            {
                this.pickNewTarget();
                this.state = 'WALK';
                this.stateTimer = 0;
                this.currentFrame = 0;
            }

            // Idle Animation (2 frames)
            if (this.animationTimer >= 0.5)
            { // Slower idle breathing
                this.animationTimer = 0;
                this.currentFrame = (this.currentFrame + 1) % 2;
            }
        } else if (this.state === 'WALK' || this.state === 'GO_HOME' || this.state === 'RETURN_TO_WORK')
        {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // ¿Llegó al destino?
            if (dist < 5)
            {
                this.x = this.targetX;
                this.y = this.targetY;

                if (this.state === 'GO_HOME')
                {
                    this.state = 'AT_HOME';
                    this.isVisible = false; // Desaparecer al llegar a casa
                } else if (this.state === 'RETURN_TO_WORK')
                {
                    this.state = 'IDLE';
                } else
                {
                    this.state = 'IDLE';
                }

                this.stateTimer = 0;
                this.currentFrame = 0;
            } else
            {
                // Move
                const moveStep = this.speed * dt;
                this.x += (dx / dist) * moveStep;
                this.y += (dy / dist) * moveStep;

                // Recoger dinero del suelo mientras camina
                this.checkLootPickup(grid);

                // Update Direction
                if (Math.abs(dx) > Math.abs(dy))
                {
                    this.direction = dx > 0 ? 3 : 1;
                } else
                {
                    this.direction = dy > 0 ? 2 : 0;
                }

                // Walk Animation (9 frames)
                if (this.animationTimer >= this.ANIMATION_SPEED)
                {
                    this.animationTimer = 0;
                    this.currentFrame = (this.currentFrame + 1) % 9;
                }
            }
        }
    }

    private pickNewTarget()
    {
        // Pick a random point within radius of the anchor (Market Stand)
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * this.WALK_RADIUS;
        this.targetX = this.anchorX + Math.cos(angle) * dist;
        this.targetY = this.anchorY + Math.sin(angle) * dist;
    }

    public override draw(ctx: CanvasRenderingContext2D)
    {
        if (!this.isVisible) return;

        const img = this.state === 'WALK' ? this.walkImage : this.idleImage;

        if (img && img.complete && img.naturalWidth > 0)
        {
            // Calculate frame dimensions dynamically based on the grid provided
            // REFACTOR: Asegurar uso estricto de columnas según estado
            const cols = (this.state === 'WALK' || this.state === 'GO_HOME' || this.state === 'RETURN_TO_WORK') ? 9 : 2;
            const rows = 4; // Standard 4 directions

            const frameWidth = img.naturalWidth / cols;
            const frameHeight = img.naturalHeight / rows;

            // Update sprite dimensions for renderer culling/sorting
            this.spriteWidth = frameWidth;
            this.spriteHeight = frameHeight;

            const srcX = this.currentFrame * frameWidth;
            const srcY = this.direction * frameHeight;

            ctx.drawImage(
                img,
                srcX, srcY, frameWidth, frameHeight,
                this.x, this.y, frameWidth, frameHeight
            );
        }
    }
}
