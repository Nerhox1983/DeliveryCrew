import { BreadCrumb } from '../../core/engine/renderer';
import { Tile } from '../../shared/models/tile.model';
import { Worm } from './worm';
import { GameConstants } from '../../shared/config/GameConstants';
import { Animal } from './animal';

export class Hen extends Animal
{
  override chasingTarget: Worm | null = null;

  nestingState: 'idle' | 'moving_to_nest' | 'nesting' = 'idle';
  nestTarget: { r: number, c: number } | null = null;
  nestTimer: number = 0;
  nestDuration: number = 0;
  public targetCrumb: BreadCrumb | null = null;
  lastLayingTime: number;

  constructor(sprite: HTMLImageElement, startRow: number, startCol: number)
  {
    super(sprite, startRow, startCol);

    this.lastLayingTime = -GameConstants.Timers.HEN_LAYING_INTERVAL_GAME_MINUTES; // Permitir puesta inicial
    this.sound = 'hen_clucking.mp3';
  }

  update(grid: Tile[][], buildingGrid: number[][], gallinas: Hen[] = [], findTile?: (name: string) => Tile | undefined, totalGameTime: number = 0, canLay: boolean = true, worms: Worm[] = [], breadCrumbs: BreadCrumb[] = [])
  {
    // Lógica de Anidación
    if (this.nestingState === 'nesting')
    {
      this.isMoving = false; // Asegurarse de que no se mueva mientras anida
      this.nestTimer++;
      if (this.nestTimer >= this.nestDuration)
      {

        if (this.nestTarget && findTile)
        {
          const currentTile = grid[this.nestTarget.r][this.nestTarget.c];
          const baseName = currentTile.fileName.replace(/type0[1-3]/, 'type00');
          const restoredTile = findTile(baseName);
          if (restoredTile)
          {
            grid[this.nestTarget.r][this.nestTarget.c] = restoredTile;
          }
        }
        // Finalizar anidación
        this.nestingState = 'idle';
        this.nestTarget = null;
        this.setNewWait();
        this.lastLayingTime = totalGameTime; // Registrar tiempo de puesta
      }
      return; // La gallina se queda quieta mientras anida
    }

    // Check for breadcrumb and move towards it
    if (this.targetCrumb)
    {
      const dx = this.targetCrumb.x - this.x;
      const dy = this.targetCrumb.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5)
      {
        this.eatBreadCrumb(this.targetCrumb, breadCrumbs);
      } else
      {
        this.isMoving = true;
        this.targetX = this.targetCrumb.x; // El sistema de movimiento ya centra la entidad
        this.targetY = this.targetCrumb.y;
        this.moveTowardsTarget(grid, buildingGrid);
      }

      return; // Prioritize breadcrumb over other behaviors
    }

    if (this.nestingState === 'moving_to_nest' && this.nestTarget)
    {
      const targetPxX = this.nestTarget.c * GameConstants.TILE_SIZE;
      const targetPxY = this.nestTarget.r * GameConstants.TILE_SIZE;

      // Verificar si llegamos
      if (Math.abs(this.x - targetPxX) < 4 && Math.abs(this.y - targetPxY) < 4)
      {
        this.x = targetPxX;
        this.y = targetPxY;
        this.isMoving = false;
        this.startNesting(grid, findTile);
      } else
      {
        this.isMoving = true;
        this.targetX = targetPxX;
        this.targetY = targetPxY;
        this.moveTowardsTarget(grid, buildingGrid);
      }
      return; // La anidación es prioritaria sobre el deambular
    }

