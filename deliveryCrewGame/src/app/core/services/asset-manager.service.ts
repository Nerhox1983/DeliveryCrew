import { Injectable } from '@angular/core';
import { Observable, Subscriber, forkJoin } from 'rxjs';
import { Tile } from '../../shared/models/tile.model';
import animalConfigData from '../../../assets/config/animal-assets.json';
import { SpriteAnimalConfig, SpriteConfig } from '../../shared/models/sprite-config.model';

@Injectable({ providedIn: 'root' })
export class AssetManager
{
  // Configuración de assets de animales cargada desde el JSON
  private animalConfig: SpriteAnimalConfig = animalConfigData;

  public tileImages: { [key: string]: HTMLImageElement | HTMLCanvasElement } = {};
  public dogImages: { [key: string]: HTMLImageElement } = {};
  public catImages: { [key: string]: HTMLImageElement } = {};
  public npcFaceImages: { [key: string]: HTMLImageElement } = {};

  public playerImage!: HTMLImageElement;
  public grandma01_face!: HTMLImageElement;
  public grandpa01_face!: HTMLImageElement;
  public playerCarryCardBoardBoxImage!: HTMLImageElement;
  public playerCarryWoodBoxImage!: HTMLImageElement;
  public playerCarryMetalPitcherEmptyImage!: HTMLImageElement;
  public playerCarryMetalPitcherWaterImage!: HTMLImageElement;
  public playerCarrySmallGreenImage!: HTMLImageElement;
  public playerKneelDownImage!: HTMLImageElement;
  public playerKneelDownMetalPitcherEmptyImage!: HTMLImageElement;
  public playerKneelDownMetalPitcherWaterImage!: HTMLImageElement;
  public npcImage!: HTMLImageElement;
  public playerIdleImage!: HTMLImageElement;
  public playerChopImage!: HTMLImageElement;
  public woman01_walking!: HTMLImageElement;
  public woman02_walking!: HTMLImageElement;
  public woman03_walking!: HTMLImageElement;
  public woman05_idle!: HTMLImageElement;
  public woman05_walking!: HTMLImageElement;
  public woman06_idle!: HTMLImageElement;
  public woman06_walking!: HTMLImageElement;
  public woman10_idle!: HTMLImageElement;
  public woman10_walking!: HTMLImageElement;
  public woman11_walking!: HTMLImageElement;
  public chick_yellow_walking!: HTMLImageElement;
  public chick_yellow_swimming!: HTMLImageElement;
  //public chick_yellow_walking!: HTMLImageElement;
  public walk_Image!: HTMLImageElement;
  public hen_white_walking!: HTMLImageElement;
  public hen_turken_walking!: HTMLImageElement;
  public rooster_white_walking!: HTMLImageElement;
  public mouse_white_walking!: HTMLImageElement;
  public mouse_gray_walking!: HTMLImageElement;
  public earthworm_pink_moving!: HTMLImageElement;
  public drake_white_walking!: HTMLImageElement;
  public drake_black_walking!: HTMLImageElement;
  public drake_brown_walking!: HTMLImageElement;
  public drake_mallard_walking!: HTMLImageElement;
  public duck_mallard_walking!: HTMLImageElement;
  public duckling_yellow_walking!: HTMLImageElement;
  public duckling_yellow_swimming!: HTMLImageElement;
  public rabbit_white_walking!: HTMLImageElement;
  public rabbit_white_jumping!: HTMLImageElement;
  public rabbit_black_walking!: HTMLImageElement;
  public rabbit_black_jumping!: HTMLImageElement;
  public frog_green_jumping!: HTMLImageElement;
  public toadGreenImage!: HTMLImageElement;
  public puppyDalmatianBlackImage!: HTMLImageElement;
  public pig_pink_walking!: HTMLImageElement;
  public parrot_green_walking!: HTMLImageElement;
  public parrot_green_flying!: HTMLImageElement;
  public woman07_walking!: HTMLImageElement;
  public mujerImage!: HTMLImageElement;
  public man01_walking!: HTMLImageElement;
  public man02_walking!: HTMLImageElement;
  public man03_walking!: HTMLImageElement;
  public man04_walking!: HTMLImageElement;
  public man08_walking!: HTMLImageElement;
  public man09_walking!: HTMLImageElement;
  public fish_orange_jumping!: HTMLImageElement;
  public man09_carrySmallGreenImage!: HTMLImageElement;
  public man09_carryCardboardBoxImage!: HTMLImageElement;
  public woman04CarrySmallGreenImage!: HTMLImageElement;
  public woman07CarrySmallGreenImage!: HTMLImageElement;
  public playerSitSleepImage!: HTMLImageElement;
  public couchGreenFrontImage!: HTMLImageElement;
  public couchGreenProfileImage!: HTMLImageElement;
  public couchGreenBackImage!: HTMLImageElement;
  public chairBrownFrontImage!: HTMLImageElement;
  public chairBrownProfileImage!: HTMLImageElement;
  public chairBrownBackImage!: HTMLImageElement;
  public playerSitImage!: HTMLImageElement;
  public playerSitChairImage!: HTMLImageElement; // Nueva propiedad para conservar la imagen de la silla
  public nameplateBrownEmptyImage!: HTMLImageElement;
  public sidewalkSignFishImage!: HTMLImageElement;
  public sidewalkSignFruitImage!: HTMLImageElement;
  public sidewalkSignMugImage!: HTMLImageElement;

