import { AssetManager } from '../services/asset-manager.service';
import { Player } from '../../entities/player';
import { Tile, GameTile } from '../../shared/models/tile.model';
import { Necesidades } from '../services/stats-manager.service';

interface Renderable
{
    y: number;
    draw: () => void;
}

export interface RenderableEntity
{
    x: number;
    y: number;
    spriteWidth?: number;
    spriteHeight?: number;
    draw: (ctx: CanvasRenderingContext2D) => void;
    showQuestIndicator?: boolean;
    questIndicatorColor?: string;
    questIndicatorText?: string;
}

export interface NPCData
{
    x: number;
    y: number;
    visible: boolean;
    direction: number;
    currentFrame: number;
    isCarrying: boolean;
}

export interface FloatingLootItem
{
    x: number;
    y: number;
    fileName: string;
    lifeTime: number; // Seconds
    startY: number;
}

export interface BreadCrumb
{
    x: number;
    y: number;
    radius: number;
    life: number;
}

export class Renderer
{
    private readonly TILE_SIZE = 64;

    constructor(
        private ctx: CanvasRenderingContext2D,
        private assetManager: AssetManager
    ) 
    {

    }

   public drawWorld(
        cameraX: number,
        cameraY: number,
        viewportWidth: number,
        viewportHeight: number,
        gridRows: number,
        gridCols: number,
        tileGrid: GameTile[][],
        player: Player,
        npcs: RenderableEntity[],
        animals: RenderableEntity[],
        fish: RenderableEntity[], // Inyectado correctamente
        floatingLoot: FloatingLootItem[],
        breadCrumbs: BreadCrumb[],
        overlayAlpha: number,
        gameTimeMinutes: number,
        waterFrame: number,
        waterfallFrame: number,
        necesidades: Necesidades,
        isSleeping: boolean,
        weatherType?: string,
        houseOwnerFaces?: Map<string, string>
    ): void {
        this.ctx.clearRect(0, 0, viewportWidth, viewportHeight);

        // 1. Dibujar Suelo
        this.drawTiles(cameraX, cameraY, viewportWidth, viewportHeight, gridRows, gridCols, tileGrid, waterFrame, waterfallFrame);

        // 2. Mezclar Entidades para profundidad (Y-Sorting)
        const allEntities: RenderableEntity[] = [
            player,
            ...npcs,
            ...animals,
            ...fish // <--- Ahora se leen los peces
        ].filter(e => {
            const w = e.spriteWidth || 64;
            const h = e.spriteHeight || 64;
            return (
                e.x + w >= cameraX &&
                e.x <= cameraX + viewportWidth &&
                e.y + h >= cameraY &&
                e.y <= cameraY + viewportHeight
            );
        });

        allEntities.sort((a, b) => a.y - b.y);

        // 3. Dibujar Entidades con el OFFSET de cámara
        allEntities.forEach(entity => {
            this.ctx.save();
            // Aplicamos la traslación aquí para que la entidad no tenga que conocer la cámara
            this.ctx.translate(-cameraX, -cameraY);
            entity.draw(this.ctx);
            this.ctx.restore();
        });

        // 4. Dibujar Breadcrumbs (Migajas)
        this.drawBreadCrumbs(breadCrumbs, cameraX, cameraY);

        // 5. Dibujar Floating Loot
        this.drawFloatingLoot(floatingLoot, cameraX, cameraY);

        // 5. Ciclo día noche y clima (usando overlayAlpha y weatherType)
        this.applyEffects(overlayAlpha, isSleeping, weatherType);
    }