    // Comportamiento por defecto: cazar o deambular
    this.handleIdleState(grid, buildingGrid, worms, gallinas, canLay, totalGameTime);
  }

  private handleIdleState(grid: Tile[][], buildingGrid: number[][], worms: Worm[], gallinas: Hen[], canLay: boolean, totalGameTime: number)
  {
    if (this.chasingTarget && !worms.includes(this.chasingTarget))
    {
      this.chasingTarget = null;
    }

    if (!this.chasingTarget && this.shouldCheckAI())
    {
      this.chasingTarget = this.findClosestWorm(worms);
    }

    const wasChasing = this.handleChase(
      this.chasingTarget,
      grid,
      buildingGrid,
      GameConstants.Physics.CHASE_SPEED_MULTIPLIER,
      () =>
      {
        if (this.chasingTarget)
        {
          worms.splice(worms.indexOf(this.chasingTarget), 1);
        }
      },
      GameConstants.AI.EAT_WORM_DISTANCE
    );

    if (wasChasing)
    {
      return;
    }

    this.handleWandering(grid, buildingGrid, gallinas, canLay, totalGameTime);
  }


  private startNesting(grid: Tile[][], findTile?: (name: string) => Tile | undefined)
  {
    if (!this.nestTarget || !findTile)
    {
      this.nestingState = 'idle';
      return;
    }

    // Verificar que el nido sigue siendo type00 (evitar condiciones de carrera)
    const tile = grid[this.nestTarget.r][this.nestTarget.c];
    if (!tile.fileName.includes('type00'))
    {
      this.nestingState = 'idle';
      return;
    }

    const eggs = Math.floor(Math.random() * 4); // 0 a 3 huevos

    if (eggs === 0)
    {
      this.nestingState = 'idle'; // Se retira inmediatamente
      this.setNewWait();
    } else
    {
      this.nestingState = 'nesting';
      this.nestTimer = 0;
      // 1 huevo = 3s (180 frames), 2 = 6s, 3 = 9s. Asumiendo 60fps.
      this.nestDuration = eggs * GameConstants.Timers.HEN_NESTING_DURATION_PER_EGG_FRAMES;

      // Cambiar tile
      const newSuffix = `type0${eggs}`;
      const newName = tile.fileName.replace('type00', newSuffix);
      const newTile = findTile(newName);

      if (newTile)
      {
        grid[this.nestTarget.r][this.nestTarget.c] = newTile;
      }
    }
  }

  private findEmptyNest(grid: Tile[][]): { r: number, c: number } | null
  {
    const range = GameConstants.AI.NEST_SEARCH_RADIUS_TILES; // Radio de búsqueda
    // Búsqueda simple en área cuadrada
    const startR = Math.max(0, this.row - range);
    const endR = Math.min(grid.length - 1, this.row + range);
    const startC = Math.max(0, this.col - range);
    const endC = Math.min(grid[0].length - 1, this.col + range);

    for (let r = startR; r <= endR; r++)
    {
      for (let c = startC; c <= endC; c++)
      {
        const tile = grid[r][c];
        // Debe ser un nido y estar vacío (type00)
        if (tile && tile.fileName.includes('nest_type00'))
        {
          // Verificar que no haya edificio (aunque los nidos se generan fuera, doble check)
          return { r, c };
        }
      }
    }
    return null;
  }

  private findClosestHen(gallinas: Hen[]): Hen | null
  {
    let closest: Hen | null = null;
    let minDistSq = GameConstants.AI.MOTHER_VISION_RADIUS * GameConstants.AI.MOTHER_VISION_RADIUS;

    for (const g of gallinas)
    {
      if (g === this) continue; // No te sigas a ti misma
      const distSq = Math.pow(g.x - this.x, 2) + Math.pow(g.y - this.y, 2);
      if (distSq < minDistSq)
      {
        minDistSq = distSq;
        closest = g;
      }
    }
    return closest;
  }

  private moveTowards(hen: Hen, grid: Tile[][], buildingGrid: number[][]): boolean
  {
    const dx = hen.x - this.x;
    const dy = hen.y - this.y;

    // Si ya está muy cerca, no forzar movimiento para evitar superposición exacta
    if (Math.abs(dx) < GameConstants.AI.MIN_SEPARATION_DISTANCE && Math.abs(dy) < GameConstants.AI.MIN_SEPARATION_DISTANCE) return false;

    const directions: ('north' | 'south' | 'east' | 'west')[] = [];

    // Priorizar el eje con mayor distancia
    if (Math.abs(dx) > Math.abs(dy))
    {
      directions.push(dx > 0 ? 'east' : 'west');
      directions.push(dy > 0 ? 'south' : 'north');
    } else
    {
      directions.push(dy > 0 ? 'south' : 'north');
      directions.push(dx > 0 ? 'east' : 'west');
    }

    for (const dir of directions)
    {
      if (this.trySetMove(dir, grid, buildingGrid)) return true;
    }
    return false;
  }

  protected override pickNewMove(grid: Tile[][], buildingGrid: number[][], ...args: any[]): void
  {
    const [gallinas, canLay, totalGameTime] = args;

    // 1. Lógica de Puesta (Control de Natalidad)
    if (canLay && (totalGameTime - this.lastLayingTime >= GameConstants.Timers.HEN_LAYING_INTERVAL_GAME_MINUTES))
    {
      const nest = this.findEmptyNest(grid);
      if (nest)
      {
        this.nestingState = 'moving_to_nest';
        this.nestTarget = nest;
        return;
      }
    }

    // 2. Lógica de Agrupación
    if (gallinas && gallinas.length > 0)
    {
      const closest = this.findClosestHen(gallinas);
      if (closest && this.moveTowards(closest, grid, buildingGrid))
      {
        return;
      }
    }

    // 3. Movimiento aleatorio por defecto
    super.pickNewMove(grid, buildingGrid);
  }

  private eatBreadCrumb(crumb: BreadCrumb, breadCrumbs: BreadCrumb[]): void
  {
    // remove breadcrumb
    const index = breadCrumbs?.indexOf(crumb);
    if (index > -1)
    {
      breadCrumbs.splice(index, 1);
    }
    this.targetCrumb = null;
  }
  draw(ctx: CanvasRenderingContext2D)
  {
    if (!this.spriteSheet || !this.spriteSheet.complete || this.spriteSheet.naturalWidth === 0) return;

    //const spriteW = 32; 
    //const spriteH = 32; 
    const spriteW = 76; // 228 / 3
    const spriteH = 73; // 292 / 4

    const rowIdx = this.getSpriteRow();
    // Escalar al 50%
    const scale = GameConstants.Visuals.SCALE.HEN;
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

  public checkProximityAndCluck(x: number, y: number)
  {
    this.checkProximityAndPlaySound(x, y);
  }
}