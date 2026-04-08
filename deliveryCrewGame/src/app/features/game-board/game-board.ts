import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit, Inject, PLATFORM_ID, HostListener, NgZone } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { from, Observable, Subscription, filter, take } from 'rxjs';
import { MapAnalyzerService } from '../../services/map-analyzer.service';
import { House } from '../../shared/models/house.model';

import { Tile, GameTile } from '../../shared/models/tile.model';
import { Dog } from '../../entities/animals/dog';
import { Cat } from '../../entities/animals/cat';
import { Chicken } from '../../entities/animals/chicken';
import { Hen } from '../../entities/animals/hen';
import { Pederestian } from '../../entities/npc/pederestian';
import { Rooster } from '../../entities/animals/rooster';
import { Mouse } from '../../entities/animals/mouse';
import { Fish } from '../../entities/animals/fish';
import { Worm } from '../../entities/animals/worm';
import { Duck } from '../../entities/animals/duck';
import { Duckling } from '../../entities/animals/duckling';
import { Rabbit } from '../../entities/animals/rabbit';
import { Frog } from '../../entities/animals/frog';
import { Pig } from '../../entities/animals/pig';
import { Sheep } from '../../entities/animals/sheep';
import { Parrot } from '../../entities/animals/parrot';

import { Quest } from '../../shared/models/quest.model';
import { QuestManager } from '../../core/services/quest-manager.service';
import { NpcNameGeneratorService } from '../../core/services/npc-name-generator.service'; // Importar el nuevo servicio
import { AssetManager } from '../../core/services/asset-manager.service';
import { MapGenerator } from '../../core/engine/world-generator.service';
import { Player } from '../../entities/player';
import { SceneService } from '../../core/services/scene.service';
import { BoxManager } from '../../core/engine/box-manager.service';
import { Tree } from '../../entities/objects/tree';
import {Renderer, FloatingLootItem, BreadCrumb} from '../../core/engine/renderer';
import { TILE_DEFINITIONS } from '../../shared/constants/tile-definitions';
import { StatsManager, Necesidades } from '../../core/services/stats-manager.service';
import { CensusManager, CensusData } from '../../core/services/census-manager.service';
import { InteriorManagerService } from '../../core/services/interior-manager.service';
import { Salesman } from '../../entities/npc/salesman';
import { TradePanelComponent } from '../trade-panel/trade-panel.component';
import { MarketStandEntity } from '../../entities/objects/market-stand.entity';
import { EconomyService } from '../../core/services/economy.service';
import { LootService, LootItem } from '../../core/services/loot.service';
import { MoneyCounterComponent } from '../money-counter/money-counter.component';
import { ActiveQuestsComponent } from '../active-quests/active-quests.component';
import { QuestPanelComponent } from '../quest-panel/quest-panel.component';
import { InventoryComponent } from "../inventory/inventory.component";

