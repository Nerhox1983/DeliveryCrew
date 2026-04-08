import { Tile } from '../../shared/models/tile.model';
import { Mouse } from './mouse';
import { Chicken } from './chicken';
import { Hen } from './hen';
import { Rooster } from './rooster';
import { GameConstants } from '../../shared/config/GameConstants';
import { Animal } from './animal';

export class Cat extends Animal
{
  isMale: boolean;
  isAdult: boolean;
  override chasingTarget: Mouse | Chicken | null = null;

  constructor(sprite: HTMLImageElement, startRow: number, startCol: number)
  {
    super(sprite, startRow, startCol);
    this.isMale = Math.random() < 0.5;
    this.isAdult = Math.random() < 0.5;

    // Velocidad: Gatitos más rápidos (2.5) que adultos (1.5)
    this.speed = this.isAdult ? 1.5 : 2.5;

    // Asignar sonido de maullido
    if (!this.isAdult)
    {
      this.sound = 'cat_kitten_mewing.mp3';
    } else
    {
      this.sound = this.isMale ? 'cat_male_meowing.mp3' : 'cat_female_meowing.mp3';
    }

    // El gato también puede comer pescado si lo encuentra en el piso (ej. robado del mercado)
    this.diet = [
      'fish_raw.png', 'fish_orange_jump.png',
      'cooked_fish.png'
    ];
  }

  update(grid: Tile[][], buildingGrid: number[][], ratones: Mouse[] = [], pollitos: Chicken[] = [], gallinas: Hen[] = [], gallos: Rooster[] = [])
  {
    // 1. Verificar si el objetivo actual sigue siendo válido
    if (this.chasingTarget)
    {
      if (!ratones.includes(this.chasingTarget as Mouse) && !pollitos.includes(this.chasingTarget as Chicken))
      {
        this.chasingTarget = null;
      }
    }

    // 2. Buscar presa si no hay objetivo
    if (!this.chasingTarget && this.shouldCheckAI())
    {
      this.chasingTarget = this.findClosestPrey(ratones, pollitos, gallinas, gallos);
    }

    // 3. Lógica de Persecución
    const chaseSpeedMultiplier = this.isAdult ? (3.0 / 1.5) : (3.5 / 2.5);
    const wasChasing = this.handleChase(
      this.chasingTarget,
      grid,
      buildingGrid,
      chaseSpeedMultiplier,
      () =>
      {
        if (this.chasingTarget)
        {
          if (ratones.includes(this.chasingTarget as Mouse))
          {
            ratones.splice(ratones.indexOf(this.chasingTarget as Mouse), 1);
          } else if (pollitos.includes(this.chasingTarget as Chicken))
          {
            pollitos.splice(pollitos.indexOf(this.chasingTarget as Chicken), 1);
          }
        }
      },
      GameConstants.AI.CAT_CATCH_PREY_DISTANCE
    );

    if (wasChasing)
    {
      return; // Salir para no ejecutar lógica de deambular
    }

    // 4. Lógica de Deambular
    this.handleWandering(grid, buildingGrid);
  }

  private findClosestPrey(ratones: Mouse[], pollitos: Chicken[], gallinas: Hen[], gallos: Rooster[]): Mouse | Chicken | null
  {
    let closest: Mouse | Chicken | null = null;
    let minDistSq = GameConstants.AI.PREY_VISION_RADIUS * GameConstants.AI.PREY_VISION_RADIUS;

    // 1. Revisar Ratones (Sin protección)
    for (const mouse of ratones)
    {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDistSq)
      {
        minDistSq = distSq;
        closest = mouse;
      }
    }

    // 2. Revisar Pollitos (Con lógica de protección optimizada)
    const protectionRadiusSq = GameConstants.AI.PROTECTION_RADIUS * GameConstants.AI.PROTECTION_RADIUS;

    for (const chick of pollitos)
    {
      const dx = chick.x - this.x;
      const dy = chick.y - this.y;
      const distSq = dx * dx + dy * dy;

      // Solo gastar CPU verificando protección si este pollito está más cerca que el objetivo actual
      if (distSq < minDistSq)
      {
        let isProtected = false;

        // Verificar Gallinas
        for (const hen of gallinas)
        {
          const pdx = hen.x - chick.x;
          const pdy = hen.y - chick.y;
          if ((pdx * pdx + pdy * pdy) < protectionRadiusSq) { isProtected = true; break; }
        }

        // Si no lo protege una gallina, verificar Gallos
        if (!isProtected)
        {
          for (const rooster of gallos)
          {
            const pdx = rooster.x - chick.x;
            const pdy = rooster.y - chick.y;
            if ((pdx * pdx + pdy * pdy) < protectionRadiusSq) { isProtected = true; break; }
          }
        }

        if (!isProtected)
        {
          minDistSq = distSq;
          closest = chick;
        }
      }
    }

    return closest;
  }

  // setNewWait is inherited

  protected override pickNewMove(grid: Tile[][], buildingGrid: number[][]): void
  {
    // Intentar caminata larga por caminos (30% probabilidad)
    if (Math.random() < GameConstants.AI.LONG_MOVE_CHANCE)
    {
      if (this.trySetLongMove(grid, buildingGrid)) return;
    }

    super.pickNewMove(grid, buildingGrid);
  }

  private trySetLongMove(grid: Tile[][], buildingGrid: number[][]): boolean
  {
    const currentTile = grid[this.row][this.col];
    // Solo deambular lejos si está en un camino
    if (!currentTile || (!currentTile.fileName.includes('dirtpath') && !currentTile.fileName.includes('cobblestone')))
    {
      return false;
    }

    const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'south', 'east', 'west'];
    // Preferir mantener la dirección actual (70%)
    if (Math.random() < GameConstants.AI.DIRECTION_PERSISTENCE_CHANCE)
    {
      directions.sort((a, b) => a === this.direction ? -1 : 1);
    } else
    {
      directions.sort(() => Math.random() - 0.5);
    }

    for (const dir of directions)
    {
      const dist = Math.floor(Math.random() * 6) + 4; // 4 a 9 tiles
      let r = this.row;
      let c = this.col;
      let valid = true;

      // Verificar todo el trayecto
      for (let i = 1; i <= dist; i++)
      {
        if (dir === 'north') r--;
        if (dir === 'south') r++;
        if (dir === 'east') c++;
        if (dir === 'west') c--;

        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length)
        {
          valid = false; break;
        }
        const t = grid[r][c];
        const b = buildingGrid[r][c];
        if (!t || !t.walkable || b !== 0)
        {
          valid = false; break;
        }
      }

      if (valid)
      {
        this.direction = dir as 'north' | 'south' | 'east' | 'west';
        this.targetX = c * GameConstants.TILE_SIZE;
        this.targetY = r * GameConstants.TILE_SIZE;
        this.isMoving = true;
        return true;
      }
    }
    return false;
  }

  public checkProximityAndMeow(x: number, y: number)
  {
    this.checkProximityAndPlaySound(x, y);
  }

  draw(ctx: CanvasRenderingContext2D)
  {
    const spriteW = 32; // 96px / 3 frames
    const spriteH = 32; // 128px / 4 directions

    const rowIdx = this.getSpriteRow();
    // Escalar si es adulto (150%)
    const scale = this.isAdult ? GameConstants.Visuals.SCALE.CAT_ADULT : GameConstants.Visuals.SCALE.CAT_KITTEN;
    const drawW = spriteW * scale;
    const drawH = spriteH * scale;

    // Centrar el sprite de 32px en la celda de 64px
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
}