    public drawInterior(
        canvasWidth: number, canvasHeight: number,
        interiorGrid: GameTile[][],
        player: Player,
        currentInteriorFloor: GameTile | null,
        isSitting?: boolean
    )
    {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        if (!interiorGrid || interiorGrid.length === 0) return;

        const totalWidth = interiorGrid[0].length * this.TILE_SIZE;
        const totalHeight = interiorGrid.length * this.TILE_SIZE;
        const offsetX = (canvasWidth - totalWidth) / 2;
        const offsetY = (canvasHeight - totalHeight) / 2;

        this.ctx.save();
        this.ctx.translate(offsetX, offsetY);

        // Calcular la posición del tile del jugador para la lógica de ordenamiento
        const playerR = Math.floor((player.y + player.spriteHeight / 2) / this.TILE_SIZE);
        const playerC = Math.floor((player.x + player.spriteWidth / 2) / this.TILE_SIZE);

        // Detectar si el jugador está sobre una silla para usar el sprite correcto
        const playerTile = interiorGrid[playerR] ? interiorGrid[playerR][playerC] : null;
        const isChair = playerTile ? playerTile.type?.startsWith('chair') : false;

        const renderList: Renderable[] = [];

        for (let r = 0; r < interiorGrid.length; r++)
        {
            for (let c = 0; c < interiorGrid[r].length; c++)
            {
                const tile = interiorGrid[r][c];
                if (!tile) continue;

                const x = c * this.TILE_SIZE;
                const y = r * this.TILE_SIZE;

                const floorToDraw = tile.underlyingTile || currentInteriorFloor;
                if (floorToDraw)
                {
                    const floorImg = this.assetManager.tileImages[floorToDraw.fileName];
                    if (this.isAssetReady(floorImg))
                    {
                        this.ctx.drawImage(floorImg, x, y, this.TILE_SIZE, this.TILE_SIZE);
                    }
                }

                // Ignoramos 'stair_part' para que no dibuje el suelo encima de la escalera extendida
                if (tile.type !== 'floor' && tile.type !== 'stair_part')
                {
                    const img = this.assetManager.tileImages[tile.fileName];
                    if (this.isAssetReady(img))
                    {
                        let sortY = (r + 1) * this.TILE_SIZE;

                        // Ajuste de Profundidad (Z-Sorting):
                        // Subimos el punto de ordenamiento para muebles con hitbox ajustado (walkable=true)
                        if (tile.type === 'countertop' || tile.type.startsWith('counter_') || tile.type?.startsWith('couch'))
                        {
                            sortY -= 24;
                        }

                        // CORRECCIÓN PARA SOFÁ DE ESPALDAS:
                        // Si el jugador está sentado en un sofá que mira al norte (de espaldas),
                        // debemos forzar que el sofá se dibuje DESPUÉS (encima) del jugador.
                        const isCouchBack = tile.type?.startsWith('couch') && (tile as any).facing === 'north';
                        const playerIsOnThisTile = isSitting && playerR === r && playerC === c;

                        if (isCouchBack && playerIsOnThisTile)
                        {
                            // Asignar un valor de orden mayor al del jugador para que se dibuje encima.
                            sortY = player.y + player.spriteHeight + 1;
                        }

                        if (tile.type === 'pitcher')
                        {
                            renderList.push(
                                {
                                    y: sortY, draw: () =>
                                    {
                                        const dX = x + (this.TILE_SIZE - img.width) / 2;
                                        const dY = y + (this.TILE_SIZE - img.height) / 2;
                                        this.ctx.drawImage(img, dX, dY);
                                    }
                                });
                        }
                        else if (tile.type === 'couch_left' || tile.type === 'chair_left')
                        {
                            // EFECTO MIRROR: Perfil Izquierdo
                            renderList.push(
                                {
                                    y: sortY, draw: () =>
                                    {
                                        this.ctx.save();
                                        // Trasladar al borde derecho del tile para invertir desde ahí
                                        this.ctx.translate(x + this.TILE_SIZE, y);
                                        this.ctx.scale(-1, 1); // Invertir horizontalmente
                                        this.ctx.drawImage(img, 0, 0, this.TILE_SIZE, this.TILE_SIZE);
                                        this.ctx.restore();
                                    }
                                });
                        }
                        else if (tile.type === 'nameplate')
                        {
                            renderList.push({
                                y: sortY,
                                draw: () =>
                                {
                                    // 1. Dibujar el letrero base
                                    this.ctx.drawImage(img, x, y, this.TILE_SIZE, this.TILE_SIZE);

                                    // 2. Dibujar la cara si existe (LÓGICA AÑADIDA)
                                    const faceKey = (tile as any).faceKey;
                                    if (faceKey)
                                    {
                                        // DEBUG: Validar si la imagen existe en el AssetManager
                                        if (!this.assetManager.npcFaceImages[faceKey])
                                        {
                                            //console.warn(`[Renderer] ⚠️ ALERTA: Se solicitó dibujar faceKey '${faceKey}' pero no existe en assetManager.npcFaceImages.`);
                                        }

                                        const faceImage = this.assetManager.npcFaceImages[faceKey];
                                        if (this.isAssetReady(faceImage))
                                        {
                                            const faceScale = 0.5;
                                            const faceWidth = faceImage.width * faceScale;
                                            const faceHeight = faceImage.height * faceScale;
                                            const faceX = x + (this.TILE_SIZE - faceWidth) / 2;
                                            const faceY = y + (this.TILE_SIZE - faceHeight) / 2 - 5;
                                            this.ctx.drawImage(faceImage, faceX, faceY, faceWidth, faceHeight);
                                        } else
                                        {
                                            // Si entra aquí mucho, es que la imagen no carga
                                        }
                                    }
                                }
                            });
                        }

                        else
                        {
                            const tileWidth = (tile as any).width || 1;
                            const drawWidth = tileWidth * this.TILE_SIZE;
                            renderList.push({ y: sortY, draw: () => this.ctx.drawImage(img, x, y, drawWidth, this.TILE_SIZE) });
                        }
                    }
                }
            }
        }

        renderList.push({
            y: player.y + player.spriteHeight,
            draw: () =>
            {
                if (isSitting)
                {
                    this.drawSittingPlayer(player, isChair);
                } else
                {
                    player.draw(this.ctx);
                }
            }
        });

        // Ordenamiento por Profundidad (Y-Sorting): Compara la base (pies) de cada entidad.
        renderList.sort((a, b) => a.y - b.y);
        renderList.forEach(item => item.draw());

        this.ctx.restore();
    }

