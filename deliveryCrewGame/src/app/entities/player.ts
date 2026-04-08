import { AssetManager } from '../core/services/asset-manager.service';
import { Tile } from '../shared/models/tile.model';
import { Inventory } from '../shared/models/inventory.model';
import { Wallet } from '../shared/models/wallet.model';

// Definimos GameTile localmente para asegurar tipado correcto sin dependencias circulares
export type GameTile = Tile & { underlyingTile?: Tile };

export class Player
{
  public x: number = 0;
  public y: number = 0;
  public spriteWidth: number = 64;
  public spriteHeight: number = 64;
  public direction: number = 2; // 0: Arriba, 1: Izquierda, 2: Abajo, 3: Derecha
  public currentFrame: number = 0;
  public profession: string = 'deliveryman'; // Default profession

  // Billetera del jugador
  public wallet: Wallet = new Wallet();
  public inventory: Inventory;

  // Estados de carga
  public isCarrying: boolean = false;
  public isCarryingCardBoardBox: boolean = false;
  public isCarryingWoodBox: boolean = false;
  public isCarryingSmallGreen: boolean = false;
  public isCarryingMetalPitcherEmpty: boolean = false;
  public isCarryingMetalPitcherFull: boolean = false;

  // Estados de acción/condición
  public isSleeping: boolean = false;
  public isCriticalSleeping: boolean = false;
  public currentSprite: string = '';
  public isSitting: boolean = false;
  public isMoving: boolean = false;

  // Configuración de Movimiento y Animación
  private speed: number = 120; // Píxeles por segundo (Ajustado para movimiento natural)
  private animationTimer: number = 0;
  private readonly ANIMATION_SPEED: number = 0.15; // Cambiar frame cada 0.15s

  // Estados internos de acciones temporales
  private isKneeling: boolean = false;
  private isChopping: boolean = false;
  private chopTimer: number = 0;
  private isCollectingWater: boolean = false;
  private collectTimer: number = 0;

  constructor(private assetManager: AssetManager)
  {
    this.inventory = new Inventory();
  }

  public setPosition(x: number, y: number)
  {
    this.x = x;
    this.y = y;
  }

  public toggleKneel()
  {
    this.isKneeling = !this.isKneeling;
  }

  public startChop()
  {
    if (this.isChopping) return;
    this.isChopping = true;
    this.chopTimer = 0;
    this.currentFrame = 0;
  }

  public startWaterCollection()
  {
    if (this.isCollectingWater) return;
    this.isCollectingWater = true;
    this.collectTimer = 0;
    this.currentFrame = 0;
  }

  public getTileCoordinates(tileSize: number): { r: number, c: number }
  {
    const feetX = this.x + this.spriteWidth / 2;
    const feetY = this.y + this.spriteHeight - 10;
    const c = Math.floor(feetX / tileSize);
    const r = Math.floor(feetY / tileSize);
    return { r, c };
  }

  public isNearWater(grid: GameTile[][], tileSize: number): boolean
  {
    const { r, c } = this.getTileCoordinates(tileSize);

    const isWaterSource = (row: number, col: number) =>
    {
      if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return false;
      const tile = grid[row][col];
      if (!tile) return false;
      // Check type first, then fallback to filename for specific assets like planks/beach
      return tile.type === 'water' || tile.fileName.startsWith('beach_') || tile.fileName.startsWith('plank_');
    };

    // 1. Check current tile
    if (isWaterSource(r, c)) return true;

    // 2. Check tile in front
    let frontR = r;
    let frontC = c;
    switch (this.direction)
    {
      case 0: frontR--; break; // Up
      case 1: frontC--; break; // Left
      case 2: frontR++; break; // Down
      case 3: frontC++; break; // Right
    }
    return isWaterSource(frontR, frontC);
  }

  /**
   * Método Update actualizado para usar Delta Time (dt)
   * @param dt Tiempo transcurrido en segundos desde el último frame
   */
  public update(
    keysPressed: { [key: string]: boolean },
    tileGrid: GameTile[][],
    tileSize: number,
    worldWidth: number,
    worldHeight: number,
    dt: number
  )
  {
    // Actualizar bandera general de carga
    this.isCarrying = this.isCarryingCardBoardBox ||
      this.isCarryingWoodBox ||
      this.isCarryingSmallGreen ||
      this.isCarryingMetalPitcherEmpty ||
      this.isCarryingMetalPitcherFull;

    // Manejo de acciones bloqueantes (animaciones temporizadas)
    if (this.isChopping)
    {
      this.updateChop(dt);
      return;
    }
    if (this.isCollectingWater)
    {
      this.updateWaterCollection(dt);
      return;
    }
    if (this.isSleeping || this.isKneeling || this.isSitting)
    {
      return;
    }

    // Lógica de Movimiento
    let dx = 0;
    let dy = 0;

    if (keysPressed['ArrowUp']) dy = -1;
    if (keysPressed['ArrowDown']) dy = 1;
    if (keysPressed['ArrowLeft']) dx = -1;
    if (keysPressed['ArrowRight']) dx = 1;

    // Si hay movimiento
    if (dx !== 0 || dy !== 0)
    {
      this.isMoving = true;
      // Normalizar vector para evitar movimiento rápido en diagonal
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;

      // Calcular desplazamiento basado en tiempo
      const moveStep = this.speed * dt;
      let actualDisplacement = 0;

      const nextX = this.x + dx * moveStep;
      // Colisiones (Eje X)
      if (!this.checkCollision(nextX, this.y, tileGrid, tileSize, worldWidth, worldHeight))
      {
        this.x = nextX;
        actualDisplacement += Math.abs(dx * moveStep);
      }

      const nextY = this.y + dy * moveStep;
      // Colisiones (Eje Y)
      if (!this.checkCollision(this.x, nextY, tileGrid, tileSize, worldWidth, worldHeight))
      {
        this.y = nextY;
        actualDisplacement += Math.abs(dy * moveStep);
      }

      // Actualizar Dirección
      if (Math.abs(dx) > Math.abs(dy))
      {
        this.direction = dx > 0 ? 3 : 1;
      } else
      {
        this.direction = dy > 0 ? 2 : 0;
      }

      // Animación de Caminado (Solo avanza si hay desplazamiento real)
      if (actualDisplacement > 0)
      {
        this.animationTimer += dt;
        if (this.animationTimer >= this.ANIMATION_SPEED)
        {
          this.animationTimer = 0;
          this.currentFrame = (this.currentFrame + 1) % 4; // Ciclo de 4 frames
        }
      } else
      {
        this.currentFrame = 0;
      }
    } else
    {
      this.isMoving = false;
      // Estado Idle: Frame estático 0
      this.currentFrame = 0;
      this.animationTimer = 0;
    }
  }

