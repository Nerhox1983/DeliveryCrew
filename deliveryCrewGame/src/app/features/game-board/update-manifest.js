const fs = require('fs');
const path = require('path');

// Este script genera el archivo tile-manifest.json escaneando la carpeta de assets.
// Ejecútalo con: node update-manifest.js

const TILES_DIR = path.join(__dirname, 'src/assets/tiles');
const MANIFEST_FILE = path.join(__dirname, 'src/assets/tile-manifest.json');

//console.log(`🔍 Escaneando directorio: ${TILES_DIR}`);

try {
  if (!fs.existsSync(TILES_DIR)) {
    console.error(`❌ Error: No se encuentra el directorio ${TILES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(TILES_DIR);
  const tiles = files
    .filter(file => file.toLowerCase().endsWith('.png'))
    .map(file => {
      const parts = file.split('_');
      const type = parts[0].toLowerCase(); // wall, dirtpath, grass, etc.
      
      // Determinar si es caminable
      // Asumimos que walls, windows, borders (puertas base), roofs no son caminables
      const notWalkableTypes = ['wall', 'window', 'border', 'roof', 'toparch', 'cardboardbox'];
      const walkable = !notWalkableTypes.includes(type);

      // Extraer color (segunda parte del nombre, si no es una palabra reservada de posición)
      let color = null;
      if (parts.length > 1) {
        const p1 = parts[1].toLowerCase();
        if (!['top', 'bottom', 'left', 'right', 'center', 'corner', 'type01', 'type02'].includes(p1)) {
          color = p1;
        }
      }

      return { fileName: file, type, walkable, color };
    });

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(tiles, null, 2));
  console.log(`✅ Manifest actualizado con éxito! ${tiles.length} tiles indexados en ${MANIFEST_FILE}`);
} catch (err) {
  console.error('❌ Error al generar el manifest:', err);
}