    private drawBackgroundLayer(startRow: number, endRow: number, startCol: number, endCol: number, gridRows: number, gridCols: number, tileGrid: GameTile[][], waterFrame: number, waterfallFrame: number)
    {
        for (let row = Math.max(0, startRow); row < Math.min(gridRows, endRow); row++)
        {
            for (let col = Math.max(0, startCol); col < Math.min(gridCols, endCol); col++)
            {
                const tile = tileGrid[row][col];
                if (tile)
                {
                    if (this.isPlankOverWater(tile))
                    {
                        const waterName = `water_blue_type0${waterFrame + 1}.png`;
                        const waterImg = this.assetManager.tileImages[waterName] || this.assetManager.tileImages['water_blue_type01.png'];
                        if (this.isAssetReady(waterImg))
                        {
                            this.ctx.drawImage(waterImg, col * this.TILE_SIZE, row * this.TILE_SIZE, this.TILE_SIZE, this.TILE_SIZE);
                        }
                    }

                    const bgName = this.resolveBackgroundLayer(tile, waterFrame, waterfallFrame);
                    if (bgName)
                    {
                        const bgImage = this.assetManager.tileImages[bgName];
                        if (this.isAssetReady(bgImage))
                        {
                            this.ctx.drawImage(bgImage, col * this.TILE_SIZE, row * this.TILE_SIZE, this.TILE_SIZE, this.TILE_SIZE);
                        }
                    }
                }
            }
        }
    }

