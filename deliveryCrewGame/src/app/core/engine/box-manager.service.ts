import { Injectable } from '@angular/core';
import { QuestReward } from '../../shared/models/quest.model';
import { Tile, GameTile } from '../../shared/models/tile.model';
import { Player } from '../../entities/player';

@Injectable({ providedIn: 'root' })
export class BoxManager
{
  private readonly CARDBOARDBOX_TILES = {
    TYPE_01: 'CardboardBox_type01.png',
    TYPE_02: 'CardboardBox_type02.png'
  };
  private readonly WOODBOX_TILES = {
    TYPE_01: 'WoodBox_type01.png',
    TYPE_02: 'WoodBox_type02.png'
  };
  private readonly PUDDLE_TILES = {
    TYPE_01: 'puddle_type01.png',
    TYPE_02: 'puddle_type02.png',
    TYPE_03: 'puddle_type03.png',
    TYPE_04: 'puddle_type04.png',
    TYPE_05: 'puddle_type05.png'
  };

  // Cooldown Global para evitar rebotes (pickup/drop infinito)
  private lastActionTimestamp = 0;
  // Exclusión por Coordenadas: Guarda la posición del JUGADOR al momento de soltar
  private lastDroppedTile: { r: number, c: number } | null = null;
  private readonly BASE_FLOOR_TILE: GameTile = {
    fileName: 'grass_green_type01.png',
    type: 'floor',
    walkable: true,
    color: null
  };

  constructor() { }

  public spawnBoxes(grid: GameTile[][], rows: number, cols: number, type: 'cardboard' | 'wood', count: number)
  {
    //console.log(`📦 Generando ${count} cajas de tipo ${type}...`);
    // Nota: Ahora usamos lógica de instancias para ambos tipos.

    for (let i = 0; i < count; i++)
    {
      let r, c;
      let attempts = 0;
      do
      {
        r = Math.floor(Math.random() * rows);
        c = Math.floor(Math.random() * cols);
        attempts++;
      } while ((!this.isSafeSpawn(r, c, grid) || grid[r][c].type === 'cardboardbox' || grid[r][c].type === 'woodbox') && attempts < 100);

      if (this.isSafeSpawn(r, c, grid) && grid[r][c].type !== 'cardboardbox' && grid[r][c].type !== 'woodbox')
      {
        const originalTile = grid[r][c];

        // Generación estilo "Limones" para Cajas (Cartón y Madera)
        const numInstances = Math.floor(Math.random() * 3) + 1; // 1 a 3 cajas iniciales
        const instances = [];
        for (let k = 0; k < numInstances; k++)
        {
          instances.push({
            localX: Math.floor(Math.random() * 40) + 12,
            localY: Math.floor(Math.random() * 40) + 12,
            rotation: 0 // Las cajas no deben rotar para mantener la perspectiva
          });
        }

        const tilesSet = type === 'cardboard' ? this.CARDBOARDBOX_TILES : this.WOODBOX_TILES;
        const boxTiles = Object.values(tilesSet);
        const fileName = boxTiles[Math.floor(Math.random() * boxTiles.length)];
        const boxType = type === 'cardboard' ? 'cardboardbox' : 'woodbox';

        grid[r][c] = {
          fileName: fileName,
          type: boxType,
          walkable: true,
          color: null,
          underlyingTile: originalTile,
          instances: instances,
          quantity: numInstances
        };
      }
    }
  }

  public autoPickupSystem(player: Player, grid: GameTile[][], tileSize: number): string | null
  {
    // 1. Guardia de Seguridad: Si el jugador ya carga algo, el sistema de recogida se apaga.
    if (player.isCarrying) return null;

    // --- LÓGICA DE DETECCIÓN MEJORADA ---
    const isCollectable = (tile: GameTile | null | undefined): boolean =>
    {
      return !!tile && ['cardboardbox', 'woodbox', 'pitcher', 'lemon'].includes(tile.type);
    };

    const getTileInFront = (): { r: number, c: number } =>
    {
      const playerCenterX = player.x + player.spriteWidth / 2;
      const playerFeetY = player.y + player.spriteHeight - 1;
      let targetR = Math.floor(playerFeetY / tileSize);
      let targetC = Math.floor(playerCenterX / tileSize);
      switch (player.direction)
      {
        case 0: targetR--; break; // Arriba
        case 1: targetC--; break; // Izquierda
        case 2: targetR++; break; // Abajo
        case 3: targetC++; break; // Derecha
      }
      return { r: targetR, c: targetC };
    };

    const getTileUnderFeet = (): { r: number, c: number } =>
    {
      const playerCenterX = player.x + player.spriteWidth / 2;
      const playerFeetY = player.y + player.spriteHeight - 1;
      return {
        r: Math.floor(playerFeetY / tileSize),
        c: Math.floor(playerCenterX / tileSize)
      };
    };

    const getTileSafe = (r: number, c: number): GameTile | null =>
    {
      if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length)
      {
        return grid[r][c];
      }
      return null;
    };

