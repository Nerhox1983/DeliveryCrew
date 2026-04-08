import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SceneService } from './scene.service';
import { House } from '../../shared/models/house.model';
import { GameTile, Tile } from '../../shared/models/tile.model';
import { TILE_DEFINITIONS } from '../../shared/constants/tile-definitions';

export interface InteriorEntryResult
{
  grid: GameTile[][];
  playerStartR: number;
  playerStartC: number;
  rows: number;
  cols: number;
  floorTile: Tile;
}

@Injectable({
  providedIn: 'root'
})
export class InteriorManagerService
{
  private readonly TILE_DEFINITIONS: Tile[] = TILE_DEFINITIONS;

  // Mapa centralizado de dueños de casas. ID de Casa -> Key del Rostro en AssetManager.
  private readonly houseOwners: { [key: number]: string } = {
    2: 'woman02',
    4: 'man04',
    5: 'woman05',
    6: 'woman06',
    10: 'woman10',
    11: 'woman11'
  };

  // CORRECCIÓN: Usamos el Subject privado para emitir cambios y el Observable para el componente
  private interiorGridSubject = new BehaviorSubject<GameTile[][]>([]);
  public interiorGrid$ = this.interiorGridSubject.asObservable();

  // PROPIEDAD NECESARIA: Guardamos la referencia de la casa donde estamos para gestionar niveles
  private currentHouse: any = null;

  constructor(private sceneService: SceneService) { }

  public enterHouse(house: House): InteriorEntryResult
  {
    const houseId = house.data.id;
    const sceneId = 'house_' + houseId;

    // Guardamos la referencia para el cambio de piso
    this.currentHouse = house;
    // Si la casa no tiene inicializado el nivel, lo ponemos en 0 (Planta Baja)
    if (this.currentHouse.currentLevel === undefined) this.currentHouse.currentLevel = 0;
    if (this.currentHouse.totalFloors === undefined) this.currentHouse.totalFloors = 2; // Default 2 pisos

    const rows = house.data.height + 4;
    const cols = house.data.width + 4;

    const cachedScene = this.sceneService.getStoredScene(sceneId);
    let grid: GameTile[][];
    let floorTile: Tile;

    /*if (cachedScene) {
      grid = JSON.parse(JSON.stringify(cachedScene.grid));
      const sample = grid[1][1];
      floorTile = sample.underlyingTile ? sample.underlyingTile : sample;
    } else {
      const gen = this.generateInterior(rows, cols);
      grid = gen.grid;
      floorTile = gen.floorTile;
      
      // Si usas múltiples niveles, aquí deberías inicializar house.grids = [grid, grid2...]
    }*/
    if (cachedScene)
    {
      grid = JSON.parse(JSON.stringify(cachedScene.grid));
      const sample = grid[1][1];
      floorTile = sample.underlyingTile ? sample.underlyingTile : sample;

      // Inicialización de Memoria: Aseguramos que grids sea un array [piso0, piso1]
      if (!this.currentHouse.grids)
      {
        this.currentHouse.grids = [grid, this.generateUpperFloor(rows, cols, 1)];
      }

      // CORRECCIÓN: Restaurar staircasePos al cargar de caché para evitar crash al cambiar piso
      if (!this.currentHouse.staircasePos)
      {
        this.currentHouse.staircasePos = { r: 1, c: 3 };
      }
    } else
    {
      const gen0 = this.generateInterior(rows, cols, 0);
      const grid1 = this.generateUpperFloor(rows, cols, 1);

      grid = gen0.grid;
      floorTile = gen0.floorTile;

      // Inicialización de Memoria
      this.currentHouse.grids = [grid, grid1];

      // Definimos punto de aparición en escalera (Row 1, Col 3 es el estándar en generateInterior)
      this.currentHouse.staircasePos = { r: 1, c: 3 };
    }

    const playerStartC = Math.floor(cols / 2);
    const playerStartR = rows - 2;

    // CORRECCIÓN: Usamos interiorGridSubject para emitir el grid inicial
    this.interiorGridSubject.next(grid);

    return { grid, playerStartR, playerStartC, rows, cols, floorTile };
  }