    private drawEntitiesAndForeground(startRow: number, endRow: number, startCol: number, endCol: number, gridRows: number, gridCols: number, tileGrid: GameTile[][], player: Player, entities: RenderableEntity[], waterfallFrame: number, isSleeping: boolean, isSitting?: boolean, houseOwnerFaces?: Map<number, HTMLImageElement>)
    {
        const renderList: Renderable[] = [];

        for (let row = Math.max(0, startRow); row < Math.min(gridRows, endRow); row++)
        {
            for (let col = Math.max(0, startCol); col < Math.min(gridCols, endCol); col++)
            {
                const tile = tileGrid[row][col];
                if (tile)
                {
                    this.addTileToRenderList(tile, row, col, renderList, waterfallFrame, houseOwnerFaces);
                }
            }
        }

        // Límites de cámara en píxeles para culling (con margen de seguridad)
        const cullMargin = this.TILE_SIZE * 2;
        const camMinX = startCol * this.TILE_SIZE - cullMargin;
        const camMaxX = endCol * this.TILE_SIZE + cullMargin;
        const camMinY = startRow * this.TILE_SIZE - cullMargin;
        const camMaxY = endRow * this.TILE_SIZE + cullMargin;

        const addEntity = (entity: RenderableEntity) =>
        {
            if (entity)
            {
                // Optimización: Culling de entidades fuera de cámara
                const w = entity.spriteWidth || this.TILE_SIZE;
                const h = entity.spriteHeight || this.TILE_SIZE;
                if (entity.x + w < camMinX || entity.x > camMaxX ||
                    entity.y + h < camMinY || entity.y > camMaxY) return;

                const feetY = (entity.y !== undefined) ? entity.y + this.TILE_SIZE : 0;
                renderList.push({
                    y: feetY, draw: () =>
                    {
                        entity.draw(this.ctx);
                        // Lógica para dibujar indicador de misión
                        if (entity.showQuestIndicator)
                        {
                            this.ctx.font = 'bold 48px Arial';
                            this.ctx.fillStyle = entity.questIndicatorColor || '#f1c40f';
                            this.ctx.textAlign = 'center';
                            this.ctx.strokeStyle = 'black';
                            this.ctx.lineWidth = 2;
                            const text = entity.questIndicatorText || '!';
                            const width = entity.spriteWidth || this.TILE_SIZE;
                            this.ctx.strokeText(text, entity.x + (width / 2), entity.y - 5);
                            this.ctx.fillText(text, entity.x + (width / 2), entity.y - 5);
                        }
                    }
                });
            }
        };
        entities.forEach(e => addEntity(e));

        renderList.push({
            y: player.y + player.spriteHeight,
            draw: () =>
            {
                // Control estricto de estado para evitar mezclar hojas de sprites
                if (isSleeping)
                {
                    this.drawSleepingPlayer(player);
                } else if (isSitting)
                {
                    // Detectar si es silla en el mundo exterior (si las hubiera)
                    const r = Math.floor((player.y + player.spriteHeight / 2) / this.TILE_SIZE);
                    const c = Math.floor((player.x + player.spriteWidth / 2) / this.TILE_SIZE);
                    const tile = tileGrid[r] ? tileGrid[r][c] : null;
                    const isChair = tile ? tile.type?.startsWith('chair') : false;
                    this.drawSittingPlayer(player, isChair);
                } else
                {
                    player.draw(this.ctx);
                }
            }
        });

        renderList.sort((a, b) => a.y - b.y);
        renderList.forEach(item => item.draw());
    }

