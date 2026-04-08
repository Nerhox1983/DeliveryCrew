import { Animal } from './animal';
import { GameTile } from '../../shared/models/tile.model';
import { GameConstants } from '../../shared/config/GameConstants';

export class Rabbit extends Animal
{
    public isMale: boolean;

    constructor(image: HTMLImageElement, r: number, c: number)
    {
        // Corregido: El constructor de Animal solo acepta 3 argumentos
        super(image, r, c);

        // Propiedades específicas del conejo
        this.isMale = Math.random() < 0.5;
        this.speed = 3.5; // Velocidad ajustada para el sistema de Animal (pixels/frame aprox)
    }

    /**
     * Lógica de actualización específica para el conejo.
     * @param dt Delta time - tiempo transcurrido desde el último frame en segundos.
     * @param tileGrid La grilla de tiles del mapa para verificar colisiones.
     * @param buildingGrid La grilla de edificios para evitar obstáculos.
     */
    public update(dt: number, tileGrid: GameTile[][], buildingGrid: number[][]): void
    {
        // Usamos la lógica de deambular base de Animal para evitar errores de implementación manual
        this.handleWandering(tileGrid, buildingGrid);
    }

    // Implementación obligatoria del método abstracto draw
    draw(ctx: CanvasRenderingContext2D)
    {
        const spriteW = this.spriteSheet.naturalWidth / 3;
        const spriteH = this.spriteSheet.naturalHeight / 4;

        const rowIdx = this.getSpriteRow();
        const scale = 0.6; // Escala para que se vea pequeño
        const drawW = spriteW * scale;
        const drawH = spriteH * scale;

        const offsetX = (GameConstants.TILE_SIZE - drawW) / 2;
        const offsetY = (GameConstants.TILE_SIZE - drawH) / 2;

        ctx.drawImage(
            this.spriteSheet,
            this.animationFrame * spriteW,
            rowIdx * spriteH,
            spriteW,
            spriteH,
            this.x + offsetX,
            this.y + offsetY,
            drawW,
            drawH
        );

        // Dibujar indicador de hambre si es necesario
        this.drawHungerIndicator(ctx);
    }

    // Sobrescribimos para animación rápida
    protected override updateAnimation(): void
    {
        super.updateAnimation(true);
    }

    // Sobrescribimos para que cambien de dirección/esperen menos tiempo
    protected override setNewWait(): void
    {
        this.waitTimer = 0;
        this.waitDuration = Math.floor(Math.random() * 40) + 20;
    }
}