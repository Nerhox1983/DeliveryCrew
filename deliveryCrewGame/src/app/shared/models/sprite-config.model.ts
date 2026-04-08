/**
 * Define la configuración de renderizado para un único sprite de animal,
 * tal como lo genera el script de auditoría.
 */
export interface SpriteConfig
{
    width: number;
    height: number;
    scale: number;
    offset: {
        x: number;
        y: number;
    };
}

/**
 * Representa el objeto completo del archivo animal-assets.json.
 */
export interface SpriteAnimalConfig
{
    [key: string]: SpriteConfig;
}