    private addTileToRenderList(tile: GameTile, row: number, col: number, renderList: Renderable[], waterfallFrame: number, houseOwnerFaces?: Map<number, HTMLImageElement>)
    {
        const fileName = this.resolveForegroundLayer(tile, waterfallFrame);
        const isFlatFloor = fileName === this.resolveBackgroundLayer(tile, 0, waterfallFrame);

        // FIX CRÍTICO: Ignorar partes del stand en la capa de entidades para evitar el "black box effect"
        if (tile.type === 'market_stand_part') return;

        // FIX: Ocultar explícitamente monedas y billetes de la cuadrícula (para que no caigan en el fallback de renderizado)
        if (tile.type === 'coin' || tile.type === 'bill') return;

        if (!isFlatFloor || tile.type.startsWith('tree'))
        {
            const tileImage = this.assetManager.tileImages[fileName];
            if (this.isAssetReady(tileImage))
            {
                let sortY = (row + 1) * this.TILE_SIZE;
                let drawY = row * this.TILE_SIZE;
                let drawX = col * this.TILE_SIZE;

                // Ajuste de Profundidad consistente para el mundo exterior
                if (tile.type === 'countertop' || tile.type.startsWith('counter_'))
                {
                    sortY -= 24;
                }

                if (tile.type.startsWith('tree'))
                {
                    let width = tileImage.width;
                    let height = tileImage.height;

                    // Redimensionar nuevos árboles (no limoneros) si exceden 4x4 tiles (256px)
                    if (tile.type !== 'tree' && tile.type !== 'tree_large')
                    {
                        const MAX_SIZE = 256; // 4 tiles * 64
                        if (width > MAX_SIZE || height > MAX_SIZE)
                        {
                            const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
                            width *= ratio;
                            height *= ratio;
                        }
                    }
                    drawY = (row + 1) * this.TILE_SIZE - height;
                    drawX = col * this.TILE_SIZE + (this.TILE_SIZE - width) / 2;
                    sortY = drawY + (height / 2);
                    renderList.push({ y: sortY, draw: () => this.ctx.drawImage(tileImage, drawX, drawY, width, height) });
                } else if (['lemon', 'cardboardbox', 'woodbox', 'food', 'fruits', 'vegetables', 'meat', 'fish', 'bakery'].includes(tile.type)) 
                {
                    let tileWidth = tileImage.width;
                    let tileHeight = tileImage.height;

                    if (['food', 'fruits', 'vegetables', 'meat', 'fish', 'bakery'].includes(tile.type))
                    {
                        const MAX_SIZE = 32; // Tamaño máximo de 32x32 píxeles
                        if (tileWidth > MAX_SIZE || tileHeight > MAX_SIZE)
                        {
                            const ratio = Math.min(MAX_SIZE / tileWidth, MAX_SIZE / tileHeight);
                            tileWidth *= ratio;
                            tileHeight *= ratio;
                        }
                        // Si la imagen ya es más pequeña que 32x32, se usará su tamaño original.
                    }
                    else if (tile.type === 'lemon')
                    {
                        const scaleFactor = 0.5;
                        tileWidth *= scaleFactor;
                        tileHeight *= scaleFactor;
                    }
                    // Para 'cardboardbox' y 'woodbox' no se aplica escalado, usan su tamaño original.

                    const instances = (tile as any).instances;
                    const quantity = (tile as any).quantity || 0;

                    renderList.push({
                        y: sortY,
                        draw: () =>
                        {
                            // 1. Si hay instancias, las dibujamos todas
                            if (instances && Array.isArray(instances))
                            {
                                instances.forEach((inst: any) =>
                                {
                                    this.ctx.save();
                                    const lemonCenterX = drawX + inst.localX;
                                    const lemonCenterY = drawY + inst.localY;
                                    this.ctx.translate(lemonCenterX, lemonCenterY);
                                    this.ctx.rotate(inst.rotation * Math.PI / 180);
                                    this.ctx.drawImage(tileImage, -tileWidth / 2, -tileHeight / 2, tileWidth, tileHeight);
                                    this.ctx.restore();
                                });
                            } else
                            {
                                // 2. Fallback: Si no hay instancias, uno centrado
                                const centerX = drawX + (this.TILE_SIZE - tileWidth) / 2;
                                const centerY = drawY + (this.TILE_SIZE - tileHeight) / 2;
                                this.ctx.drawImage(tileImage, centerX, centerY, tileWidth, tileHeight);
                            }
                        }
                    });
                }
                else if (tile.type === 'nameplate')
                {
                    renderList.push(
                        {
                            y: sortY, draw: () =>
                            {
                                // 1. Dibujar el letrero base
                                this.ctx.drawImage(tileImage, drawX, drawY, this.TILE_SIZE, this.TILE_SIZE);

                                // 2. Dibujar la cara del propietario encima
                                const houseId = (tile as any).houseId;
                                if (houseId && houseOwnerFaces)
                                {
                                    const faceImage = houseOwnerFaces.get(houseId);
                                    if (this.isAssetReady(faceImage))
                                    {
                                        // Escalar la cara para que quepa en el letrero
                                        const faceScale = 0.5;
                                        const faceWidth = faceImage.width * faceScale;
                                        const faceHeight = faceImage.height * faceScale;
                                        const faceX = drawX + (this.TILE_SIZE - faceWidth) / 2;
                                        const faceY = drawY + (this.TILE_SIZE - faceHeight) / 2 - 5; // Un poco más arriba para centrar
                                        this.ctx.drawImage(faceImage, faceX, faceY, faceWidth, faceHeight);
                                    }
                                }
                            }
                        });
                }
                else if (tile.type === 'market_stand')
                {
                    // Lógica para renderizar stands de mercado (128x128px)
                    const width = ((tile as any).width || 2) * this.TILE_SIZE; // Default a 2 tiles si no viene definido
                    const height = ((tile as any).height || 2) * this.TILE_SIZE;
                    // Ajustar 'drawY' para que la base del stand se alinee con la parte inferior de su última fila de tiles
                    const finalDrawY = (row + ((tile as any).height || 1)) * this.TILE_SIZE - height;
                    // El 'sortY' es la base del objeto para un correcto Z-sorting
                    const finalSortY = (row + ((tile as any).height || 1)) * this.TILE_SIZE;
                    renderList.push({ y: finalSortY, draw: () => this.ctx.drawImage(tileImage, drawX, finalDrawY, width, height) });
                }
                else if (tile.type === 'pitcher')
                {
                    const x = drawX + (this.TILE_SIZE - tileImage.width) / 2;
                    const y = drawY + (this.TILE_SIZE - tileImage.height) / 2;
                    renderList.push({ y: sortY, draw: () => this.ctx.drawImage(tileImage, x, y) });
                }
                else if (tile.type === 'market_sign')
                {
                    // Redimensionar al 50% del tamaño original
                    const width = tileImage.width * 0.25;
                    const height = tileImage.height * 0.25;
                    // Centrar horizontalmente en el tile
                    const offsetX = (this.TILE_SIZE - width) / 2;
                    // Ajustar drawY para que la base de la imagen coincida con la base del tile
                    drawY = (row + 1) * this.TILE_SIZE - height;
                    sortY = (row + 1) * this.TILE_SIZE; // Ordenar por la base

                    renderList.push({ y: sortY, draw: () => this.ctx.drawImage(tileImage, drawX + offsetX, drawY, width, height) });
                }
                else if (tile.type === 'sidewalk_sign')
                {
                    // Renderizado para el letrero decorativo (similar a market_sign pero sin redimensionado agresivo si es necesario)
                    // Asumimos que el sprite es aprox 64x64 o menor. Lo centramos abajo.
                    const width = tileImage.width;
                    const height = tileImage.height;
                    const offsetX = (this.TILE_SIZE - width) / 2;
                    drawY = (row + 1) * this.TILE_SIZE - height;
                    sortY = (row + 1) * this.TILE_SIZE;

                    renderList.push({ y: sortY, draw: () => this.ctx.drawImage(tileImage, drawX + offsetX, drawY, width, height) });
                }
                else
                {
                    if (tile.type === 'puddle')
                        sortY -= 0.01;
                    renderList.push({ y: sortY, draw: () => this.ctx.drawImage(tileImage, drawX, drawY, this.TILE_SIZE, this.TILE_SIZE) });
                }
            }
            else if (['lemon', 'cardboardbox', 'woodbox', 'food', 'fruits', 'vegetables', 'meat', 'fish', 'bakery'].includes(tile.type))
            {
                //console.warn(`[Renderer] Error visual: Se encontró un objeto '${tile.type}' en [${row}, ${col}] pero la imagen '${fileName}' no está lista.`);
            }
        }
    }

