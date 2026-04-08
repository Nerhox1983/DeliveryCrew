import { Tile } from '../../shared/models/tile.model';
import { Quest } from '../../shared/models/quest.model';
import { Wallet } from '../../shared/models/wallet.model';

export class Pederestian
{
    public x: number;
    public y: number;
    public spriteWidth = 64;
    public spriteHeight = 64;

    public direction = 2; // 0: Up, 1: Left, 2: Down, 3: Right
    public currentFrame = 0;
    private frameTimer = 0;
    private moveTimer = 0;
    private isMoving = false;
    protected speed = 1;

    // Lógica de carga
    private isCarrying = false;
    private actionTimer = 0;
    private carriedTile: Tile | null = null;
    private deliveryTarget: { r: number, c: number } | null = null;

    // Billetera del NPC
    public wallet: Wallet = new Wallet();

    // Propiedades para Misiones
    public id: number;
    public quest: Quest | null = null;
    public showQuestIndicator: boolean = false;
    public questIndicatorColor: string = '#f1c40f'; // Amarillo por defecto
    public questIndicatorText: string = '!';
    public identifier: string;
    public faceId: string;
    public name: string = ''; // Nueva propiedad para el nombre completo
    public sex: 'male' | 'female' = 'male';
    public assignedHouseId: number | null = null;
    private static nextId = 0;

    constructor(
        protected walkImage: HTMLImageElement,
        r: number,
        c: number,
        private carryImage?: HTMLImageElement, // Parámetro opcional para la imagen de carga (limón)
        private carryBoxImage?: HTMLImageElement // Nuevo: Imagen para cargar cajas
    )
    {
        this.x = c * 64;
        this.y = r * 64;
        this.id = Pederestian.nextId++;
        const fileName = walkImage.src.split('/').pop() || `npc_${this.id}`;
        this.identifier = fileName.replace('.png', '');
        // Extraer el identificador base (ej: 'woman02' de 'woman02_walk')
        const match = this.identifier.match(/^(man0|man|woman|mujer|grandpa|grandma)(\d+)/i); // 'i' para case-insensitive
        if (match)
        {
            let prefix = match[1];
            let number = match[2];
            const originalPrefix = prefix.toLowerCase();

            // 1. Asignar el sexo basado en el prefijo original para garantizar la correcta asignación.
            this.sex = (originalPrefix.startsWith('woman') || originalPrefix.startsWith('mujer') || originalPrefix.startsWith('grandma')) ? 'female' : 'male';

            // 2. Normalizar prefijos para un faceId consistente.
            if (originalPrefix.startsWith('grandpa')) prefix = 'grandpa';
            else if (originalPrefix.startsWith('grandma')) prefix = 'grandma';
            else if (originalPrefix.startsWith('man')) prefix = 'man'; // Cubre 'man' y 'man0'
            else if (originalPrefix.startsWith('woman') || originalPrefix.startsWith('mujer')) prefix = 'woman';

            // 3. Casos especiales para faceId donde el arte no coincide con el género.
            // Ejemplo: woman03 usa el rostro de man03.
            if (this.identifier.toLowerCase().startsWith('woman03'))
            {
                prefix = 'man';
            }

            // 4. Construir el faceId final.
            this.faceId = `${prefix}${number.padStart(2, '0')}`;
        } else
        {
            this.sex = 'male'; // Default
            this.faceId = `npc_${this.id}`; // Fallback
        }
    }

