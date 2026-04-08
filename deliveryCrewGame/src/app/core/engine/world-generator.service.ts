import { Tile, GameTile } from '../../shared/models/tile.model';

export interface MapData
{
  tileGrid: GameTile[][];
  buildingGrid: number[][];
  manzanasRegistradas: { r: number, c: number, w: number, h: number }[];
}

export class MapGenerator
{
  private tileGrid: GameTile[][] = [];
  private buildingGrid: number[][] = [];
  private manzanasRegistradas: { r: number, c: number, w: number, h: number }[] = [];

  constructor(
    private rows: number,
    private cols: number,
    private tileDefinitions: Tile[]
  ) { }

  public generarMapa(config: { numLakes?: number } = {}): MapData
  {
    this.generarCuadriculaUrbana(config.numLakes || 1);

    this.inicializarNidos();
    this.generarMuelle();
    this.generarVegetacion();

    return {
      tileGrid: this.tileGrid,
      buildingGrid: this.buildingGrid,
      manzanasRegistradas: this.manzanasRegistradas
    };
  }

  private generarCuadriculaUrbana(numLakes: number)
  {
    this.manzanasRegistradas = [];
    this.tileGrid = [];
    this.buildingGrid = Array(this.rows).fill(0).map(() => Array(this.cols).fill(0));

    // 1. Llenar fondo con Grass
    for (let r = 0; r < this.rows; r++)
    {
      this.tileGrid[r] = [];
      for (let c = 0; c < this.cols; c++)
      {
        const grass = this.findRandomTileByPrefix('grass', 'nest');
        if (grass) this.tileGrid[r][c] = grass;
      }
    }

    // 2. Generar Calles
    const roadCoords: number[] = [];
    let currentPos = 4;
    while (currentPos < this.rows - 8)
    {
      roadCoords.push(currentPos);
      const step = Math.floor(Math.random() * (14 - 12 + 1)) + 12;
      currentPos += step;
    }

    const colocarTile = (r: number, c: number, nombre: string) =>
    {
      if (r >= 0 && r < this.rows && c >= 0 && c < this.cols)
      {
        const tile = this.findTileByName(nombre);
        if (tile) this.tileGrid[r][c] = tile;
      }
    };
    const getVariante = (nombreBase: string) => Math.random() < 0.5 ? nombreBase : nombreBase.replace('type01', 'type02');

    roadCoords.forEach(r =>
    {
      for (let c = 0; c < this.cols; c++)
      {
        colocarTile(r, c, getVariante('dirtpath_brown_south_type01.png'));
        colocarTile(r, c, getVariante('dirtpath_brown_south_type01.png'));
        colocarTile(r + 1, c, getVariante('dirtpath_brown_north_type01.png'));
      }
    });

    roadCoords.forEach(c =>
    {
      for (let r = 0; r < this.rows; r++)
      {
        colocarTile(r, c, getVariante('dirtpath_brown_right_type01.png'));
        colocarTile(r, c + 1, getVariante('dirtpath_brown_left_type01.png'));
      }
    });

    roadCoords.forEach(r =>
    {
      roadCoords.forEach(c =>
      {
        colocarTile(r, c, 'dirtpath_brown_southright_corner_type01.png');
        colocarTile(r, c + 1, 'dirtpath_brown_southleft_corner_type01.png');
        colocarTile(r + 1, c + 1, 'dirtpath_brown_northleft_corner_type01.png');
        colocarTile(r + 1, c, 'dirtpath_brown_northright_corner_type01.png');
      });
    });

    // 3. Identificar Manzanas y Lagos
    const getIntervals = (coords: number[], max: number) =>
    {
      const intervals = [];
      let current = 0;
      for (const r of coords)
      {
        const start = current === 0 ? 1 : current + 2;
        const end = r - 2;
        if (end >= start) intervals.push({ start, end });
        current = r + 1;
      }
      if (current < max - 2) intervals.push({ start: current + 2, end: max - 2 });
      return intervals;
    };

    const rowIntervals = getIntervals(roadCoords, this.rows);
    const colIntervals = getIntervals(roadCoords, this.cols);
    const validBlocks: { r: number, c: number, w: number, h: number }[] = [];

    rowIntervals.forEach(rInt =>
    {
      colIntervals.forEach(cInt =>
      {
        const w = cInt.end - cInt.start + 1;
        const h = rInt.end - rInt.start + 1;
        if (w >= 8 && h >= 8) validBlocks.push({ r: rInt.start, c: cInt.start, w, h });
      });
    });

    // Selección de múltiples lagos
    const lakeIndices: number[] = [];
    const availableIndices = Array.from({ length: validBlocks.length }, (_, i) => i);
    const lakesToSpawn = Math.min(numLakes, validBlocks.length);

    for (let i = 0; i < lakesToSpawn; i++)
    {
      const randIdx = Math.floor(Math.random() * availableIndices.length);
      lakeIndices.push(availableIndices[randIdx]);
      availableIndices.splice(randIdx, 1);
    }

    // Selección de Mercado (Prioridad: bloque vacío, Fallback: compartir con el primer lago)
    let marketIndex = -1;
    if (availableIndices.length > 0)
    {
      marketIndex = availableIndices[0];
    } else if (validBlocks.length > 0)
    {
      marketIndex = lakeIndices[0];
    }

    const sidewalkRects: { r: number, c: number, w: number, h: number }[] = [];

    validBlocks.forEach((rect, index) =>
    {
      const isLake = lakeIndices.includes(index);

      if (isLake)
      {
        this.dibujarLago(rect.r, rect.c, rect.w, rect.h);
      }
      if (index === marketIndex)
      {
        if (!isLake)
        {
          this.dibujarBloqueUrbano(rect.r, rect.c, rect.w, rect.h);
        }
        this.generarMercado(rect.r, rect.c, rect.w, rect.h);
        this.manzanasRegistradas.push(rect);
      } else if (!isLake)
      {
        this.dibujarBloqueUrbano(rect.r, rect.c, rect.w, rect.h);
        sidewalkRects.push(rect);
        this.manzanasRegistradas.push(rect);
      }
    });

    this.dibujarAndenes();
    this.poblarAndenesConCasas(sidewalkRects);
  }