    private drawSleepingPlayer(player: Player)
    {
        const img = this.assetManager.playerSitSleepImage;
        if (img && img.complete && img.naturalWidth > 0)
        {
            // HOJA DE DORMIR: 2 columnas x 4 filas (128x256 px)
            // Frame size: 64x64 px.

            // Fila estática basada en dirección: 0: Arriba, 1: Izquierda, 2: Abajo, 3: Derecha
            const row = player.direction;

            // Animación de columnas (0 y 1). Ciclo lento (1000ms por ciclo completo)
            const col = Math.floor(Date.now() / 1000) % 2;

            this.ctx.drawImage(img, col * 64, row * 64, 64, 64, player.x, player.y, 64, 64);
        } else
        {
            // Fallback de seguridad para evitar que el jugador desaparezca si la imagen no carga
            player.draw(this.ctx);
        }
    }

    private drawBreadCrumbs(breadCrumbs: BreadCrumb[])
    {
        if (!breadCrumbs || breadCrumbs.length === 0) return;

        this.ctx.save();
        breadCrumbs.forEach(crumb =>
        {
            // 1. Capa interior (Cuerpo del pan)
            this.ctx.beginPath();
            this.ctx.arc(crumb.x, crumb.y, crumb.radius, 0, 2 * Math.PI);
            this.ctx.fillStyle = '#D28D32';
            this.ctx.fill();

            // 2. Borde del círculo negro
            this.ctx.strokeStyle = '#000000'; // Negro
            this.ctx.lineWidth = 0.5;
            this.ctx.stroke();

            // 3. Sombras/Detalles (Marrón café oscuro)
            // Dibujamos un pequeño detalle descentrado para dar textura
            this.ctx.beginPath();
            this.ctx.arc(crumb.x - (crumb.radius * 0.2), crumb.y - (crumb.radius * 0.2), crumb.radius * 0.4, 0, 2 * Math.PI);
            this.ctx.fillStyle = '#7A431D';
            this.ctx.fill();
        });
        this.ctx.restore();
    }