  // Duck Sounds
  public duckMaleQuackSound!: HTMLAudioElement;
  public duckFemaleQuackSound!: HTMLAudioElement;

  // NPC Professions
  public grandma01_walk!: HTMLImageElement;
  public grandpa01_walk!: HTMLImageElement;
  public grandma01_idle!: HTMLImageElement;
  public grandpa01_idle!: HTMLImageElement;
  public grandma01_walk_sell!: HTMLImageElement;
  public grandpa01_walk_sell!: HTMLImageElement;
  public grandma01_idle_sell!: HTMLImageElement;
  public grandpa01_idle_sell!: HTMLImageElement;

  public tree01Image!: HTMLImageElement;
  public tree02Image!: HTMLImageElement;
  public tree03Image!: HTMLImageElement;
  public tree04Image!: HTMLImageElement;
  public tree05Image!: HTMLImageElement;
  public tree06Image!: HTMLImageElement;

  // Imágenes por defecto para fallback
  public dogImage!: HTMLImageElement;

  // Nuevas frutas
  public strawberryImage!: HTMLImageElement;
  public redAppleImage!: HTMLImageElement;
  public orangeImage!: HTMLImageElement;
  public grapeImage!: HTMLImageElement;
  public bananaImage!: HTMLImageElement;

  // Loot Assets (Monedas y Billetes)
  public coin_50!: HTMLImageElement;
  public coin_100!: HTMLImageElement;
  public coin_200!: HTMLImageElement;
  public coin_500!: HTMLImageElement;
  public coin_1000!: HTMLImageElement;
  public bill_2000!: HTMLImageElement;
  public bill_5000!: HTMLImageElement;
  public bill_10000!: HTMLImageElement;
  public bill_20000!: HTMLImageElement;
  public bill_50000!: HTMLImageElement;
  public bill_100000!: HTMLImageElement;

  // Fish
  public troutImage!: HTMLImageElement;
  public salmonImage!: HTMLImageElement;

  // UI Buttons
  public acceptQuestBtn!: HTMLImageElement;
  public barterBtn!: HTMLImageElement;
  public haggleBtn!: HTMLImageElement;
  public rejectQuestBtn!: HTMLImageElement;
  public shopBtn!: HTMLImageElement;

  constructor() { }

  /**
   * Recupera una imagen cargada por su clave o nombre de propiedad.
   * @param key Clave en tileImages o nombre de la propiedad en AssetManager.
   */
  public getImage(key: string): HTMLImageElement | undefined
  {
    // 1. Buscar en el diccionario de tiles (donde se registran assets genéricos)
    if (this.tileImages[key])
    {
      return this.tileImages[key] as HTMLImageElement;
    }

    // 2. Buscar en propiedades directas de la clase (ej: 'playerImage', 'sheep_white_walking')
    const prop = (this as any)[key];
    if (prop instanceof HTMLImageElement)
    {
      return prop;
    }

    return undefined;
  }

  /**
   * Recupera la configuración de un sprite de animal por el nombre del archivo.
   * @param fileName El nombre del archivo de la hoja de sprites (ej. 'sheep_white_walking.png')
   * @returns La configuración de SpriteConfig o undefined si no se encuentra.
   */
  public getAnimalConfig(fileName: string): SpriteConfig | undefined
  {
    return this.animalConfig[fileName];
  }