  private generarMercado(r: number, c: number, w: number, h: number)
  {
    //console.log(`[WorldGenerator] Iniciando generación de mercado en bloque [${r},${c}] de tamaño ${w}x${h}`);

    // Tarea 1: Regla de Espaciado (Padding de Navegación)
    // OPTIMIZACIÓN: Reducimos a 4x4 (1 margen + 2 stand + 1 margen) para que quepan 2 puestos en manzanas pequeñas
    const requiredWidth = 4;
    const requiredHeight = 4;
    if (w < requiredWidth || h < requiredHeight)
    {
      //console.warn(`[WorldGenerator] Manzana en [${r},${c}] (${w}x${h}) es muy pequeña para el mercado (Min ${requiredWidth}x${requiredHeight}).`);
      return;
    }

    // Tarea 2: Lógica de Variedad de Productos
    const stands = this.tileDefinitions.filter(t => t.type === 'market_stand');
    if (stands.length === 0)
    {
      //console.warn("No se encontraron definiciones de 'market_stand' para generar el mercado.");
      return;
    }

    // Tile para la limpieza forzada
    const baseFloorTile = this.findTileByName('cobblestone_gray_type01.png') || this.findRandomTileByPrefix('grass');
    if (!baseFloorTile)
    {
      //console.error("[WorldGenerator] No se encontró un tile de suelo base (grass/cobblestone). Abortando mercado.");
      return;
    }

    const standCount = 2; // Intentar colocar 2 puestos por mercado
    let placedCount = 0;
    for (let i = 0; i < standCount; i++)
    {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 50)
      {
        attempts++;

        // Buscar un área libre de 6x6
        // FIX: Ajustar rango para respetar los bordes del bloque (padding de 1 tile)
        // El bloque tiene bordes en 0 y h-1. El área útil empieza en 1 y termina en h-2.
        const minR = r + 1;
        const maxR = r + h - 1 - requiredHeight;
        const minC = c + 1;
        const maxC = c + w - 1 - requiredWidth;

        const baseR = minR + Math.floor(Math.random() * (maxR - minR + 1));
        const baseC = minC + Math.floor(Math.random() * (maxC - minC + 1));

        if (this.isAreaFree(baseR, baseC, requiredWidth, requiredHeight))
        {

          // Tarea 1: Limpieza Forzada del área 6x6
          for (let rowOffset = 0; rowOffset < requiredHeight; rowOffset++)
          {
            for (let colOffset = 0; colOffset < requiredWidth; colOffset++)
            {
              this.tileGrid[baseR + rowOffset][baseC + colOffset] = { ...baseFloorTile };
            }
          }

          // Posicionar el stand 2x2 en el centro del área 6x6
          // Ajuste: Con área de 4x4, el centro (margen 1) empieza en +1
          const standR = baseR + 1;
          const standC = baseC + 1;

          // Tarea 2: Elegir aleatoriamente
          const standTileDef = stands[Math.floor(Math.random() * stands.length)];
          const standData = { ...standTileDef, width: 2, height: 2 };

          // Colocar Stand (2x2)
          this.tileGrid[standR][standC] = { ...standData, walkable: false, underlyingTile: { ...baseFloorTile } };
          const placeholder = { ...standData, type: 'market_stand_part', walkable: false, underlyingTile: { ...baseFloorTile } };
          this.tileGrid[standR + 1][standC] = placeholder;
          this.tileGrid[standR][standC + 1] = placeholder;
          this.tileGrid[standR + 1][standC + 1] = placeholder;

          placed = true;
          placedCount++;
        }
      }
    }
    //console.log(`[WorldGenerator] Mercado generado: ${placedCount}/${standCount} puestos colocados.`);
  }


  private isAreaFree(r: number, c: number, w: number, h: number): boolean
  {
    if (r + h > this.rows || c + w > this.cols) return false;
    for (let i = 0; i < h; i++)
    {
      for (let j = 0; j < w; j++)
      {
        const tile = this.tileGrid[r + i][c + j];
        if (!tile || !tile.walkable) return false;

        const forbiddenTypes = ['wall', 'water', 'tree', 'tree_large', 'market_stand', 'market_stand_part', 'house', 'door', 'window'];

        if (forbiddenTypes.includes(tile.type) || tile.fileName.includes('water'))
        {
          return false;
        }
      }
    }
    return true;
  }

  private dibujarLago(r: number, c: number, w: number, h: number)
  {
    for (let i = 0; i < h; i++)
    {
      for (let j = 0; j < w; j++)
      {
        const currentRow = r + i;
        const currentCol = c + j;
        if (currentRow >= this.rows || currentCol >= this.cols) continue;

        const isTop = (i === 0);
        const isBottom = (i === h - 1);
        const isLeft = (j === 0);
        const isRight = (j === w - 1);

        let tileName = 'water_blue_type01.png';
        if (isTop)
        {
          if (isLeft) tileName = 'beach_sandy_northleft_corner.png';
          else if (isRight) tileName = 'beach_sandy_northright_corner.png';
          else tileName = 'beach_sandy_north_type02.png';
        } else if (isBottom)
        {
          if (isLeft) tileName = 'beach_sandy_southleft_corner.png';
          else if (isRight) tileName = 'beach_sandy_southright_corner.png';
          else tileName = 'beach_sandy_south_type02.png';
        } else if (isLeft) tileName = 'beach_sandy_left_type02.png';
        else if (isRight) tileName = 'beach_sandy_right_type02.png';

        const tile = this.findTileByName(tileName);
        if (tile) this.tileGrid[currentRow][currentCol] = tile;
      }
    }
    // Cascada
    const waterfallTile = this.findTileByName('cascade_Azure01.png');
    if (waterfallTile)
    {
      const midCol = c + Math.floor(w / 2);
      this.tileGrid[r][midCol] = waterfallTile;
      const rockLeft = this.findTileByName('rock_gray_left_type01.png');
      const rockRight = this.findTileByName('rock_gray_right_type01.png');
      if (rockLeft && midCol - 1 >= c) this.tileGrid[r][midCol - 1] = rockLeft;
      if (rockRight && midCol + 1 < c + w) this.tileGrid[r][midCol + 1] = rockRight;
    }
  }

  private dibujarBloqueUrbano(r: number, c: number, w: number, h: number)
  {
    for (let i = 0; i < h; i++)
    {
      for (let j = 0; j < w; j++)
      {
        const currentRow = r + i;
        const currentCol = c + j;
        if (currentRow >= this.rows || currentCol >= this.cols) continue;

        const isTop = (i === 0);
        const isBottom = (i === h - 1);
        const isLeft = (j === 0);
        const isRight = (j === w - 1);

        let name = '';
        if (isTop)
        {
          if (isLeft) name = 'cobblestone_gray_northleft_corner.png';
          else if (isRight) name = 'cobblestone_gray_northright_corner.png';
          else name = 'cobblestone_gray_north_type02.png';
        } else if (isBottom)
        {
          if (isLeft) name = 'cobblestone_gray_southleft_corner.png';
          else if (isRight) name = 'cobblestone_gray_southright_corner.png';
          else name = 'cobblestone_gray_south_type02.png';
        } else if (isLeft) name = 'cobblestone_gray_left_type02.png';
        else if (isRight) name = 'cobblestone_gray_right_type02.png';
        else if (i > 3) name = 'cobblestone_gray_type01.png';

        if (name)
        {
          const t = this.findTileByName(name);
          if (t) this.tileGrid[currentRow][currentCol] = t;
        }
      }
    }
  }

  private dibujarAndenes()
  {
    const sidewalkTiles: (Tile | undefined)[][] = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
    for (let r = 0; r < this.rows; r++)
    {
      for (let c = 0; c < this.cols; c++)
      {
        if (this.buildingGrid[r][c] !== 0) continue;
        const n = this.getBuildingId(r - 1, c);
        const s = this.getBuildingId(r + 1, c);
        const w = this.getBuildingId(r, c - 1);
        const e = this.getBuildingId(r, c + 1);
        const nw = this.getBuildingId(r - 1, c - 1);
        const ne = this.getBuildingId(r - 1, c + 1);
        const sw = this.getBuildingId(r + 1, c - 1);
        const se = this.getBuildingId(r + 1, c + 1);

        let tName = '';
        if ((w > 0 && e > 0) || (n > 0 && s > 0)) tName = 'sidewalk_gray_type';
        else if (se > 0 && s === 0 && e === 0) tName = 'sidewalk_gray_northleft_corner.png';
        else if (sw > 0 && s === 0 && w === 0) tName = 'sidewalk_gray_northright_corner.png';
        else if (ne > 0 && n === 0 && e === 0) tName = 'sidewalk_gray_southleft_corner.png';
        else if (nw > 0 && n === 0 && w === 0) tName = 'sidewalk_gray_southright_corner.png';
        else if (s > 0) tName = 'sidewalk_gray_north_type';
        else if (n > 0) tName = 'sidewalk_gray_south_type';
        else if (e > 0) tName = 'sidewalk_gray_left_type';
        else if (w > 0) tName = 'sidewalk_gray_right_type';
        else if (nw > 0 || ne > 0 || sw > 0 || se > 0) tName = 'sidewalk_gray_type';

        if (tName)
        {
          if (tName.endsWith('.png')) sidewalkTiles[r][c] = this.findTileByName(tName);
          else sidewalkTiles[r][c] = this.findRandomTileByPrefix(tName);
        }
      }
    }
    for (let r = 0; r < this.rows; r++)
    {
      for (let c = 0; c < this.cols; c++)
      {
        if (sidewalkTiles[r][c]) this.tileGrid[r][c] = sidewalkTiles[r][c]!;
      }
    }
  }

  private poblarAndenesConCasas(rects: { r: number, c: number, w: number, h: number }[])
  {
    let houseIdCounter = 1;
    rects.forEach(rect =>
    {
      const houseFloor1Row = rect.r + 3;
      const startLimitCol = rect.c + 1;
      const endLimitCol = rect.c + rect.w - 2;
      let currentCol = startLimitCol;

      while (currentCol < endLimitCol)
      {
        const houseWidth = Math.floor(Math.random() * (6 - 3 + 1)) + 3;
        if (currentCol + houseWidth > endLimitCol) break;

        const isRuin = Math.random() < 0.15;
        if (isRuin)
        {
          const ruinRow = houseFloor1Row - 1;
          this.construirCasaEnRuinas(houseIdCounter++, ruinRow, currentCol, houseWidth);
        } else
        {
          const houseHeight = Math.floor(Math.random() * 2) + 2;
          const startRow = houseFloor1Row - houseHeight + 1;
          this.construirCasa(houseIdCounter++, startRow, currentCol, houseWidth, houseHeight);
        }
        currentCol += houseWidth + 1;
      }
    });
  }

  private construirCasa(houseId: number, startRow: number, startCol: number, width: number, height: number)
  {
    const wallColors = [...new Set(this.tileDefinitions.filter(t => t.type === 'wall' && t.color).map(t => t.color!))];
    const houseColor = wallColors.length > 0 ? wallColors[Math.floor(Math.random() * wallColors.length)] : null;
    if (!houseColor) return;

    let doorInfo: { col: number; tile: Tile } | null = null;
    let detectedArchColor = 'white';

    for (let floor = 1; floor <= height; floor++)
    {
      const gridRow = startRow + height - floor;
      const placedDoorInfo = this.construirPiso(floor, gridRow, startCol, width, height, houseColor, doorInfo, detectedArchColor);
      if (placedDoorInfo)
      {
        doorInfo = placedDoorInfo;
        if (floor === 1)
        {
          const match = placedDoorInfo.tile.fileName.match(/^border_([^_]+)_door/i);
          if (match) detectedArchColor = match[1].toLowerCase();
        }
      }
    }
    for (let r = startRow; r < startRow + height; r++)
    {
      for (let c = startCol; c < startCol + width; c++)
      {
        this.buildingGrid[r][c] = houseId;
      }
    }

    // Colocar Nameplate (1 fila abajo, 1 columna a la derecha de la puerta)
    if (doorInfo)
    {
      const doorRow = startRow + height - 1; // Fila donde está la puerta (pared)
      const plateRow = doorRow + 1; // 1 fila abajo (suelo frente a la casa)
      const plateCol = doorInfo.col + 1; // 1 columna a la derecha de la puerta

      if (plateRow < this.rows && plateCol < this.cols)
      {
        const currentTile = this.tileGrid[plateRow][plateCol];
        // Aseguramos que se coloque sobre suelo válido y caminable
        if (currentTile && currentTile.walkable)
        {
          this.tileGrid[plateRow][plateCol] = {
            fileName: 'nameplate_brown_empty.png',
            type: 'nameplate',
            walkable: true,
            underlyingTile: { ...currentTile },
            houseId: houseId
          };
        }
      }
    }
  }

  private construirPiso(floorNumber: number, gridRow: number, startCol: number, width: number, totalHeight: number, color: string, doorInfoFromBelow: { col: number; tile: Tile } | null, archColor: string): { col: number; tile: Tile } | null
  {
    if (gridRow < 0 || gridRow >= this.rows) return null;
    let doorInfoForThisFloor: { col: number; tile: Tile } | null = null;
    const isFinalFloor = floorNumber === totalHeight;

    let wallTile = isFinalFloor ? this.findTile('wall', color, 'top') : this.findTile('wall', color, undefined, 'top');
    if (!wallTile) wallTile = this.findTile('wall', color);
    if (!wallTile) return null;

    for (let i = 0; i < width; i++) this.tileGrid[gridRow][startCol + i] = { ...wallTile!, walkable: false };

    let occupiedCol = -1;
    if (floorNumber === 1)
    {
      const doorCol = startCol + Math.floor(Math.random() * width);
      let doorTile = this.findRandomTile('door', null, ['border_']);
      if (!doorTile) doorTile = this.findRandomTileByType('door', color) || this.findRandomTileByType('door', null);
      if (doorTile)
      {
        this.tileGrid[gridRow][doorCol] = { ...doorTile, walkable: true };
        doorInfoForThisFloor = { col: doorCol, tile: doorTile };
        occupiedCol = doorCol;
      }
    }

    if (floorNumber > 1 && doorInfoFromBelow)
    {
      occupiedCol = doorInfoFromBelow.col;
      const safeColor = color.toLowerCase();
      const suffix = isFinalFloor ? '_top.png' : '.png';
      let targetFileName = (floorNumber === 2) ? `wall_${safeColor}_toparch_${archColor}${suffix}` : (isFinalFloor ? `wall_${safeColor}_top.png` : '');

      let archTile = targetFileName ? this.findTileByName(targetFileName) : undefined;
      if (!archTile && targetFileName.includes('toparch')) archTile = this.findTile('wall', color, `toparch_${archColor}`);

      if (archTile)
      {
        this.tileGrid[gridRow][occupiedCol] = { ...archTile, walkable: false };
        doorInfoForThisFloor = { col: occupiedCol, tile: archTile };
      }
    }

    const targetWindows = Math.floor(Math.random() * 2) + 1;
    const availableIndices = Array.from({ length: width }, (_, i) => i).filter(i => (startCol + i) !== occupiedCol);
    availableIndices.sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(targetWindows, availableIndices.length); i++)
    {
      const colIndex = availableIndices[i];
      let windowTile = isFinalFloor ? this.findRandomTile('window', color, ['top', 'window']) : undefined;
      if (!windowTile) windowTile = this.findRandomTile('window', color, undefined, ['top']);
      if (windowTile) this.tileGrid[gridRow][startCol + colIndex] = { ...windowTile, walkable: false };
    }
    return doorInfoForThisFloor;
  }

  private construirCasaEnRuinas(houseId: number, startRow: number, startCol: number, width: number)
  {
    const ruinTiles = this.tileDefinitions.filter(t => t.fileName.startsWith('shatteredFacade_') || t.fileName.startsWith('crackedFacade_'));
    const allDebrisTiles = this.tileDefinitions.filter(t => t.fileName.startsWith('debrisBlock_'));
    if (ruinTiles.length === 0) return;

    const tilesByColor: { [key: string]: any[] } = {};
    ruinTiles.forEach(t =>
    {
      let c = t.color || t.fileName.split('_')[1] || 'unknown';
      if (!tilesByColor[c]) tilesByColor[c] = [];
      tilesByColor[c].push(t);
    });

    const selectedColor = Object.keys(tilesByColor)[Math.floor(Math.random() * Object.keys(tilesByColor).length)];
    const selectedMuros = tilesByColor[selectedColor];
    const ponerEscombrosAbajo = Math.random() < 0.5;

    for (let i = 0; i < width; i++)
    {
      const randomMuro = selectedMuros[Math.floor(Math.random() * selectedMuros.length)];
      if (startRow < this.rows && startCol + i < this.cols)
      {
        this.tileGrid[startRow][startCol + i] = { ...randomMuro, walkable: false };
        this.buildingGrid[startRow][startCol + i] = houseId;
      }

      if (ponerEscombrosAbajo && startRow + 1 < this.rows)
      {
        const escombrosMismoColor = allDebrisTiles.filter(t => t.fileName.includes(selectedColor));
        if (escombrosMismoColor.length > 0)
        {
          const randomDebris = escombrosMismoColor[Math.floor(Math.random() * escombrosMismoColor.length)];
          this.tileGrid[startRow + 1][startCol + i] = { ...randomDebris, walkable: true };
          this.buildingGrid[startRow + 1][startCol + i] = houseId;
        }
      }
    }
  }

  private generarMuelle(): void
  {
    const candidates: { x: number; y: number; dirX: number; dirY: number }[] = [];
    const esVertical = Math.random() < 0.5;
    const getBaseTile = (x: number, y: number) => (x >= 0 && x < this.cols && y >= 0 && y < this.rows && this.tileGrid[y][x]) ? this.tileGrid[y][x].fileName : '';

    for (let x = 0; x < this.cols; x++)
    {
      for (let y = 0; y < this.rows; y++)
      {
        if (!getBaseTile(x, y).includes('water')) continue;
        if (esVertical)
        {
          if (y > 0 && !getBaseTile(x, y - 1).includes('water')) candidates.push({ x, y, dirX: 0, dirY: 1 });
          if (y < this.rows - 1 && !getBaseTile(x, y + 1).includes('water')) candidates.push({ x, y, dirX: 0, dirY: -1 });
        } else
        {
          if (x > 0 && !getBaseTile(x - 1, y).includes('water')) candidates.push({ x, y, dirX: 1, dirY: 0 });
          if (x < this.cols - 1 && !getBaseTile(x + 1, y).includes('water')) candidates.push({ x, y, dirX: -1, dirY: 0 });
        }
      }
    }

    if (candidates.length === 0) return;
    const start = candidates[Math.floor(Math.random() * candidates.length)];
    const longitud = Math.floor(Math.random() * 3) + 1;
    const bodyTile = esVertical ? 'plank_brown_horizontal.png' : 'plank_brown_vertical.png';

    for (let i = 0; i < longitud; i++)
    {
      const px = start.x + (start.dirX * i);
      const py = start.y + (start.dirY * i);
      if (px < 0 || px >= this.cols || py < 0 || py >= this.rows) break;
      if (!getBaseTile(px, py).includes('water')) break;

      let tileToPaint = bodyTile;
      if (i === longitud - 1)
      {
        if (start.dirX === 1) tileToPaint = 'plank_brown_left_type01.png';
        else if (start.dirX === -1) tileToPaint = 'plank_brown_right_type01.png';
        else if (start.dirY === 1) tileToPaint = 'plank_brown_south_type01.png';
        else if (start.dirY === -1) tileToPaint = 'plank_brown_north_type01.png';
      }
      const t = this.findTileByName(tileToPaint);
      if (t) this.tileGrid[py][px] = t;
    }
  }

  private inicializarNidos()
  {
    const cantidad = Math.floor(Math.random() * 6) + 5;
    let colocados = 0, intentos = 0;
    const nestGrass = this.findTileByName('grass_green_nest_type00.png');
    const nestDirt = this.findTileByName('dirtpath_brown_nest_type00.png');

    while (colocados < cantidad && intentos < 2000)
    {
      intentos++;
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);
      if (this.buildingGrid[r][c] !== 0) continue;
      const tile = this.tileGrid[r][c];
      if (!tile) continue;
      const name = tile.fileName;
      if (name.includes('wall') || name.includes('door') || name.includes('window') || name.includes('roof') || name.includes('border')) continue;

      if (name.includes('grass') && nestGrass) { this.tileGrid[r][c] = nestGrass; colocados++; }
      else if (name.includes('dirtpath') && nestDirt) { this.tileGrid[r][c] = nestDirt; colocados++; }
    }
  }

  private generarVegetacion()
  {
    const standardTrees = this.tileDefinitions.filter(t => t.type === 'tree');
    const largeTrees = this.tileDefinitions.filter(t => t.type === 'tree_large');

    if (standardTrees.length === 0 && largeTrees.length === 0)
    {
      //console.warn("[Vegetación] No se encontraron definiciones de árboles.");
      return;
    }

    // Helper para validar posición
    const isValidSpot = (r: number, c: number) =>
    {
      if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;
      const tile = this.tileGrid[r][c];
      if (!tile) return false;

      // 1. Regla de Sustrato: Solo sobre grass_green_type
      if (!tile.fileName.startsWith('grass_green_type')) return false;

      // 2. Validación de Colisión
      const forbidden = ['nest', 'ruin', 'box', 'cascade', 'rock', 'wall', 'door', 'window', 'water', 'plank'];
      if (forbidden.some(k => tile.fileName.includes(k))) return false;
      if (tile.type === 'tree' || tile.type === 'tree_large') return false; // Evitar superposición
      if (this.buildingGrid[r][c] !== 0) return false; // No dentro de casas

      return true;
    };

    // 1. Generar Árboles Grandes (5 a 10)
    const numLarge = Math.floor(Math.random() * (10 - 5 + 1)) + 5;
    let placedLarge = 0;
    let attempts = 0;

    while (placedLarge < numLarge && attempts < 2000)
    {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);

      if (isValidSpot(r, c))
      {
        const tree = largeTrees[Math.floor(Math.random() * largeTrees.length)];
        this.tileGrid[r][c] = {
          ...tree,
          walkable: true,
          underlyingTile: this.tileGrid[r][c]
        };
        placedLarge++;
      }
      attempts++;
    }

    // 2. Generar Árboles Pequeños (10 a 20)
    const numSmall = Math.floor(Math.random() * (20 - 10 + 1)) + 10;
    let placedSmall = 0;
    attempts = 0;

    while (placedSmall < numSmall && attempts < 2000)
    {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);

      if (isValidSpot(r, c))
      {
        const tree = standardTrees[Math.floor(Math.random() * standardTrees.length)];
        this.tileGrid[r][c] = {
          ...tree,
          walkable: true,
          underlyingTile: this.tileGrid[r][c]
        };
        placedSmall++;
      }
      attempts++;
    }
  }

  // Helpers
  private getBuildingId(r: number, c: number): number
  {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return 0;
    return this.buildingGrid[r][c];
  }
  private findTileByName(fileName: string): Tile | undefined { return this.tileDefinitions.find(t => t.fileName === fileName); }
  private findRandomTileByPrefix(prefix: string, exclude?: string): Tile | undefined
  {
    const possible = this.tileDefinitions.filter(t => t.fileName.startsWith(prefix) && (!exclude || !t.fileName.includes(exclude)));
    return possible.length > 0 ? possible[Math.floor(Math.random() * possible.length)] : this.findTile('floor');
  }
  private findTile(type: string, color?: string | null, mustInclude?: string, mustNotInclude?: string): Tile | undefined
  {
    return this.tileDefinitions.find(t =>
    {
      if (t.type !== type) return false;
      if (color && t.color !== color) return false;
      if (mustInclude && !t.fileName.includes(mustInclude)) return false;
      if (mustNotInclude && t.fileName.includes(mustNotInclude)) return false;
      return true;
    });
  }
  private findRandomTile(type: string, color?: string | null, mustInclude?: string[], mustNotInclude?: string[]): Tile | undefined
  {
    const possible = this.tileDefinitions.filter(t =>
    {
      if (t.type !== type) return false;
      if (color && t.color !== color) return false;
      if (mustInclude && !mustInclude.every(k => t.fileName.includes(k))) return false;
      if (mustNotInclude && mustNotInclude.some(k => t.fileName.includes(k))) return false;
      return true;
    });
    return possible.length > 0 ? possible[Math.floor(Math.random() * possible.length)] : undefined;
  }
  private findRandomTileByType(type: string, color?: string | null): Tile | undefined
  {
    const all = this.tileDefinitions.filter(t => t.type === type);
    if (color)
    {
      const colored = all.filter(t => t.color === color);
      if (colored.length > 0) return colored[Math.floor(Math.random() * colored.length)];
    }
    return all.length > 0 ? all[Math.floor(Math.random() * all.length)] : undefined;
  }
}