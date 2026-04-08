import { Tile } from '../models/tile.model';
import tileManifest from '../../../assets/tile-manifest.json';

export const TILE_DEFINITIONS: Tile[] = [
  ...(tileManifest as Tile[]),
  // Nuevo ítem: Metal Pitcher (Olleta)
  { fileName: '../img/metal_pitcher.png', type: 'pitcher', walkable: true, color: null },
  // === CORRECCIONES INTERIOR MANAGER ===    
  { fileName: 'stove.png', type: 'stove', walkable: false, color: null }, // Asegurado minúsculas
  { fileName: 'bed.png', type: 'bed', walkable: false, color: null },
  { fileName: '../architecture/stairs_horizontal_type01.png', type: 'stair_up_trigger', walkable: true, color: null },
  { fileName: '../architecture/stairs_landing_horizontal_type01.png', type: 'stair_down_trigger', walkable: true, color: null },
  { fileName: 'wall_lightGray.png', type: 'wall', walkable: false, color: null },
  { fileName: 'floor_type01.png', type: 'floor', walkable: true, color: null },
  // Nuevos tiles de Árboles (Vegetación)
  { fileName: 'tree_green_fruit_green_type01.png', type: 'tree', walkable: true, color: null },
  { fileName: 'tree_green_fruit_yellow_type01.png', type: 'tree', walkable: true, color: null },
  { fileName: 'tree_green_fruit_green_type02.png', type: 'tree_large', walkable: true, color: null },
  { fileName: 'tree_green_fruit_yellow_type02.png', type: 'tree_large', walkable: true, color: null },
  // Nuevos tiles de Puddle (Charcos)
  { fileName: 'puddle_type01.png', type: 'puddle', walkable: true, color: null },
  { fileName: 'puddle_type02.png', type: 'puddle', walkable: true, color: null },
  { fileName: 'puddle_type03.png', type: 'puddle', walkable: true, color: null },
  { fileName: 'puddle_type04.png', type: 'puddle', walkable: true, color: null },
  { fileName: 'puddle_type05.png', type: 'puddle', walkable: true, color: null },
  // === FURNITURE (SOFAS) ===
  { fileName: '../furniture/couch_green_front_type01.png', type: 'couch_front', walkable: false, color: null },
  { fileName: '../furniture/couch_green_profile_type01.png', type: 'couch_profile', walkable: false, color: null },
  { fileName: '../furniture/couch_green_back_type01.png', type: 'couch_back', walkable: false, color: null }
];