  public cargarRecursos(tileDefinitions: Tile[]): Observable<void>
  {
    const tileObservables = tileDefinitions.map(tileDef =>
      this.cargarImagen(`/assets/tiles/${tileDef.fileName}`)
    );

    const playerImage$ = this.cargarImagen('/assets/pc/deliveryman_walk.png');
    const playerCarryCardboardBoxImage$ = this.cargarImagen('/assets/pc/deliveryman_carry_cardboardbox.png');
    const playerCarryWoodBoxImage$ = this.cargarImagen('/assets/pc/deliveryman_carry_woodbox.png');
    const playerCarrySmallGreenImage$ = this.cargarImagen('/assets/pc/deliveryman_carry_small_green.png');
    const playerCarryMetalPitcherEmptyImage$ = this.cargarImagen('/assets/pc/deliveryman_carry_metal_pitcher_empty.png');
    const playerCarryMetalPitcherWaterImage$ = this.cargarImagen('/assets/pc/deliveryman_carry_metal_pitcher_water.png');
    const playerKneelDownImage$ = this.cargarImagen('/assets/pc/deliveryman_kneel_down.png');
    const playerKneelDownMetalPitcherEmpty$ = this.cargarImagen('/assets/pc/deliveryman_kneel_down_metal_pitcher_empty.png');
    const playerKneelDownMetalPitcherWaterImage$ = this.cargarImagen('/assets/pc/deliveryman_kneel_down_metal_pitcher_water.png');
    const woman01_walking$ = this.cargarImagen('/assets/npc/woman01_walk.png');
    const woman02_walking$ = this.cargarImagen('/assets/npc/woman02_walk.png');
    const woman03_walking$ = this.cargarImagen('/assets/npc/woman03_walk.png');
    const woman05_idle$ = this.cargarImagen('/assets/npc/woman05_idle.png');
    const woman05_walking$ = this.cargarImagen('/assets/npc/woman05_walk.png');
    const woman06_idle$ = this.cargarImagen('/assets/npc/woman06_idle.png');
    const woman06_walking$ = this.cargarImagen('/assets/npc/woman06_walk.png');
    const woman10_idle$ = this.cargarImagen('/assets/npc/woman10_idle.png');
    const woman10_walking$ = this.cargarImagen('/assets/npc/woman10_walk.png');
    const woman11_walking$ = this.cargarImagen('/assets/npc/woman11_walk.png');

    // Carga de Rostros de NPCs
    const man01_face$ = this.cargarImagen('/assets/npc/man01_face.png');
    const man02_face$ = this.cargarImagen('/assets/npc/man02_face.png');
    const man03_face$ = this.cargarImagen('/assets/npc/man03_face.png');
    const man04_face$ = this.cargarImagen('/assets/npc/man04_face.png');
    const man08_face$ = this.cargarImagen('/assets/npc/man08_face.png');
    const man09_face$ = this.cargarImagen('/assets/npc/man09_face.png');
    const woman01_face$ = this.cargarImagen('/assets/npc/woman01_face.png');
    const woman02_face$ = this.cargarImagen('/assets/npc/woman02_face.png');
    const woman03_face$ = this.cargarImagen('/assets/npc/woman03_face.png');
    const woman04_face$ = this.cargarImagen('/assets/npc/woman04_face.png');
    const woman05_face$ = this.cargarImagen('/assets/npc/woman05_face.png');
    const woman06_face$ = this.cargarImagen('/assets/npc/woman06_face.png');
    const woman07_face$ = this.cargarImagen('/assets/npc/woman07_face.png');
    const woman09_face$ = this.cargarImagen('/assets/npc/woman09_face.png');
    const woman10_face$ = this.cargarImagen('/assets/npc/woman10_face.png');
    const woman11_face$ = this.cargarImagen('/assets/npc/woman11_face.png');
    const grandma01_face$ = this.cargarImagen('/assets/npc/grandma01_face.png');
    const grandpa01_face$ = this.cargarImagen('/assets/npc/grandpa01_face.png');

    const npcImage$ = this.cargarImagen('/assets/npc/woman04_walk.png');
    const dogImage$ = this.cargarImagen('/assets/npc/dog_white_walk.png');

    const dogColors = ['white', 'brown', 'golden', 'black', 'dalmatian_black'];
    const dogObservables = dogColors.map(c => this.cargarImagen(`/assets/npc/dog_${c}_walk.png`));

    // Eliminamos 'gris' y 'naranja' temporalmente si no existen los archivos para evitar 404
    const catColors = ['white', 'black'];
    const catObservables = catColors.map(c => this.cargarImagen(`/assets/npc/cat_${c}_walk.png`));

    const chick_yellow_walking$ = this.cargarImagen('/assets/npc/chick_yellow_walk.png');
    const hen_white_walking$ = this.cargarImagen('/assets/npc/hen_white_walk.png');
    const hen_turken_walking$ = this.cargarImagen('/assets/npc/hen_turken_walk.png');
    const mouse_white_walking$ = this.cargarImagen('/assets/npc/mouse_white_walk.png');
    const mouse_gray_walking$ = this.cargarImagen('/assets/npc/mouse_gray_walk.png');
    const eartworm_pink_moving$ = this.cargarImagen('/assets/npc/earthworm_pink_move.png');
    const drake_white_walking$ = this.cargarImagen('/assets/npc/drake_white_walk.png');
    const drake_black_walking$ = this.cargarImagen('/assets/npc/drake_black_walk.png');
    const drake_brown_walking$ = this.cargarImagen('/assets/npc/drake_brown_walk.png');
    const drake_mallard_walking$ = this.cargarImagen('/assets/npc/drake_mallard_walk.png');
    const duck_mallard_walking$ = this.cargarImagen('/assets/npc/duck_mallard_walk.png');
    const duckling_yellow_walking$ = this.cargarImagen('/assets/npc/duckling_yellow_walk.png');
    const duckling_yellow_swimming$ = this.cargarImagen('/assets/npc/duckling_yellow_swim.png');
    const rabbit_white_walking$ = this.cargarImagen('/assets/npc/rabbit_white_walk.png');
    const rabbit_white_jumping$ = this.cargarImagen('/assets/npc/rabbit_white_jump.png');
    const rabbit_black_walking$ = this.cargarImagen('/assets/npc/rabbit_black_walk.png');
    const rabbit_black_jumping$ = this.cargarImagen('/assets/npc/rabbit_black_jump.png');
    const frog_green_jumping$ = this.cargarImagen('/assets/npc/frog_green_jump.png');
    const toad_green_jumping$ = this.cargarImagen('/assets/npc/toad_green_jump.png');
    const puppyDalmatianBlackImage$ = this.cargarImagen('/assets/npc/puppy_dalmatian_black_walk.png');
    const pig_pink_walking$ = this.cargarImagen('/assets/npc/pig_pink_walk.png');
    const parrot_green_walking$ = this.cargarImagen('/assets/npc/parrot_green_walk.png');
    const parrot_green_flying$ = this.cargarImagen('/assets/npc/parrot_green_fly.png');
    const rooster_white_walking$ = this.cargarImagen('/assets/npc/rooster_white_walk.png');
    const woman07_walking$ = this.cargarImagen('/assets/npc/woman07_walk.png');
    const man01_walking$ = this.cargarImagen('/assets/npc/man01_walk.png');
    const man02_walking$ = this.cargarImagen('/assets/npc/man02_walk.png');
    const man03_walking$ = this.cargarImagen('/assets/npc/man03_walk.png');
    const man04_walking$ = this.cargarImagen('/assets/npc/man04_walk.png');
    const man08_walking$ = this.cargarImagen('/assets/npc/man08_walk.png');
    const man09_walking$ = this.cargarImagen('/assets/npc/man09_walk.png');
    const fish_orange_jumping$ = this.cargarImagen('/assets/npc/fish_orange_jump.png'); // Asegúrate que este archivo exista
    const lemonImage$ = this.cargarImagen('/assets/img/lemon.png');
    const man09CarrySmallGreenImage$ = this.cargarImagen('/assets/npc/man09_carry_small_green.png');
    const woman04CarrySmallGreenImage$ = this.cargarImagen('/assets/npc/woman04_carry_small_green.png');
    const woman07CarrySmallGreenImage$ = this.cargarImagen('/assets/npc/woman07_carry_small_green.png');
    const man09CarryCardboardBoxImage$ = this.cargarImagen('/assets/npc/man09_carry_cardboardbox.png');
    const playerSitChairImage$ = this.cargarImagen('/assets/pc/deliveryman_sit_chair.png');
    const playerSitCouchImage$ = this.cargarImagen('/assets/pc/deliveryman_sit_couch.png');
    const playerSitSleepImage$ = this.cargarImagen('/assets/pc/deliveryman_sit_sleep.png');
    const playerIdleImage$ = this.cargarImagen('/assets/pc/deliveryman_idle.png');
    const playerChopImage$ = this.cargarImagen('/assets/pc/deliveryman_chop.png');
    const couchGreenFrontImage$ = this.cargarImagen('/assets/furniture/couch_green_front_type01.png');
    const couchGreenProfileImage$ = this.cargarImagen('/assets/furniture/couch_green_profile_type01.png');
    const couchGreenBackImage$ = this.cargarImagen('/assets/furniture/couch_green_back_type01.png');
    const chairBrownFrontImage$ = this.cargarImagen('/assets/furniture/chair_brown_front_type01.png');
    const chairBrownProfileImage$ = this.cargarImagen('/assets/furniture/chair_brown_profile_type01.png');
    const chairBrownBackImage$ = this.cargarImagen('/assets/furniture/chair_brown_back_empty_type01.png');
    const nameplateBrownEmptyImage$ = this.cargarImagen('/assets/architecture/nameplate_brown_empty.png');
    const sidewalkSignImage$ = this.cargarImagen('/assets/architecture/sidewalkSign.png');
    const sidewalkSignFishImage$ = this.cargarImagen('/assets/architecture/sidewalkSign_fish.png');
    const sidewalkSignFruitImage$ = this.cargarImagen('/assets/architecture/sidewalkSign_fruits.png');
    const sidewalkSignMugImage$ = this.cargarImagen('/assets/architecture/sidewalkSign_mugs.png');

    // Carga explícita de cajas de cartón y madera
    const cardboardBox01Image$ = this.cargarImagen('/assets/img/cardboardBox_type01.png');
    const cardboardBox02Image$ = this.cargarImagen('/assets/img/cardboardBox_type02.png');
    const woodBox01Image$ = this.cargarImagen('/assets/img/woodBox_type01.png');
    const woodBox02Image$ = this.cargarImagen('/assets/img/woodBox_type02.png');

    // Carga de NPCs con Profesión (Architecture folder per instructions)
    const granma01_walk$ = this.cargarImagen('/assets/npc/grandma01_walk.png');
    const granpa01_walk$ = this.cargarImagen('/assets/npc/grandpa01_walk.png');
    const granma01_idle$ = this.cargarImagen('/assets/npc/grandma01_idle.png');
    const granpa01_idle$ = this.cargarImagen('/assets/npc/grandpa01_idle.png');
    const granma01_walk_sell$ = this.cargarImagen('/assets/npc/grandma01_walk_sell.png');
    const granpa01_walk_sell$ = this.cargarImagen('/assets/npc/grandpa01_walk_sell.png');
    const granma01_idle_sell$ = this.cargarImagen('/assets/npc/grandma01_idle_sell.png');
    const granpa01_idle_sell$ = this.cargarImagen('/assets/npc/grandpa01_idle_sell.png');

    const tree01Image$ = this.cargarImagen('/assets/tiles/tree_grass_green_type01.png');
    const tree02Image$ = this.cargarImagen('/assets/tiles/tree_grass_green_type02.png');
    const tree03Image$ = this.cargarImagen('/assets/tiles/tree_grass_green_type03.png');
    const tree04Image$ = this.cargarImagen('/assets/tiles/tree_grass_green_type04.png');
    const tree05Image$ = this.cargarImagen('/assets/tiles/tree_grass_green_type05.png');

    // Carga de nuevas frutas
    const strawberryImage$ = this.cargarImagen('/assets/img/strawberry.png');
    const redAppleImage$ = this.cargarImagen('/assets/img/red_apple.png');
    const orangeImage$ = this.cargarImagen('/assets/img/orange.png');
    const grapeImage$ = this.cargarImagen('/assets/img/grape.png');
    const bananaImage$ = this.cargarImagen('/assets/img/banana.png');

    // Carga de Loot
    const coin_50$ = this.cargarImagen('/assets/img/coin_50_cop.png');
    const coin_100$ = this.cargarImagen('/assets/img/coin_100_cop.png');
    const coin_200$ = this.cargarImagen('/assets/img/coin_200_cop.png');
    const coin_500$ = this.cargarImagen('/assets/img/coin_500_cop.png');
    const coin_1000$ = this.cargarImagen('/assets/img/coin_1000_cop.png');
    const bill_2000$ = this.cargarImagen('/assets/img/bill_2000_cop.png');
    const bill_5000$ = this.cargarImagen('/assets/img/bill_5000_cop.png');
    const bill_10000$ = this.cargarImagen('/assets/img/bill_10000_cop.png');
    const bill_20000$ = this.cargarImagen('/assets/img/bill_20000_cop.png');
    const bill_50000$ = this.cargarImagen('/assets/img/bill_50000_cop.png'); // Fix nombre archivo
    const bill_100000$ = this.cargarImagen('/assets/img/bill_100000_cop.png'); // Fix nombre archivo para evitar 404

    // Carga de Sonidos
    const duckMaleQuackSound$ = this.cargarSonido('/assets/sounds/duck_male_quacking.mp3');
    const duckFemaleQuackSound$ = this.cargarSonido('/assets/sounds/duck_female_quacking.mp3');

    // Carga de botones UI
    const acceptQuestBtn$ = this.cargarImagen('/assets/buttons/acceptQuest.png');
    const barterBtn$ = this.cargarImagen('/assets/buttons/barter.png');
    const haggleBtn$ = this.cargarImagen('/assets/buttons/hagel.png');
    const rejectQuestBtn$ = this.cargarImagen('/assets/buttons/rejectQuest.png');
    const shopBtn$ = this.cargarImagen('/assets/buttons/shop.png');

    // Agrupamos assets especiales que necesitan ser registrados en tileImages pero no son parte de tileDefinitions
    const specialTileAssets = [
      { key: 'lemon.png', obs: lemonImage$ },
      { key: 'CardboardBox_type01.png', obs: cardboardBox01Image$ },
      { key: 'CardboardBox_type02.png', obs: cardboardBox02Image$ },
      { key: 'WoodBox_type01.png', obs: woodBox01Image$ },
      { key: 'WoodBox_type02.png', obs: woodBox02Image$ },
    ];

    return new Observable((observer) =>
    {
      // 1. Configuración de Assets: Mapeo de clave a observable
      const assetConfig = [
        { key: 'playerImage', obs: playerImage$ },
        { key: 'playerCarryCardBoardBoxImage', obs: playerCarryCardboardBoxImage$ },
        { key: 'playerCarryWoodBoxImage', obs: playerCarryWoodBoxImage$ },
        { key: 'playerCarrySmallGreenImage', obs: playerCarrySmallGreenImage$ },
        { key: 'playerCarryMetalPitcherEmptyImage', obs: playerCarryMetalPitcherEmptyImage$ },
        { key: 'playerCarryMetalPitcherWaterImage', obs: playerCarryMetalPitcherWaterImage$ },
        { key: 'playerKneelDownImage', obs: playerKneelDownImage$ },
        { key: 'playerKneelDownMetalPitcherEmptyImage', obs: playerKneelDownMetalPitcherEmpty$ },
        { key: 'playerKneelDownMetalPitcherWaterImage', obs: playerKneelDownMetalPitcherWaterImage$ },
        { key: 'woman01_walking', obs: woman01_walking$ },
        { key: 'woman02_walking', obs: woman02_walking$ },
        { key: 'woman03_walking', obs: woman03_walking$ },
        { key: 'woman05_idle', obs: woman05_idle$ },
        { key: 'woman05_walking', obs: woman05_walking$ },
        { key: 'woman06_idle', obs: woman06_idle$ },
        { key: 'woman06_walking', obs: woman06_walking$ },
        { key: 'woman10_idle', obs: woman10_idle$ },
        { key: 'woman10_walking', obs: woman10_walking$ },
        { key: 'woman11_walking', obs: woman11_walking$ },
        { key: 'npcImage', obs: npcImage$ }, // mujer4
        { key: 'chick_yellow_walking', obs: chick_yellow_walking$ },
        { key: 'hen_white_walking', obs: hen_white_walking$ },
        { key: 'hen_turken_walking', obs: hen_turken_walking$ },
        { key: 'pinkWormImage', obs: eartworm_pink_moving$ },
        { key: 'drakeWhiteImage', obs: drake_white_walking$ },
        { key: 'drakeBlackImage', obs: drake_black_walking$ },
        { key: 'drakeBrownImage', obs: drake_brown_walking$ },
        { key: 'drakeMallardImage', obs: drake_mallard_walking$ },
        { key: 'duckMallardImage', obs: duck_mallard_walking$ },
        { key: 'ducklingYellowWalk', obs: duckling_yellow_walking$ },
        { key: 'ducklingYellowSwim', obs: duckling_yellow_swimming$ },
        { key: 'rabbitWhiteWalkImage', obs: rabbit_white_walking$ },
        { key: 'rabbitWhiteJumpImage', obs: rabbit_white_jumping$ },
        { key: 'rabbitBlackWalkImage', obs: rabbit_black_walking$ },
        { key: 'rabbitBlackJumpImage', obs: rabbit_black_jumping$ },
        { key: 'frogGreenImage', obs: frog_green_jumping$ },
        { key: 'toadGreenImage', obs: toad_green_jumping$ },
        { key: 'puppyDalmatianBlackImage', obs: puppyDalmatianBlackImage$ },
        { key: 'pigPinkWalkImage', obs: pig_pink_walking$ },
        { key: 'parrotImage', obs: parrot_green_walking$ },
        { key: 'parrotFlyImage', obs: parrot_green_flying$ },
        { key: 'eartwormImage', obs: eartworm_pink_moving$ },
        { key: 'mouse_gray_walking', obs: mouse_gray_walking$ },
        { key: 'dogImage', obs: dogImage$ },
        { key: 'roosterImage', obs: rooster_white_walking$ },
        { key: 'woman04_walking', obs: woman01_walking$ },
        { key: 'woman07_walking', obs: woman07_walking$ },
        { key: 'man08_walking', obs: man08_walking$ },
        { key: 'man09_walking', obs: man09_walking$ },
        { key: 'fish_orange_jumping', obs: fish_orange_jumping$ },
        { key: 'man09CarrySmallGreenImage', obs: man09CarrySmallGreenImage$ },
        { key: 'man09_carrySmallGreenImage', obs: man09CarrySmallGreenImage$ },
        { key: 'woman04CarrySmallGreenImage', obs: woman04CarrySmallGreenImage$ },
        { key: 'woman07CarrySmallGreenImage', obs: woman07CarrySmallGreenImage$ },
        { key: 'man09_carryCardboardBoxImage', obs: man09CarryCardboardBoxImage$ },
        { key: 'playerSitImage', obs: playerSitCouchImage$ },
        { key: 'playerSitSleepImage', obs: playerSitSleepImage$ },
        { key: 'playerIdleImage', obs: playerIdleImage$ },
        { key: 'playerChopImage', obs: playerChopImage$ },
        { key: 'tree01Image', obs: tree01Image$ },
        { key: 'tree02Image', obs: tree02Image$ },
        { key: 'tree03Image', obs: tree03Image$ },
        { key: 'tree04Image', obs: tree04Image$ },
        { key: 'tree05Image', obs: tree05Image$ },
        { key: 'couchGreenFrontImage', obs: couchGreenFrontImage$ },
        { key: 'couchGreenProfileImage', obs: couchGreenProfileImage$ },
        { key: 'couchGreenBackImage', obs: couchGreenBackImage$ },
        { key: 'chairBrownFrontImage', obs: chairBrownFrontImage$ },
        { key: 'chairBrownProfileImage', obs: chairBrownProfileImage$ },
        { key: 'chairBrownBackImage', obs: chairBrownBackImage$ },
        { key: 'man01_walking', obs: man01_walking$ },
        { key: 'man02_walking', obs: man02_walking$ },
        { key: 'man03_walking', obs: man03_walking$ },
        { key: 'man04_walking', obs: man04_walking$ },
        { key: 'playerSitChairImage', obs: playerSitChairImage$ },
        { key: 'nameplateBrownEmptyImage', obs: nameplateBrownEmptyImage$ },
        { key: 'sidewalkSignImage', obs: sidewalkSignImage$ },
        { key: 'sidewalkSignFishImage', obs: sidewalkSignFishImage$ },
        { key: 'sidewalkSignFruitImage', obs: sidewalkSignFruitImage$ },
        { key: 'sidewalkSignMugImage', obs: sidewalkSignMugImage$ },
        { key: 'grandma01_walk', obs: granma01_walk$ },
        { key: 'grandpa01_walk', obs: granpa01_walk$ },
        { key: 'grandma01_idle', obs: granma01_idle$ },
        { key: 'grandpa01_idle', obs: granpa01_idle$ },
        { key: 'grandma01_walk_sell', obs: granma01_walk_sell$ },
        { key: 'grandpa01_walk_sell', obs: granpa01_walk_sell$ },
        { key: 'grandma01_idle_sell', obs: granma01_idle_sell$ },
        { key: 'grandpa01_idle_sell', obs: granpa01_idle_sell$ },
        { key: 'strawberryImage', obs: strawberryImage$ },
        { key: 'redAppleImage', obs: redAppleImage$ },
        { key: 'orangeImage', obs: orangeImage$ },
        { key: 'grapeImage', obs: grapeImage$ },
        { key: 'bananaImage', obs: bananaImage$ },
        { key: 'coin_50', obs: coin_50$ },
        { key: 'coin_100', obs: coin_100$ },
        { key: 'coin_200', obs: coin_200$ },
        { key: 'coin_500', obs: coin_500$ },
        { key: 'coin_1000', obs: coin_1000$ },
        { key: 'bill_2000', obs: bill_2000$ },
        { key: 'bill_5000', obs: bill_5000$ },
        { key: 'bill_10000', obs: bill_10000$ },
        { key: 'bill_20000', obs: bill_20000$ },
        { key: 'bill_50000', obs: bill_50000$ },
        { key: 'bill_100000', obs: bill_100000$ },
        // Sounds
        { key: 'duckMaleQuackSound', obs: duckMaleQuackSound$ },
        { key: 'duckFemaleQuackSound', obs: duckFemaleQuackSound$ },
        // UI Buttons
        { key: 'acceptQuestBtn', obs: acceptQuestBtn$ },
        { key: 'barterBtn', obs: barterBtn$ },
        { key: 'haggleBtn', obs: haggleBtn$ },
        { key: 'rejectQuestBtn', obs: rejectQuestBtn$ },
        { key: 'shopBtn', obs: shopBtn$ },
      ];

      // Arrays especiales
      const faceConfig = [
        { key: 'man01', obs: man01_face$ },
        { key: 'man02', obs: man02_face$ },
        { key: 'man03', obs: man03_face$ },
        { key: 'man04', obs: man04_face$ },
        { key: 'woman01', obs: woman01_face$ },
        { key: 'woman02', obs: woman02_face$ },
        { key: 'woman03', obs: woman03_face$ },
        { key: 'woman04', obs: woman04_face$ },
        { key: 'woman05', obs: woman05_face$ },
        { key: 'woman06', obs: woman06_face$ },
        { key: 'woman07', obs: woman07_face$ },
        { key: 'man08', obs: man08_face$ },
        { key: 'man09', obs: man09_face$ },
        { key: 'woman09', obs: woman09_face$ },
        { key: 'woman10', obs: woman10_face$ },
        { key: 'woman11', obs: woman11_face$ },
        { key: 'grandma01', obs: grandma01_face$ },
        { key: 'grandpa01', obs: grandpa01_face$ },
      ];

      const allObservables = [
        ...tileObservables,
        ...assetConfig.map(a => a.obs),
        ...dogObservables,
        ...catObservables,
        ...faceConfig.map(f => f.obs)
      ];
      // Añadimos los assets especiales al final para un manejo unificado
      allObservables.push(...specialTileAssets.map(a => a.obs));

      forkJoin(allObservables).subscribe({
        next: (results: (HTMLImageElement | HTMLAudioElement)[]) =>
        {
          let currentIndex = 0;

          // Asignar tiles
          tileDefinitions.forEach((tileDef, index) =>
          {
            this.tileImages[tileDef.fileName] = results[currentIndex++] as HTMLImageElement;
          });

          // Asignar assets individuales
          assetConfig.forEach(config =>
          {
            (this as any)[config.key] = results[currentIndex++];
          });

          // Asignar perros
          dogColors.forEach(color =>
          {
            const img = results[currentIndex++] as HTMLImageElement;
            if (img.naturalWidth > 0) this.dogImages[`dog_${color}_walk.png`] = img;
          });

          // Asignar gatos
          catColors.forEach(color =>
          {
            const img = results[currentIndex++] as HTMLImageElement;
            if (img.naturalWidth > 0) this.catImages[`cat_${color}_walk.png`] = img;
          });

          // Asignar caras de NPCs
          faceConfig.forEach(config =>
          {
            const img = results[currentIndex++] as HTMLImageElement;
            if (img.naturalWidth > 0) this.npcFaceImages[config.key] = img;
          });

          // Asignar y registrar assets especiales (limón, cajas)
          specialTileAssets.forEach(config =>
          {
            const img = results[currentIndex++] as HTMLImageElement;
            if (img && img.naturalWidth > 0)
            {
              this.tileImages[config.key] = img;
            }
          });

          // Mapear perros
          this.dogImage = this.dogImages['dog_white_walk.png'];

          // Registrar manualmente los sofás en tileImages usando rutas absolutas
          this.tileImages['/assets/furniture/couch_green_front_type01.png'] = this.couchGreenFrontImage;
          this.tileImages['/assets/furniture/couch_green_profile_type01.png'] = this.couchGreenProfileImage;
          this.tileImages['/assets/furniture/couch_green_back_type01.png'] = this.couchGreenBackImage;

          // Registrar manualmente las sillas
          this.tileImages['/assets/furniture/chair_brown_front_type01.png'] = this.chairBrownFrontImage;
          this.tileImages['/assets/furniture/chair_brown_profile_type01.png'] = this.chairBrownProfileImage;
          this.tileImages['/assets/furniture/chair_brown_back_empty_type01.png'] = this.chairBrownBackImage;

          // Registrar nameplate
          if (this.nameplateBrownEmptyImage.naturalWidth > 0)
          {
            this.tileImages['nameplate_brown_empty.png'] = this.nameplateBrownEmptyImage;
          }

          // Registrar manualmente los letreros de mercado
          this.tileImages['sidewalkSign_fish.png'] = this.sidewalkSignFishImage;
          this.tileImages['sidewalkSign_fruits.png'] = this.sidewalkSignFruitImage;
          this.tileImages['sidewalkSign_mugs.png'] = this.sidewalkSignMugImage;

          // Registrar árboles en tileImages
          // CORRECCIÓN: Usar los nombres exactos que espera el Tree.ts (tree_grass_green_typeXX.png)
          if (this.tree01Image.naturalWidth > 0) this.tileImages['tree_grass_green_type01.png'] = this.resizeIfNeeded(this.tree01Image);
          if (this.tree02Image.naturalWidth > 0) this.tileImages['tree_grass_green_type02.png'] = this.resizeIfNeeded(this.tree02Image);
          if (this.tree03Image.naturalWidth > 0) this.tileImages['tree_grass_green_type03.png'] = this.resizeIfNeeded(this.tree03Image);
          if (this.tree04Image.naturalWidth > 0) this.tileImages['tree_grass_green_type04.png'] = this.resizeIfNeeded(this.tree04Image);
          if (this.tree05Image.naturalWidth > 0) this.tileImages['tree_grass_green_type05.png'] = this.resizeIfNeeded(this.tree05Image);

          // Redimensionar y registrar frutas para el trade-panel
          if (this.strawberryImage.naturalWidth > 0) this.tileImages['strawberry.png'] = this.resizeTo(this.strawberryImage);
          if (this.redAppleImage.naturalWidth > 0) this.tileImages['red_apple.png'] = this.resizeTo(this.redAppleImage);
          if (this.orangeImage.naturalWidth > 0) this.tileImages['orange.png'] = this.resizeTo(this.orangeImage);
          if (this.grapeImage.naturalWidth > 0) this.tileImages['grape.png'] = this.resizeTo(this.grapeImage);
          if (this.bananaImage.naturalWidth > 0) this.tileImages['banana.png'] = this.resizeTo(this.bananaImage);

          // Registrar Loot en tileImages para el Renderer
          if (this.coin_50.naturalWidth > 0) this.tileImages['coin_50.png'] = this.resizeTo(this.coin_50);
          if (this.coin_100.naturalWidth > 0) this.tileImages['coin_100.png'] = this.resizeTo(this.coin_100);
          if (this.coin_200.naturalWidth > 0) this.tileImages['coin_200.png'] = this.resizeTo(this.coin_200);
          if (this.coin_500.naturalWidth > 0) this.tileImages['coin_500.png'] = this.resizeTo(this.coin_500);
          if (this.coin_1000.naturalWidth > 0) this.tileImages['coin_1000.png'] = this.resizeTo(this.coin_1000);
          if (this.bill_2000.naturalWidth > 0) this.tileImages['bill_2000.png'] = this.resizeTo(this.bill_2000);
          if (this.bill_5000.naturalWidth > 0) this.tileImages['bill_5000.png'] = this.resizeTo(this.bill_5000);
          if (this.bill_10000.naturalWidth > 0) this.tileImages['bill_10000.png'] = this.resizeTo(this.bill_10000);
          if (this.bill_20000.naturalWidth > 0) this.tileImages['bill_20000.png'] = this.resizeTo(this.bill_20000);
          if (this.bill_50000.naturalWidth > 0) this.tileImages['bill_50000.png'] = this.resizeTo(this.bill_50000);
          if (this.bill_100000.naturalWidth > 0) this.tileImages['bill_100000.png'] = this.resizeTo(this.bill_100000);

          observer.next();
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  private cargarImagen(url: string): Observable<HTMLImageElement>
  {
    return new Observable((observer: Subscriber<HTMLImageElement>) =>
    {
      const img = new Image();
      img.src = url;
      img.onload = () => { observer.next(img); observer.complete(); };
      img.onerror = () =>
      {
        //console.warn(`⚠️ No se pudo cargar: ${url}`);
        observer.next(img); // Retornar imagen vacía para no romper forkJoin
        observer.complete();
      };
    });
  }

  private cargarSonido(url: string): Observable<HTMLAudioElement>
  {
    return new Observable((observer: Subscriber<HTMLAudioElement>) =>
    {
      const audio = new Audio(url);
      audio.oncanplaythrough = () =>
      {
        observer.next(audio);
        observer.complete();
      };
      audio.onerror = (e) =>
      {
        //console.warn(`⚠️ No se pudo cargar el sonido: ${url}`, e);
        observer.next(audio); // Return empty audio to not break forkJoin
        observer.complete();
      };
      audio.load(); // Some browsers require an explicit load call.
    });
  }

  private resizeIfNeeded(img: HTMLImageElement): HTMLImageElement | HTMLCanvasElement
  {
    const MAX_SIZE = 256;
    // Si la imagen ya es pequeña, la devolvemos tal cual
    if (img.naturalWidth <= MAX_SIZE && img.naturalHeight <= MAX_SIZE) return img;

    const canvas = document.createElement('canvas');
    // Calculamos la escala manteniendo la relación de aspecto
    const scale = Math.min(MAX_SIZE / img.naturalWidth, MAX_SIZE / img.naturalHeight);

    canvas.width = Math.floor(img.naturalWidth * scale);
    canvas.height = Math.floor(img.naturalHeight * scale);

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  private resizeTo(img: HTMLImageElement, newWidth: number = 32, newHeight: number = 32): HTMLCanvasElement | HTMLImageElement
  {
    // OPTIMIZACIÓN: Si la imagen ya tiene el tamaño deseado, no crear canvas extra.
    if (img.naturalWidth === newWidth && img.naturalHeight === newHeight)
    {
      return img;
    }

    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext('2d');

    if (ctx)
    {
      // 1. Desactivamos el suavizado para mantener la esencia de los píxeles (Pixel Art)
      ctx.imageSmoothingEnabled = false;

      // 2. Opcional: Algunos navegadores antiguos requieren prefijos
      // (ctx as any).mozImageSmoothingEnabled = false;
      // (ctx as any).webkitImageSmoothingEnabled = false;

      // 3. Dibujamos la imagen original escalada al tamaño del canvas
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
    }

    return canvas;
  }

  private resizeTo32Px(img: HTMLImageElement): HTMLCanvasElement
  {
    const canvas = document.createElement('canvas');

    // 0.03125 es el factor para pasar de 1024 a 32
    const scaleFactor = 0.03125;

    canvas.width = Math.floor(img.naturalWidth * scaleFactor);
    canvas.height = Math.floor(img.naturalHeight * scaleFactor);

    const ctx = canvas.getContext('2d');
    if (ctx)
    {
      // Tip Pro: Mejora la calidad de la reducción agresiva
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    return canvas;
  }
}