    private drawFloatingLoot(items: FloatingLootItem[])
    {
        items.forEach(item =>
        {
            const img = this.assetManager.tileImages[item.fileName];
            if (this.isAssetReady(img))
            {
                this.ctx.save();
                // Efecto de desvanecimiento
                this.ctx.globalAlpha = Math.max(0, 1 - item.lifeTime);
                // Dibujar imagen centrada en la posición calculada
                // Asumimos que item.x e item.y ya son coordenadas de pantalla ajustadas
                this.ctx.drawImage(img, item.x, item.y);
                this.ctx.restore();
            }
        });
    }

    private drawSittingPlayer(player: Player, isChair: boolean = false)
    {
        // Seleccionar la hoja de sprites según el tipo de mueble
        const img = isChair ? this.assetManager.playerSitChairImage : this.assetManager.playerSitImage;
        if (this.isAssetReady(img))
        {
            // HOJA DE SENTARSE: 1 columna x 4 filas (64x256 px)
            // Frame size: 64x64 px.
            // Fila basada en dirección: 0: Arriba, 1: Izquierda, 2: Abajo, 3: Derecha
            // (Asumiendo mapeo estándar de dirección del Player)
            const row = player.direction;
            const col = 0; // Solo hay 1 columna (estático)

            this.ctx.drawImage(img, col * 64, row * 64, 64, 64, player.x, player.y, 64, 64);
        } else
        {
            player.draw(this.ctx);
        }
    }

    private drawUI(canvasWidth: number, gameTimeMinutes: number)
    {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 4;
        this.ctx.font = 'bold 24px Arial';
        const hh = Math.floor(gameTimeMinutes / 60).toString().padStart(2, '0');
        const mm = (gameTimeMinutes % 60).toString().padStart(2, '0');
        const timeText = `${hh}:${mm}`;
        this.ctx.strokeText(timeText, canvasWidth - 100, 40);
        this.ctx.fillText(timeText, canvasWidth - 100, 40);

        this.ctx.restore();
    }