    // 1. Prioridad: Buscar objeto EN FRENTE
    let targetCoords = getTileInFront();
    let targetTile = getTileSafe(targetCoords.r, targetCoords.c);

    // 2. Fallback: Si no hay nada enfrente, buscar BAJO LOS PIES
    if (!isCollectable(targetTile))
    {
      targetCoords = getTileUnderFeet();
      targetTile = getTileSafe(targetCoords.r, targetCoords.c);
    }

    // 3. Si no se encontró un objeto recolectable, salir.
    if (!isCollectable(targetTile))
    {
      return null;
    }

    // Sistema Anti-Rebote (Exclusión por Coordenadas)
    // Si estamos a punto de recoger un objeto del tile donde acabamos de soltar algo,
    // lo ignoramos por un frame para evitar el re-pickup instantáneo.
    if (this.lastDroppedTile)
    {
      if (this.lastDroppedTile.r === targetCoords.r && this.lastDroppedTile.c === targetCoords.c)
      {
        this.lastDroppedTile = null; // Consumir el cooldown
        return null;
      }
      // Si el jugador se movió e intenta recoger OTRO objeto, el cooldown ya no es necesario.
      this.lastDroppedTile = null;
    }

    const { r, c } = targetCoords;
    const tile = targetTile!;

    if (tile.type === 'cardboardbox' || tile.type === 'woodbox')
    {
      if (tile.type === 'cardboardbox') player.isCarryingCardBoardBox = true;
      if (tile.type === 'woodbox') player.isCarryingWoodBox = true;

      // Lógica de instancias (pop)
      if (tile.instances && tile.instances.length > 0)
      {
        tile.instances.pop();
      }
      tile.quantity = (tile.quantity || 1) - 1;

      if (tile.quantity < 1)
      {
        this.restoreTile(r, c, grid, tile);
      }
      this.lastActionTimestamp = performance.now();
      return tile.type;
    }
    else if (tile.type === 'pitcher')
    {
      // Recoger olleta automáticamente
      player.isCarryingMetalPitcherEmpty = true;

      // Restaurar el suelo debajo (Fix Tile Corrupto)
      this.restoreTile(r, c, grid, tile);
      this.lastActionTimestamp = performance.now();
      return tile.type;
    }
    // Interacción con Limones
    else if (tile.type === 'lemon')
    {
      // 1. Cambiar estado del jugador y notificar
      player.isCarryingSmallGreen = true;
      //console.log('Limones que lleva el usuario: 1');

      // 2. Modificar el tile (instancias y cantidad)
      if (tile.instances && tile.instances.length > 0)
      {
        tile.instances.pop(); // Eliminar una instancia visual
      }

      tile.quantity = (tile.quantity || 1) - 1;
      //console.log(`Quedan ${tile.quantity} limones en el suelo.`);

      // 3. Si ya no quedan limones, limpiar el tile
      if (tile.quantity < 1)
      {
        this.restoreTile(r, c, grid, tile);
      }

      this.lastActionTimestamp = performance.now();
      return tile.type;
    }
    return null;
  }

  public tryDropBox(player: Player, grid: GameTile[][], tileSize: number): boolean
  {
    if (!player.isCarrying) return false;

    const feetX = player.x + player.spriteWidth / 2;
    const feetY = player.y + player.spriteHeight - 10;
    const playerC = Math.floor(feetX / tileSize);
    const playerR = Math.floor(feetY / tileSize);

    let targetR = playerR;
    let targetC = playerC;

    switch (player.direction)
    {
      case 0: targetR--; break; // Arriba
      case 1: targetC--; break; // Izquierda
      case 2: targetR++; break; // Abajo
      case 3: targetC++; break; // Derecha
    }

    if (targetR < 0 || targetR >= grid.length || targetC < 0 || targetC >= grid[0].length) return false;

    // PASO 1 (Prioridad Máxima): Si player.isCarryingMetalPitcherFull
    if (player.isCarryingMetalPitcherFull)
    {
      if (this.placePuddle(targetR, targetC, grid))
      {
        player.isCarryingMetalPitcherFull = false;
        player.isCarryingMetalPitcherEmpty = true;
        this.lastActionTimestamp = performance.now();
        return true; // IMPORTANTE: No sueltes el objeto.
      }
      return false;
    }

    // PASO 2: Si player.isCarryingMetalPitcherEmpty
    if (player.isCarryingMetalPitcherEmpty)
    {
      if (this.placePitcher(targetR, targetC, grid))
      {
        player.isCarryingMetalPitcherEmpty = false;
        this.lastDroppedTile = { r: targetR, c: targetC };
        this.lastActionTimestamp = performance.now();
        return true;
      }
      return false;
    }

    // PASO 3: Cajas de Cartón (Nuevo sistema)
    if (player.isCarryingCardBoardBox)
    {
      if (this.placeCardboardBox(targetR, targetC, grid))
      {
        player.isCarryingCardBoardBox = false;
        this.lastDroppedTile = { r: targetR, c: targetC };
        this.lastActionTimestamp = performance.now();
        return true;
      }
      return false;
    }

    // PASO 4: Cajas de Madera (Nuevo sistema)
    if (player.isCarryingWoodBox)
    {
      if (this.placeWoodBox(targetR, targetC, grid))
      {
        player.isCarryingWoodBox = false;
        this.lastDroppedTile = { r: targetR, c: targetC };
        this.lastActionTimestamp = performance.now();
        return true;
      }
      return false;
    }

    // Lógica adicional para limones (si aplica)
    if (player.isCarryingSmallGreen)
    {
      if (this.placeLemon(targetR, targetC, grid))
      {
        player.isCarryingSmallGreen = false;
        this.lastDroppedTile = { r: targetR, c: targetC };
        this.lastActionTimestamp = performance.now();
        return true;
      }
    }

    return false;
  }

  public tryPourWater(player: Player, grid: GameTile[][], tileSize: number): boolean
  {
    if (!player.isCarryingMetalPitcherFull) return false;

    const feetX = player.x + player.spriteWidth / 2;
    const feetY = player.y + player.spriteHeight - 10;
    let c = Math.floor(feetX / tileSize);
    let r = Math.floor(feetY / tileSize);

    // Colocar enfrente
    switch (player.direction)
    {
      case 0: r--; break; // Arriba
      case 1: c--; break; // Izquierda
      case 2: r++; break; // Abajo
      case 3: c++; break; // Derecha
    }

    if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length)
    {
      return this.placePuddle(r, c, grid);
    }
    return false;
  }

  private placePuddle(r: number, c: number, grid: GameTile[][]): boolean
  {
    const tile = grid[r][c];
    if (!tile) return false;

    const puddleLevels = Object.values(this.PUDDLE_TILES);

    // Lógica: Si ya hay un charco, lo hacemos más grande (upgrade)
    if (tile.type === 'puddle')
    {
      const currentLevelIndex = puddleLevels.indexOf(tile.fileName);
      if (currentLevelIndex !== -1 && currentLevelIndex < puddleLevels.length - 1)
      {
        grid[r][c] = { ...tile, fileName: puddleLevels[currentLevelIndex + 1] };
        return true;
      }
      return false; // Ya está al máximo
    }

    // Lógica: Crear nuevo charco (Solo en suelo caminable, no sobre agua ni obstáculos)
    if (!tile.walkable) return false;
    if (tile.type === 'water' || tile.fileName.includes('water')) return false;
    if (tile.type === 'wall' || tile.type === 'door' || tile.type === 'window') return false;

    grid[r][c] = { fileName: this.PUDDLE_TILES.TYPE_01, type: 'puddle', walkable: true, color: null, underlyingTile: { ...tile } };
    return true;
  }

  private placePitcher(r: number, c: number, grid: GameTile[][]): boolean
  {
    const tile = grid[r][c];
    if (!tile) return false;
    if (!tile.walkable) return false;
    if (tile.type === 'water' || tile.fileName.includes('water')) return false;
    if (tile.type === 'pitcher' || tile.type === 'cardboardbox' || tile.type === 'woodbox' || tile.type === 'lemon') return false;

    grid[r][c] = {
      fileName: '../img/metal_pitcher.png',
      type: 'pitcher',
      walkable: true,
      color: null,
      underlyingTile: { ...tile }
    };
    return true;
  }

  private placeLemon(r: number, c: number, grid: GameTile[][]): boolean
  {
    //console.log(`[BoxManager] Intentando colocar limón en TILE [${r}, ${c}]`);

    // Validación de límites del mapa para evitar errores de ejecución
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length)
    {
      //console.warn(`[BoxManager] Coordenadas fuera de rango: [${r}, ${c}]`);
      return false;
    }

    const tile = grid[r][c];

    // 2. Validar si el terreno es apto (Caminable o ya es un limón)
    if (!tile || (!tile.walkable && tile.type !== 'lemon'))
    {
      //console.warn(`[BoxManager] Terreno bloqueado o inválido en [${r}, ${c}]. Tipo: ${tile?.type}`);
      return false;
    }

    // 3. Posición aleatoria dentro del tile (Margen de seguridad para no salir del tile)
    const finalX = Math.floor(Math.random() * 40) + 12;
    const finalY = Math.floor(Math.random() * 40) + 12;

    // 4. Lógica de apilamiento (Stacking)
    if (tile.type === 'lemon')
    {
      // Si el array de instancias no existe, lo creamos.
      if (!tile.instances)
      {
        // Si no hay 'instances', pero es un limón, significa que es el primero.
        // Debemos crear la primera instancia a partir de una posición aleatoria.
        tile.instances = [{
          localX: Math.floor(Math.random() * 40) + 12, // Posición para el limón original
          localY: Math.floor(Math.random() * 40) + 12,
          rotation: Math.random() * 360
        }];
      }

      // Añadimos la nueva instancia.
      tile.instances.push({
        localX: finalX,
        localY: finalY,
        rotation: Math.random() * 360
      });

      // Incrementamos la cantidad.
      tile.quantity = (tile.quantity || 1) + 1;
      //console.log(`[BoxManager] Limón apilado en [${r}, ${c}]. Nueva cantidad: ${tile.quantity}`);
      return true;
    }

    // 5. Creación de nuevo contenedor de limones si el tile no era un limón
    grid[r][c] = {
      fileName: 'lemon.png',
      type: 'lemon',
      walkable: true,
      // La primera vez, creamos el array con una sola instancia.
      instances: [{ localX: finalX, localY: finalY, rotation: Math.random() * 360 }],
      underlyingTile: { ...tile }, // Guardamos lo que había debajo
      quantity: 1
    };
    //console.log(`[BoxManager] Nuevo limón creado en [${r}, ${c}].`);

    return true;
  }

  private placeCardboardBox(r: number, c: number, grid: GameTile[][]): boolean
  {
    // Validación de límites
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return false;

    const tile = grid[r][c];
    // Validar terreno (Caminable o ya es una caja de cartón)
    if (!tile || (!tile.walkable && tile.type !== 'cardboardbox')) return false;

    // Posición aleatoria dentro del tile
    const finalX = Math.floor(Math.random() * 40) + 12;
    const finalY = Math.floor(Math.random() * 40) + 12;

    // Apilamiento
    if (tile.type === 'cardboardbox')
    {
      if (!tile.instances)
      {
        tile.instances = [{
          localX: Math.floor(Math.random() * 40) + 12,
          localY: Math.floor(Math.random() * 40) + 12,
          rotation: 0
        }];
      }
      tile.instances.push({
        localX: finalX,
        localY: finalY,
        rotation: 0
      });
      tile.quantity = (tile.quantity || 1) + 1;
      return true;
    }

    // Crear nueva pila de cajas
    const boxTiles = Object.values(this.CARDBOARDBOX_TILES);
    const fileName = boxTiles[Math.floor(Math.random() * boxTiles.length)];

    grid[r][c] = {
      fileName: fileName,
      type: 'cardboardbox',
      walkable: true,
      instances: [{ localX: finalX, localY: finalY, rotation: 0 }],
      underlyingTile: { ...tile },
      quantity: 1
    };

    return true;
  }






  private canPlaceNewLemon(r: number, c: number, grid: GameTile[][]): boolean
  {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return false;
    const tile = grid[r][c];
    if (!tile) return false;

    // Si ya es limón, retornamos false para que el buscador siga buscando un hueco vacío
    if (tile.type === 'lemon') return false;

    const isBox = tile.type === 'cardboardbox' || tile.type === 'woodbox';

    // No colocar sobre obstáculos (excepto cajas)
    if (!tile.walkable && !isBox) return false;

    // No colocar sobre árbol, etc.
    if (tile.type === 'tree' || tile.type === 'tree_large') return false;

    return true;
  }

  private createNewLemon(r: number, c: number, grid: GameTile[][]): boolean
  {
    const tile = grid[r][c];
    grid[r][c] = {
      fileName: 'lemon.png',
      type: 'lemon',
      walkable: true,
      color: null,
      underlyingTile: { ...tile },
      quantity: 1
    };
    return true;
  }

  // Garantía de Integridad de Tile
  private restoreTile(r: number, c: number, grid: GameTile[][], originalTile: GameTile)
  {
    const fallback = {
      fileName: 'grass_green_type01.png',
      type: 'floor',
      walkable: true,
      color: null
    };

    grid[r][c] = originalTile.underlyingTile
      ? { ...originalTile.underlyingTile }
      : { ...fallback };
  }

  private isSafeSpawn(r: number, c: number, grid: GameTile[][]): boolean
  {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return false;
    const tile = grid[r][c];
    if (!tile || !tile.walkable) return false;
    if (tile.type === 'tree' || tile.type === 'tree_large') return false;
    const name = tile.fileName.toLowerCase();
    return !name.includes('wall') && !name.includes('window') && !name.includes('water') && !name.includes('cascade');
  }

  public spawnReward(centerR: number, centerC: number, reward: QuestReward, grid: GameTile[][])
  {
    //console.log(`🎁 Spawning reward: ${reward.amount} x ${reward.itemType} near [${centerR}, ${centerC}]`);
    let remaining = reward.amount;
    let radius = 1;
    const maxRadius = 3; // Radio máximo de búsqueda para no tirar cosas muy lejos

    // Intentar colocar en espiral alrededor del NPC
    while (remaining > 0 && radius <= maxRadius)
    {
      const coords = [];
      // Generar perímetro del cuadrado
      for (let i = -radius; i <= radius; i++)
      {
        coords.push({ r: centerR - radius, c: centerC + i });
        coords.push({ r: centerR + radius, c: centerC + i });
        coords.push({ r: centerR + i, c: centerC - radius });
        coords.push({ r: centerR + i, c: centerC + radius });
      }
      // Mezclar posiciones para que el drop se vea natural y no en línea perfecta
      coords.sort(() => Math.random() - 0.5);

      for (const pos of coords)
      {
        if (remaining <= 0) break;
        if (this.tryPlaceRewardItem(pos.r, pos.c, reward.itemType, grid))
        {
          remaining--;
        }
      }
      radius++;
    }
  }

  private tryPlaceRewardItem(r: number, c: number, itemType: string, grid: GameTile[][]): boolean
  {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return false;
    const tile = grid[r][c];
    if (!tile) return false;

    // 1. Caso Limón (Permite stacking sobre otros limones)
    if (itemType === 'lemon') return this.placeLemon(r, c, grid);

    // 2. Para otros objetos, necesitamos suelo vacío y caminable
    if (!tile.walkable) return false;
    if (['cardboardbox', 'woodbox', 'pitcher', 'puddle', 'wall', 'door', 'window', 'tree', 'tree_large'].includes(tile.type)) return false;
    if (tile.fileName.includes('water') || tile.fileName.includes('cascade')) return false;

    if (itemType === 'pitcher_empty') return this.placePitcher(r, c, grid);
    if (itemType === 'cardboardbox') return this.placeCardboardBox(r, c, grid); // Usar nuevo sistema
    if (itemType === 'woodbox') return this.placeWoodBox(r, c, grid);

    return false;
  }

  private placeWoodBox(r: number, c: number, grid: GameTile[][]): boolean
  {
    // Validación de límites
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return false;

    const tile = grid[r][c];
    // Validar terreno (Caminable o ya es una caja de madera)
    if (!tile || (!tile.walkable && tile.type !== 'woodbox')) return false;

    // Posición aleatoria dentro del tile
    const finalX = Math.floor(Math.random() * 40) + 12;
    const finalY = Math.floor(Math.random() * 40) + 12;

    // Apilamiento
    if (tile.type === 'woodbox')
    {
      if (!tile.instances) tile.instances = [];
      tile.instances.push({ localX: finalX, localY: finalY, rotation: 0 });
      tile.quantity = (tile.quantity || 1) + 1;
      return true;
    }

    // Crear nueva pila de cajas
    const boxTiles = Object.values(this.WOODBOX_TILES);
    const fileName = boxTiles[Math.floor(Math.random() * boxTiles.length)];

    grid[r][c] = {
      fileName: fileName, type: 'woodbox', walkable: true,
      instances: [{ localX: finalX, localY: finalY, rotation: 0 }],
      underlyingTile: { ...tile }, quantity: 1
    };
    return true;
  }
}