@Component({
  selector: 'app-game-board',
  templateUrl: './game-board.html',
  styles: [`
    :host { display: block; width: 100%; height: 100vh; overflow: hidden; }
    .game-layout { display: flex; width: 100%; height: 100%; background-color: #1a1a1a; }
    .canvas-container { flex: 1; display: flex; justify-content: center; align-items: center; overflow: auto; background-color: #000; position: relative; }
    .ui-panel { width: 300px; min-width: 250px; background-color: #2c3e50; color: #ecf0f1; display: flex; flex-direction: column; border-left: 4px solid #34495e; font-family: 'Segoe UI', sans-serif; overflow-y: auto; z-index: 10; box-shadow: -2px 0 5px rgba(0,0,0,0.3); }
    .panel-header { padding: 20px; background-color: #34495e; text-align: center; border-bottom: 1px solid #7f8c8d; }
    .panel-header h2 { margin: 0; font-size: 1.5rem; color: #ecf0f1; }
    .section { padding: 20px; border-bottom: 1px solid #34495e; }
    .section h3 { margin-top: 0; margin-bottom: 15px; font-size: 1.1rem; color: #bdc3c7; text-transform: uppercase; letter-spacing: 1px; }
    .census-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .census-item { background-color: #34495e; padding: 10px; border-radius: 6px; font-size: 0.9rem; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
    .need-row { margin-bottom: 15px; }
    .need-label { display: block; margin-bottom: 5px; font-size: 0.9rem; font-weight: bold; }
    .progress-bar-bg { width: 100%; height: 14px; background-color: #1a252f; border-radius: 7px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.5); }
    .progress-bar-fill { height: 100%; border-radius: 7px; transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s ease; }
    .insuficiente { background-color: #e74c3c; box-shadow: 0 0 8px #c0392b; }
    .mal { background-color: #e67e22; }
    .bien { background-color: #f1c40f; }
    .excelente { background-color: #2ecc71; box-shadow: 0 0 5px #27ae60; }
  `],
  standalone: true,
  imports: [CommonModule, TradePanelComponent, MoneyCounterComponent, QuestPanelComponent, ActiveQuestsComponent, InventoryComponent]
})
export class GameBoard implements OnInit, AfterViewInit, OnDestroy
{
  // 1. Usamos @ViewChild para referenciar el #gameCanvas del HTML
  @ViewChild('gameCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  // Referencia al componente hijo del panel de comercio
  @ViewChild('tradePanel') tradePanel!: TradePanelComponent;
  // Referencia al nuevo panel de misiones
  @ViewChild('questPanel') questPanel!: QuestPanelComponent;

  public casas: House[] = [];
  public casaActual: House | null = null; // Guardará la casa donde está el jugador

  private ctx!: CanvasRenderingContext2D;

  // Propiedades de la Cuadrícula y Tiles
  private readonly GRID_ROWS = 100;
  private readonly GRID_COLS = 100;
  private readonly TILE_SIZE = 64;
  // El canvas ahora es nuestro "viewport" o "ventana" al mundo del juego
  private canvasWidth!: number;
  private canvasHeight!: number;
  // Dimensiones totales del mundo del juego
  private worldWidth!: number;
  private worldHeight!: number;
  private cameraX = 0;
  private cameraY = 0;

  // Gestión de Tiles
  private tileGrid: GameTile[][] = [];
  private buildingGrid: number[][] = [];
  // La lista de tiles ahora se carga dinámicamente desde el manifiesto.
  private readonly TILE_DEFINITIONS: Tile[] = TILE_DEFINITIONS;
  private extendedTileDefinitions: Tile[] = []; // Nueva propiedad para definiciones extendidas

  // Entidades Principales
  public player: Player | null = null;
  private houseOwnerFaces = new Map<number, HTMLImageElement>();
  //private boxManager!: BoxManager;
  private trees: Tree[] = [];

  // Animación de agua
  private waterfallFrame = 0;
  private waterfallTimer = 0;
  private readonly WATERFALL_SPEED = 0.17; // Velocidad de la cascada (segundos)

  private waterFrame = 0;
  private waterTimer = 0;
  private readonly WATER_SPEED = 1.0; // Velocidad del agua (segundos)

  private npcX = 0;
  private npcY = 0;
  private npcDirection = 2;
  private npcCurrentFrame = 0;
  private npcVisible = false;
  private npcTarget: { r: number, c: number } | null = null;
  private npcPath: { r: number, c: number }[] = [];
  private readonly NPC_SPEED = 120; // Píxeles por segundo (antes 2 px/frame)
  private doors: { r: number, c: number }[] = [];
  private npcIsCarrying = false;
  private npcActionTimer = 0;
  private salesmen: Salesman[] = [];
  private marketStands: MarketStandEntity[] = []; // Array para gestionar las entidades lógicas de los puestos
  private debugNPCsChasePlayer = false; // Bandera para pruebas: NPCs persiguen al jugador
  private floatingLootItems: FloatingLootItem[] = []; // Efectos visuales de loot

  // Reporte de dinero de NPCs
  private npcMoneyLogTimer = 0;
  private readonly NPC_MONEY_LOG_INTERVAL = 5; // Loguear cada 5 segundos

  // Propiedades del Perro
  private dog!: Dog;
  private dogs: Dog[] = [];
  private peatones: Pederestian[] = [];
  private cats: Cat[] = [];
  private chicks: Chicken[] = [];
  private hens: Hen[] = [];
  private roosters: Rooster[] = [];
  private mice: Mouse[] = [];
  private worms: Worm[] = [];
  private ducks: Duck[] = [];
  private ducklings: Duckling[] = [];
  private rabbits: Rabbit[] = [];
  private frogs: Frog[] = [];
  private pigs: Pig[] = [];
  private sheeps: Sheep[] = [];
  private parrots: Parrot[] = [];
  private fish: Fish[] = [];
  private breadCrumbs: BreadCrumb[] = [];
  private manzanasRegistradas: { r: number, c: number, w: number, h: number }[] = [];
  private hatchingTimer: any;

  // Sistema de Tiempo
  private gameTimeMinutes: number = 480; // 8:00 AM
  private totalGameMinutes: number = 480; // Tiempo total acumulado
  private lastTimeUpdate: number = 0;
  private overlayAlpha: number = 0;

  // Estado del Juego (Mundo vs Interior)
  private gameState: 'WORLD' | 'INTERIOR' = 'WORLD';
  // interiorGrid ahora se actualiza vía suscripción, no asignación directa
  private interiorGrid: Tile[][] = [];
  private currentInteriorFloor: Tile | null = null;
  private savedWorldPos: { x: number, y: number } = { x: 0, y: 0 };
  private canTriggerDoor: boolean = true; // Para evitar rebote inmediato en la puerta

  private lastOlletaLogTime = 0; // Para controlar el spam de logs
  private pickupCooldown = 0; // Cooldown para evitar recoger objetos inmediatamente después de soltarlos
  private statsManager = new StatsManager();
  //private questManager: QuestManager;
  private censusManager = new CensusManager();

  // Inicializamos con valores en 0 para evitar errores en el HTML antes del primer ciclo
  public censusReport: CensusData = {
    dogs: { male: 0, female: 0, total: 0 },
    cats: { male: 0, female: 0, total: 0 },
    birds: { chicks: 0, hens: 0, roosters: 0, total: 0 },
    ducks: { male: 0, female: 0, total: 0 },
    rabbits: { male: 0, female: 0, total: 0 },
    pests: { mice: 0 },
    frogs: { total: 0 },
    pigs: { total: 0 },
    sheeps: { total: 0 },
    parrots: { total: 0 },
    worms: { total: 0 },
    totalPopulation: 0
  };

  // Datos para la UI (Panel Lateral)
  public necesidades: Necesidades = {
    salud: 100,
    energia: 100,
    hidratacion: 100,
    nutricion: 100,
    higiene: 100,
    confort: 100
  };

  // Objeto para rastrear las teclas presionadas
  private keysPressed: { [key: string]: boolean } = {};

  // Tooltip para la barra de energía
  public energyTooltip: string = 'Energía: 100%';

  // Estado del Jugador
  private isSleeping: boolean = false;

  // Mouse Tracking
  private mouseX = 0;
  private mouseY = 0;

  // Rain Effect
  private isRaining = false;
  private rainTimer = 0;
  private nextRainCheck = 0;
  private raindrops: { x: number, y: number, length: number, speed: number, type: 'line' | 'oval' | 'circle', opacity: number, radiusX: number, radiusY: number }[] = [];
  private rainAudio1!: HTMLAudioElement;
  private rainAudio2!: HTMLAudioElement;
  private activeRainAudio!: HTMLAudioElement;
  private puddles: { r: number, c: number, size: number, maxSize: number }[] = [];
  private puddleSpawnTimer = 0;
  private readonly PUDDLE_SPAWN_INTERVAL = 0.2; // Segundos
  private animalShelterTargets = new Map<any, { r: number, c: number, reached: boolean }>();
  private looseCrumbs = 0; // Migajas sueltas disponibles para lanzar con la tecla 3

  // Control de FPS (60 Frames por segundo)
  private lastFrameTime = 0;
  private readonly FPS = 60;
  private readonly FRAME_INTERVAL = 1000 / this.FPS;
  private isDestroyed = false; // Bandera para detener el loop

  // Nuevos Gestores
  private mapGenerator: MapGenerator;
  private renderer!: Renderer;

  // Suscripciones
  private interiorSubscription: Subscription = new Subscription();

  // Mapa para rastrear el objetivo de movimiento de los NPCs con misión activa
  private npcTargets = new Map<number, { r: number, c: number, reached: boolean }>();

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent)
  {
    this.keysPressed[event.key] = true;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key))
    {
      event.preventDefault();
    }

    // --- TECLA 2: ABRIR COMERCIO ---
    if (event.key === '2')
    {
      this.tryOpenTrade();
    }

    if (event.key.toLowerCase() === 'z')
    {
      this.toggleRain();
    }

    if (event.key === '3')
    {
      this.dropSingleBreadCrumb();
    }



    if (event.key === '4')
    {
      this.throwBreadCrumbs();
    }

    // --- LEVANTARSE DEL SOFÁ ---
    if (this.player?.isSitting)
    {
      const key = event.key.toLowerCase();
      if (key.startsWith('arrow') || ['w', 'a', 's', 'd'].includes(key))
      {
        this.player.isSitting = false;
      }
    }

    if (this.gameState === 'INTERIOR' && (event.key.toLowerCase() === 'e' || event.key === ' ' || event.key === 'Enter'))
    {
      this.checkInteriorInteraction();
    }

    if (event.key.toLowerCase() === 'a') this.player?.toggleKneel();
    if (event.key.toLowerCase() === 'b') this.isSleeping = true;
    if (event.key.toLowerCase() === 'c' && this.player) this.player.startChop();

    // --- TECLA 1 / E / ENTER (RESTAURADO) ---
    if (event.key === '1' || event.key.toLowerCase() === 'e' || event.key === 'Enter')
    {
      // Verificar interacción de misión si estamos en el mundo exterior
      if (this.gameState === 'WORLD')
      {
        this.ngZone.run(() => this.checkQuestInteraction());
      }

      // --- LEVANTARSE DEL SOFÁ ---
      if (this.player?.isSitting)
      {
        this.standUp();
        return;
      }

      // Primero intentamos recoger agua (olleta)
      if (this.player?.isCarryingMetalPitcherEmpty && this.checkWaterSourceProximity())
      {
        this.player.startWaterCollection();
        return;
      }

      // Si no es agua, intentamos soltar caja (solo si no está sentado)
      if (this.player && !this.player.isSitting)
      {
        let currentGrid = (this.gameState === 'WORLD') ? this.tileGrid : this.interiorGrid;
        if (currentGrid)
        {
          this.boxManager.tryDropBox(this.player, currentGrid as GameTile[][], this.TILE_SIZE);
          this.pickupCooldown = 60; // Pausar auto-recogida por ~1 segundo (60 frames)
        }
      }
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent)
  {
    this.keysPressed[event.key] = false;
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent)
  {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;
  }

  @HostListener('window:blur')
  onBlur()
  {
    // Resetear teclas si la ventana pierde el foco para evitar que el personaje se quede "pegado" caminando
    this.keysPressed = {};
  }

  constructor(
    private assetManager: AssetManager,
    private sceneService: SceneService,
    private interiorManager: InteriorManagerService, // Inyección del nuevo servicio
    private nameGenerator: NpcNameGeneratorService, // Inyectar el generador de nombres
    private mapAnalyzer: MapAnalyzerService, // 2. Inyectar servicio
    private economyService: EconomyService, // Inyectar servicio de economía
    private lootService: LootService, // Inyectar servicio de Loot
    private questManager: QuestManager, // <--- INYECCIÓN CORRECTA (Singleton)
    private boxManager: BoxManager,     // <--- INYECCIÓN CORRECTA (Singleton)
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone) 
  {
    // 1. Inyectar definiciones de Market Stand si no existen
    // Asumimos que las imágenes están en assets/architecture/ como los sidewalkSigns
    const marketStands: Tile[] = [
      {
        fileName: '../architecture/marketStand_fruits_type01.png',
        type: 'market_stand',
        walkable: false,
        color: null
      },
      {
        fileName: '../architecture/marketStand_fish_type01.png',
        type: 'market_stand',
        walkable: false,
        color: null
      },
      {
        fileName: '../architecture/marketStand_bakery_type01.png',
        type: 'market_stand',
        walkable: false,
        color: null
      },
      {
        fileName: '../architecture/marketStand_meat_type01.png',
        type: 'market_stand',
        walkable: false,
        color: null
      },
      {
        fileName: '../architecture/marketStand_vegetables_type01.png',
        type: 'market_stand',
        walkable: false,
        color: null
      },
      {
        fileName: '../architecture/marketStand_meat_type02.png',
        type: 'market_stand',
        walkable: false,
        color: null
      }
    ];

    // --- NUEVO: Precarga de assets de items de tienda (Solución Dinámica) ---
    // Obtenemos la lista de todos los items posibles directamente desde la entidad MarketStand
    // para asegurar que todos los assets se precarguen correctamente. Esto elimina la
    // necesidad de mantener una lista manual y previene errores cuando se añaden nuevos items.
    const purchasableItemIds = MarketStandEntity.getAllPossibleItemIds();
    const itemTiles: Tile[] = purchasableItemIds.map(id => ({
      fileName: `../img/${id}.png`,
      type: 'food', // Asumimos que todos son 'food' por ahora
      walkable: true,
      color: null
    }));

    // Combinamos las definiciones existentes con las nuevas
    this.extendedTileDefinitions = [...this.TILE_DEFINITIONS, ...marketStands, ...itemTiles];

    // Usamos la lista extendida para el generador
    this.mapGenerator = new MapGenerator(this.GRID_ROWS, this.GRID_COLS, this.extendedTileDefinitions);
    // ELIMINADO: this.boxManager = new BoxManager();
    // ELIMINADO: this.questManager = new QuestManager();
  }

  ngOnInit()
  {
    // Suscripción reactiva al grid de interiores
    this.interiorSubscription = this.interiorManager.interiorGrid$.subscribe(grid =>
    {
      // Actualizamos la referencia interna que usa el loop de renderizado
      this.interiorGrid = grid;
    });

    // Suscripción a eventos de misiones completadas para dar recompensas
    this.questManager.questCompleted$.subscribe(completedQuest =>
    {
      // Ya no damos energía automática, la recompensa se maneja en la interacción.
      // Solo usamos esto para limpiar la UI.
      //console.log(`Misión "${completedQuest.title}" archivada.`);

    });
  }

  ngOnDestroy()
  {
    this.isDestroyed = true; // Detener el gameLoop inmediatamente
    if (this.hatchingTimer)
    {
      clearInterval(this.hatchingTimer);
    }
    this.interiorSubscription.unsubscribe();
  }

  ngAfterViewInit()
  {
    if (isPlatformBrowser(this.platformId))
    {
      const canvas = this.canvasRef.nativeElement;
      this.ctx = canvas.getContext('2d')!;

      // 1. Configuración de dimensiones del Canvas
      this.canvasWidth = 1024;
      this.canvasHeight = 768;
      canvas.width = this.canvasWidth;
      canvas.height = this.canvasHeight;

      this.worldWidth = this.GRID_COLS * this.TILE_SIZE;
      this.worldHeight = this.GRID_ROWS * this.TILE_SIZE;

      // 2. Inicialización del Renderer (asegúrate que Renderer esté importado)
      this.renderer = new Renderer(this.ctx, this.assetManager);

      // Inicializar audio para la lluvia
      this.rainAudio1 = new Audio('assets/sounds/rain01.mp3');
      this.rainAudio1.loop = true;
      this.rainAudio2 = new Audio('assets/sounds/rain02.mp3');
      this.rainAudio2.loop = true;

      // 3. Inicialización del juego
      this.cargarRecursos(); // Tu método existente para cargar el resto de assets

      // 4. Inicio del Game Loop
      this.ngZone.runOutsideAngular(() =>
      {
        this.gameLoop();
      });

      // Conectar el evento de compra del panel de comercio con la lógica de spawn de items.
      this.tradePanel.itemPurchased.subscribe((event: { item: { fileName: string, type: string, value: number }, stand: MarketStandEntity }) =>
      {
        this.spawnPurchasedItem(event.item, event.stand);
      });
    }
  }

  private cargarRecursos()
  {
    // Usamos extendedTileDefinitions para que el AssetManager cargue también los marketStands
    this.assetManager.cargarRecursos(this.extendedTileDefinitions).subscribe({
      next: () => this.onResourcesLoaded(),
      error: (err: any) =>
      {
        //console.error('Error crítico al cargar recursos:', err);
      }
    });
  }

  private onResourcesLoaded()
  {
    // Esperar a que las misiones se carguen desde el JSON antes de inicializar entidades
    this.questManager.questsLoaded$.pipe(
      filter(loaded => loaded === true),
      take(1)
    ).subscribe(() =>
    {
      // CORRECCIÓN: setTimeout para evitar ExpressionChangedAfterItHasBeenCheckedError
      // cuando 'player' pasa de null a objeto inicializado afectando la vista (Inventario).
      setTimeout(() =>
      {
        //console.log("Recursos y misiones cargados. Inicializando entidades...");

        // Generamos el mapa aleatorio usando el nuevo generador
        const mapData = this.mapGenerator.generarMapa();
        this.tileGrid = mapData.tileGrid;
        this.buildingGrid = mapData.buildingGrid;
        this.manzanasRegistradas = mapData.manzanasRegistradas;

        // Generar árboles decorativos aleatorios (01-06) antes de inicializar entidades
        // Tree.spawnRandomTrees(this.tileGrid, this.buildingGrid, this.GRID_ROWS, this.GRID_COLS); // Comentado temporalmente si causa conflicto, o descomentar si Tree es estático

        // === NUEVO AJUSTE: Análisis de Casas ===
        // MOVIDO: Debe ejecutarse ANTES de inicializarEntidades para que assignHouseOwners tenga casas que asignar
        if (this.buildingGrid && this.buildingGrid.length > 0)
        {
          this.casas = this.mapAnalyzer.extractHousesFromGrid(this.buildingGrid, this.TILE_SIZE);
        }

        // Inicializar NPC y otros elementos que dependen del mapa
        this.inicializarEntidades();

        // Calculamos el tamaño de cada sprite
        this.player = new Player(this.assetManager);

        // Inicializar sistema de árboles
        this.initializeTrees();

        // Generar señales de acera (Sidewalk Signs)
        this.spawnSidewalkSigns();

        this.setPlayerStartPosition();

        // Programar la primera comprobación de lluvia para dentro de 20-40 minutos de juego
        this.nextRainCheck = this.totalGameMinutes + 20 + Math.floor(Math.random() * 20);

        // Iniciar ciclo de eclosión (cada 10 segundos)
        this.hatchingTimer = setInterval(() => this.cicloEclosion(), 10000);
      }, 0);
    });
  }

  private setPlayerStartPosition()
  {
    if (!this.player) return;

    // 1. Prioridad: Mercado (Donde están los abuelos)
    const marketSpots: { r: number, c: number }[] = [];
    for (let r = 0; r < this.GRID_ROWS; r++)
    {
      for (let c = 0; c < this.GRID_COLS; c++)
      { // Busca puestos de mercado en lugar de letreros
        if (this.tileGrid[r][c] && this.tileGrid[r][c].type === 'market_stand')
        {
          marketSpots.push({ r, c });
        }
      }
    }

    if (marketSpots.length > 0)
    {
      // Tomamos el primer puesto encontrado como referencia
      const spot = marketSpots[0];
      //console.log(`Intentando ubicar al jugador cerca del mercado en [${spot.r}, ${spot.c}]`);

      // Intentar spawnear cerca (búsqueda en espiral más amplia alrededor del puesto)
      // Aumentamos el radio a 8 y permitimos aparecer sobre cajas
      for (let r = spot.r - 8; r <= spot.r + 8; r++)
      {
        for (let c = spot.c - 8; c <= spot.c + 8; c++)
        {
          if (this.isSafeSpawn(r, c, true))
          { // true = permitir aparecer sobre cajas
            this.player.setPosition((c * this.TILE_SIZE), (r * this.TILE_SIZE));
            return;
          }
        }
      }
    }

    // Posición inicial del personaje: buscar lugar seguro
    const candidates: { r: number, c: number }[] = [];

    // 1. Recopilar TODOS los puntos seguros cerca del agua
    for (let r = 0; r < this.GRID_ROWS; r++)
    {
      for (let c = 0; c < this.GRID_COLS; c++)
      {
        if (this.tileGrid[r][c] && this.tileGrid[r][c].fileName.includes('water'))
        {
          const neighbors = [{ r: r + 1, c }, { r: r - 1, c }, { r, c: c + 1 }, { r, c: c - 1 }];
          for (const n of neighbors)
          {
            if (this.isSafeSpawn(n.r, n.c))
            {
              candidates.push(n);
            }
          }
        }
      }
    }

    let startRow = Math.floor(this.GRID_ROWS / 2);
    let startCol = Math.floor(this.GRID_COLS / 2);

    if (candidates.length > 0)
    {
      // Elegir uno al azar de los candidatos encontrados
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      startRow = pick.r;
      startCol = pick.c;
    } else if (!this.isSafeSpawn(startRow, startCol))
    {
      // Fallback: Búsqueda en espiral si no hay agua o el centro no es seguro
      let found = false;
      let radius = 1;
      while (!found && radius < Math.max(this.GRID_ROWS, this.GRID_COLS))
      {
        for (let r = startRow - radius; r <= startRow + radius; r++)
        {
          for (let c = startCol - radius; c <= startCol + radius; c++)
          {
            if (this.isSafeSpawn(r, c))
            {
              startRow = r;
              startCol = c;
              found = true;
              break;
            }
          }
          if (found) break;
        }
        radius++;
      }
    }

    this.player.setPosition((startCol * this.TILE_SIZE), (startRow * this.TILE_SIZE));
  }

  private cicloEclosion()
  {
    for (let r = 0; r < this.GRID_ROWS; r++)
    {
      for (let c = 0; c < this.GRID_COLS; c++)
      {
        const tile = this.tileGrid[r][c];
        if (!tile) continue;

        // Buscar nidos con huevos (type01, type02, type03)
        // Regex captura: Grupo 1 (prefijo hasta type0), Grupo 2 (número 1-3), Grupo 3 (extensión)
        const match = tile.fileName.match(/(.*_nest_type0)([1-3])(\.png)$/);

        if (match)
        {
          const prefix = match[1]; // Ej: grass_green_nest_type0
          const currentLevel = parseInt(match[2], 10);
          const suffix = match[3]; // .png

          const newLevel = currentLevel - 1;
          const newFileName = `${prefix}${newLevel}${suffix}`;

          const newTile = this.TILE_DEFINITIONS.find(t => t.fileName === newFileName);

          if (newTile)
          {
            // 1. Actualizar tile (descenso de grado)
            this.tileGrid[r][c] = newTile;

            // 2. Generar Pollito
            if (this.assetManager.chick_yellow_walking)
            {
              this.chicks.push(new Chicken(this.assetManager.chick_yellow_walking, r, c));
            }
          }
        }
      }
    }
  }

  private initializeTrees()
  {
    this.trees = [];
    for (let r = 0; r < this.GRID_ROWS; r++)
    {
      for (let c = 0; c < this.GRID_COLS; c++)
      {
        const tile = this.tileGrid[r][c];
        if (tile && (tile.type === 'tree' ||
          tile.type === 'tree_large' ||
          (tile.type && tile.type.startsWith('tree_grass_green_type0')) ||
          (tile.fileName && tile.fileName.startsWith('tree_grass_green_type0')))) 
        {
          // Ahora que spawnRandomTrees es consciente de los edificios,
          // podemos asumir que cualquier árbol en el grid está en una posición válida.
          this.trees.push(new Tree(r, c, tile.type as any));
        }
      }
    }
  }

  private spawnSidewalkSigns()
  {
    // Buscamos la definición que acabamos de agregar
    const signTileDef = this.extendedTileDefinitions.find(t => t.fileName.includes('sidewalkSign'));
    if (!signTileDef) return;

    // 1. Buscar manzanas libres de casas
    // Filtramos las manzanas registradas verificando que no tengan IDs de construcción en su área
    const manzanasLibres = this.manzanasRegistradas.filter(m =>
    {
      for (let r = m.r; r < m.r + m.h; r++)
      {
        for (let c = m.c; c < m.c + m.w; c++)
        {
          if (r >= 0 && r < this.GRID_ROWS && c >= 0 && c < this.GRID_COLS)
          {
            if (this.buildingGrid[r][c] > 0) return false; // Hay una casa aquí
          }
        }
      }
      return true; // Manzana totalmente libre
    });

    if (manzanasLibres.length > 0)
    {
      // 2. Seleccionar una manzana aleatoria de las disponibles
      const manzana = manzanasLibres[Math.floor(Math.random() * manzanasLibres.length)];

      // 3. Intentar ubicar el cartel en el centro (o cerca)
      const centerR = Math.floor(manzana.r + manzana.h / 2);
      const centerC = Math.floor(manzana.c + manzana.w / 2);

      const candidates = [
        { r: centerR, c: centerC },
        { r: centerR + 1, c: centerC }, { r: centerR - 1, c: centerC },
        { r: centerR, c: centerC + 1 }, { r: centerR, c: centerC - 1 }
      ];

      for (const cand of candidates)
      {
        if (this.isSafeSpawn(cand.r, cand.c))
        {
          this.tileGrid[cand.r][cand.c] = {
            ...signTileDef,
            type: 'sidewalk_sign',
            walkable: false,
            underlyingTile: this.tileGrid[cand.r][cand.c]
          } as GameTile;
          break; // Solo colocamos uno
        }
      }
    }
  }

  // Helper para verificar si un tile es seguro para spawnear (no es pared, ventana ni agua)
  private isSafeSpawn(r: number, c: number, allowBoxes: boolean = false): boolean
  {
    if (r < 0 || r >= this.GRID_ROWS || c < 0 || c >= this.GRID_COLS) return false;

    // FIX: Verificar buildingGrid para evitar spawn dentro de casas y ruinas
    if (this.buildingGrid[r][c] !== 0) return false;

    const tile = this.tileGrid[r][c];
    if (!tile) return false;
    if (!tile.walkable) return false;
    if (tile.type === 'tree' || tile.type === 'tree_large' || tile.type === 'market_stand') return false;
    if (!allowBoxes && (tile.type === 'cardboardbox' || tile.type === 'woodbox')) return false;
    const name = tile.fileName.toLowerCase();
    return !name.includes('wall') && !name.includes('window') && !name.includes('water') && !name.includes('cascade');
  }

  private getLakeEdgeTiles(): { r: number, c: number }[]
  {
    const edgeTiles: { r: number, c: number }[] = [];
    for (let r = 0; r < this.GRID_ROWS; r++)
    {
      for (let c = 0; c < this.GRID_COLS; c++)
      {
        // Usamos isSafeSpawn para asegurar que el borde sea un lugar válido
        if (this.isSafeSpawn(r, c))
        {
          // Revisar vecinos en busca de agua
          const neighbors = [{ r: r + 1, c }, { r: r - 1, c }, { r, c: c + 1 }, { r, c: c - 1 }];
          for (const n of neighbors)
          {
            if (n.r >= 0 && n.r < this.GRID_ROWS && n.c >= 0 && n.c < this.GRID_COLS)
            {
              const neighborTile = this.tileGrid[n.r][n.c];
              if (neighborTile && neighborTile.fileName.includes('water'))
              {
                edgeTiles.push({ r, c });
                break; // Tile añadido, no es necesario seguir revisando vecinos
              }
            }
          }
        }
      }
    }
    return edgeTiles;
  }

  private inicializarEntidades()
  {
    // Inicializar NPC
    this.findDoors();
    this.startNPC();

    this.spawnLoot(); // Generar monedas y billetes en el mapa
    if (this.boxManager)
    {
      this.boxManager.spawnBoxes(this.tileGrid, this.GRID_ROWS, this.GRID_COLS, 'cardboard', Math.floor(Math.random() * 100) + 1);
      this.boxManager.spawnBoxes(this.tileGrid, this.GRID_ROWS, this.GRID_COLS, 'wood', Math.floor(Math.random() * 50) + 1);
    }

    // Resetear listas
    this.dogs = [];
    this.peatones = [];
    this.cats = [];
    this.chicks = [];
    this.hens = [];
    this.roosters = [];
    this.mice = [];
    this.worms = [];
    this.ducks = [];
    this.fish = [];
    this.rabbits = [];
    this.frogs = [];
    this.pigs = [];
    this.sheeps = [];
    this.parrots = [];
    this.salesmen = [];
    this.marketStands = [];

    if (this.manzanasRegistradas.length > 0)
    {
      this.spawnDogs();
      this.spawnCats();
      this.spawnFarmAnimals();
      this.spawnTurkens();
      this.spawnRodents();
      this.spawnNewAnimals(); // Lombrices y Patos
      this.spawnRabbits();
      this.spawnFish();
      this.spawnFrogs();
      this.spawnPigs();
      this.spawnSheeps();
      this.spawnParrots();
      this.spawnSalesmen(); // Spawnear vendedores
      this.spawnPedestrians();

      // Asignar misiones DESPUÉS de que los peatones han sido creados
      this.assignQuestsToNPCs();

      // Asignar dueños a las casas DESPUÉS de crear peatones y analizar casas
      if (this.casas.length > 0 && this.peatones.length > 0)
      {
        this.assignHouseOwners();
      }
    } else
    {
      this.spawnFallbackEntities();
    }
  }

  private spawnDogs()
  {
    const dogColors = ['white', 'brown', 'golden', 'black', 'dalmatian'];
    const randomManzana = this.manzanasRegistradas[Math.floor(Math.random() * this.manzanasRegistradas.length)];

    // Spawnear Perro Principal
    let spawnR = randomManzana.r;
    let spawnC = randomManzana.c;
    if (!this.isSafeSpawn(spawnR, spawnC))
    {
      for (let i = 0; i < 5; i++)
      {
        if (this.isSafeSpawn(spawnR + i, spawnC)) { spawnR += i; break; }
        if (this.isSafeSpawn(spawnR, spawnC + i)) { spawnC += i; break; }
      }
    }
    this.dog = new Dog(this.assetManager.dogImage, spawnR, spawnC);

    dogColors.forEach(color =>
    {
      const fileName = `dog_${color}_walk.png`;
      const numDogs = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < numDogs; i++)
      {
        this.spawnEntityInRandomBlock(10, (r, c) =>
        {
          if (this.assetManager.dogImages[fileName])
          {
            this.dogs.push(new Dog(this.assetManager.dogImages[fileName], r, c));
          }
        });
      }
    });
  }

  private spawnCats()
  {
    const catColors = ['white', 'black'];
    catColors.forEach(color =>
    {
      const fileName = `cat_${color}_walk.png`;
      const numCats = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < numCats; i++)
      {
        this.spawnEntityInRandomBlock(10, (r, c) =>
        {
          if (this.assetManager.catImages[fileName])
          {
            this.cats.push(new Cat(this.assetManager.catImages[fileName], r, c));
          }
        });
      }
    });
  }

  private spawnFarmAnimals()
  {
    const fincaIndex = Math.floor(Math.random() * this.manzanasRegistradas.length);
    const finca = this.manzanasRegistradas[fincaIndex];

    // Pollitos
    const totalPollitos = 30;
    const pollitosEnFinca = Math.floor(totalPollitos * 0.8);
    for (let i = 0; i < totalPollitos; i++)
    {
      const useFinca = i < pollitosEnFinca;
      this.spawnEntityInBlock(useFinca ? finca : null, 10, (r, c) =>
      {
        this.chicks.push(new Chicken(this.assetManager.chick_yellow_walking, r, c));
      });
    }

    // Gallinas
    const totalGallinas = 10;
    const gallinasEnFinca = Math.floor(totalGallinas * 0.8);
    for (let i = 0; i < totalGallinas; i++)
    {
      const useFinca = i < gallinasEnFinca;
      this.spawnEntityInBlock(useFinca ? finca : null, 10, (r, c) =>
      {
        this.hens.push(new Hen(this.assetManager.hen_white_walking, r, c));
      });
    }

    // Gallos
    const totalGallos = 3;
    for (let i = 0; i < totalGallos; i++)
    {
      const useFinca = i < 2;
      this.spawnEntityInBlock(useFinca ? finca : null, 10, (r, c) =>
      {
        if (this.assetManager.rooster_white_walking)
        {
          this.roosters.push(new Rooster(this.assetManager.rooster_white_walking, r, c));
        }
      });
    }
  }

  private spawnTurkens()
  {
    if (!this.assetManager.hen_turken_walking) return;

    const numTurkens = Math.floor(Math.random() * 11) + 5; // Entre 5 y 15 gallinas Turken
    for (let i = 0; i < numTurkens; i++)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        this.hens.push(new Hen(this.assetManager.hen_turken_walking, r, c));
      });
    }
  }

  private spawnRodents()
  {
    const numRatones = Math.floor(Math.random() * 11) + 10;
    for (let i = 0; i < numRatones; i++)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        const img = Math.random() < 0.5 ? this.assetManager.mouse_white_walking : this.assetManager.mouse_gray_walking;
        this.mice.push(new Mouse(img, r, c));
      });
    }
  }

  private spawnNewAnimals()
  {
    const numWorms = Math.floor(Math.random() * 11) + 50; // Generar entre 50 y 60 lombrices
    for (let i = 0; i < numWorms; i++)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        if (this.assetManager.earthworm_pink_moving) this.worms.push(new Worm(this.assetManager.earthworm_pink_moving, r, c));
      });
    }

    // Patos (Cerca de agua o en granjas)
    const numDucks = Math.floor(Math.random() * 20) + 3;
    for (let i = 0; i < numDucks; i++)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        // Lógica de selección de patos
        let selectedImage: HTMLImageElement | null = null;
        let isMale: boolean | undefined;

        // 40% de probabilidad de ser Mallard (Si los assets cargaron correctamente)
        const isMallard = Math.random() < 0.4 && this.assetManager.drake_mallard_walking && this.assetManager.duck_mallard_walking;

        if (isMallard)
        {
          // Asignar sexo aleatoriamente: Macho (Cabeza verde) o Hembra (Café claro)
          isMale = Math.random() < 0.5;
          selectedImage = isMale ? this.assetManager.drake_mallard_walking : this.assetManager.duck_mallard_walking;
        } else
        {
          // Selección aleatoria de variante genérica (Drakes originales)
          const genericDuckImages = [
            this.assetManager.drake_white_walking,
            this.assetManager.drake_black_walking,
            this.assetManager.drake_brown_walking
          ].filter(img => img);

          if (genericDuckImages.length > 0)
          {
            selectedImage = genericDuckImages[Math.floor(Math.random() * genericDuckImages.length)];
          }
        }

        if (selectedImage)
        {
          const duck = new Duck(selectedImage, r, c);
          if (isMale !== undefined)
          {
            duck.isMale = isMale;
          }
          this.ducks.push(duck);
        }
      });
    }

    // --- LÓGICA DE PATITOS DIVIDIDA ---
    const totalDucklings = Math.floor(Math.random() * 100) + 90;
    const lakeEdgeDucklings = Math.floor(totalDucklings * 0.5);
    const randomDucklings = totalDucklings - lakeEdgeDucklings;

    const lakeEdgeTiles = this.getLakeEdgeTiles();

    // 1. Spawn 50% cerca del lago
    if (lakeEdgeTiles.length > 0)
    {
      for (let i = 0; i < lakeEdgeDucklings; i++)
      {
        const spot = lakeEdgeTiles[Math.floor(Math.random() * lakeEdgeTiles.length)];
        if (this.assetManager.duckling_yellow_walking && this.assetManager.duckling_yellow_walking && this.assetManager.duckling_yellow_swimming)
        {
          this.ducklings.push(new Duckling(this.assetManager.duckling_yellow_walking, this.assetManager.duckling_yellow_swimming, spot.r, spot.c));
        }
      }
    } else
    {
      // Fallback: si no hay bordes de lago, los spawneamos aleatoriamente
      for (let i = 0; i < lakeEdgeDucklings; i++)
      {
        this.spawnEntityInRandomBlock(10, (r, c) =>
        {
          if (this.assetManager.duckling_yellow_walking && this.assetManager.duckling_yellow_walking && this.assetManager.duckling_yellow_swimming)
          {
            this.ducklings.push(new Duckling(this.assetManager.duckling_yellow_walking, this.assetManager.duckling_yellow_swimming, r, c));
          }
        });
      }
    }

    // 2. Spawn el 50% restante aleatoriamente en el mapa
    for (let i = 0; i < randomDucklings; i++)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        if (this.assetManager.duckling_yellow_walking && this.assetManager.duckling_yellow_walking && this.assetManager.duckling_yellow_swimming)
        {
          this.ducklings.push(new Duckling(this.assetManager.duckling_yellow_walking, this.assetManager.duckling_yellow_swimming, r, c));
        }
      });
    }
  }

  private spawnRabbits()
  {
    const rabbitTypes: { walk: HTMLImageElement, jump: HTMLImageElement }[] = [];
    if (this.assetManager.rabbit_white_walking && this.assetManager.rabbit_white_jumping)
    {
      rabbitTypes.push({
        walk: this.assetManager.rabbit_white_walking,
        jump: this.assetManager.rabbit_white_jumping
      });
    }
    if (this.assetManager.rabbit_black_walking && this.assetManager.rabbit_black_jumping)
    {
      rabbitTypes.push({
        walk: this.assetManager.rabbit_black_walking,
        jump: this.assetManager.rabbit_black_jumping
      });
    }

    if (rabbitTypes.length === 0) return;

    const numRabbits = Math.floor(Math.random() * 15) + 5; // Entre 5 y 19 conejos
    for (let i = 0; i < numRabbits; i++)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        const chosenRabbit = rabbitTypes[Math.floor(Math.random() * rabbitTypes.length)];
        this.rabbits.push(new Rabbit(chosenRabbit.walk, r, c));
      });
    }
  }

  private spawnFish()
  {
    // FIX: Buscar el asset de forma robusta (Propiedad directa O Mapa de tiles O getImage)
    const fishAsset = this.assetManager.fish_orange_jumping || this.assetManager.getImage('fish_orange_jumping') || this.assetManager.tileImages['fish_orange_jumping.png'];
    if (!fishAsset) return;
    if (!fishAsset || fishAsset.naturalWidth === 0) return; // Validar que la imagen tenga contenido

    const waterTiles: { r: number, c: number }[] = [];
    for (let r = 0; r < this.GRID_ROWS; r++)
    {
      for (let c = 0; c < this.GRID_COLS; c++)
      {
        if (this.tileGrid[r][c] && this.tileGrid[r][c].fileName.includes('water_blue_type'))
        {
          waterTiles.push({ r, c });
        }
      }
    }
    const numPeces = Math.min(waterTiles.length, 15);
    for (let i = 0; i < numPeces; i++)
    {
      const spot = waterTiles[Math.floor(Math.random() * waterTiles.length)];
      // FIX: Pasar coordenadas en píxeles (x, y) en lugar de grid (r, c)
      this.fish.push(new Fish(fishAsset, spot.c * this.TILE_SIZE, spot.r * this.TILE_SIZE));
    }
  }

  private spawnFrogs()
  {
    const frogSprite = this.assetManager.frog_green_jumping;
    const frogConfig = this.assetManager.getAnimalConfig('frog_green_jumping.png');
    if (!frogSprite || !frogConfig) return;

    const lakeEdgeTiles = this.getLakeEdgeTiles();
    if (lakeEdgeTiles.length === 0) return;

    const numFrogs = Math.floor(Math.random() * 15) + 10; // Between 10 and 24 frogs

    for (let i = 0; i < numFrogs; i++)
    {
      const spot = lakeEdgeTiles[Math.floor(Math.random() * lakeEdgeTiles.length)];
      this.frogs.push(new Frog(frogSprite, spot.r, spot.c, frogConfig));
    }
  }

  private spawnPigs()
  {
    const pigSprite = this.assetManager.pig_pink_walking;
    const pigConfig = this.assetManager.getAnimalConfig('pig_pink_walking.png');
    if (!pigSprite || !pigConfig) return;

    // Generamos entre 3 y 6 cerdos
    const numPigs = Math.floor(Math.random() * 4) + 3;

    for (let i = 0; i < numPigs; i++)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        this.pigs.push(new Pig(pigSprite, r, c, pigConfig));
      });
    }
  }

  private spawnSheeps()
  {
    const sheepSprite = this.assetManager.getImage('sheep_white_walking');
    const sheepConfig = this.assetManager.getAnimalConfig('sheep_white_walking.png');
    if (!sheepSprite || !sheepConfig) return;

    // Generamos entre 3 y 7 ovejas
    const numSheeps = Math.floor(Math.random() * 5) + 3;

    for (let i = 0; i < numSheeps; i++)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        // Pasamos la configuración al constructor
        this.sheeps.push(new Sheep(sheepSprite, r, c, sheepConfig));
      });
    }
  }

  private spawnParrots()
  {
    const parrotSprite = this.assetManager.getImage('parrotImage'); // Usa la key de AssetManager
    const parrotFlySprite = this.assetManager.getImage('parrotFlyImage');
    const parrotConfig = this.assetManager.getAnimalConfig('parrot_green_walk.png');
    if (!parrotSprite || !parrotFlySprite || !parrotConfig) return;

    // Generar entre 2 y 5 loros
    const numParrots = Math.floor(Math.random() * 4) + 2;

    for (let i = 0; i < numParrots; i++)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        this.parrots.push(new Parrot(parrotSprite, parrotFlySprite, r, c, parrotConfig));
      });
    }
  }

  private spawnSalesmen()
  {
    // Buscar tiles de tipo 'market_stand' para colocar a los vendedores
    const marketSpots: { r: number, c: number }[] = [];
    for (let r = 0; r < this.GRID_ROWS; r++)
    {
      for (let c = 0; c < this.GRID_COLS; c++)
      {
        if (this.tileGrid[r][c] && this.tileGrid[r][c].type === 'market_stand')
        {
          marketSpots.push({ r, c });
        }
      }
    }

    // Spawnear Granpa (Salesman) y Granma (Saleswoman) en frente de los puestos
    if (marketSpots.length > 0)
    {
      // Granpa en el primer puesto encontrado
      const spot1 = marketSpots[0];
      // Posicionar en frente del puesto (que mide 2x2 tiles) y centrado
      const salesmanX1 = (spot1.c * this.TILE_SIZE) + 32; // Centrado en el puesto de 128px
      const salesmanY1 = (spot1.r + 2) * this.TILE_SIZE; // Justo debajo del puesto
      this.salesmen.push(new Salesman(this.assetManager, salesmanX1, salesmanY1, 'salesman'));
      console.log(`NPC Salesman (Granpa) creado en frente de [${spot1.r}, ${spot1.c}]`);

      // Granma en el segundo puesto (o al lado si solo hay uno)
      if (marketSpots.length > 1)
      {
        const spot2 = marketSpots[1];
        const salesmanX2 = (spot2.c * this.TILE_SIZE) + 32;
        const salesmanY2 = (spot2.r + 2) * this.TILE_SIZE;
        this.salesmen.push(new Salesman(this.assetManager, salesmanX2, salesmanY2, 'saleswoman'));
        console.log(`NPC Saleswoman (Granma) creada en frente de [${spot2.r}, ${spot2.c}]`);
      } else
      {
        this.salesmen.push(new Salesman(this.assetManager, salesmanX1 + 64, salesmanY1, 'saleswoman'));
        console.log(`NPC Saleswoman (Granma) creada junto a Granpa en el único puesto.`);
      }

      // Crear entidades lógicas de MarketStand para el sistema de comercio
      marketSpots.forEach((spot, index) =>
      {
        const tile = this.tileGrid[spot.r][spot.c];
        let standType = 'general';
        if (tile && tile.fileName)
        {
          // Extract type from filename: marketStand_fruits_type01.png -> fruits
          const match = tile.fileName.match(/marketStand_([a-zA-Z]+)_/);
          if (match)
          {
            standType = match[1].toLowerCase();
          }
        }
        const standX = spot.c * this.TILE_SIZE;
        const standY = spot.r * this.TILE_SIZE;
        // Creamos la entidad lógica. El ID es único basado en coordenadas.
        const standEntity = new MarketStandEntity(`stand_${spot.r}_${spot.c}`, this.economyService, standX, standY, standType);

        // Opcional: Llenar inventario inicial si fuera necesario, aunque el TradePanel usa items estáticos por ahora.
        this.marketStands.push(standEntity);
      });
    }
  }

  private spawnPedestrians()
  {
    if (this.assetManager.man09_walking)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        const npc = new Pederestian(
          this.assetManager.man09_walking,
          r,
          c,
          this.assetManager.man09_carrySmallGreenImage,
          this.assetManager.man09_carryCardboardBoxImage // Pasamos la nueva imagen de la caja
        );
        npc.name = this.nameGenerator.generarNombreNPC('male');
        this.peatones.push(npc);
        console.log(`NPC Creado: ${npc.name} (${npc.identifier})`);
      });
    }
    if (this.assetManager.man08_walking)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        const npc = new Pederestian(this.assetManager.man08_walking, r, c);
        npc.name = this.nameGenerator.generarNombreNPC('male');
        this.peatones.push(npc);
        //console.log(`NPC Creado: ${npc.name} (${npc.identifier})`);
      });
    }
    if (this.assetManager.woman07_walking)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        const npc = new Pederestian(this.assetManager.woman07_walking, r, c, this.assetManager.woman07CarrySmallGreenImage);
        npc.name = this.nameGenerator.generarNombreNPC('female');
        this.peatones.push(npc);
        //console.log(`NPC Creado: ${npc.name} (${npc.identifier})`);
      });
    }
    if (this.assetManager.woman01_walking)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        const npc = new Pederestian(this.assetManager.woman01_walking, r, c);
        npc.name = this.nameGenerator.generarNombreNPC('female');
        this.peatones.push(npc);
        //console.log(`NPC Creado: ${npc.name} (${npc.identifier})`);
      });
    }
    if (this.assetManager.woman02_walking)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        const npc = new Pederestian(this.assetManager.woman02_walking, r, c);
        npc.name = this.nameGenerator.generarNombreNPC('female');
        this.peatones.push(npc);
        console.log(`NPC Creado: ${npc.name} (${npc.identifier})`);
      });
    }
    if (this.assetManager.woman03_walking)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        const npc = new Pederestian(this.assetManager.woman03_walking, r, c);
        npc.name = this.nameGenerator.generarNombreNPC('female');
        this.peatones.push(npc);
        //console.log(`NPC Creado: ${npc.name} (${npc.identifier})`);
      });
    }
    if (this.assetManager.woman05_walking)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        const npc = new Pederestian(this.assetManager.woman05_walking, r, c);
        npc.name = this.nameGenerator.generarNombreNPC('female');
        this.peatones.push(npc);
        console.log(`NPC Creado: ${npc.name} (${npc.identifier})`);
      });
    }
    if (this.assetManager.woman06_walking)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        const npc = new Pederestian(this.assetManager.woman06_walking, r, c);
        npc.name = this.nameGenerator.generarNombreNPC('female');
        this.peatones.push(npc);
        console.log(`NPC Creado: ${npc.name} (${npc.identifier})`);
      });
    }
    if (this.assetManager.woman10_walking)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        const npc = new Pederestian(this.assetManager.woman10_walking, r, c);
        npc.name = this.nameGenerator.generarNombreNPC('female');
        this.peatones.push(npc);
        console.log(`NPC Creado: ${npc.name} (${npc.identifier})`);
      });
    }
    if (this.assetManager.woman11_walking)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        const npc = new Pederestian(this.assetManager.woman11_walking, r, c);
        npc.name = this.nameGenerator.generarNombreNPC('female');
        this.peatones.push(npc);
        console.log(`NPC Creado: ${npc.name} (${npc.identifier})`);
      });
    }
    if (this.assetManager.man01_walking)
    { // Asumiendo que tienes un asset man01_walking
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        const npc = new Pederestian(this.assetManager.man01_walking, r, c);
        npc.name = this.nameGenerator.generarNombreNPC('male');
        this.peatones.push(npc);
        //console.log(`NPC Creado: ${npc.name} (${npc.identifier})`);
      });
    }
    if (this.assetManager.man02_walking)
    {
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        const npc = new Pederestian(this.assetManager.man02_walking, r, c);
        npc.name = this.nameGenerator.generarNombreNPC('male');
        this.peatones.push(npc);
        //console.log(`NPC Creado: ${npc.name} (${npc.identifier})`);
      });
    }
    if (this.assetManager.man03_walking)
    { // Asumiendo que tienes un asset man03_walking
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        const npc = new Pederestian(this.assetManager.man03_walking, r, c);
        npc.name = this.nameGenerator.generarNombreNPC('male');
        this.peatones.push(npc);
        //console.log(`NPC Creado: ${npc.name} (${npc.identifier})`);
      });
    }
    if (this.assetManager.man04_walking)
    { // Asumiendo que tienes un asset man03_walking
      this.spawnEntityInRandomBlock(10, (r, c) =>
      {
        const npc = new Pederestian(this.assetManager.man04_walking, r, c);
        npc.name = this.nameGenerator.generarNombreNPC('male');
        this.peatones.push(npc);
        console.log(`NPC Creado: ${npc.name} (${npc.identifier})`);
      });
    }
  }

  private assignQuestsToNPCs()
  {
    // Asigna misiones disponibles a los NPCs que no tengan una
    const allNPCs = [...this.peatones, ...this.salesmen];
    allNPCs.forEach(npc =>
    {
      if (!npc.quest)
      {
        const quest = this.questManager.getQuestForGiver(npc.id);
        if (quest)
        {
          npc.quest = quest;
          // Log de depuración para pruebas de misiones
          /*console.log(`%c[PRUEBA DE MISIÓN]%c Busca a ${npc.name} ('${npc.identifier}', ID: ${npc.id}). Te ofrecerá la misión: "${quest.title}"`, 
            'background: #222; color: #bada55; font-weight: bold; padding: 2px 4px; border-radius: 3px;', 
            'color: default;');*/
        }
      }
    });
  }

  private assignHouseOwners()
  {
    this.houseOwnerFaces.clear();
    // Combinar peatones y vendedores para que los abuelos también puedan tener casa
    const allNPCs = [...this.peatones, ...this.salesmen];
    if (allNPCs.length === 0) return;

    // 1. Filtrar solo NPCs adultos (man..., woman..., grandpa..., grandma...)
    const eligibleOwners = allNPCs.filter(p =>
      p.identifier.toLowerCase().startsWith('man') ||
      p.identifier.toLowerCase().startsWith('woman') ||
      p.identifier.toLowerCase().startsWith('grandpa') ||
      p.identifier.toLowerCase().startsWith('grandma')
    );

    // 2. Mezclar la lista de dueños elegibles
    const owners = [...eligibleOwners].sort(() => Math.random() - 0.5);

    // 3. Asignar dueños 1 a 1. Si hay más casas que dueños, quedan libres.
    this.casas.forEach((casa, index) =>
    {
      if (index < owners.length)
      {
        const owner = owners[index];
        casa.owner = owner;

        const ownerFaceImage = this.assetManager.npcFaceImages[owner.faceId];
        // Verificar que la imagen exista y se haya cargado correctamente
        if (ownerFaceImage && ownerFaceImage.naturalWidth > 0)
        {
          this.houseOwnerFaces.set(casa.data.id, ownerFaceImage);
        }
      } else
      {
        casa.owner = null;
      }
    });
  }

  private spawnFallbackEntities()
  {
    this.dog = new Dog(this.assetManager.dogImage, 10, 10);
    const dogColors = ['white', 'brown', 'golden', 'black', 'dalmatian'];
    dogColors.forEach(color =>
    {
      const fileName = `dog_${color}_walk.png`;
      const numDogs = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < numDogs; i++)
      {
        if (this.assetManager.dogImages[fileName])
        {
          this.dogs.push(new Dog(this.assetManager.dogImages[fileName], 10 + i, 10 + i));
        }
      }
    });

    for (let i = 0; i < 30; i++) this.chicks.push(new Chicken(this.assetManager.chick_yellow_walking, 10, 10));
    for (let i = 0; i < 10; i++) this.hens.push(new Hen(this.assetManager.hen_white_walking, 10, 10));
    if (this.assetManager.hen_turken_walking) for (let i = 0; i < 5; i++) this.hens.push(new Hen(this.assetManager.hen_turken_walking, 10, 10));
    for (let i = 0; i < 3; i++) if (this.assetManager.rooster_white_walking) this.roosters.push(new Rooster(this.assetManager.rooster_white_walking, 10, 10));
    for (let i = 0; i < 15; i++) this.mice.push(new Mouse(this.assetManager.mouse_white_walking, 10, 10));
    for (let i = 0; i < 50; i++) if (this.assetManager.earthworm_pink_moving) this.worms.push(new Worm(this.assetManager.earthworm_pink_moving, 10, 10));
    for (let i = 0; i < 5; i++) if (this.assetManager.drake_white_walking) this.ducks.push(new Duck(this.assetManager.drake_white_walking, 10, 10));
    if (this.assetManager.rabbit_white_walking && this.assetManager.rabbit_white_jumping && this.assetManager.rabbit_white_walking && this.assetManager.rabbit_white_jumping) for (let i = 0; i < 10; i++) this.rabbits.push(new Rabbit(this.assetManager.rabbit_white_walking, 12, 12));
    const frogImg = this.assetManager.frog_green_jumping;
    const frogConfig = this.assetManager.getAnimalConfig('frog_green.png');
    if (frogImg && frogConfig) for (let i = 0; i < 10; i++) this.frogs.push(new Frog(frogImg, 11, 11, frogConfig));
    const pigImg = this.assetManager.pig_pink_walking;
    const pigConfig = this.assetManager.getAnimalConfig('pig_pink_walk.png');
    if (pigImg && pigConfig) for (let i = 0; i < 5; i++) this.pigs.push(new Pig(pigImg, 11, 11, pigConfig));
    const sheepImg = this.assetManager.getImage('sheep_white_walk');
    const sheepConfig = this.assetManager.getAnimalConfig('sheep_white_walk.png');
    if (sheepImg && sheepConfig) for (let i = 0; i < 5; i++) this.sheeps.push(new Sheep(sheepImg, 12, 11, sheepConfig));
    const parrotImg = this.assetManager.getImage('parrotImage');
    const parrotFlyImg = this.assetManager.getImage('parrotFlyImage');
    const parrotConfig = this.assetManager.getAnimalConfig('parrot_green_walk.png');
    if (parrotImg && parrotFlyImg && parrotConfig) for (let i = 0; i < 3; i++) this.parrots.push(new Parrot(parrotImg, parrotFlyImg, 13, 13, parrotConfig));
  }

  private spawnEntityInRandomBlock(maxAttempts: number, callback: (r: number, c: number) => void)
  {
    this.spawnEntityInBlock(null, maxAttempts, callback);
  }

  private spawnEntityInBlock(block: { r: number, c: number, w: number, h: number } | null, maxAttempts: number, callback: (r: number, c: number) => void)
  {
    let attempts = 0;
    let placed = false;
    while (attempts < maxAttempts && !placed)
    {
      const m = block || this.manzanasRegistradas[Math.floor(Math.random() * this.manzanasRegistradas.length)];
      const r = m.r + Math.floor(Math.random() * m.h);
      const c = m.c + Math.floor(Math.random() * m.w);
      if (this.isSafeSpawn(r, c))
      {
        callback(r, c);
        placed = true;
      }
      attempts++;
    }
  }

  // --------------------------------------------------------------------------
  // Lógica del NPC
  // --------------------------------------------------------------------------

  private findDoors()
  {
    this.doors = [];
    for (let r = 0; r < this.GRID_ROWS; r++)
    {
      for (let c = 0; c < this.GRID_COLS; c++)
      {
        const tile = this.tileGrid[r][c];
        if (tile && tile.type === 'door')
        {
          this.doors.push({ r, c });
        }
      }
    }
  }

  private startNPC()
  {
    if (this.doors.length < 2) return;

    // Aparecer en una puerta aleatoria
    const startDoor = this.doors[Math.floor(Math.random() * this.doors.length)];
    this.npcX = startDoor.c * this.TILE_SIZE;
    this.npcY = startDoor.r * this.TILE_SIZE;
    this.npcVisible = true;

    this.pickNewNPCTarget();
  }

  private pickNewNPCTarget()
  {
    if (this.doors.length < 2) return;

    let targetDoor;
    // Elegir un destino diferente al actual (aproximado)
    let attempts = 0;
    do
    {
      targetDoor = this.doors[Math.floor(Math.random() * this.doors.length)];
      attempts++;
    } while (
      attempts < 10 &&
      Math.abs(targetDoor.c * this.TILE_SIZE - this.npcX) < this.TILE_SIZE &&
      Math.abs(targetDoor.r * this.TILE_SIZE - this.npcY) < this.TILE_SIZE
    );

    this.npcTarget = targetDoor;

    // Calcular ruta usando BFS
    const startNode = { r: Math.round(this.npcY / this.TILE_SIZE), c: Math.round(this.npcX / this.TILE_SIZE) };
    this.npcPath = this.findPath(startNode, targetDoor);
  }

  private findPath(start: { r: number, c: number }, end: { r: number, c: number }): { r: number, c: number }[]
  {
    // BFS simple para encontrar ruta
    const queue = [{ ...start, path: [] as { r: number, c: number }[] }];
    const visited = new Set<string>();
    visited.add(`${start.r},${start.c}`);

    // Límite de iteraciones para evitar bloqueos en mapas complejos
    let iterations = 0;
    const MAX_ITERATIONS = 5000;

    while (queue.length > 0 && iterations < MAX_ITERATIONS)
    {
      iterations++;
      const { r, c, path } = queue.shift()!;

      if (r === end.r && c === end.c)
      {
        return path;
      }

      const neighbors = [
        { r: r - 1, c }, { r: r + 1, c },
        { r, c: c - 1 }, { r, c: c + 1 }
      ];

      for (const n of neighbors)
      {
        if (n.r >= 0 && n.r < this.GRID_ROWS && n.c >= 0 && n.c < this.GRID_COLS)
        {
          const key = `${n.r},${n.c}`;
          if (!visited.has(key))
          {
            const tile = this.tileGrid[n.r][n.c];
            // Es caminable si el tile lo permite.
            // Nota: Las puertas son 'walkable', así que el NPC puede entrar en ellas.
            if (tile && tile.walkable)
            {
              visited.add(key);
              queue.push({ r: n.r, c: n.c, path: [...path, { r: n.r, c: n.c }] });
            }
          }
        }
      }
    }
    return []; // No se encontró ruta
  }

  private updateNPC(dt: number)
  {
    // Lógica de Persecución (Debug)
    if (this.debugNPCsChasePlayer && this.npcVisible && this.player)
    {
      const dx = this.player.x - this.npcX;
      const dy = this.player.y - this.npcY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let moved = false;
      if (dist > 64)
      {
        let nextX = this.npcX;
        let nextY = this.npcY;

        if (Math.abs(dx) > Math.abs(dy))
        {
          if (dx > 0) { nextX += this.NPC_SPEED * dt; this.npcDirection = 3; }
          else { nextX -= this.NPC_SPEED * dt; this.npcDirection = 1; }
        } else
        {
          if (dy > 0) { nextY += this.NPC_SPEED * dt; this.npcDirection = 2; }
          else { nextY -= this.NPC_SPEED * dt; this.npcDirection = 0; }
        }

        // Chequeo de colisión
        const c = Math.floor((nextX + 32) / this.TILE_SIZE);
        const r = Math.floor((nextY + 63) / this.TILE_SIZE); // Pies del sprite

        if (r >= 0 && r < this.GRID_ROWS && c >= 0 && c < this.GRID_COLS && this.tileGrid[r][c] && this.tileGrid[r][c].walkable)
        {
          this.npcX = nextX;
          this.npcY = nextY;
          moved = true;
        }
      }

      // Animación simple
      if (moved)
      {
        const ANIMATION_SPEED = 8;
        if (Date.now() % (ANIMATION_SPEED * 20) < 20)
        {
          this.npcCurrentFrame = (this.npcCurrentFrame + 1) % 9;
        }
      }
      // Continuar con la lógica de interacción (recoger limones) más abajo...
    } else
    {
      // Lógica Normal (Caminar entre puertas)
      if (!this.npcVisible || !this.npcTarget) return;

      // Si no hay ruta o ya llegamos
      if (this.npcPath.length === 0)
      {
        this.handleNPCArrival();
        return;
      }

      const nextStep = this.npcPath[0];
      const targetX = nextStep.c * this.TILE_SIZE;
      const targetY = nextStep.r * this.TILE_SIZE;

      let moved = false;
      // Movimiento simple hacia el siguiente tile
      if (this.npcX < targetX) { this.npcX += this.NPC_SPEED * dt; this.npcDirection = 3; moved = true; }
      else if (this.npcX > targetX) { this.npcX -= this.NPC_SPEED * dt; this.npcDirection = 1; moved = true; }

      if (this.npcY < targetY) { this.npcY += this.NPC_SPEED * dt; this.npcDirection = 2; moved = true; }
      else if (this.npcY > targetY) { this.npcY -= this.NPC_SPEED * dt; this.npcDirection = 0; moved = true; }

      // Si estamos lo suficientemente cerca del centro del tile objetivo, pasamos al siguiente
      // Usamos un umbral un poco mayor para evitar oscilaciones con dt
      if (Math.abs(this.npcX - targetX) <= (this.NPC_SPEED * dt * 1.5) && Math.abs(this.npcY - targetY) <= (this.NPC_SPEED * dt * 1.5))
      {
        this.npcX = targetX;
        this.npcY = targetY;
        this.npcPath.shift(); // Eliminar paso completado
      }

      // Animación
      if (moved)
      {
        const ANIMATION_SPEED = 8; // Valor que estaba antes en la clase
        // Usamos un contador simple para la animación, independiente del PC
        if (Date.now() % (ANIMATION_SPEED * 20) < 20)
        { // Truco simple para animar sin otro timer
          this.npcCurrentFrame = (this.npcCurrentFrame + 1) % 9; // 9 columnas de frames en el spritesheet
        }
      }
    } // Fin else (Lógica Normal)

    // Lógica de Interacción (Recoger/Lanzar Limón)
    this.npcActionTimer += dt;
    if (this.npcActionTimer > 0.5)
    { // Revisar cada ~0.5 segundos
      this.npcActionTimer = 0;
      this.checkNPCInteraction();
    }
  }

  private handleNPCArrival()
  {
    // Ha llegado a la puerta (o final de ruta)
    this.npcVisible = false;

    // Reaparecer en max 5 segundos
    const delay = Math.random() * 5000;
    setTimeout(() =>
    {
      this.respawnNPC();
    }, delay);
  }

  private checkNPCInteraction() 
  {
    const c = Math.floor((this.npcX + 32) / this.TILE_SIZE);
    // Ajuste: Usar el centro vertical (+32) en lugar del fondo (+64) para detectar el tile actual correctamente
    const r = Math.floor((this.npcY + 32) / this.TILE_SIZE);

    if (r < 0 || r >= this.GRID_ROWS || c < 0 || c >= this.GRID_COLS) return;
    const tile = this.tileGrid[r][c];
    if (!tile) return;

    // 50% de probabilidad de ejecutar la acción
    if (Math.random() > 0.5) return;

    if (this.npcIsCarrying) 
    {
      // Intentar LANZAR (Drop)
      // Se puede soltar si el suelo es caminable y no hay obstáculo (limón, caja, muro)
      //if (tile.walkable && tile.type !== 'lemon' && tile.type !== 'cardboardbox' && tile.type !== 'woodbox') {
      if (tile.walkable && tile.type !== 'cardboardbox' && tile.type !== 'woodbox') 
      {
        this.npcIsCarrying = false;
        // Colocar limón en el suelo
        this.tileGrid[r][c] = {
          fileName: 'lemon.png',
          type: 'lemon',
          walkable: true,
          underlyingTile: { ...tile } // Preservar lo que había abajo
        };
      }
    }
    else 
    {
      // Intentar RECOGER (Pick Up)
      if (tile.type === 'lemon') 
      {
        this.npcIsCarrying = true;
        // Restaurar el tile que había debajo del limón
        if (tile.underlyingTile) 
        {
          this.tileGrid[r][c] = tile.underlyingTile;
        } else
        {
          // Fallback por seguridad
          this.tileGrid[r][c] = { fileName: 'grass_green_type01.png', type: 'floor', walkable: true, color: null };
        }
      }
    }
  }

  private respawnNPC()
  {
    if (this.doors.length === 0) return;

    // Elegir nueva puerta de inicio
    const startDoor = this.doors[Math.floor(Math.random() * this.doors.length)];
    this.npcX = startDoor.c * this.TILE_SIZE;
    this.npcY = startDoor.r * this.TILE_SIZE;
    this.npcVisible = true;

    // Elegir nuevo destino
    this.pickNewNPCTarget();
  }

  private gameLoop(timestamp: number = 0) 
  {
    // BLINDAJE CICLO DE VIDA: Si el componente se destruyó, detenemos el loop.
    if (this.isDestroyed) return;

    // BLINDAJE DEL LOOP: Si el jugador no se ha instanciado (carga de assets en proceso),
    // saltamos este frame pero mantenemos el bucle vivo.
    if (!this.player)
    {
      requestAnimationFrame((t) => this.gameLoop(t));
      return;
    }

    // CONTROL DE FPS: Calculamos el tiempo transcurrido desde el último frame
    const elapsed = timestamp - this.lastFrameTime;

    // Si no ha pasado suficiente tiempo para un nuevo frame (16.6ms), esperamos.
    if (elapsed < this.FRAME_INTERVAL)
    {
      requestAnimationFrame((t) => this.gameLoop(t));
      return;
    }

    // Calculamos Delta Time en segundos
    // Blindaje: Limitamos dt a 0.1s (10 FPS) para evitar atravesar paredes (Tunneling)
    const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);

    // Ajustamos el tiempo del último frame restando el remanente para evitar "drift" (desfase)
    this.lastFrameTime = timestamp - (elapsed % this.FRAME_INTERVAL);

    // Si estamos en interior, usamos lógica simplificada
    if (this.gameState === 'INTERIOR') 
    {
      this.updateInterior(dt);
      this.renderer.drawInterior(
        this.canvasWidth,
        this.canvasHeight,
        this.interiorGrid,
        this.player,
        this.currentInteriorFloor,
        this.player.isSitting
      );
    }
    else 
    {
      this.update(dt);

      let allEntities: any[] = [
        this.dog, ...this.dogs, ...this.peatones, ...this.cats,
        ...this.chicks, ...this.hens, ...this.roosters, ...this.ducks, ...this.mice,
        ...this.fish, ...this.ducklings, ...this.salesmen, ...this.worms, ...this.frogs, ...this.pigs, ...this.sheeps, ...this.parrots,
        ...this.rabbits
      ].filter(e => e); // Filtra nulos/undefined

      // FIX CRÍTICO: Wrapper para corregir el Z-Index de los peces al saltar
      // Cuando el pez salta, su 'y' disminuye (sube), lo que hace que el renderer lo ordene DETRÁS del agua.
      // Este wrapper reporta una 'y' falsa (en el suelo) para el ordenamiento, pero dibuja el pez real.
      allEntities = allEntities.map(entity =>
      {
        if (entity instanceof Fish)
        {
          return {
            // Propiedades Proxy para el Renderer
            x: entity.x,
            // Truco: Sumamos 64px a la Y de ordenamiento para asegurar que se dibuje ENCIMA del tile de agua de donde sale
            y: entity.y + 64,
            spriteWidth: 64,
            spriteHeight: 64,
            showQuestIndicator: false,
            // El método draw llama al original, que usa la 'y' real (saltando)
            draw: (ctx: CanvasRenderingContext2D) => entity.draw(ctx)
          };
        }
        return entity;
      });

      // Ordenar entidades por posición Y para el efecto de profundidad (Z-sorting)
      allEntities.sort((a: any, b: any) => a.y - b.y);

      this.renderer.drawWorld(
        this.cameraX, this.cameraY, this.canvasWidth, this.canvasHeight, this.GRID_ROWS, this.GRID_COLS, this.tileGrid, this.player, allEntities, this.floatingLootItems, this.breadCrumbs, this.overlayAlpha, this.gameTimeMinutes, this.waterFrame, this.waterfallFrame, this.necesidades, this.isSleeping, undefined, this.houseOwnerFaces
      );

      // Dibujar charcos en el suelo
      if (this.puddles.length > 0)
      {
        this.drawPuddles();
      }

      // Dibujar la lluvia encima de todo si está lloviendo y estamos en el mundo exterior
      if (this.isRaining)
      {
        this.drawRain();
      }
    }

    // Pedimos al navegador que vuelva a llamar a gameLoop para el siguiente frame
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  private updateGameTime() 
  {
    const now = Date.now();
    if (now - this.lastTimeUpdate < 1000) return;
    this.lastTimeUpdate = now;

    this.gameTimeMinutes = (this.gameTimeMinutes + 1) % 1440;
    this.totalGameMinutes++;

    // 1. Stats Manager (Energía)
    if (this.player)
    {
      const statsResult = this.statsManager.updateNeeds(this.necesidades, this.isSleeping, this.totalGameMinutes, this.player);
      this.necesidades = statsResult.nuevasNecesidades;
      this.isSleeping = statsResult.shouldSleep;
      this.handleForcedSleepLogic();
    }

    // 2. Census Manager (Aquí está la magia)
    this.censusReport = this.censusManager.generateReport(
      {
        dogs: [this.dog, ...this.dogs].filter(d => d),
        cats: this.cats.filter(g => g),
        chicks: this.chicks.filter(p => p),
        hens: this.hens.filter(h => h),
        roosters: this.roosters.filter(r => r),
        mice: this.mice.filter(m => m),
        worms: this.worms.filter(w => w),
        ducks: this.ducks.filter(d => d),
        rabbits: this.rabbits.filter(rb => rb),
        frogs: this.frogs.filter(f => f),
        pigs: this.pigs.filter(p => p),
        sheeps: this.sheeps.filter(s => s),
        parrots: this.parrots.filter(p => p)
      });

    // 3. Lógica de Sueño Sentado (Requerimiento de Tarjeta)
    if (this.necesidades.energia <= 15 && !this.isSleeping) 
    {
      this.forceSitSleep();
    }

    // --- Lógica de Lluvia ---
    if (this.isRaining)
    {
      this.rainTimer--;
      if (this.rainTimer <= 0)
      {
        this.stopRain();
      }
    } else if (this.totalGameMinutes >= this.nextRainCheck)
    {
      // 25% de probabilidad de que empiece a llover
      if (Math.random() < 0.25)
      {
        this.startRain();
      } else
      {
        // Si no llueve, volver a comprobar en 1-2 horas de juego
        this.nextRainCheck = this.totalGameMinutes + 60 + Math.floor(Math.random() * 60);
      }
    }
  }

  private updateDayNightCycle()
  {
    const hour = this.gameTimeMinutes / 60;
    if (hour < 5) this.overlayAlpha = 0.7;
    else if (hour < 8) this.overlayAlpha = 0.7 - ((hour - 5) / 3) * 0.7;
    else if (hour < 17) this.overlayAlpha = 0;
    else if (hour < 20) this.overlayAlpha = ((hour - 17) / 3) * 0.7;
    else this.overlayAlpha = 0.7;
  }

  private updateAllEntities(dt: number)
  {
    const player = this.player;
    if (!player) return;

    // Helper para aplicar lógica de refugio o update normal
    const updateAnimal = (animal: any, normalUpdate: () => void) =>
    {
      if (this.handleAnimalShelter(animal, dt)) return;
      normalUpdate();
    };

    if (this.dog) updateAnimal(this.dog, () => { this.dog.update(this.tileGrid, this.buildingGrid); this.dog.checkProximityAndBark(player.x, player.y); });
    this.dogs.forEach(p => updateAnimal(p, () => { p.update(this.tileGrid, this.buildingGrid); p.checkProximityAndBark(player.x, player.y); }));

    // Unificamos peatones y vendedores para que ambos puedan tener misiones y su lógica se actualice
    const allNPCs = [...this.peatones, ...this.salesmen];
    allNPCs.forEach(npc =>
    {
      // Verificar si el NPC tiene una misión ACTIVA (aceptada por el jugador)
      const activeQuest = this.questManager.activeQuests.find(q => q.giverId === npc.id && q.status === 'active');

      if (activeQuest)
      {
        this.handleNPCQuestMovement(npc, dt);
      } else
      {
        // Si no tiene misión activa, limpiamos cualquier target previo y usamos movimiento normal
        if (this.npcTargets.has(npc.id)) this.npcTargets.delete(npc.id);

        // Cada tipo de NPC tiene su propia lógica de actualización de movimiento
        if (npc instanceof Salesman)
        {
          npc.updateRoutine(dt, this.gameTimeMinutes, this.tileGrid);
        } else
        {
          npc.update(this.tileGrid, this.buildingGrid, player.x, player.y, this.debugNPCsChasePlayer);
        }
      }

      // Verificar si este NPC tiene una misión lista para entregar
      const readyQuest = this.questManager.activeQuests.find(q => q.giverId === npc.id && q.status === 'ready');

      if (readyQuest)
      {
        npc.showQuestIndicator = true;
        npc.questIndicatorColor = '#2ecc71'; // Verde
        npc.questIndicatorText = '?'; // Símbolo de interrogación para entregar
      } else if (npc.quest && npc.quest.status === 'inactive')
      {
        // Misión disponible para aceptar
        const dist = Math.sqrt(Math.pow(npc.x - player.x, 2) + Math.pow(npc.y - player.y, 2));
        npc.showQuestIndicator = dist < 128; // Mostrar '!' si el jugador está a menos de 2 tiles
        npc.questIndicatorColor = '#f1c40f'; // Amarillo
        npc.questIndicatorText = '!';
      } else
      {
        npc.showQuestIndicator = false;
      }
    });

    this.cats.forEach(g => updateAnimal(g, () =>
    {
      g.update(this.tileGrid, this.buildingGrid, this.mice, this.chicks, this.hens, this.roosters);
      g.checkProximityAndMeow(player.x, player.y);
    }));

    this.chicks.forEach(p => updateAnimal(p, () =>
    {
      p.update(this.tileGrid, this.buildingGrid, this.hens, this.worms, this.breadCrumbs);
      p.checkProximityAndChirp(player.x, player.y);
    }));

    const findTileWrapper = (name: string) => this.TILE_DEFINITIONS.find(t => t.fileName === name);
    const canLayEggs = this.chicks.length < 50;
    //this.hens.forEach(g => g.update(this.tileGrid, this.buildingGrid, this.hens, findTileWrapper, this.totalGameMinutes, canLayEggs, this.worms));
    this.hens.forEach(g => updateAnimal(g, () =>
    {
      g.update(this.tileGrid, this.buildingGrid, this.hens, findTileWrapper, this.totalGameMinutes, canLayEggs, this.worms, this.breadCrumbs);
      g.checkProximityAndCluck(player.x, player.y);
    }));

    this.roosters.forEach(g => updateAnimal(g, () =>
    {
      g.update(this.tileGrid, this.buildingGrid, this.hens, this.worms);
      g.checkProximityAndCrow(player.x, player.y);
    }));

    this.mice.forEach(r => updateAnimal(r, () => r.update(this.tileGrid, this.buildingGrid)));
    this.worms.forEach(w => w.update(this.tileGrid, this.buildingGrid));
    this.ducks.forEach(d => // Los patos aman la lluvia, no se refugian
    {
      d.update(this.tileGrid, this.buildingGrid, this.worms, this.breadCrumbs);
      d.checkProximityAndQuack(player.x, player.y);
    });
    this.ducklings.forEach(d => 
    {
      d.update(this.tileGrid, this.buildingGrid, this.ducks, this.worms);
      d.checkProximityAndCheep(player.x, player.y);
    });
    this.rabbits.forEach(rb => updateAnimal(rb, () => rb.update(dt, this.tileGrid, this.buildingGrid)));
    this.frogs.forEach(f =>
    {
      // Pasamos la posición del jugador y dt para que la rana pueda reaccionar y animarse
      f.update(this.tileGrid, this.buildingGrid, player.x, player.y, dt, this.worms);
    });
    this.pigs.forEach(p => updateAnimal(p, () => p.update(dt, this.tileGrid, this.buildingGrid)));
    this.sheeps.forEach(s => updateAnimal(s, () => s.update(this.tileGrid, this.buildingGrid)));
    this.parrots.forEach(p => // Los loros se refugian también
    {
      // Pasamos la lista de gatos para que el loro pueda detectarlos
      updateAnimal(p, () => p.update(this.tileGrid, this.buildingGrid, this.cats));
    });
    this.fish.forEach(p => p.update(this.tileGrid));

    // FIX CRÍTICO: Pasar 'dt' al update del pez para que la animación funcione.
    // También limpiamos los peces que han terminado su animación.
    for (let i = this.fish.length - 1; i >= 0; i--)
    {
      const p = this.fish[i];
      p.update(this.tileGrid, dt); // <--- AQUÍ FALTABA EL DT
      if ((p as any).finished)
      {
        this.fish.splice(i, 1);
      }
    }

    this.trees.forEach(t => t.update(this.tileGrid, this.GRID_ROWS, this.GRID_COLS));
    this.checkPlayerWormCollision();
  }

  private handleNPCQuestMovement(npc: Pederestian, dt: number)
  {
    const player = this.player;
    if (!player) return;

    let target = this.npcTargets.get(npc.id);

    // 1. Si no tiene objetivo asignado, buscar uno (Casa o Mercado)
    if (!target)
    {
      target = this.assignQuestTarget(npc);
      if (target)
      {
        this.npcTargets.set(npc.id, target);
        console.log(`[NPC ${npc.name}] Misión aceptada. Esperando en: [${target.r}, ${target.c}]`);
      } else
      {
        // Fallback: Si no encuentra lugar, se queda quieto o deambula
        npc.update(this.tileGrid, this.buildingGrid, player.x, player.y, false);
        return;
      }
    }

    // 2. Si ya llegó, quedarse quieto (Idle)
    if (target.reached)
    {
      npc.currentFrame = 0; // Frame estático
      // Opcional: Mirar hacia el sur (frente) para esperar
      // npc.direction = 2; 
      return;
    }

    // 3. Moverse hacia el objetivo
    const targetX = target.c * this.TILE_SIZE;
    const targetY = target.r * this.TILE_SIZE;

    const dx = targetX - npc.x;
    const dy = targetY - npc.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 60; // Velocidad de caminata (px/s)

    if (dist < 5)
    {
      target.reached = true;
      npc.x = targetX;
      npc.y = targetY;
      npc.currentFrame = 0;
      return;
    }

    // Normalizar y mover
    const moveDist = speed * dt;
    npc.x += (dx / dist) * moveDist;
    npc.y += (dy / dist) * moveDist;

    // Actualizar Dirección
    if (Math.abs(dx) > Math.abs(dy))
    {
      npc.direction = dx > 0 ? 3 : 1;
    } else
    {
      npc.direction = dy > 0 ? 2 : 0;
    }

    // Animación simple (Ciclo de 4 frames)
    const frame = Math.floor(Date.now() / 200) % 4;
    npc.currentFrame = frame;
  }

  private assignQuestTarget(npc: Pederestian): { r: number, c: number, reached: boolean } | undefined
  {
    // Opción 1: Ir a su casa (Nameplate)
    const house = this.casas.find(h => h.owner && h.owner.id === npc.id);
    if (house)
    {
      // Buscar el nameplate alrededor de la casa
      const hData = house.data;
      const searchStartR = Math.max(0, hData.originRow - 1);
      const searchEndR = Math.min(this.GRID_ROWS, hData.originRow + hData.height + 2);
      const searchStartC = Math.max(0, hData.originCol - 1);
      const searchEndC = Math.min(this.GRID_COLS, hData.originCol + hData.width + 2);

      for (let r = searchStartR; r < searchEndR; r++)
      {
        for (let c = searchStartC; c < searchEndC; c++)
        {
          const tile = this.tileGrid[r][c];
          if (tile && tile.type === 'nameplate' && (tile as any).houseId === house.data.id)
          {
            return { r, c, reached: false };
          }
        }
      }
    }

    // Opción 2 (o Fallback): Ir al Mercado
    // Buscar un puesto de mercado aleatorio
    const stands: { r: number, c: number }[] = [];
    for (let r = 0; r < this.GRID_ROWS; r++)
    {
      for (let c = 0; c < this.GRID_COLS; c++)
      {
        if (this.tileGrid[r][c].type === 'market_stand')
        {
          stands.push({ r, c });
        }
      }
    }

    if (stands.length > 0)
    {
      const stand = stands[Math.floor(Math.random() * stands.length)];
      // Objetivo: 2 tiles abajo del puesto (frente al mostrador)
      const targetR = stand.r + 2;
      const targetC = stand.c;
      if (this.isSafeSpawn(targetR, targetC))
      {
        return { r: targetR, c: targetC, reached: false };
      }
    }

    return undefined;
  }

  private checkPlayerWormCollision()
  {
    const player = this.player;
    if (!player) return;
    const playerRect = {
      x: player.x,
      y: player.y,
      width: player.spriteWidth * 0.8,
      height: player.spriteHeight * 0.8
    };

    for (let i = this.worms.length - 1; i >= 0; i--)
    {
      const worm = this.worms[i];
      const wormRect = { x: worm.x, y: worm.y, width: 32, height: 32 };

      if (playerRect.x < wormRect.x + wormRect.width &&
        playerRect.x + playerRect.width > wormRect.x &&
        playerRect.y < wormRect.y + wormRect.height &&
        playerRect.y + playerRect.height > wormRect.y)
      {
        this.worms.splice(i, 1);
        this.questManager.updateKillCount('worm');
      }
    }
  }

  /*private checkQuestInteraction()
  {
    // 1. Evitar conflictos: Si el panel ya está abierto, no hacer nada (o cerrarlo con Escape)
    if (this.questPanel && this.questPanel.visible) return;

    const player = this.player;
    if (!player) return;

    let interactionHandled = false;
    const allQuestGivers = [...this.peatones, ...this.salesmen];

    if (this.questManager) for (const npc of allQuestGivers)
    {
      // 2. Validación de Distancia (Aumentada a 128px para coincidir con el indicador '!')
      const dist = Math.sqrt(Math.pow(npc.x - player.x, 2) + Math.pow(npc.y - player.y, 2));
      if (dist > 128) continue;

      interactionHandled = true;

      // 2. Verificar si hay misión para ENTREGAR (Prioridad)
      const readyQuest = this.questManager.activeQuests.find(q => q.giverId === npc.id && q.status === 'ready');

      // Caso especial: Misión de agua (verificar si tiene la olleta llena en el momento de la entrega)
      const waterQuest = this.questManager.activeQuests.find(q => q.giverId === npc.id && q.id === 'water_delivery_1' && q.status === 'active');
      if (waterQuest && player.isCarryingMetalPitcherFull)
      {
        this.questManager.completeQuest(waterQuest.id);
        console.log(`%c[RECOMPENSA]%c ¡Gracias por el agua! Aquí tienes unas monedas.`,
          'background: #3498db; color: #fff; font-weight: bold; padding: 4px;', 'color: auto');
        player.isCarryingMetalPitcherFull = false; // Entregar item
        player.isCarryingMetalPitcherEmpty = true; // Devolver vacía
        return;
      }

      if (readyQuest)
      {
        this.questManager.completeQuest(readyQuest.id);

        // Lógica de Recompensas Específicas
        if (readyQuest.id === 'cardboard_collection_1')
        {
          console.log(`%c[RECOMPENSA]%c ¡Misión completada! ${npc.identifier} te ha dado una Olleta.`,
            'background: #3498db; color: #fff; font-weight: bold; padding: 4px;', 'color: auto');
          this.spawnRewardPitcher(player.y, player.x);
        } else
        {
          // Recompensa por defecto (Limones)
          const numLemons = Math.floor(Math.random() * 5) + 1;
          console.log(`%c[RECOMPENSA]%c ¡Misión completada! ${npc.identifier} te ha dado ${numLemons} limones.`,
            'background: #2ecc71; color: #000; font-weight: bold; padding: 4px;', 'color: auto');

          this.spawnRewardLemons(player.y, player.x, numLemons);
        }

        return; // Interacción terminada
      }

      // 3. Verificar si hay misión para ACEPTAR
      // 3. Verificar si hay misión para ACEPTAR / REGATEAR
      if (npc.showQuestIndicator && npc.quest)
      {
        if (this.questPanel)
        {
          const questToAccept = npc.quest;
          // Enriquecer la misión con los datos del NPC
          questToAccept.giverName = npc.name;
          questToAccept.giverFaceSrc = this.assetManager.npcFaceImages[npc.faceId]?.src;

          // --- NUEVA LÓGICA CON UI ---
          // Abrimos el panel en lugar de usar prompts
          this.questPanel.open(questToAccept);

          // npc.quest = null; // CORRECCIÓN: No borrar la misión aquí, esperar a que el jugador acepte/rechace en el panel.
        }
        return;
      }

      // 4. Diálogo Genérico (Si no tiene misiones)
      console.log(`%c${npc.name}:%c "¡Hola! Qué buen día hace hoy en la aldea."`,
        'color: #e67e22; font-weight: bold;', 'color: auto;');
      // Aquí podrías añadir un efecto visual o burbuja de texto en el futuro
    }
  }*/

  private checkQuestInteraction()
  {
    console.log('[DEBUG] checkQuestInteraction invocado.');

    // 1. Evitar conflictos: Si el panel ya está abierto, no hacer nada
    if (this.questPanel && this.questPanel.visible) 
    {
      console.log('[DEBUG] Panel ya visible. Interacción cancelada.');
      return;
    }

    const player = this.player;
    if (!player) return;

    // 1. Evitar conflictos y validar estado
    if (!this.questManager) return;

    const INTERACTION_RADIUS = 128; // Coincide con el indicador '!'
    const allQuestGivers = [...this.peatones, ...this.salesmen];

    let closestNpc: Pederestian | Salesman | null = null;
    let minDistanceSq = INTERACTION_RADIUS * INTERACTION_RADIUS;

    // 2. Encontrar el NPC más cercano DENTRO del radio de interacción
    for (const npc of allQuestGivers)
    {
      const dx = npc.x - player.x;
      const dy = npc.y - player.y;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq < minDistanceSq)
      {
        minDistanceSq = distanceSq;
        closestNpc = npc;
      }
    }

    // 3. Si no se encontró a nadie, no hacer nada
    if (!closestNpc)
    {
      return;
    }

    // 4. Procesar la interacción SOLAMENTE con el NPC más cercano
    const npc = closestNpc;

    // Prioridad 1: Entregar misión completa
    const readyQuest = this.questManager.activeQuests.find(q => q.giverId === npc.id && q.status === 'ready');
    if (readyQuest)
    {
      this.questManager.completeQuest(readyQuest.id);
      if (readyQuest.id === 'cardboard_collection_1')
      {
        console.log(`%c[RECOMPENSA]%c ¡Misión completada! ${npc.identifier} te ha dado una Olleta.`, 'background: #3498db; color: #fff; font-weight: bold; padding: 4px;', 'color: auto');
        this.spawnRewardPitcher(player.y, player.x);
      } else
      {
        const numLemons = Math.floor(Math.random() * 5) + 1;
        console.log(`%c[RECOMPENSA]%c ¡Misión completada! ${npc.identifier} te ha dado ${numLemons} limones.`, 'background: #2ecc71; color: #000; font-weight: bold; padding: 4px;', 'color: auto');
        this.spawnRewardLemons(player.y, player.x, numLemons);
      }
      return;
    }

    // Prioridad 2: Entregar misión de agua
    const waterQuest = this.questManager.activeQuests.find(q => q.giverId === npc.id && q.id === 'water_delivery_1' && q.status === 'active');
    if (waterQuest && player.isCarryingMetalPitcherFull)
    {
      this.questManager.completeQuest(waterQuest.id);
      console.log(`%c[RECOMPENSA]%c ¡Gracias por el agua! Aquí tienes unas monedas.`, 'background: #3498db; color: #fff; font-weight: bold; padding: 4px;', 'color: auto');
      player.isCarryingMetalPitcherFull = false;
      player.isCarryingMetalPitcherEmpty = true;
      return;
    }

    // Prioridad 3: Abrir panel para aceptar/regatear nueva misión
    // Nota: Usamos npc.quest para verificar existencia, showQuestIndicator es visual.
    if (npc.quest && npc.quest.status === 'inactive')
    {
      if (this.questPanel)
      {
        const questToAccept = npc.quest;
        questToAccept.giverName = npc.name;
        questToAccept.giverFaceSrc = this.assetManager.npcFaceImages[npc.faceId]?.src;
        this.questPanel.open(questToAccept);
        // No borramos la misión aquí para que persista si el jugador cierra el panel
      }
      return;
    }

    // Prioridad 4: Diálogo genérico si no hay más interacciones de misión
    console.log(`%c${npc.name}:%c "¡Hola! Qué buen día hace hoy en la aldea."`, 'color: #e67e22; font-weight: bold;', 'color: auto;');
  }



  private spawnRewardLemons(playerY: number, playerX: number, count: number)
  {
    const r = Math.floor(playerY / this.TILE_SIZE);
    const c = Math.floor(playerX / this.TILE_SIZE);
    let placed = 0;
    let attempts = 0;

    // Intentar colocar limones alrededor del jugador
    while (placed < count && attempts < 20)
    {
      const tr = r + Math.floor(Math.random() * 3) - 1;
      const tc = c + Math.floor(Math.random() * 3) - 1;

      if (tr >= 0 && tr < this.GRID_ROWS && tc >= 0 && tc < this.GRID_COLS)
      {
        const tile = this.tileGrid[tr][tc];
        // Colocar si es caminable y no es agua
        if (tile.walkable && !tile.fileName.includes('water'))
        {
          this.tileGrid[tr][tc] = {
            fileName: 'lemon.png',
            type: 'lemon',
            walkable: true,
            underlyingTile: tile.type === 'lemon' ? tile.underlyingTile : tile
          };
          placed++;
        }
      }
      attempts++;
    }
  }

  private spawnRewardPitcher(playerY: number, playerX: number)
  {
    const r = Math.floor(playerY / this.TILE_SIZE);
    const c = Math.floor(playerX / this.TILE_SIZE);

    // Intentar colocar cerca del jugador
    const neighbors = [{ r: r + 1, c }, { r: r - 1, c }, { r, c: c + 1 }, { r, c: c - 1 }];
    for (const n of neighbors)
    {
      if (n.r >= 0 && n.r < this.GRID_ROWS && n.c >= 0 && n.c < this.GRID_COLS)
      {
        const tile = this.tileGrid[n.r][n.c];
        if (tile.walkable && !tile.fileName.includes('water'))
        {
          this.tileGrid[n.r][n.c] = {
            fileName: '../img/metal_pitcher.png',
            type: 'pitcher',
            walkable: true,
            underlyingTile: tile
          };
          return; // Solo una olleta
        }
      }
    }
  }

  private checkBoxInteraction() 
  {
    // 1. GUARDA DE SEGURIDAD: Si no hay jugador, salimos para no romper el GameLoop
    if (!this.player) return;

    // 2. COOLDOWN: Si acabamos de soltar algo, no recogemos nada
    if (this.pickupCooldown > 0)
    {
      this.pickupCooldown--;
      return;
    }

    let currentGrid: GameTile[][] | null = null;

    if (this.gameState === 'WORLD')
    {
      currentGrid = this.tileGrid;
    } else if (this.gameState === 'INTERIOR' && this.interiorGrid)
    {
      currentGrid = this.interiorGrid as GameTile[][];
    }

    if (currentGrid && this.boxManager) 
    {
      try 
      {
        // El sistema de recogida automática ahora devuelve el tipo de objeto recogido.
        const pickedUpItemType = this.boxManager.autoPickupSystem(this.player, currentGrid as GameTile[][], this.TILE_SIZE);

        // Si se recogió un objeto, se notifica al QuestManager para que actualice
        // el progreso de cualquier misión activa que lo requiera.
        if (pickedUpItemType && this.questManager)
        {
          this.player.inventory.addItem(pickedUpItemType);
          console.log(`[GameBoard] Auto-pickup: ${pickedUpItemType}. Notificando a QuestManager.`);
          this.questManager.updateCollectCount(pickedUpItemType);
        }

      }
      catch (error)
      {
        console.warn("Error en interacción de cajas, pero el juego continúa:", error);
        console.warn("⚠️ BoxManager error (recuperado):", error);
      }
    }
  }

  private spawnLoot()
  {
    //console.log("💰 Generando Loot en el mapa...");
    let lootCount = 0;
    for (let r = 0; r < this.GRID_ROWS; r++)
    {
      for (let c = 0; c < this.GRID_COLS; c++)
      {
        if (this.isSafeSpawn(r, c))
        {
          const loot = this.lootService.checkForLoot();
          if (loot)
          {
            const tile = this.tileGrid[r][c];
            this.tileGrid[r][c] = {
              fileName: `${loot.denomination}.png`,
              type: loot.type,
              walkable: true,
              underlyingTile: tile,
              value: loot.value
            } as GameTile;
            lootCount++;
          }
        }
      }
    }
    //console.log(`💰 Loot generado: ${lootCount} items.`);
  }

  private checkItemPickup()
  {
    const player = this.player;
    if (!player) return;

    const { r, c } = player.getTileCoordinates(this.TILE_SIZE);
    if (r >= 0 && r < this.GRID_ROWS && c >= 0 && c < this.GRID_COLS)
    {
      const tile = this.tileGrid[r][c];
      if (!tile) return;

      // Lógica para dinero
      if (tile.type === 'coin' || tile.type === 'bill')
      {
        const value = tile.value || 0;
        const denomination = tile.fileName.replace('.png', '');
        player.wallet.add(denomination, value);

        this.floatingLootItems.push({
          x: (c * this.TILE_SIZE) + (this.TILE_SIZE / 4),
          y: (r * this.TILE_SIZE),
          startY: (r * this.TILE_SIZE),
          fileName: tile.fileName,
          lifeTime: 0
        });

        // Restaurar el suelo
        this.tileGrid[r][c] = tile.underlyingTile || { fileName: 'grass_green_type01.png', type: 'floor', walkable: true, color: null };

        // Lógica para otros objetos recogibles (como comida)
      }
      else if (['food', 'fruits', 'vegetables', 'meat', 'fish', 'bakery'].includes(tile.type))
      {
        // Items comestibles/recogibles de tiendas
        const fileNameOnly = tile.fileName.split('/').pop() || tile.fileName;
        const itemName = fileNameOnly.replace('.png', '');
        //console.log(`Jugador recogió: ${itemName}`);

        // Aquí iría la lógica para añadir el objeto al inventario del jugador.

        player.inventory.addItem(itemName);
        // Por ahora, lo notificamos al gestor de misiones por si es relevante.
        this.questManager.updateCollectCount(itemName);

        // Restaurar el suelo
        this.tileGrid[r][c] = tile.underlyingTile || { fileName: 'grass_green_type01.png', type: 'floor', walkable: true, color: null };
      }
    }
  }

  private handleLootFound(loot: LootItem)
  {
    // Lógica de UI y Estado
    //console.log(`%c[LOOT] ¡Encontraste algo! ${loot.type === 'coin' ? '🪙' : '💵'} $${loot.value}`, 'color: gold; font-weight: bold; background: #333; padding: 4px;');

    // Aquí podrías sumar al dinero del jugador, mostrar un toast, reproducir sonido, etc.
    // Ejemplo: this.playerMoney += loot.value;
    // Ejemplo UI: this.showLootPopup(loot);
  }

  private tryOpenTrade()
  {
    const player = this.player;
    if (!player || this.gameState !== 'WORLD') return;

    // 1. Buscar el puesto de mercado más cercano
    let nearestStand: MarketStandEntity | null = null;
    let minDistance = Infinity;

    this.marketStands.forEach(stand =>
    {
      // Calculamos distancia al centro del stand (que mide 2x2 tiles = 128x128)
      const standCenterX = stand.x + this.TILE_SIZE;
      const standCenterY = stand.y + this.TILE_SIZE;

      const dist = Math.sqrt(Math.pow(player.x - standCenterX, 2) + Math.pow(player.y - standCenterY, 2));
      if (dist < minDistance)
      {
        minDistance = dist;
        nearestStand = stand;
      }
    });

    // 2. Verificar umbral de proximidad (2 celdas = 128px aprox)
    if (nearestStand && minDistance <= (this.TILE_SIZE * 2.5))
    {
      // Calcular día actual (cada 24h de juego es un día)
      const gameDay = Math.floor(this.totalGameMinutes / 1440);
      this.tradePanel.open(gameDay, nearestStand, player);
    } else
    {
      this.tradePanel.showMessage("No hay nadie con quien comerciar aquí.");
    }
  }

  /**
   * Genera un objeto comprado en el mapa, cerca del puesto de mercado correspondiente.
   * Este método debe ser llamado desde el TradePanelComponent cuando una compra es exitosa.
   * @param item - El objeto comprado (debe tener fileName y type).
   * @param stand - La entidad del puesto de mercado donde se realizó la compra.
   */
  public spawnPurchasedItem(item: { fileName: string, type: string, value: number }, stand: MarketStandEntity): boolean
  {
    console.log(`[GameBoard] Attempting to spawn purchased item: ${item.fileName}`);
    if (!this.player)
    {
      console.error("spawnPurchasedItem: Player not found, cannot spawn item.");
      return false;
    }

    // FIX: Usar getTileCoordinates para obtener la posición de los pies (suelo)
    // Anteriormente se usaba this.player.y / TILE_SIZE que tomaba la esquina superior izquierda.
    // Si el sprite era alto, playerR + 1 coincidía con los pies, causando recogida inmediata (instant pickup).
    const { r: playerR, c: playerC } = this.player.getTileCoordinates(this.TILE_SIZE);

    // Área de búsqueda alrededor del jugador
    const prioritySpots = [
      { r: playerR + 1, c: playerC }, { r: playerR - 1, c: playerC }, // Abajo, Arriba
      { r: playerR, c: playerC + 1 }, { r: playerR, c: playerC - 1 }, // Derecha, Izquierda
      { r: playerR + 1, c: playerC + 1 }, { r: playerR - 1, c: playerC - 1 }, // Diagonales
      { r: playerR + 1, c: playerC - 1 }, { r: playerR - 1, c: playerC + 1 }
    ];

    for (const spot of prioritySpots)
    {
      if (this.tryPlaceItem(spot.r, spot.c, item)) return true;
    }

    // Fallback: Búsqueda extendida en un área de 5x5 si los lugares prioritarios están llenos
    for (let r = playerR - 2; r <= playerR + 2; r++)
    {
      for (let c = playerC - 2; c <= playerC + 2; c++)
      {
        // Omitir los puntos ya revisados en `prioritySpots`
        if (Math.abs(r - playerR) <= 1 && Math.abs(c - playerC) <= 1) continue;
        if (this.tryPlaceItem(r, c, item)) return true;
      }
    }

    console.warn(`[GameBoard] Failed to find a spot to spawn item: ${item.fileName}`);
    return false;
  }

  private tryPlaceItem(r: number, c: number, item: { fileName: string, type: string, value: number }): boolean
  {
    if (this.isSafeSpawn(r, c, true)) // true = permitir aparecer sobre cajas
    {
      const underlyingTile = this.tileGrid[r][c];
      const isFoodItem = ['food', 'fruits', 'vegetables', 'meat', 'fish', 'bakery'].includes(underlyingTile.type);
      // Evitar sobrescribir otros items valiosos
      if (isFoodItem || underlyingTile.type === 'coin' || underlyingTile.type === 'bill') return false;

      this.tileGrid[r][c] = {
        fileName: item.fileName,
        type: item.type,
        walkable: true,
        underlyingTile: underlyingTile.type === item.type ? underlyingTile.underlyingTile : underlyingTile,
        value: item.value
      } as GameTile;
      console.log(`[GameBoard] Item ${item.fileName} ubicado en las coordenadas: Fila ${r}, Columna ${c}.`);
      return true;
    }
    return false;
  }

  private updateCameraAndDoors()
  {
    const player = this.player;
    if (!player) return;

    // Actualizamos la cámara para que siga al personaje, manteniéndolo centrado
    // FIX: Redondear coordenadas de cámara para evitar sub-pixel jittering
    this.cameraX = Math.floor(player.x - (this.canvasWidth / 2) + (player.spriteWidth / 2));
    this.cameraY = Math.floor(player.y - (this.canvasHeight / 2) + (player.spriteHeight / 2));

    // Nos aseguramos de que la cámara no se salga de los límites del mapa
    if (this.cameraX < 0)
    {
      this.cameraX = 0;
    }
    if (this.cameraY < 0)
    {
      this.cameraY = 0;
    }
    if (this.cameraX > this.worldWidth - this.canvasWidth)
    {
      this.cameraX = this.worldWidth - this.canvasWidth;
    }
    if (this.cameraY > this.worldHeight - this.canvasHeight)
    {
      this.cameraY = this.worldHeight - this.canvasHeight;
    }

    // Verificar si estamos sobre una puerta
    const { r, c } = player.getTileCoordinates(this.TILE_SIZE);

    if (r >= 0 && r < this.GRID_ROWS && c >= 0 && c < this.GRID_COLS)
    {
      const tile = this.tileGrid[r][c];
      if (tile && tile.type === 'door')
      {
        if (this.canTriggerDoor)
        {
          this.enterHouse();
        }
      } else
      {
        this.canTriggerDoor = true; // Resetear trigger al salir de la puerta
      }

      // --- NUEVO: Detección de proximidad a casa con Olleta ---
      // Buscamos el ID de la casa cercana (en la posición actual o vecinos)
      let nearbyHouseId = this.buildingGrid[r][c];
      if (nearbyHouseId === 0)
      {
        // Buscar en vecinos si no estoy directamente sobre el tile de construcción
        const neighbors = [{ r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }];
        for (const n of neighbors)
        {
          if (n.r >= 0 && n.r < this.GRID_ROWS && n.c >= 0 && n.c < this.GRID_COLS && this.buildingGrid[n.r][n.c] > 0)
          {
            nearbyHouseId = this.buildingGrid[n.r][n.c];
            break;
          }
        }
      }

      if (nearbyHouseId > 0 && this.tryFindOlleta(nearbyHouseId))
      {
        const now = Date.now();
        if (now - this.lastOlletaLogTime > 3000)
        { // Mensaje cada 3 segundos máximo
          this.lastOlletaLogTime = now;
        }
      }
    }
  }

  private updateFloatingLoot(dt: number)
  {
    for (let i = this.floatingLootItems.length - 1; i >= 0; i--)
    {
      const item = this.floatingLootItems[i];
      item.lifeTime += dt; // Incrementar tiempo de vida (segundos)
      item.y = item.startY - (item.lifeTime * 60); // Flotar hacia arriba (60px/s)

      if (item.lifeTime > 1.0)
      { // Duración: 1 segundo
        this.floatingLootItems.splice(i, 1);
      }
    }
  }

  // --- Lógica de Interiores ---

  private enterHouse() 
  {
    const player = this.player;
    if (!player) return;

    // 1. Identificar qué casa es según la posición actual en el mundo
    const { r: playerRow, c: playerCol } = player.getTileCoordinates(this.TILE_SIZE);

    // Acceso seguro al grid
    let houseId = (this.buildingGrid[playerRow] && this.buildingGrid[playerRow][playerCol]) ? this.buildingGrid[playerRow][playerCol] : 0;

    // Si el ID es 0 (quizás estamos en el umbral), buscar en adyacentes
    if (houseId === 0)
    {
      const neighbors = [
        { r: playerRow - 1, c: playerCol }, // Arriba
        { r: playerRow + 1, c: playerCol }, // Abajo
        { r: playerRow, c: playerCol - 1 }, // Izquierda
        { r: playerRow, c: playerCol + 1 }  // Derecha
      ];

      for (const n of neighbors) 
      {
        if (n.r >= 0 && n.r < this.GRID_ROWS && n.c >= 0 && n.c < this.GRID_COLS)
        {
          const id = this.buildingGrid[n.r][n.c];
          if (id !== 0)
          {
            houseId = id;
            break;
          }
        }
      }
    }
    // 2. Buscar el objeto House dinámico
    const foundHouse = this.casas.find(h => h.data.id === houseId);

    if (foundHouse)
    {

      // Guardar posición para cuando salgamos al mapa global
      this.savedWorldPos = { x: player.x, y: player.y };

      // Asignar la casa actual
      this.casaActual = foundHouse;
      this.gameState = 'INTERIOR';
      this.canTriggerDoor = false;

      // DELEGACIÓN: El servicio se encarga de la lógica de generación/carga
      const entryResult = this.interiorManager.enterHouse(foundHouse);

      // Actualizamos el estado local con la respuesta del servicio
      // NOTA: this.interiorGrid ya no se asigna aquí, se actualiza vía suscripción en ngOnInit

      this.currentInteriorFloor = entryResult.floorTile;

      // Posicionar al jugador
      player.setPosition(entryResult.playerStartC * this.TILE_SIZE, entryResult.playerStartR * this.TILE_SIZE);
    }
    else 
    {
      console.warn("No se encontró la información de la casa en el array 'casas' o el ID es 0.");
    }
  }

  private exitHouse()
  {
    const player = this.player;
    if (!player) return;

    // DELEGACIÓN: El servicio se encarga de guardar el estado
    if (this.casaActual)
    {
      this.interiorManager.saveInteriorState(this.casaActual.data.id, this.interiorGrid as GameTile[][]);
    }

    this.gameState = 'WORLD';
    player.setPosition(this.savedWorldPos.x, this.savedWorldPos.y);
    this.canTriggerDoor = false; // Evitar re-entrada inmediata

    // Actualizar hora (+30 minutos)
    this.gameTimeMinutes = (this.gameTimeMinutes + 30) % 1440;
    this.totalGameMinutes += 30;
  }

  private updateInterior(dt: number)
  {
    const player = this.player;
    if (!this.casaActual || !player) return;

    const rows = this.casaActual.data.height + 4;
    const cols = this.casaActual.data.width + 4;

    player.update(this.keysPressed, this.interiorGrid, this.TILE_SIZE, cols * this.TILE_SIZE, rows * this.TILE_SIZE, dt);

    // --- SOBRESCRIBIR SPRITE SI ESTÁ SENTADO ---
    if (player.isSitting)
    {
      // Determinar si es silla o sofá para asignar el sprite correcto en la metadata del jugador
      const { r, c } = player.getTileCoordinates(this.TILE_SIZE);
      const tile = this.interiorGrid[r]?.[c];
      if (tile && tile.type?.startsWith('chair'))
      {
        player.currentSprite = 'assets/pc/deliveryman_sit_chair.png';
      } else
      {
        player.currentSprite = 'assets/pc/deliveryman_sit_couch.png';
      }
    }

    // Verificar salida
    // Verificar triggers de puertas y escaleras
    this.checkInteriorTriggers();

    // Verificar interacción con objetos en interiores DESPUÉS de mover y verificar puertas
    this.checkBoxInteraction();
  }

  private checkInteriorTriggers() 
  {
    const player = this.player;
    if (!player) return;

    const { r, c } = player.getTileCoordinates(this.TILE_SIZE);
    const tile = this.interiorGrid[r]?.[c]; // Optional chaining for safety

    // --- LÓGICA AUTOMÁTICA DE SOFÁS ---
    // Si pisamos un sofá o silla, nos sentamos automáticamente.
    if (tile && (tile.type?.startsWith('couch') || tile.type?.startsWith('chair')))
    {
      // Solo ejecutar la lógica de "sentarse" una vez, no en cada frame
      if (!player.isSitting)
      {
        player.isSitting = true;
        player.isMoving = false; // Detener el movimiento al sentarse

        // SNAP: Centrar al jugador en el tile del sofá para alineación visual
        const tileCenterX = (c * this.TILE_SIZE) + (this.TILE_SIZE / 2);
        const tileCenterY = (r * this.TILE_SIZE) + (this.TILE_SIZE / 2);
        player.x = tileCenterX - (player.spriteWidth / 2);
        player.y = tileCenterY - (player.spriteHeight / 2);

        // LÓGICA DE DIRECCIÓN EXPLÍCITA
        if (tile.type.includes('front'))
        {
          player.direction = 2; // South
        } else if (tile.type.includes('back'))
        {
          player.direction = 0; // North
        } else if (tile.type.includes('right'))
        {
          // Couch right: El sofá está a la derecha, miramos a la izquierda (1)
          // Chair right: La silla mira a la derecha, miramos a la derecha (3)
          player.direction = tile.type.includes('chair') ? 3 : 1;
        } else if (tile.type.includes('left'))
        {
          // Couch left: El sofá está a la izquierda, miramos a la derecha (3)
          // Chair left: La silla mira a la izquierda, miramos a la izquierda (1)
          player.direction = tile.type.includes('chair') ? 1 : 3;
        }
      }
    } else
    {
      // Solo levantarse si estaba sentado (y no está en sueño forzado)
      if (player.isSitting && !this.isSleeping)
      {
        player.isSitting = false;
      }
    }

    if (this.interiorGrid[r] && this.interiorGrid[r][c] && this.interiorGrid[r][c].type === 'door') 
    {
      if (this.canTriggerDoor) 
      {
        this.exitHouse();
      }
    }
    else 
    {
      this.canTriggerDoor = true;
      if (!tile) 
      {
        this.canTriggerDoor = true;
        return;
      }

      // Verificar interacción con objetos en interiores DESPUÉS de mover y verificar puertas
      this.checkBoxInteraction();
      switch (tile.type) 
      {
        case 'door':
          if (this.canTriggerDoor) 
          {
            this.exitHouse();
          }
          break;
        case 'stair_up_trigger': // Definido como el tile inferior derecho de la escalera
          if (this.canTriggerDoor) 
          { // Reutilizamos el flag como cooldown
            this.changeInteriorFloor(1); // Subir
          }
          break;
        case 'stair_down_trigger': // Definido en el área del landing superior
          if (this.canTriggerDoor) 
          {
            this.changeInteriorFloor(-1); // Bajar
          }
          break;
        default:
          // Resetea el cooldown si el jugador no está sobre un tile de trigger
          this.canTriggerDoor = true;
          break;
      }
    }
  }

  private changeInteriorFloor(direction: 1 | -1) 
  {
    const player = this.player;
    if (!this.casaActual || !player)
      return;

    // Delegamos la lógica de cambio de piso al InteriorManager
    const changeResult = this.interiorManager.changeFloor(this.casaActual.data.id, direction);

    if (changeResult.success) 
    {
      // La suscripción a interiorGrid$ se encarga de actualizar el grid que se renderiza.
      // Solo necesitamos reposicionar al jugador en el punto de aparición del nuevo piso.
      player.setPosition(
        changeResult.playerStartC * this.TILE_SIZE,
        changeResult.playerStartR * this.TILE_SIZE
      );

      // Prevenir un re-disparo inmediato del trigger al aterrizar en el nuevo piso
      this.canTriggerDoor = false;
      setTimeout(() => this.canTriggerDoor = true, 300); // Un breve cooldown
    }
  }


  private checkInteriorInteraction() 
  {
    const player = this.player;
    if (!player || !this.interiorGrid) return;

    // 1. Obtener coordenadas actuales del jugador
    const { r, c } = player.getTileCoordinates(this.TILE_SIZE);

    // 2. Definir vecinos + el tile actual (por si ya está pisando el sofá)
    const neighbors = [
      { r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 },
      { r, c }
    ];

    for (const n of neighbors) 
    {
      // Validar que el tile exista en la rejilla
      if (this.interiorGrid[n.r] && this.interiorGrid[n.r][n.c])
      {
        const tile = this.interiorGrid[n.r][n.c];

        // --- LÓGICA ORIGINAL: CAMA ---
        if (tile.type === 'bed') 
        {
          this.necesidades.energia = Math.min(100, this.necesidades.energia + 20);
          this.gameTimeMinutes += 60;
          break;
        }

        // --- LÓGICA ORIGINAL: ESTUFA ---
        else if (tile.type === 'stove') 
        {
          this.necesidades.nutricion = Math.min(100, this.necesidades.nutricion + 20);
          this.gameTimeMinutes += 15;
          break;
        }
      }
    }
  }

  private tryFindOlleta(houseId: number): boolean
  {
    // Hacemos que sea determinista basado en el ID de la casa
    // Así podemos saber si tiene olleta desde afuera sin entrar
    return true; // 100% de probabilidad solicitada
  }

  // Verifica si el jugador está sobre o frente a un tile de agua válido (beach o plank)
  private checkWaterSourceProximity(): boolean
  {
    const player = this.player;
    if (this.gameState !== 'WORLD' || !player) return false; // Solo en el mundo exterior
    return player.isNearWater(this.tileGrid, this.TILE_SIZE);
  }

  // Helper para clases CSS dinámicas
  getNeedClass(value: number): string
  {
    if (value <= 25) return 'insuficiente';
    if (value <= 50) return 'mal';
    if (value <= 75) return 'bien';
    return 'excelente';
  }

  private forceSitSleep() 
  {
    this.isSleeping = true;
    if (this.player)
    {
      this.player.isSleeping = true;
      this.player.currentSprite = 'assets/sprites/deliveryman_sit_sleep.png';
    }
  }

  // Añade esto en game-board.ts, usualmente debajo de updateGameTime
  private handleForcedSleepLogic(): void 
  {
    const player = this.player;
    if (!player)
      return;

    // Si la energía cae al 15% o menos
    if (this.necesidades.energia <= 15) 
    {
      player.isCriticalSleeping = true; // El flag que añadimos a player.ts
      this.isSleeping = true;               // Estado global del juego
    }
    else 
    {
      // Si la energía sube por encima de 15 (ej. al despertar), liberamos el estado
      player.isCriticalSleeping = false;
    }
  }

  private standUp()
  {
    const player = this.player;
    if (!player || !this.interiorGrid) return;

    const { r, c } = player.getTileCoordinates(this.TILE_SIZE);

    // 1. Definir dirección preferente (Frente)
    let dr = 0, dc = 0;
    // Corrección de direcciones: 0:Norte, 1:Izquierda(Oeste), 2:Sur, 3:Derecha(Este)
    switch (player.direction)
    {
      case 0: dr = -1; break;
      case 1: dc = -1; break;
      case 2: dr = 1; break;
      case 3: dc = 1; break;
    }

    // 2. Lista de candidatos por prioridad: Frente -> Sur -> Norte -> Este -> Oeste
    // Se prioriza 'Sur' (r+1) como segunda opción porque visualmente es "bajar" del sofá.
    const candidates = [
      { r: r + dr, c: c + dc }, // Frente
      { r: r + 1, c: c },       // Abajo
      { r: r - 1, c: c },       // Arriba
      { r: r, c: c + 1 },       // Derecha
      { r: r, c: c - 1 }        // Izquierda
    ];

    // 3. Buscar primer tile válido (Walkable y NO sofá)
    for (const cand of candidates)
    {
      if (this.isValidStandUpTile(cand.r, cand.c))
      {
        // Mover al centro del tile encontrado
        player.x = (cand.c * this.TILE_SIZE) + (this.TILE_SIZE / 2) - (player.spriteWidth / 2);
        player.y = (cand.r * this.TILE_SIZE) + (this.TILE_SIZE / 2) - (player.spriteHeight / 2);
        player.isSitting = false;
        return; // Salir tras encontrar sitio
      }
    }

    console.warn("⚠️ No se encontró espacio seguro para levantarse.");
  }

  private isValidStandUpTile(r: number, c: number): boolean
  {
    if (r < 0 || r >= this.interiorGrid.length || c < 0 || c >= this.interiorGrid[0].length) return false;
    const tile = this.interiorGrid[r][c];
    // Debe existir, ser caminable y NO ser un sofá/silla (para evitar el trigger de sentarse de nuevo)
    return !!tile && tile.walkable && !tile.type?.startsWith('couch') && !tile.type?.startsWith('chair');
  }

  private toggleRain()
  {
    if (this.isRaining)
    {
      this.stopRain();
    } else
    {
      this.startRain();
    }
  }

  private startRain()
  {
    this.isRaining = true;
    // La lluvia durará entre 20 y 60 minutos de juego
    this.rainTimer = 20 + Math.floor(Math.random() * 40);

    this.activeRainAudio = Math.random() < 0.5 ? this.rainAudio1 : this.rainAudio2;
    this.activeRainAudio.play();

    this.generateRaindrops();
  }

  private stopRain()
  {
    this.isRaining = false;
    if (this.activeRainAudio)
    {
      this.activeRainAudio.pause();
      this.activeRainAudio.currentTime = 0;
    }
    this.raindrops = [];
    this.animalShelterTargets.clear(); // Liberar a los animales de sus refugios
    // Programar la siguiente comprobación de lluvia para dentro de 2-4 horas de juego
    this.nextRainCheck = this.totalGameMinutes + 120 + Math.floor(Math.random() * 120);
  }

  private generateRaindrops()
  {
    this.raindrops = [];
    const numberOfDrops = 500; // Se puede ajustar para optimizar el rendimiento
    for (let i = 0; i < numberOfDrops; i++)
    {
      const typeRoll = Math.random();
      let type: 'line' | 'oval' | 'circle';
      if (typeRoll < 0.8)
      {
        type = 'line'; // 80% de probabilidad para las líneas de lluvia
      } else if (typeRoll < 0.95)
      {
        type = 'circle'; // 15% para los círculos de salpicadura
      } else
      {
        type = 'oval'; // 5% para óvalos
      }

      this.raindrops.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        length: type === 'line' ? Math.random() * 20 + 10 : 0,
        speed: Math.random() * 300 + 400, // velocidad en píxeles por segundo
        type: type,
        opacity: Math.random() * 0.3 + 0.3, // opacidad entre 0.3 y 0.6
        radiusX: type === 'oval' ? Math.random() * 2 + 1 : 0,
        radiusY: type === 'oval' ? Math.random() * 1 + 0.5 : 0,
      });
    }
  }

  private updateRain(dt: number)
  {
    for (const drop of this.raindrops)
    {
      drop.y += drop.speed * dt;
      // Si la gota sale por debajo de la pantalla, la reiniciamos arriba con una nueva posición X
      if (drop.y > this.canvasHeight)
      {
        drop.y = -drop.length;
        drop.x = Math.random() * this.canvasWidth;
      }
    }
  }

  private drawRain()
  {
    this.ctx.lineWidth = 1.5;
    this.ctx.lineCap = 'round';

    for (const drop of this.raindrops)
    {
      this.ctx.strokeStyle = `rgba(173, 216, 230, ${drop.opacity})`;
      this.ctx.fillStyle = `rgba(173, 216, 230, ${drop.opacity * 0.8})`; // Las salpicaduras son un poco más tenues

      switch (drop.type)
      {
        case 'line':
          this.ctx.beginPath();
          this.ctx.moveTo(drop.x, drop.y);
          this.ctx.lineTo(drop.x, drop.y + drop.length);
          this.ctx.stroke();
          break;
        case 'circle':
          this.ctx.beginPath();
          this.ctx.arc(drop.x, drop.y, 1, 0, Math.PI * 2); // Círculo pequeño
          this.ctx.fill();
          break;
        case 'oval':
          this.ctx.beginPath();
          this.ctx.ellipse(drop.x, drop.y, drop.radiusX, drop.radiusY, 0, 0, Math.PI * 2);
          this.ctx.fill();
          break;
      }
    }
  }

  private updatePuddles(dt: number)
  {
    if (this.isRaining)
    {
      // Spawn new puddles periodically
      this.puddleSpawnTimer += dt;
      if (this.puddleSpawnTimer >= this.PUDDLE_SPAWN_INTERVAL)
      {
        this.puddleSpawnTimer = 0;
        this.trySpawnPuddle();
      }

      // Grow existing puddles
      for (const puddle of this.puddles)
      {
        if (puddle.size < puddle.maxSize)
        {
          const growthRate = (puddle.maxSize - puddle.size) * 0.5;
          puddle.size += growthRate * dt;
        }
      }
    } else
    {
      // Evaporate puddles when not raining
      for (let i = this.puddles.length - 1; i >= 0; i--)
      {
        const puddle = this.puddles[i];
        puddle.size -= dt * 2; // Evaporation rate
        if (puddle.size <= 0)
        {
          this.puddles.splice(i, 1);
        }
      }
    }
  }

  private trySpawnPuddle()
  {
    if (this.puddles.length >= 80) return;

    const attempts = 10;
    for (let i = 0; i < attempts; i++)
    {
      const r = Math.floor(Math.random() * this.GRID_ROWS);
      const c = Math.floor(Math.random() * this.GRID_COLS);

      const tile = this.tileGrid[r]?.[c];
      if (tile && tile.walkable && !tile.fileName.includes('water') && !tile.type?.startsWith('tree') && tile.type !== 'door')
      {
        if (!this.puddles.some(p => p.r === r && p.c === c))
        {
          this.puddles.push({
            r, c, size: 1,
            maxSize: Math.random() * (this.TILE_SIZE / 3) + (this.TILE_SIZE / 4),
          });
          return;
        }
      }
    }
  }

  private handleAnimalShelter(animal: any, dt: number): boolean
  {
    if (!this.isRaining) return false;

    // Obtener o asignar objetivo de refugio
    let target = this.animalShelterTargets.get(animal);
    if (!target)
    {
      const bestSpot = this.findBestShelter(animal);
      if (bestSpot)
      {
        target = { r: bestSpot.r, c: bestSpot.c, reached: false };
        this.animalShelterTargets.set(animal, target);
      } else
      {
        // Si no encuentra refugio cerca, sigue su rutina normal
        return false;
      }
    }

    if (target.reached)
    {
      // Comportamiento al llegar: Se quedan quietos esperando que pase la lluvia
      animal.currentFrame = 0;
      return true; // Controlamos al animal para que no ejecute su update normal
    }

    // Mover hacia el objetivo
    const spriteW = animal.spriteWidth || 32;
    const spriteH = animal.spriteHeight || 32;
    const targetX = (target.c * this.TILE_SIZE) + (this.TILE_SIZE / 2) - (spriteW / 2);
    const targetY = (target.r * this.TILE_SIZE) + (this.TILE_SIZE / 2) - (spriteH / 2);

    const dx = targetX - animal.x;
    const dy = targetY - animal.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 90; // Corren un poco más rápido para refugiarse

    if (dist < 5)
    {
      target.reached = true;
      return true;
    }

    const moveX = (dx / dist) * speed * dt;
    const moveY = (dy / dist) * speed * dt;

    // Actualizar posición (simple, sin colisiones complejas para evitar atascos al buscar refugio)
    animal.x += moveX;
    animal.y += moveY;

    // Actualizar Dirección
    if (Math.abs(dx) > Math.abs(dy))
    {
      animal.direction = dx > 0 ? 3 : 1;
    } else
    {
      animal.direction = dy > 0 ? 2 : 0;
    }

    // Animación de correr
    const ANIMATION_SPEED = 8;
    if (Date.now() % (ANIMATION_SPEED * 20) < 20)
    {
      animal.currentFrame = (animal.currentFrame + 1) % 4;
    }

    return true;
  }

  private findBestShelter(animal: any): { r: number, c: number } | null
  {
    const r = Math.floor(animal.y / this.TILE_SIZE);
    const c = Math.floor(animal.x / this.TILE_SIZE);
    let closest: { r: number, c: number, dist: number } | null = null;

    // 1. Buscar Casas Vacías
    for (const casa of this.casas)
    {
      if (!casa.owner)
      {
        // Objetivo: Centro de la casa (para que entren visualmente)
        const tr = casa.data.originRow + Math.floor(casa.data.height / 2);
        const tc = casa.data.originCol + Math.floor(casa.data.width / 2);
        const dist = Math.abs(r - tr) + Math.abs(c - tc);
        if (!closest || dist < closest.dist)
        {
          closest = { r: tr, c: tc, dist };
        }
      }
    }

    // 2. Buscar Árboles cercanos
    // Iteramos por los árboles existentes
    for (const tree of this.trees)
    {
      const dist = Math.abs(r - tree.r) + Math.abs(c - tree.c);
      // Si encontramos un árbol más cerca que la casa, vamos al árbol.
      // El objetivo es el tile FRENTE al árbol (r+1) para que se vea, ya que el árbol es obstáculo.
      if (!closest || dist < closest.dist)
      {
        closest = { r: tree.r + 1, c: tree.c, dist };
      }
    }

    return closest ? { r: closest.r, c: closest.c } : null;
  }

  private drawPuddles()
  {
    this.ctx.fillStyle = 'rgba(101, 87, 78, 0.5)';
    for (const puddle of this.puddles)
    {
      const puddleScreenX = (puddle.c * this.TILE_SIZE) + (this.TILE_SIZE / 2) - this.cameraX;
      const puddleScreenY = (puddle.r * this.TILE_SIZE) + (this.TILE_SIZE / 2) - this.cameraY;

      if (puddleScreenX + puddle.size < 0 || puddleScreenX - puddle.size > this.canvasWidth || puddleScreenY + puddle.size < 0 || puddleScreenY - puddle.size > this.canvasHeight) continue;

      this.ctx.beginPath();
      this.ctx.ellipse(puddleScreenX, puddleScreenY, puddle.size, puddle.size * 0.6, 0, 0, 2 * Math.PI);
      this.ctx.fill();
    }
  }

  private logNpcMoney()
  {
    const npcsWithMoney = this.peatones.filter(p => p.wallet.getTotal() > 0);
    if (npcsWithMoney.length > 0)
    {
      //console.groupCollapsed(`[NPC Economy] Reporte de Dinero (${new Date().toLocaleTimeString()})`);
      npcsWithMoney.forEach(p =>
      {
        //console.log(`- ${p.name}: $${p.wallet.getTotal()}`);
      });
      //console.groupEnd();
    }
  }

  /*private throwBreadCrumbs()
  {
    if (!this.player) return;

    // Asumimos que el item de pan tiene el ID 'bread' en el inventario.
    const breadItemId = 'bread';

    // Para depurar, mostramos el estado del inventario.
    // Convertimos el Map a un objeto para que se vea bien en el log.
    const inventoryContent = Object.fromEntries(this.player.inventory.getItems());
    console.log('[DEBUG] Intentando lanzar pan. Inventario actual:', JSON.stringify(inventoryContent, null, 2));

    // Usamos los nuevos métodos del inventario para una lógica limpia y segura.
    if (this.player.inventory.hasItem(breadItemId))
    {
      if (this.player.inventory.removeItem(breadItemId, 1))
      {
        const numCrumbs = Math.floor(Math.random() * (22 - 15 + 1)) + 15; // Entre 15 y 22 trozos
        const spawnRadius = 80; // Radio en píxeles alrededor del jugador
        const crumbLifetime = 15; // Segundos de vida de los trozos

        for (let i = 0; i < numCrumbs; i++)
        {
          const angle = Math.random() * 2 * Math.PI;
          const distance = Math.random() * spawnRadius;
          const crumbX = this.player.x + (this.player.spriteWidth / 2) + Math.cos(angle) * distance;
          const crumbY = this.player.y + (this.player.spriteHeight / 2) + Math.sin(angle) * distance;

          this.breadCrumbs.push({
            x: crumbX,
            y: crumbY,
            radius: Math.random() * 2 + 1, // Radio entre 1 y 3 píxeles
            life: crumbLifetime
          });
        }
      }
    } else
    {
      // Mensaje de error si no se encuentra el pan, para confirmar que la tecla '4' funciona.
      console.log('[DEBUG] No se encontró el item "bread" o la cantidad es 0 en el inventario.');
    }
  }*/

  private dropSingleBreadCrumb()
  {
    if (!this.player) return;
    const breadItemId = 'bread';

    // 1. Verificar si tenemos migajas sueltas
    if (this.looseCrumbs > 0)
    {
      this.looseCrumbs--;
      this.spawnSingleCrumbProjectile();
      console.log(`[Pan] Lanzaste una migaja. Te quedan ${this.looseCrumbs} migajas sueltas.`);
      return;
    }

    // 2. Si no hay sueltas, intentar desmenuzar un pan del inventario
    if (this.player.inventory.hasItem(breadItemId))
    {
      this.player.inventory.removeItem(breadItemId, 1);
      this.looseCrumbs = 9; // 1 Pan = 10 Migajas (1 lanzada ahora + 9 guardadas)
      this.spawnSingleCrumbProjectile();
      const remainingBread = this.player.inventory.getQuantity(breadItemId);
      console.log(`[Pan] Desmenuzaste un pan. Tienes 9 migajas listas. (Panes restantes: ${remainingBread})`);
    }
    else
    {
      console.log('[Pan] No tienes pan para lanzar.');
    }
  }

  private spawnSingleCrumbProjectile()
  {
    if (!this.player) return;

    // Calcular posición frente al jugador (mínimo 2 tiles para que caiga al agua desde el muelle)
    const distance = this.TILE_SIZE * 2.5;

    // Obtener vector de dirección
    let dirX = 0, dirY = 0;
    switch (this.player.direction)
    {
      case 0: dirY = -1; break; // Arriba
      case 1: dirX = -1; break; // Izquierda
      case 2: dirY = 1; break;  // Abajo
      case 3: dirX = 1; break;  // Derecha
    }

    // Añadir un poco de aleatoriedad lateral para que no sea una línea perfecta si spameas
    const spread = (Math.random() * 32) - 16;

    const centerX = this.player.x + (this.player.spriteWidth / 2);
    const centerY = this.player.y + (this.player.spriteHeight / 2);

    const crumbX = centerX + (dirX * distance) + (dirX === 0 ? spread : 0);
    const crumbY = centerY + (dirY * distance) + (dirY === 0 ? spread : 0);

    this.breadCrumbs.push({
      x: crumbX,
      y: crumbY,
      radius: 2, // Un radio fijo para que se distingan
      life: Infinity // ¡Este trozo de pan nunca desaparecerá!
    });
  }

  private throwBreadCrumbs()
  {
    if (!this.player) return;

    const breadItemId = 'bread';

    if (this.player.inventory.hasItem(breadItemId))
    {
      if (this.player.inventory.removeItem(breadItemId, 1))
      {
        const remaining = this.player.inventory.getQuantity(breadItemId);
        console.log(`[Pan Arrojado] Quedan ${remaining} panes en el inventario.`);

        const numCrumbs = Math.floor(Math.random() * (22 - 15 + 1)) + 15; // Entre 15 y 22 trozos
        const minRadius = this.TILE_SIZE * 2; // Mínimo 2 tiles (128px) de distancia
        const maxRadius = this.TILE_SIZE * 4; // Máximo 4 tiles
        const crumbLifetime = 15; // Segundos de vida de los trozos

        for (let i = 0; i < numCrumbs; i++)
        {
          const angle = Math.random() * 2 * Math.PI;
          const distance = minRadius + Math.random() * (maxRadius - minRadius); // Distancia entre min y max
          const crumbX = this.player.x + (this.player.spriteWidth / 2) + Math.cos(angle) * distance;
          const crumbY = this.player.y + (this.player.spriteHeight / 2) + Math.sin(angle) * distance;

          this.breadCrumbs.push({
            x: crumbX,
            y: crumbY,
            radius: Math.random() * 2 + 1, // Radio entre 1 y 3 píxeles
            life: crumbLifetime
          });
        }
      }
    }
  }

  private updateBreadCrumbs(dt: number)
  {
    for (let i = this.breadCrumbs.length - 1; i >= 0; i--)
    {
      const crumb = this.breadCrumbs[i];
      crumb.life -= dt;

      // Detectar si el pan cayó en el agua
      const r = Math.floor(crumb.y / this.TILE_SIZE);
      const c = Math.floor(crumb.x / this.TILE_SIZE);

      if (r >= 0 && r < this.GRID_ROWS && c >= 0 && c < this.GRID_COLS)
      {
        const tile = this.tileGrid[r][c];
        // FIX: Ampliamos la detección a cualquier tile de agua, incluyendo cascadas.
        if (tile && (tile.fileName.includes('water') || tile.fileName.includes('cascade')))
        {

          console.log(`%c[AGUA DETECTADA] Pan cayó en [${r}, ${c}]. Tile: ${tile.fileName}`, 'color: cyan; font-weight:bold;');

          // 1. El pan desaparece (se lo comen)
          this.breadCrumbs.splice(i, 1);

          // 2. Aparece un pez (si tenemos el asset y no hay demasiados)
          const fishAsset = this.assetManager.fish_orange_jumping || this.assetManager.getImage('fish_orange_jumping') || this.assetManager.tileImages['fish_orange_jumping.png'];

          if (fishAsset && this.fish.length < 50)
          {
            if (fishAsset && fishAsset.naturalWidth > 0 && this.fish.length < 50)
            {
              console.log(`%c[SPAWN] 🐟 Creando PEZ en pixel [${c * this.TILE_SIZE}, ${r * this.TILE_SIZE}]`, 'color: lime; font-weight:bold;');
              // FIX: Pasar coordenadas en píxeles para que se vea donde cae el pan
              this.fish.push(new Fish(fishAsset, c * this.TILE_SIZE, r * this.TILE_SIZE));
            } else
            {
              if (!fishAsset) console.error(`%c[ERROR] ❌ No se encontró la imagen del pez. (fish_orange_jump.png). Revisa assets.`, 'color: red; font-size: 14px;');
              else console.log(`[INFO] Límite de peces alcanzado (${this.fish.length}/50).`);
            }
            continue; // Pasamos al siguiente, ya que este fue eliminado
          }
          else if (tile)
          {
            // Log opcional para ver dónde cae si NO es agua (descomentar si es necesario depurar tierra)
            // console.log(`[TIERRA] Pan cayó en [${r}, ${c}]. Tile: ${tile.fileName}`);
          }
        }

        if (crumb.life <= 0)
        {
          this.breadCrumbs.splice(i, 1);
        }
      }
    }
  }

  private attractAnimalsToBreadCrumbs()
  {
    // Lógica para atraer animales a los trozos de pan
    this.ducks.forEach(duck => this.setAnimalTargetBreadCrumb(duck));
    this.hens.forEach(hen => this.setAnimalTargetBreadCrumb(hen));
    this.chicks.forEach(chick => this.setAnimalTargetBreadCrumb(chick));
  }

  private setAnimalTargetBreadCrumb(animal: any)
  { // Use 'any' to avoid circular dependency issues
    // FIX: Si el animal ya tiene un objetivo, no buscar uno nuevo para evitar el efecto "estampida".
    if (animal.targetCrumb) return;

    // Determinar si el animal puede entrar al agua (los patos y patitos sí pueden)
    const canSwim = animal instanceof Duck || animal instanceof Duckling;

    let closestCrumb: BreadCrumb | null = null;
    let minDistSq = Infinity;

    for (const crumb of this.breadCrumbs)
    {
      // FIX: Si el animal no puede nadar, ignoramos las migas que caen en el agua.
      if (!canSwim)
      {
        const r = Math.floor(crumb.y / this.TILE_SIZE);
        const c = Math.floor(crumb.x / this.TILE_SIZE);
        const tile = this.tileGrid[r]?.[c];
        if (tile && (tile.fileName.includes('water') || tile.fileName.includes('cascade')))
        {
          continue; // Ignorar esta miga y pasar a la siguiente.
        }
      }

      const dx = crumb.x - animal.x;
      const dy = crumb.y - animal.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDistSq)
      {
        minDistSq = distSq;
        closestCrumb = crumb;
      }
    }

    if (closestCrumb)
    {
      animal.targetCrumb = closestCrumb;
    }
  }


  // --- MÉTODO UPDATE CORREGIDO (SIN ERRORES) ---
  private update(dt: number)
  {
    // Actualizar la lógica de la lluvia si está activa
    if (this.isRaining)
    {
      this.updateRain(dt);
    }

    this.updatePuddles(dt);

    this.updateGameTime();
    this.updateDayNightCycle();
    this.updateNPC(dt);
    this.updateFloatingLoot(dt); // Actualizar animaciones de loot
    this.updateBreadCrumbs(dt); // Actualizar vida de los trozos de pan
    this.attractAnimalsToBreadCrumbs();
    this.updateAllEntities(dt);

    // Reporte periódico del dinero de los NPCs
    this.npcMoneyLogTimer += dt;
    if (this.npcMoneyLogTimer >= this.NPC_MONEY_LOG_INTERVAL)
    {
      this.logNpcMoney();
      this.npcMoneyLogTimer = 0;
    }

    // Bloqueo de movimiento si está dormido O sentado
    const player = this.player;
    if (player && !this.isSleeping && !player.isSitting)
    {
      // Usamos el método update REAL de tu clase Player
      player.update(this.keysPressed, this.tileGrid, this.TILE_SIZE, this.worldWidth, this.worldHeight, dt);

      // Verificar recogida de objetos (dinero, items comprados, etc.)
      this.checkItemPickup();
    }

    this.checkBoxInteraction();

    // Animación de fluidos
    this.waterfallTimer += dt;
    this.waterTimer += dt;
    if (this.waterTimer >= this.WATER_SPEED)
    {
      this.waterTimer = 0;
      this.waterFrame = (this.waterFrame + 1) % 4;
    }
    if (this.waterfallTimer >= this.WATERFALL_SPEED)
    {
      this.waterfallTimer = 0;
      this.waterfallFrame = (this.waterfallFrame + 1) % 4;
    }

    this.updateCameraAndDoors();
  }
}