    private resolveBackgroundLayer(tile: GameTile, waterFrame: number, waterfallFrame: number): string | null
    {
        // FIX: Incluir market_stand, market_stand_part y sidewalk_sign para que se dibuje el suelo debajo de ellos
        const itemTypes = ['cardboardbox', 'woodbox', 'lemon', 'puddle', 'pitcher', 'nameplate', 'market_sign', 'market_stand', 'market_stand_part', 'sidewalk_sign', 'coin', 'bill', 'food', 'fruits', 'vegetables', 'meat', 'fish', 'bakery'];
        if (itemTypes.includes(tile.type) || tile.type.startsWith('tree'))
        {
            return tile.underlyingTile?.fileName || 'grass_green_type01.png';
        }
        if (tile.fileName.includes('rock_gray')) return 'beach_sandy_north_type02.png';
        if (tile.fileName.includes('shatteredFacade_') || tile.fileName.includes('crackedFacade_') || tile.fileName.includes('debrisBlock_'))
        {
            return 'grass_green_type01.png';
        }
        if (['wall', 'door', 'window'].includes(tile.type))
        {
            return 'grass_green_type01.png';
        }
        return this.resolveForegroundLayer(tile, tile.fileName.startsWith('cascade') ? waterfallFrame : waterFrame);
    }

    private resolveForegroundLayer(tile: GameTile, frame: number): string
    {
        if (tile.fileName.startsWith('cascade_Azure'))
        {
            return `cascade_Azure0${frame + 1}.png`;
        } else if (tile.fileName.startsWith('water_blue_type'))
        {
            const animatedName = `water_blue_type0${frame + 1}.png`;
            return this.assetManager.tileImages[animatedName] ? animatedName : 'water_blue_type01.png';
        }
        return tile.fileName;
    }

    private isPlankOverWater(tile: GameTile): boolean
    {
        return tile.fileName.includes('plank_brown') &&
            (tile.fileName.includes('_left_type01') || tile.fileName.includes('_right_type01') ||
                tile.fileName.includes('_north_type01') || tile.fileName.includes('_south_type01'));
    }

    /**
     * Type Guard para verificar si un asset (Imagen o Canvas) está listo para renderizarse.
     * Resuelve los errores TS2339 al discriminar correctamente entre HTMLImageElement y HTMLCanvasElement.
     */
    private isAssetReady(asset: HTMLImageElement | HTMLCanvasElement | undefined | null): asset is HTMLImageElement | HTMLCanvasElement
    {
        if (!asset) return false;
        // Si es Canvas, asumimos que está listo si tiene dimensiones
        if (asset instanceof HTMLCanvasElement) return asset.width > 0;
        // Si es Imagen, verificamos flags de carga nativos
        return (asset as HTMLImageElement).complete && (asset as HTMLImageElement).naturalWidth > 0;
    }

    private drawTiles(cameraX: number, cameraY: number, vw: number, vh: number, rows: number, cols: number, grid: GameTile[][], wFrame: number, wfFrame: number) {
        const startCol = Math.max(0, Math.floor(cameraX / this.TILE_SIZE));
        const endCol = Math.min(cols - 1, Math.ceil((cameraX + vw) / this.TILE_SIZE));
        const startRow = Math.max(0, Math.floor(cameraY / this.TILE_SIZE));
        const endRow = Math.min(rows - 1, Math.ceil((cameraY + vh) / this.TILE_SIZE));

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const tile = grid[r][c];
                if (!tile) continue;

                let assetName = tile.fileName;
                if (tile.fileName.includes('water')) assetName = `water_blue_type0${wFrame + 1}.png`;
                if (tile.fileName.includes('cascade')) assetName = `cascade_Azure0${wfFrame + 1}.png`;

                const img = this.assetManager.tileImages[assetName] || this.assetManager.tileImages[tile.fileName];
                if (img) {
                    this.ctx.drawImage(img, c * this.TILE_SIZE - cameraX, r * this.TILE_SIZE - cameraY, this.TILE_SIZE, this.TILE_SIZE);
                }
            }
        }
    }

    private applyEffects(alpha: number, isSleeping: boolean, weather?: string) {
        if (alpha > 0 || isSleeping) {
            this.ctx.fillStyle = `rgba(0, 0, 40, ${isSleeping ? 0.8 : alpha})`;
            this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        }
        // Aquí podrías añadir lógica para 'weather' si la necesitas
    }
}