    public update(grid: any[][], buildingGrid: number[][], playerX?: number, playerY?: number, chasePlayer: boolean = false)
    {
        if (chasePlayer && playerX !== undefined && playerY !== undefined)
        {
            // Lógica de Persecución
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let nextX = this.x;
            let nextY = this.y;
            this.isMoving = false;

            // Moverse si está a más de 1 tile de distancia
            if (dist > 64)
            {
                if (Math.abs(dx) > Math.abs(dy))
                {
                    if (dx > 0) { nextX += this.speed; this.direction = 3; }
                    else { nextX -= this.speed; this.direction = 1; }
                } else
                {
                    if (dy > 0) { nextY += this.speed; this.direction = 2; }
                    else { nextY -= this.speed; this.direction = 0; }
                }
                this.isMoving = true;
            }

            // Chequeo de colisión
            const c = Math.floor((nextX + 32) / 64);
            const r = Math.floor((nextY + 63) / 64); // Usar los pies del sprite (64-1)

            if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length && grid[r][c] && grid[r][c].walkable && buildingGrid[r][c] === 0)
            {
                this.x = nextX;
                this.y = nextY;
                if (!this.isCarrying) this.checkAutoPickup(grid);
                this.checkLootPickup(grid);
            } else
            {
                this.isMoving = false; // Detener si choca
            }

            // Animación durante persecución
            if (this.isMoving)
            {
                this.frameTimer++;
                if (this.frameTimer > 10)
                {
                    this.frameTimer = 0;
                    this.currentFrame = (this.currentFrame + 1) % 9;
                }
            } else
            {
                this.currentFrame = 0;
            }
        } else if (this.isCarrying && this.carriedTile?.type === 'cardboardbox')
        {
            // 2. Lógica de Entrega (Delivery Mode)
            this.handleDelivery(grid, buildingGrid);
        } else
        {
            // 1. Movimiento Aleatorio (Random Walk)
            this.moveTimer++;
            if (this.moveTimer > 100)
            {
                this.moveTimer = 0;
                this.isMoving = !this.isMoving;
                if (this.isMoving)
                {
                    this.direction = Math.floor(Math.random() * 4);
                }
            }

            if (this.isMoving)
            {
                let nextX = this.x;
                let nextY = this.y;
                if (this.direction === 0) nextY -= this.speed;
                if (this.direction === 1) nextX -= this.speed;
                if (this.direction === 2) nextY += this.speed;
                if (this.direction === 3) nextX += this.speed;

                // Chequeo de colisión simple
                const c = Math.floor((nextX + 32) / 64);
                const r = Math.floor((nextY + 63) / 64); // Usar los pies del sprite (64-1)

                if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length)
                {
                    const tile = grid[r][c];
                    // Verificar si es caminable y no es un edificio
                    if (tile && tile.walkable && buildingGrid[r][c] === 0)
                    {
                        this.x = nextX;
                        this.y = nextY;
                        this.checkLootPickup(grid);
                        if (!this.isCarrying) this.checkAutoPickup(grid);
                    } else
                    {
                        this.isMoving = false; // Detenerse si choca
                    }
                }
            }

