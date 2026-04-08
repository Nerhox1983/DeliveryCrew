import { Injectable } from '@angular/core';
import { House } from '../../shared/models/house.model';
import { SceneState } from '../../shared/models/scene.model';
import { MapAnalyzerService } from '../../services/map-analyzer.service';
import { SceneService } from './scene.service';
import { createHouseScene } from './scene-generators'; // Asegura ruta relativa correcta
import { Pederestian } from '../../entities/npc/pederestian';
import { AssetManager } from './asset-manager.service';
import { NpcNameGeneratorService } from './npc-name-generator.service';

@Injectable({
  providedIn: 'root'
})
export class SceneInitializationService
{
  // BANDERA DE PRUEBA: Desactivada. El problema de renderizado se ha corregido en 'renderer.ts'.
  private readonly DEBUG_SPAWN_NPCS_NEAR_PLAYER = false;

  constructor(
    private mapAnalyzer: MapAnalyzerService,
    private sceneService: SceneService,
    private assetManager: AssetManager,
    private npcNameGen: NpcNameGeneratorService
  ) { }

  /**
   * Analiza el mapa, extrae todas las casas y precarga sus escenas interiores en el caché.
   * Este método debe ser llamado una sola vez al iniciar el juego.
   * @param buildingGrid La matriz numérica que representa los edificios en el mapa del mundo.
   * @param tileSize El tamaño de los tiles para el cálculo de píxeles.
   */
  public preloadHouseScenes(buildingGrid: number[][], tileSize: number): void
  {
    //console.log('Iniciando precarga de escenas de interiores...');

    const houses: House[] = this.mapAnalyzer.extractHousesFromGrid(buildingGrid, tileSize);

    for (const house of houses)
    {
      // IMPORTANTE: Usamos house.data.id para construir la clave única
      const houseSceneId = `house_${house.data.id}`;

      if (this.sceneService.getStoredScene(houseSceneId)) continue;

      const interiorScene: SceneState = createHouseScene(house);

      // Verificación de seguridad: El ID interno de la escena debe coincidir con la clave del caché
      if (interiorScene.id !== houseSceneId)
      {
        //console.warn(`Corrección de ID: ${interiorScene.id} -> ${houseSceneId}`);
        interiorScene.id = houseSceneId;
      }

      this.sceneService.saveSceneToCache(interiorScene);
      //console.log(`-> Escena '${interiorScene.id}' precargada y cacheada.`);
    }

    //console.log(`Precarga finalizada. ${houses.length} escenas de interiores listas.`);
  }

  /**
   * Crea la población inicial de NPCs para el mundo principal.
   * @returns Un array de instancias de Pederestian.
   */
  public createInitialPopulation(playerStartR?: number, playerStartC?: number): Pederestian[]
  {
    //console.log('%c[SceneInit] 🏁 Iniciando creación de población...', 'color: #00ffff; font-weight: bold;');
    const pederestrians: Pederestian[] = [];

    const npcsToCreate: {
      asset: HTMLImageElement;
      r: number;
      c: number;
      houseId: number;
      gender: 'male' | 'female';
      assetName: string;
    }[] = [
        { asset: this.assetManager.woman01_walking, r: 15, c: 20, houseId: 1, gender: 'female', assetName: 'woman01_walk.png' },
        { asset: this.assetManager.woman02_walking, r: 20, c: 25, houseId: 2, gender: 'female', assetName: 'woman02_walk.png' },
        { asset: this.assetManager.woman03_walking, r: 18, c: 33, houseId: 3, gender: 'female', assetName: 'woman03_walk.png' },
        { asset: this.assetManager.man04_walking, r: 22, c: 30, houseId: 4, gender: 'male', assetName: 'man04_walk.png' },
        { asset: this.assetManager.woman05_walking, r: 25, c: 15, houseId: 5, gender: 'female', assetName: 'woman05_walk.png' },
        { asset: this.assetManager.woman06_walking, r: 28, c: 18, houseId: 6, gender: 'female', assetName: 'woman06_walk.png' },
        { asset: this.assetManager.woman07_walking, r: 29, c: 10, houseId: 7, gender: 'female', assetName: 'woman07_walk.png' },
        { asset: this.assetManager.woman10_walking, r: 30, c: 35, houseId: 10, gender: 'female', assetName: 'woman10_walk.png' },
        { asset: this.assetManager.woman11_walking, r: 32, c: 38, houseId: 11, gender: 'female', assetName: 'woman11_walk.png' },
        { asset: this.assetManager.man01_walking, r: 16, c: 16, houseId: 12, gender: 'male', assetName: 'man01_walk.png' },
        { asset: this.assetManager.man02_walking, r: 33, c: 33, houseId: 13, gender: 'male', assetName: 'man02_walk.png' },
        { asset: this.assetManager.man03_walking, r: 35, c: 20, houseId: 14, gender: 'male', assetName: 'man03_walk.png' },
        { asset: this.assetManager.man08_walking, r: 19, c: 40, houseId: 8, gender: 'male', assetName: 'man08_walk.png' },
        { asset: this.assetManager.man09_walking, r: 40, c: 40, houseId: 9, gender: 'male', assetName: 'man09_walk.png' },
      ];

    if (this.DEBUG_SPAWN_NPCS_NEAR_PLAYER)
    {
      //console.warn('[PRUEBA] La bandera de depuración de NPCs está activa, pero la lógica ha sido removida para usar las coordenadas por defecto. El problema principal estaba en el Renderer.'); 
    }

    npcsToCreate.forEach((npcData) =>
    {
      this.createAndAddNpc(
        pederestrians, npcData.asset, npcData.r, npcData.c,
        npcData.houseId, npcData.gender, npcData.assetName
      );
    });

    console.log(`%c[SceneInit] ✅ Población finalizada. Total NPCs creados: ${pederestrians.length}`, 'color: #00ffff; font-weight: bold;');
    return pederestrians;
  }

  /**
   * Método ayudante para crear y añadir un NPC al array, con validación de assets.
   */
  private createAndAddNpc(
    pederestrians: Pederestian[],
    asset: HTMLImageElement,
    r: number,
    c: number,
    houseId: number,
    gender: 'male' | 'female',
    assetName: string // Para logs claros
  ): void
  {
    // CORRECCIÓN: No bloqueamos la creación si el ancho es 0.
    // Permitimos que el GameLoop intente dibujarla cuando la carga asíncrona termine.
    if (!asset)
    {
      console.error(`%c[SceneInit] ❌ ERROR CRÍTICO: El asset IMAGE para '${assetName}' es NULO/UNDEFINED.`, 'color: red; font-weight: bold;');
      return;
    }

    const loadedStatus = (asset.complete && asset.naturalWidth > 0) ? 'LISTO' : 'CARGANDO/PENDIENTE';
    if (asset.naturalWidth === 0)
    {
      console.warn(`%c[SceneInit] ⚠️ ADVERTENCIA: Asset '${assetName}' tiene ancho 0 (Estado: ${loadedStatus}). Se creará el NPC esperando carga tardía.`, 'color: orange;');
    }

    const npc = new Pederestian(asset, r, c);
    npc.name = this.npcNameGen.generarNombreNPC(gender);
    npc.assignedHouseId = houseId;
    pederestrians.push(npc);
    console.log(`[SceneInit] 👤 NPC Creado: ${assetName} (Casa ${houseId}) en [${r}, ${c}] - Asset: ${loadedStatus}`);
  }
}