  /**
   * Cambia de piso de forma segura
   */
  public changeFloor(houseId: number, direction: 1 | -1): { success: boolean, playerStartC: number, playerStartR: number }
  {
    // 1. Validamos que tengamos la casa cargada
    if (!this.currentHouse || this.currentHouse.data.id !== houseId)
    {
      return { success: false, playerStartC: 0, playerStartR: 0 };
    }

    const newLevel = this.currentHouse.currentLevel + direction;

    // 2. Validar límites de pisos
    if (newLevel < 0 || newLevel >= (this.currentHouse.totalFloors || 1))
    {
      return { success: false, playerStartC: 0, playerStartR: 0 };
    }

    // 3. Actualizar estado
    this.currentHouse.currentLevel = newLevel;

    // Aquí asumimos que tienes un array de grids por piso. 
    // Si no, por ahora regeneramos o usamos el actual para que no falle la lógica.
    const newGrid = this.currentHouse.grids ? this.currentHouse.grids[newLevel] : this.interiorGridSubject.value;

    // Robustez: Emitimos el cambio al GameBoard
    this.interiorGridSubject.next(newGrid);

    // Cálculo de Spawn Coherente
    // Usamos la posición de la escalera definida en enterHouse o fallback a 3
    const stairCol = this.currentHouse.staircasePos ? this.currentHouse.staircasePos.c : 3;

    // Tanto al subir como al bajar, aparecemos "frente" a la escalera/landing (Row 2)
    // para no quedar atrapados en la pared o en el trigger
    const spawnC = stairCol;
    const spawnR = 2;

    return {
      success: true,
      playerStartC: spawnC,
      playerStartR: spawnR
    };
  }

  // --- Helpers de generación y búsqueda (Mantener igual que antes) ---

  /*private generateInterior(rows: number, cols: number): { grid: GameTile[][], floorTile: Tile } {
    const grid: GameTile[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
    const selectedFloor = this.findTileByName('floor_type01.png') || this.findTile('floor')!;
    const wallTile = this.findTileByName('wall_lightGray.png') || this.findTile('wall')!;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
          grid[r][c] = { ...wallTile, walkable: false } as GameTile;
        } else {
          grid[r][c] = { ...selectedFloor, walkable: true } as GameTile;
        }
      }
    }

    const doorCol = Math.floor(cols / 2);
    grid[rows - 1][doorCol] = { ...this.findTileByName('border_white_door_brown_type01.png'), type: 'door', walkable: true } as GameTile;

    return { grid, floorTile: selectedFloor };
  }*/

  private generateInterior(rows: number, cols: number, level: number): { grid: GameTile[][], floorTile: Tile }
  {
    const grid: GameTile[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));

    // 1. Definición de Tiles: Nombres planos sincronizados con TILE_DEFINITIONS
    // Mantenemos el suelo original (floor_type01.png) aunque se vea rojo si falta la textura, según instrucciones.
    const selectedFloor = this.findTileByName('floor_type01.png') || this.findTileByName('wall_lightGray.png') || this.findTile('floor')!;
    const wallTile = this.findTileByName('wall_lightGray.png') || this.findTile('wall')!;

    // Assets de muebles (Con rutas relativas exactas)
    const bedTile = this.findTileByName('bed.png');
    const pitcherTile = this.findTileByName('../img/metal_pitcher.png');
    const staircaseTile = this.findTileByName('../architecture/stairs_horizontal_type01.png');
    const boxTile = this.findTileByName('WoodBox_type01.png');

