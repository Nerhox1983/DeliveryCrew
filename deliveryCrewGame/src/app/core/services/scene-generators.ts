import { House } from '../../shared/models/house.model';
import { SceneState } from '../../shared/models/scene.model';
import { GameTile } from '../../shared/models/tile.model';
// Importa aquí tus modelos de Npc, GameObject, etc.

/**
 * Genera el SceneState para el interior de una casa específica.
 * Esta es una implementación de ejemplo. La lógica real sería más compleja.
 * @param house El objeto House para el cual se generará la escena.
 * @returns Un SceneState que representa el interior de la casa.
 */
export function createHouseScene(house: House): SceneState {
  // ID CONSISTENTE: Usamos house.data.id porque el modelo House envuelve los datos en 'data'.
  const sceneId = `house_${house.data.id}`;

  // Lógica de ejemplo para generar el interior:
  const interiorLayout = [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 2, 0, 0, 3, 0, 1], // 2: cama, 3: mesa
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
  ];

  // Convertimos la matriz numérica a GameTile[][]
  const interiorGrid: GameTile[][] = interiorLayout.map(row => 
    row.map(cellValue => {
      // Mapeo estricto a GameTile
      const isWall = cellValue === 1;
      return {
        fileName: isWall ? 'wall_indoor.png' : 'floor_wood.png',
        type: isWall ? 'wall' : 'floor',
        walkable: !isWall,
        // Nota: Los valores 2 y 3 se renderizan como suelo base; 
        // los objetos visuales deben ir en la capa de entities.
      };
    })
  );

  const newScene: SceneState = {
    id: sceneId,
    grid: interiorGrid,
    playerPosition: { x: 3, y: 3 }, // Posición por defecto al entrar
    entities: {
      player: null, // El player se mueve a la escena, no pertenece a ella.
      npcs: [],
      objects: [],
      // ... otras entidades
    },
    // ... otras propiedades del estado de la escena
  };

  // Ejemplo: Añadir un NPC si es la casa con id 1
  if (house.data.id === 1) {
    // const owner = new Npc({ ... }); // Crearías una instancia de tu modelo Npc
    // newScene.entities.npcs.push(owner);
  }

  return newScene;
}