import { Tile } from '../../shared/models/tile.model';

type GameTile = Tile & { underlyingTile?: Tile };

export class Tree {
  private lastFruitTime: number = 0;
  private readonly FRUIT_INTERVAL = 60000; // 60 segundos = 1 hora de juego
  public growthStage: number = 1; // 0: Joven, 1: Maduro (Placeholder para futura lógica visual)

  constructor(
    public r: number,
    public c: number,
    public type: 'tree' | 'tree_large' | 'tree_grass_green_type01' | 'tree_grass_green_type02' | 'tree_grass_green_type03' | 'tree_grass_green_type04' | 'tree_grass_green_type05'
  ) {
    // Desfase aleatorio inicial para que no todos los árboles generen fruta al mismo tiempo exacto
    this.lastFruitTime = Date.now() - Math.floor(Math.random() * this.FRUIT_INTERVAL);
  }

  public update(grid: GameTile[][], rows: number, cols: number) {
    // Aquí podrías añadir lógica de crecimiento:
    // if (this.growthStage < 1) { ... aumentar stage ... }

    // Los nuevos árboles decorativos no generan fruta
    if (this.type !== 'tree' && this.type !== 'tree_large') return;

    // Generación de frutas
    const now = Date.now();
    if (now - this.lastFruitTime >= this.FRUIT_INTERVAL) {
      this.lastFruitTime = now;
      this.generateFruit(grid, rows, cols);
    }
  }

  private generateFruit(grid: GameTile[][], rows: number, cols: number) {
    // Regla de negocio: 30% de probabilidad de generar un fruto en este ciclo (1 hora)
    // Esto resulta en aprox 1 limón cada 3-4 horas de juego.
    if (Math.random() > 0.3) return;

    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 15) {
      const offsetR = Math.floor(Math.random() * 5) - 2; // Rango -2 a +2
      const offsetC = Math.floor(Math.random() * 5) - 2; // Rango -2 a +2
      const nr = this.r + offsetR;
      const nc = this.c + offsetC;

      if (this.isSafeSpawn(nr, nc, grid, rows, cols)) {
        const targetTile = grid[nr][nc];
        // Asegurarnos de no sobreescribir otro limón, caja o árbol
        if (targetTile.type !== 'lemon' && targetTile.type !== 'cardboardbox' && targetTile.type !== 'woodbox') {
          grid[nr][nc] = {
            fileName: 'lemon.png',
            type: 'lemon',
            walkable: true,
            color: null,
            underlyingTile: targetTile // Preservar el suelo (pasto/tierra)
          };
          placed = true;
        }
      }
      attempts++;
    }
  }

  private isSafeSpawn(r: number, c: number, grid: GameTile[][], rows: number, cols: number): boolean {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    const tile = grid[r][c];
    if (!tile) return false;
    if (!tile.walkable) return false;
    if (tile.type.startsWith('tree')) return false;
    const name = tile.fileName.toLowerCase();
    return !name.includes('wall') && !name.includes('window') && !name.includes('water') && !name.includes('cascade');
  }

  // Método estático para generar árboles decorativos aleatoriamente en el mapa
  public static spawnRandomTrees(grid: GameTile[][], buildingGrid: number[][], rows: number, cols: number) {
    const treeTypes = ['tree_grass_green_type01', 'tree_grass_green_type02', 'tree_grass_green_type03', 'tree_grass_green_type04', 'tree_grass_green_type05'] as const;

    treeTypes.forEach(type => {
      // Generar entre 5 y 10 árboles de este tipo
      const count = Math.floor(Math.random() * 6) + 5; 
      
      let placed = 0;
      let attempts = 0;

      while (placed < count && attempts < 100) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);

        if (Tree.isSafeSpawnStatic(r, c, grid, buildingGrid, rows, cols)) {
          grid[r][c] = {
            fileName: `${type}.png`,
            type: type,
            walkable: false, // Los árboles bloquean el paso
            color: null,
            underlyingTile: grid[r][c] // Preservar el suelo debajo
          };
          placed++;
        }
        attempts++;
      }
    });
  }

  private static isSafeSpawnStatic(r: number, c: number, grid: GameTile[][], buildingGrid: number[][], rows: number, cols: number): boolean {
    // Reutilizamos la lógica de seguridad pero en estático
    // Creamos una instancia temporal dummy solo para acceder a la lógica o duplicamos la lógica aquí:
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    
    // VERIFICACIÓN: No colocar sobre edificios.
    if (buildingGrid[r]?.[c] > 0) return false;

    const tile = grid[r][c];
    if (!tile) return false;
    if (!tile.walkable) return false;
    if (tile.type.startsWith('tree')) return false;
    if (tile.type === 'cardboardbox' || tile.type === 'woodbox' || tile.type === 'lemon' || tile.type === 'pitcher') return false;
    
    const name = tile.fileName.toLowerCase();
    return !name.includes('wall') && !name.includes('window') && !name.includes('water') && !name.includes('cascade');
  }
}