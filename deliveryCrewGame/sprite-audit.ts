import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Configuración de Referencia
const REFERENCE_HEIGHT = 47; // Altura del NPC adulto (filas)
const OUTPUT_FILE = path.join(process.cwd(), 'src/assets/config/animal-assets.json');

// Función para detectar el Bounding Box (Caja delimitadora real)
async function detectBoundingBox(imagePath: string): Promise<{ width: number; height: number; offsetX: number; offsetY: number }>
{
    const data = await readFile(imagePath);
    const png = PNG.sync.read(data);
    const { width, height } = png;

    let minX = width, minY = height, maxX = 0, maxY = 0;
    let foundPixel = false;

    for (let y = 0; y < height; y++)
    {
        for (let x = 0; x < width; x++)
        {
            const idx = (width * y + x) << 2;
            const alpha = png.data[idx + 3];

            if (alpha > 0)
            {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
                foundPixel = true;
            }
        }
    }

    if (!foundPixel)
    {
        return { width: 0, height: 0, offsetX: 0, offsetY: 0 };
    }

    return {
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        offsetX: minX,
        offsetY: minY
    };
}

// Lógica de escalado Senior por categoría
function getScaleMultiplier(fileName: string): number
{
    const name = fileName.toLowerCase();

    if (name.includes('pig') || name.includes('sheep')) 
    {
        return 0.6; // 60% de la altura del humano
    }
    if (name.includes('perro') || name.includes('dog')) 
    {
        return 0.45; // 45% de la altura del humano
    }
    if (name.includes('gato') || name.includes('cat')) 
    {
        return 0.35; // 35% de la altura del humano
    }
    if (name.includes('lombriz') || name.includes('pollito') || name.includes('mouse') || name.includes('duckling') || name.includes('frog')) 
    {
        return 0.15; // 15% de la altura del humano
    }

    return 0.3; // Aves adultas, conejos, etc.
}

// Función principal de análisis
async function analyzeSprites(directory: string)
{
    try
    {
        if (!fs.existsSync(directory))
        {
            console.error(`El directorio no existe: ${directory}`);
            return;
        }

        const files = await readdir(directory);
        const imageFiles = files.filter(file =>
            file.toLowerCase().endsWith('.png') &&
            //!/^(man|woman|grandpa|grandma)/i.test(file)
            !/^(man|woman|grandpa|grandma|gal\d+)/i.test(file)
        );

        console.log(`Analizando ${imageFiles.length} sprites en: ${directory}\n`);

        const configOutput: Record<string, any> = {};
        const tableResults = [];

        for (const file of imageFiles)
        {
            const imagePath = path.join(directory, file);

            try
            {
                const { width, height, offsetX, offsetY } = await detectBoundingBox(imagePath);

                if (width === 0)
                {
                    continue;
                }

                // Aplicar multiplicador de escala según tipo de animal
                const multiplier = getScaleMultiplier(file);
                const targetHeight = REFERENCE_HEIGHT * multiplier;

                // Calculamos el valor decimal y el porcentaje para la tabla
                const scaleValue = parseFloat((targetHeight / height).toFixed(2));
                const finalScale = scaleValue > 1 ? 1 : scaleValue; // Evitar estirar si el asset es muy pequeño

                // Guardamos la configuración para el JSON
                configOutput[file] = {
                    width,
                    height,
                    scale: finalScale,
                    offset: {
                        x: -offsetX,
                        y: 64 - (height + offsetY)
                    }
                };

                tableResults.push({
                    "Archivo": file,
                    "Tamaño Real": `${width}x${height}`,
                    "Escala": (finalScale * 100).toFixed(0) + '%',
                    "Offset X": configOutput[file].offset.x,
                    "Offset Y": configOutput[file].offset.y
                });
            }
            catch (fileError)
            {
                console.error(`[ERROR] Falló el archivo ${file}. Revisa si es un PNG válido.`);
            }
        }

        // Mostrar resultados en consola
        console.table(tableResults);

        // Exportar JSON para Angular
        const configDir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(configDir))
        {
            fs.mkdirSync(configDir, { recursive: true });
        }

        await writeFile(OUTPUT_FILE, JSON.stringify(configOutput, null, 2));
        console.log(`\n✅ Configuración exportada a: ${OUTPUT_FILE}`);

    }
    catch (err)
    {
        console.error("Error general al analizar sprites:", err);
    }
}

// Ejecutar
const spritesDirectory = path.join(process.cwd(), 'src', 'assets', 'npc');
analyzeSprites(spritesDirectory);