    // 2. Generación de Base (Suelo y Paredes)
    for (let r = 0; r < rows; r++)
    {
      for (let c = 0; c < cols; c++)
      {
        if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1)
        {
          grid[r][c] = { ...wallTile, walkable: false } as GameTile;
        } else
        {
          grid[r][c] = { ...selectedFloor, walkable: true } as GameTile;
        }
      }
    }

    this.buildCountertop(grid, rows, cols, level);
    this.placeSofas(grid, rows, cols, level);
    this.placeChairs(grid, rows, cols);

    const isSingleStory = this.currentHouse?.totalFloors === 1;

    if (isSingleStory)
    {
      // Lógica rústica para casas de 1 piso: todo en un solo espacio
      this.placeObject(grid, 2, 2, bedTile, 'bed');
      this.placeObject(grid, 2, cols - 4, pitcherTile, 'pitcher');
    } else
    {
      // Lógica para casas de múltiples pisos
      if (level === 0)
      { // Planta Baja: Zona Social/Cocina
        this.placeObject(grid, 2, cols - 4, pitcherTile, 'pitcher');

        // La Escalera: Ocupa 2 tiles de ancho (1,3) y (1,4)
        if (staircaseTile)
        {
          this.placeObject(grid, 1, 3, { ...staircaseTile, width: 2 }, 'stair_up_trigger', true);
          if (grid[1] && grid[1][4])
          {
            grid[1][4] = { ...grid[1][4], type: 'stair_part', walkable: false };
          }
        }
      } else if (level === 1)
      { // Planta Alta: Zona Privada/Dormitorio
        this.placeObject(grid, 2, 2, bedTile, 'bed');
        this.placeObject(grid, 2, cols - 3, boxTile, 'woodbox');
      }
    }

    // La puerta solo debe existir en la planta baja (level 0)
    if (level === 0)
    {
      const doorCol = Math.floor(cols / 2);
      grid[rows - 1][doorCol] = {
        ...this.findTileByName('border_white_door_brown_type01.png'),
        type: 'door',
        walkable: true
      } as GameTile;
    }

    return { grid, floorTile: selectedFloor };
  }

  private placeObject(grid: GameTile[][], r: number, c: number, tile: any, type: string, walkableOverride?: boolean)
  {
    const logPrefix = `[placeObject | ${type}]`;

    if (!tile || !grid[r] || !grid[r][c])
    {
      //console.error(`${logPrefix} ERROR CRÍTICO en [${r},${c}]: Tile o celda de grid inválida. Abortando colocación.`);
      return;
    }

    //console.log(`${logPrefix} Intentando colocar en [${r},${c}] con tile de entrada:`, tile);

    // REFACTOR: Usamos el nuevo buscador flexible para encontrar la definición del asset.
    const definition = tile.fileName && Object.keys(tile).length === 1
      ? this.findTileByAnyName(tile.fileName)
      : tile;

    // VALIDACIÓN MEJORADA: Si la definición es nula, lanzamos un error claro.
    if (!definition || Object.keys(definition).length === 0)
    {
      //console.error(`${logPrefix} ERROR en [${r},${c}]: No se encontró una definición válida para el asset '${tile?.fileName || 'objeto sin nombre'}'. La búsqueda flexible falló.`);
      return;
    }

    //console.log(`${logPrefix} Definición de asset encontrada para '${definition.fileName}':`, definition);

    const isWalkable = walkableOverride !== undefined ? walkableOverride
      : (definition.walkable !== undefined ? definition.walkable
        : type.includes('trigger'));

    //console.log(`${logPrefix} en [${r},${c}]: Propiedad 'walkable' determinada como: ${isWalkable}.`);

    const underlyingTile = { ...grid[r][c] };
    //console.log(`${logPrefix} en [${r},${c}]: Guardando tile subyacente:`, underlyingTile);

    grid[r][c] = {
      ...definition,
      type: type,
      walkable: isWalkable,
      underlyingTile: underlyingTile
    } as GameTile;

    // LOG DE ÉXITO: Confirmación visual en consola.
    //console.log(`%c${logPrefix} ÉXITO en [${r},${c}]: Objeto '${definition.fileName}' colocado.`, 'color: #2ecc71; font-weight: bold;', grid[r][c]);
  }

  /**
   * NUEVO MÉTODO: Búsqueda flexible que compara solo el nombre del archivo, ignorando la ruta.
   */
  private findTileByAnyName(fileName: string): Tile | undefined
  {
    const targetName = fileName.split('/').pop();
    if (!targetName)
    {
      //console.warn(`[findTileByAnyName] Nombre de archivo inválido: ${fileName}`);
      return undefined;
    }

    return this.TILE_DEFINITIONS.find(t =>
    {
      const definitionName = t.fileName.split('/').pop();
      return definitionName === targetName;
    });
  }

  private findTileByName(fileName: string): Tile | undefined
  {
    return this.TILE_DEFINITIONS.find(t => t.fileName === fileName);
  }

  private findTile(type: string): Tile | undefined
  {
    return this.TILE_DEFINITIONS.find(t => t.type === type);
  }

  private buildCountertop(grid: GameTile[][], rows: number, cols: number, level: number)
  {
    //console.log(`[buildCountertop] Iniciando construcción para nivel ${level}.`);

    // Zonificación CRÍTICA: Este método SOLO debe ejecutarse en Planta Baja (level 0).
    if (level !== 0)
    {
      //console.warn(`[buildCountertop] OMITIDO: La construcción de encimeras solo aplica al nivel 0. Nivel actual: ${level}.`);
      return;
    }
    //console.log(`[buildCountertop] Verificación de nivel superada. Procediendo a construir.`);

    // Definición de Assets con rutas exactas según manifest
    const T = {
      NL: 'countertop_brown_northleft_corner_type01.png',
      N: 'countertop_brown_north.png',
      NR: 'countertop_brown_northright_corner_type01.png',
      L: 'countertop_brown_left_type01.png',
      SL: 'countertop_southleft_type01.png',
      R: 'countertop_brown_right_type01.png',
      SR: 'countertop_southright_type01.png'
    };
    //console.log('[buildCountertop] Nombres de assets de encimera a usar:', T);

    const stoveTile = this.findTileByName('stove.png');
    if (!stoveTile)
      console.warn('[buildCountertop] ADVERTENCIA: No se encontró la definición del tile para "stove.png".');

    const pitcherTile = this.findTileByName('../img/metal_pitcher.png');
    if (!pitcherTile)
      console.warn('[buildCountertop] ADVERTENCIA: No se encontró la definición del tile para "../img/metal_pitcher.png".');
    let stovePlaced = false;

    // Lógica de Auto-ensamblaje: Selección aleatoria de uno de los 5 casos
    const designCase: number = 5;
    //console.log(`[buildCountertop] Caso de diseño seleccionado: ${designCase}`);

    const startR = 1;
    const startC = 1;
    const endC = cols - 2;
    const lengthV = 2;

    //console.log(`[buildCountertop] Iniciando bucle de colocación para el caso ${designCase}...`);

    switch (designCase)
    {
      case 1: // Caso #1: Línea Horizontal
        this.placeObject(grid, startR, startC, { fileName: T.NL }, 'countertop');
        for (let c = startC + 1; c < endC; c++) this.placeObject(grid, startR, c, { fileName: T.N }, 'countertop');
        this.placeObject(grid, startR, endC, { fileName: T.NR }, 'countertop');
        break;
      case 2: // Caso #2: Línea Vertical Izquierda
        this.placeObject(grid, startR, startC, { fileName: T.NL }, 'countertop');
        for (let r = startR + 1; r < startR + lengthV; r++) this.placeObject(grid, r, startC, { fileName: T.L }, 'countertop');
        this.placeObject(grid, startR + lengthV, startC, { fileName: T.SL }, 'countertop');
        break;
      case 3: // Caso #3: L Invertida Izquierda
        this.placeObject(grid, startR, startC, { fileName: T.NL }, 'countertop');
        for (let c = startC + 1; c < endC; c++) this.placeObject(grid, startR, c, { fileName: T.N }, 'countertop');
        this.placeObject(grid, startR, endC, { fileName: T.NR }, 'countertop');
        for (let r = startR + 1; r < startR + lengthV; r++) this.placeObject(grid, r, startC, { fileName: T.L }, 'countertop');
        this.placeObject(grid, startR + lengthV, startC, { fileName: T.SL }, 'countertop');
        break;
      case 4: // Caso #4: U o Herradura
        this.placeObject(grid, startR, startC, { fileName: T.NL }, 'countertop');
        for (let c = startC + 1; c < endC; c++) this.placeObject(grid, startR, c, { fileName: T.N }, 'countertop');
        this.placeObject(grid, startR, endC, { fileName: T.NR }, 'countertop');
        for (let r = startR + 1; r < startR + lengthV; r++) this.placeObject(grid, r, startC, { fileName: T.L }, 'countertop');
        this.placeObject(grid, startR + lengthV, startC, { fileName: T.SL }, 'countertop');
        for (let r = startR + 1; r < startR + lengthV; r++) this.placeObject(grid, r, endC, { fileName: T.R }, 'countertop');
        this.placeObject(grid, startR + lengthV, endC, { fileName: T.SR }, 'countertop');
        break;
      case 5: // Caso #5: L Invertida Derecha
        //console.log(`[buildCountertop] Colocando L Invertida Derecha...`);
        // Línea Superior: 3 tiles pegados a la pared derecha
        this.placeObject(grid, startR, endC - 2, { fileName: T.NL }, 'countertop');
        this.placeObject(grid, startR, endC - 1, { fileName: T.N }, 'countertop');
        this.placeObject(grid, startR, endC, { fileName: T.NR }, 'countertop');

        // Línea Lateral: 2 tiles bajando por la derecha
        this.placeObject(grid, startR + 1, endC, { fileName: T.R }, 'countertop');
        this.placeObject(grid, startR + 2, endC, { fileName: T.SR }, 'countertop');
        break;
    }
    //console.log(`[buildCountertop] Bucle de colocación para el caso ${designCase} finalizado.`);

    // Inyección de la Estufa: Lógica de Adyacencia (Pegada a la encimera)
    //console.log(`[buildCountertop] Iniciando lógica de inyección de estufa...`);
    if (!stovePlaced)
    {
      // 1. Escanear límites de la encimera en la fila superior
      let minC = cols;
      let maxC = -1;

      for (let c = 1; c < cols - 1; c++)
      {
        if (grid[startR][c]?.type === 'countertop')
        {
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
        }
      }
      //console.log(`[buildCountertop] Límites de encimera escaneados: minC=${minC}, maxC=${maxC}.`);

      const checkAndPlace = (col: number) =>
      {
        //console.log(`[buildCountertop] -> Intentando colocar estufa en columna ${col}.`);
        // Ajuste de colisiones: Solo prohibir 3 y 4 para permitir muebles en 2 y 5
        if (col <= 0 || col >= cols - 1 || (col >= 3 && col <= 4))
        {
          //console.log(`[buildCountertop] -> Colocación en ${col} RECHAZADA (fuera de límites o zona de escalera).`);
          return false;
        }
        this.placeObject(grid, startR, col, stoveTile, 'stove');
        stovePlaced = true;
        // El log de éxito ya lo emite placeObject
        return true;
      };

      if (maxC !== -1)
      {
        // Intentar izquierda de la encimera
        if (!checkAndPlace(minC - 1)) 
        {
          checkAndPlace(minC - 4); // Salto de escalera hacia la izquierda
        }
        // Si sigue sin ponerse, intentar derecha
        if (!stovePlaced && !checkAndPlace(maxC + 1)) 
        {
          checkAndPlace(maxC + 4); // Salto de escalera hacia la derecha
        }
      }
    }
    if (!stovePlaced) console.warn('[buildCountertop] ADVERTENCIA: No se pudo encontrar una posición válida para la estufa.');

    // Inyección de la Olleta (Pitcher): Decoración sobre la encimera
    //console.log(`[buildCountertop] Iniciando lógica de inyección de olleta...`);
    if (pitcherTile)
    {
      let rightmostC = -1;
      // Buscar la encimera más a la derecha en la fila superior
      for (let c = 1; c < cols - 1; c++)
      {
        if (grid[startR][c]?.type === 'countertop')
        {
          rightmostC = c;
        }
      }

      if (rightmostC !== -1) 
      {
        //console.log(`[buildCountertop] -> Colocando olleta sobre la encimera en columna ${rightmostC}.`);
        // Colocar olleta sobre la encimera (placeObject preserva el underlyingTile)
        this.placeObject(grid, startR, rightmostC, pitcherTile, 'pitcher', false);
      }
      else 
      {
        console.warn('[buildCountertop] ADVERTENCIA: No se encontró una encimera para colocar la olleta.');
      }
    }
    //console.log(`[buildCountertop] Construcción finalizada.`);
  }

  private placeSofas(grid: GameTile[][], rows: number, cols: number, level: number)
  {
    // Solo generar sofás en la Planta Baja (Sala)
    if (level !== 0) return;

    const sofaCount = Math.floor(Math.random() * 6) + 1; // 1 a 6 sofás
    const assets = {
      front: '/assets/furniture/couch_green_front_type01.png',
      profile: '/assets/furniture/couch_green_profile_type01.png',
      back: '/assets/furniture/couch_green_back_type01.png'
    };

    let placed = 0;
    let attempts = 0;
    const maxAttempts = 50; // Evitar bucles infinitos

    // Calculamos la columna de la puerta para evitar bloquearla
    const doorCol = Math.floor(cols / 2);

    while (placed < sofaCount && attempts < maxAttempts)
    {
      attempts++;
      // Margen de 1 tile para no pegar a paredes exteriores
      const r = Math.floor(Math.random() * (rows - 2)) + 1;
      const c = Math.floor(Math.random() * (cols - 2)) + 1;

      // ZONA DE EXCLUSIÓN: Escaleras y entrada
      // Escalera está en (1,3) y (1,4). Dejamos libre filas 1-3 y cols 2-5 para tránsito.
      if (r <= 3 && c >= 2 && c <= 5) continue;

      // ZONA DE EXCLUSIÓN: Puerta Principal
      // Evitar colocar sofás justo enfrente de la puerta (fila rows - 2) para no bloquear la entrada/salida
      if (r === rows - 2 && c === doorCol) continue;

      // Solo colocar en suelo vacío
      if (grid[r][c].type !== 'floor') continue;

      const orientation = Math.floor(Math.random() * 4); // 0-3
      let fileName = assets.front;
      let type = 'couch_front';

      if (orientation === 1)
      { // Perfil Derecho
        fileName = assets.profile;
        type = 'couch_right';
      } else if (orientation === 2)
      { // Espaldas
        fileName = assets.back;
        type = 'couch_back';
      } else if (orientation === 3)
      { // Perfil Izquierdo (Mirror)
        fileName = assets.profile; // Usamos el mismo asset
        type = 'couch_left'; // Tipo especial para que el Renderer sepa rotarlo
      }

      this.placeObject(grid, r, c, { fileName }, type, true);
      placed++;
    }
  }

  private placeChairs(grid: GameTile[][], rows: number, cols: number)
  {
    const chairCount = Math.floor(Math.random() * 2) + 1; // 1 a 2 sillas por piso
    //console.log(`[InteriorManager] Iniciando generación de sillas. Objetivo: ${chairCount}`);
    const assets = {
      front: '/assets/furniture/chair_brown_front_type01.png',
      profile: '/assets/furniture/chair_brown_profile_type01.png',
      back: '/assets/furniture/chair_brown_back_empty_type01.png'
    };

    let placed = 0;
    let attempts = 0;
    const maxAttempts = 50;
    const doorCol = Math.floor(cols / 2);

    while (placed < chairCount && attempts < maxAttempts)
    {
      attempts++;
      // Margen de 1 tile para no pegar a paredes exteriores
      const r = Math.floor(Math.random() * (rows - 2)) + 1;
      const c = Math.floor(Math.random() * (cols - 2)) + 1;

      // ZONA DE EXCLUSIÓN: Escaleras (1,3) y (1,4) y área de tránsito
      if (r <= 3 && c >= 2 && c <= 5) continue;

      // ZONA DE EXCLUSIÓN: Puerta Principal (fila inferior, centro)
      if (r === rows - 2 && c === doorCol) continue;

      // Solo colocar en suelo vacío (evita sofás, encimeras, camas, etc.)
      if (grid[r][c].type !== 'floor') continue;

      const orientation = Math.floor(Math.random() * 4); // 0-3
      let fileName = assets.front;
      let type = 'chair_front';

      if (orientation === 1)
      { // Perfil Derecho
        fileName = assets.profile;
        type = 'chair_right';
      } else if (orientation === 2)
      { // Espaldas
        fileName = assets.back;
        type = 'chair_back';
      } else if (orientation === 3)
      { // Perfil Izquierdo (Mirror)
        fileName = assets.profile;
        type = 'chair_left';
      }

      // ya que es probable que estas sillas nuevas no estén registradas allí todavía.
      const chairDef = {
        fileName: fileName,
        type: type,
        walkable: true
      };
      this.placeObject(grid, r, c, chairDef, type, true);

      // Verificamos si realmente se colocó (el tipo del tile debe coincidir)
      if (grid[r][c].type === type)
      {
        placed++;
        console.log(`[InteriorManager] Silla colocada en [${r}, ${c}] Tipo: ${type}`);
      }
    }
    console.log(`[InteriorManager] Generación de sillas finalizada. Total: ${placed}/${chairCount} (Intentos: ${attempts})`);
  }

  public saveInteriorState(houseId: number, currentGrid: GameTile[][]): void
  {
    const sceneId = 'house_' + houseId;
    // Guardamos una copia del grid actual (con cajas movidas, items recogidos, etc.)
    this.sceneService.saveScene(sceneId, {
      grid: JSON.parse(JSON.stringify(currentGrid))
    });
  }

  // Implementación de generateUpperFloor
  private generateUpperFloor(rows: number, cols: number, level: number): GameTile[][]
  {
    // Copia del interior base
    const { grid } = this.generateInterior(rows, cols, level);

    // 1. Eliminar puerta de salida (reemplazar con pared)
    const doorCol = Math.floor(cols / 2);
    const wallTile = this.findTileByName('wall_lightGray.png') || this.findTile('wall')!;
    grid[rows - 1][doorCol] = { ...wallTile, walkable: false } as GameTile;

    // 2. Reemplazar escalera de subida con Landing (bajada) de 2 tiles de ancho
    const stairCol = 3; // Consistente con generateInterior
    const landingTile = this.findTileByName('../architecture/stairs_landing_horizontal_type01.png');

    if (landingTile)
    {
      // Colocamos el tile visual principal, que es el trigger y debe ser caminable.
      grid[1][stairCol] = {
        ...landingTile,
        width: 2, // Propiedad para el renderer
        type: 'stair_down_trigger', // Este pisa hacia abajo
        walkable: true,
        underlyingTile: { ...grid[1][stairCol].underlyingTile }
      } as GameTile;

      // Bloqueamos la segunda parte para colisión, asumiendo que el sprite de 128px lo cubre.
      if (grid[1] && grid[1][stairCol + 1])
      {
        grid[1][stairCol + 1] = { ...grid[1][stairCol + 1], type: 'stair_part', walkable: false };
      }
    } else
    {
      console.warn("[InteriorManager] Fallo al cargar landing: stairs_landing_horizontal_type01.png");
    }

    return grid;
  }
}