            // 2. Animación
            if (this.isMoving)
            {
                this.frameTimer++;
                if (this.frameTimer > 10)
                {
                    this.frameTimer = 0;
                    this.currentFrame = (this.currentFrame + 1) % 9;
                }
            } else
            {
                this.currentFrame = 0;
            }
        }

        // 3. Interacción (Recoger/Lanzar Limón) - Solo si tiene imagen de carga
        // Evitar soltar la caja aleatoriamente (solo limones o si no lleva nada)
        if (this.carryImage && (!this.isCarrying || this.carriedTile?.type !== 'cardboardbox'))
        {
            this.actionTimer++;
            // Intentar acción con más frecuencia (cada ~0.5 segundos) para no perder tiles al caminar
            if (this.actionTimer > 30)
            {
                this.actionTimer = 0;
                this.checkInteraction(grid);
            }
        }
    }

    private handleDelivery(grid: any[][], buildingGrid: number[][])
    {
        // Si no tiene destino, buscar uno
        if (!this.deliveryTarget)
        {
            this.findDeliveryTarget(grid);
        }

        if (this.deliveryTarget)
        {
            const targetX = this.deliveryTarget.c * 64;
            const targetY = this.deliveryTarget.r * 64;
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Si llegó al destino (aprox 4px)
            if (dist < 4)
            {
                this.x = targetX;
                this.y = targetY;
                this.dropItem(this.deliveryTarget.r, this.deliveryTarget.c, grid);
                this.deliveryTarget = null; // Resetear destino
                this.isMoving = false;
            } else
            {
                // Moverse hacia el destino
                let nextX = this.x;
                let nextY = this.y;

                if (Math.abs(dx) > Math.abs(dy))
                {
                    if (dx > 0) { nextX += this.speed; this.direction = 3; }
                    else { nextX -= this.speed; this.direction = 1; }
                } else
                {
                    if (dy > 0) { nextY += this.speed; this.direction = 2; }
                    else { nextY -= this.speed; this.direction = 0; }
                }

                // Chequeo básico de colisión
                const c = Math.floor((nextX + 32) / 64);
                const r = Math.floor((nextY + 63) / 64);

                if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length && grid[r][c].walkable && buildingGrid[r][c] === 0)
                {
                    this.x = nextX;
                    this.y = nextY;
                    this.isMoving = true;
                } else
                {
                    // Si se bloquea, cancelar entrega actual para buscar otro camino o destino luego
                    this.deliveryTarget = null;
                    this.isMoving = false;
                }

                // Animación
                this.frameTimer++;
                if (this.frameTimer > 10)
                {
                    this.frameTimer = 0;
                    this.currentFrame = (this.currentFrame + 1) % 9;
                }
            }
        } else
        {
            // Si no encuentra destino, deambular un poco para desbloquearse
            this.isMoving = false;
            this.currentFrame = 0;
        }
    }

    private findDeliveryTarget(grid: any[][])
    {
        // Buscar un tile de "carretera" o "acera" aleatorio para entregar
        // Intentamos 10 veces encontrar un lugar válido
        for (let i = 0; i < 10; i++)
        {
            const r = Math.floor(Math.random() * grid.length);
            const c = Math.floor(Math.random() * grid[0].length);
            const tile = grid[r][c];

            // Criterio: Debe ser caminable y parecer una zona de entrega (cobblestone, dirtpath)
            // Y no debe ser el lugar donde ya está
            if (tile && tile.walkable &&
                (tile.fileName.includes('cobblestone') || tile.fileName.includes('dirtpath')) &&
                Math.abs(r - (this.y / 64)) > 5)
            { // Que esté al menos a 5 bloques de distancia
                this.deliveryTarget = { r, c };
                return;
            }
        }
    }

    private dropItem(r: number, c: number, grid: any[][])
    {
        if (!this.isCarrying) return;

        const tile = grid[r][c];
        // Verificar que se puede soltar
        if (tile && tile.walkable && tile.type !== 'cardboardbox' && tile.type !== 'woodbox')
        {
            this.isCarrying = false;
            const itemToDrop = this.carriedTile || {
                fileName: 'CardboardBox_type01.png',
                type: 'cardboardbox',
                walkable: true
            };

            grid[r][c] = {
                ...itemToDrop,
                underlyingTile: { ...tile }
            };
            this.carriedTile = null;
        }
    }

    private checkAutoPickup(grid: any[][])
    {
        const c = Math.floor((this.x + 32) / 64);
        const r = Math.floor((this.y + 32) / 64);

        if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length)
        {
            const tile = grid[r][c];
            if (tile && tile.type === 'cardboardbox')
            {
                this.pickupItem(tile, r, c, grid);
            }
        }
    }

    private pickupItem(tile: any, r: number, c: number, grid: any[][])
    {
        this.isCarrying = true;
        this.carriedTile = { ...tile };

        // Restaurar el tile que había debajo
        if (tile.underlyingTile)
        {
            grid[r][c] = tile.underlyingTile;
        } else
        {
            grid[r][c] = { fileName: 'grass_green_type01.png', type: 'floor', walkable: true, color: null };
        }
    }

    protected checkLootPickup(grid: any[][])
    {
        const c = Math.floor((this.x + this.spriteWidth / 2) / 64);
        const r = Math.floor((this.y + this.spriteHeight / 2) / 64);

        if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length)
        {
            const tile = grid[r][c];
            if (tile && (tile.type === 'coin' || tile.type === 'bill'))
            {
                const value = tile.value || 0;
                const denomination = tile.fileName.replace('.png', '');

                // Añadir a la billetera del NPC
                this.wallet.add(denomination, value);

                // Restaurar el suelo
                if (tile.underlyingTile)
                {
                    grid[r][c] = tile.underlyingTile;
                } else
                {
                    // Fallback por si no hay underlyingTile
                    grid[r][c] = { fileName: 'grass_green_type01.png', type: 'floor', walkable: true, color: null };
                }
            }
        }
    }

    private checkInteraction(grid: any[][])
    {
        const c = Math.floor((this.x + 32) / 64);
        // Ajuste: Usar el centro vertical (+32) en lugar del fondo (+64) para detectar el tile actual correctamente
        const r = Math.floor((this.y + 32) / 64);

        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return;
        const tile = grid[r][c];
        if (!tile) return;

        // 50% de probabilidad de ejecutar la acción
        if (Math.random() > 0.5) return;

        if (this.isCarrying)
        {
            // Intentar LANZAR (Drop)
            // Se puede soltar si el suelo es caminable y no hay obstáculo (limón, caja, muro)
            if (tile.walkable && tile.type !== 'lemon' && tile.type !== 'cardboardbox' && tile.type !== 'woodbox')
            {
                this.isCarrying = false;

                const itemToDrop = this.carriedTile || {
                    fileName: 'small_green_round_type01.png',
                    type: 'lemon',
                    walkable: true
                };

                grid[r][c] = {
                    ...itemToDrop,
                    underlyingTile: { ...tile } // Preservar lo que había abajo
                };
                this.carriedTile = null;
            }
        } else
        {
            // Intentar RECOGER (Pick Up)
            if (tile.type === 'lemon')
            {
                this.pickupItem(tile, r, c, grid);
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D)
    {
        // Seleccionar sprite según estado
        let img = this.walkImage;

        if (this.isCarrying)
        {
            // Si lleva una caja y tenemos la imagen de caja, usar esa
            if (this.carriedTile && this.carriedTile.type === 'cardboardbox' && this.carryBoxImage)
            {
                img = this.carryBoxImage;
            } else if (this.carryImage)
            {
                // Fallback: usar imagen de carga genérica (limón)
                img = this.carryImage;
            }
        }

        if (!img || !img.complete) return;

        const srcX = this.currentFrame * this.spriteWidth;
        const srcY = this.direction * this.spriteHeight;

        ctx.drawImage(
            img,
            srcX, srcY, this.spriteWidth, this.spriteHeight,
            Math.floor(this.x), Math.floor(this.y), this.spriteWidth, this.spriteHeight
        );
    }
}