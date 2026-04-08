const fs = require('fs');
const path = require('path');

// Rutas a los directorios y archivos necesarios
const tilesDirectory = path.join(__dirname, '../src/assets/tiles');
const manifestPath = path.join(__dirname, '../src/assets/tile-manifest.json');
const knownColors = ['red', 'orange', 'yellow', 'green', 'violet','brown', 'gray', 'white', 'blue']; // Colores en inglés

try {
  // Leemos todos los archivos del directorio de tiles
  const files = fs.readdirSync(tilesDirectory);

  // Filtramos para quedarnos solo con los archivos de imagen
  const imageFiles = files.filter(file => file.endsWith('.png') || file.endsWith('.jpg'));

  const tileManifest = imageFiles.map(fileName => {
    const parts = fileName.replace(/\.(png|jpg)$/, '').split('_');
    let type = (parts[0] || 'generic').toLowerCase(); // Default to first part
    let color = null;

    // Determine functional type with priority
    if (parts.includes('door') || parts.includes('archdoor')) {
      type = 'door';
    } else if (parts.includes('window')) {
      type = 'window';
    } else if (type === 'sidewalk') { // Normalize 'Sidewalk'
      type = 'sidewalk';
    }

    // Determine color: it's the first known color in the name.
    // This correctly assigns the wall color to components like 'wall_red_door...'.
    color = parts.find(p => knownColors.includes(p)) || null;

    // Definimos si un tile es transitable por defecto. ¡Puedes personalizar esto!
    const walkable = !['wall', 'water', 'roof', 'crackedfacade', 'shatteredfacade'].includes(type);

    return { fileName, type, walkable, color };
  });

  fs.writeFileSync(manifestPath, JSON.stringify(tileManifest, null, 2));

  console.log(`✅ Manifiesto de tiles con metadatos generado correctamente en: ${manifestPath}`);
} catch (error) {
  console.error('❌ Error al generar el manifiesto de tiles:', error);
  process.exit(1);
}