  private checkCollision(x: number, y: number, grid: GameTile[][], tileSize: number, worldW: number, worldH: number): boolean
  {
    // Hitbox ajustada a los pies del personaje
    // Reducimos el padding (de 20 a 12) para permitir acercarse más a los objetos/paredes
    // Esto facilita la interacción con la olleta en interiores
    const padding = 12;
    const left = x + padding;
    const right = x + this.spriteWidth - padding;
    const top = y + this.spriteHeight / 2; // Mitad inferior
    const bottom = y + this.spriteHeight - 2;

    // Límites del mundo
    if (left < 0 || right >= worldW || top < 0 || bottom >= worldH) return true;

    // Verificar las 4 esquinas del hitbox
    const corners = [
      { x: left, y: top },
      { x: right, y: top },
      { x: left, y: bottom },
      { x: right, y: bottom }
    ];

    for (const corner of corners)
    {
      const c = Math.floor(corner.x / tileSize);
      const r = Math.floor(corner.y / tileSize);
      if (grid[r] && grid[r][c])
      {
        if (!grid[r][c].walkable) return true;
      }
    }
    return false;
  }

  private updateChop(dt: number)
  {
    this.chopTimer += dt;
    // Animación rápida para talar
    if (this.chopTimer >= 0.1)
    {
      this.chopTimer = 0;
      this.currentFrame++;
      if (this.currentFrame >= 4)
      {
        this.isChopping = false;
        this.currentFrame = 0;
      }
    }
  }

  private updateWaterCollection(dt: number)
  {
    this.collectTimer += dt;
    if (this.collectTimer >= 0.2)
    {
      this.collectTimer = 0;
      this.currentFrame++;
      if (this.currentFrame >= 3)
      {
        this.isCollectingWater = false;
        // Lógica de cambio de estado de la olleta
        this.isCarryingMetalPitcherEmpty = false;
        this.isCarryingMetalPitcherFull = true;
        this.currentFrame = 0;
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D)
  {
    let img: HTMLImageElement | undefined;

    // Selección de Sprite según estado por prioridad
    if (this.isSleeping)
    {
      img = this.assetManager.playerSitSleepImage;
    } else if (this.isChopping)
    {
      img = this.assetManager.playerChopImage;
    } else if (this.isKneeling || this.isCollectingWater)
    {
      // Prioridad dentro de Kneeling/Collecting: ¿Qué tiene en las manos?
      if (this.isCarryingMetalPitcherFull)
      {
        img = this.assetManager.playerKneelDownMetalPitcherWaterImage;
      } else if (this.isCarryingMetalPitcherEmpty)
      {
        img = this.assetManager.playerKneelDownMetalPitcherEmptyImage;
      } else
      {
        img = this.assetManager.playerKneelDownImage;
      }
    } else if (this.isCarryingCardBoardBox)
    {
      img = this.assetManager.playerCarryCardBoardBoxImage;
    } else if (this.isCarryingWoodBox)
    {
      img = this.assetManager.playerCarryWoodBoxImage;
    } else if (this.isCarryingSmallGreen)
    {
      img = this.assetManager.playerCarrySmallGreenImage;
    } else if (this.isCarryingMetalPitcherEmpty)
    {
      img = this.assetManager.playerCarryMetalPitcherEmptyImage;
    } else if (this.isCarryingMetalPitcherFull)
    {
      img = this.assetManager.playerCarryMetalPitcherWaterImage;
    } else
    {
      // Estado Base (Idle / Caminar)
      img = this.assetManager.playerImage;
    }

    // Validación de Carga y Renderizado
    if (img && img.complete && img.naturalWidth > 0)
    {
      const srcX = this.currentFrame * this.spriteWidth;
      const srcY = this.direction * this.spriteHeight;
      ctx.drawImage(img, srcX, srcY, this.spriteWidth, this.spriteHeight, this.x, this.y, this.spriteWidth, this.spriteHeight);
    } else
    {
      // Diagnóstico de assets faltantes
      console.warn(`⚠️ Player Draw Error: Asset missing or not loaded. State: Sleeping=${this.isSleeping}, Carrying=${this.isCarrying}, Kneeling=${this.isKneeling}`);
    }
  }
}
