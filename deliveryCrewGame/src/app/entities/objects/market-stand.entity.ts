import { EventEmitter } from '@angular/core';
import { InventoryItem, Item } from '../../shared/models/trade.types';
import { Salesman } from '../npc/salesman';
import { EconomyService } from '../../core/services/economy.service';

export class MarketStandEntity
{
  public isOpen: boolean = true;
  public assignedNPC: Salesman | null = null;
  public inventory: InventoryItem[] = [];
  public standType: string = 'general';

  // Tarea 4: Evento de agotamiento de stock
  public stockDepleted = new EventEmitter<string>(); // Emits the ID of the depleted item

  // NUEVO: Método estático para obtener todos los IDs de items posibles
  public static getAllPossibleItemIds(): string[]
  {
    // Centralizamos todos los IDs de items que pueden existir en los puestos.
    // Esto asegura que el GameBoard pueda precargar todos los assets necesarios.
    return [
      // fruits
      'strawberry', 'lemon', 'red_apple', 'orange', 'grape', 'banana',
      // vegetables
      'carrot', 'lettuce', 'tomato',
      // meat
      'steak', 'sausage', 'chicken_leg',
      // fish
      'trout', 'salmon',
      // bakery
      'bread', 'croissant', 'baguette_bread'
    ];
  }

  constructor(
    public id: string, // e.g., 'market_stand_1'
    private economyService: EconomyService,
    public x: number,
    public y: number,
    type: string = 'general'
  )
  {
    this.standType = type;
    this.initializeInventory();
  }

  private initializeInventory()
  {
    this.inventory = [];

    switch (this.standType)
    {
      case 'fruits':
        this.addItem('strawberry', 'Fresa', 'fruits', 800, 20);
        this.addItem('lemon', 'Limón', 'fruits', 400, 30);
        this.addItem('red_apple', 'Manzana Roja', 'fruits', 1800, 25);
        this.addItem('orange', 'Naranja', 'fruits', 700, 20);
        this.addItem('grape', 'Uva', 'fruits', 1200, 15);
        this.addItem('banana', 'Banano', 'fruits', 500, 25);
        break;
      case 'vegetables':
        this.addItem('carrot', 'Zanahoria', 'vegetables', 600, 30);
        this.addItem('lettuce', 'Lechuga', 'vegetables', 2000, 20);
        this.addItem('tomato', 'Tomate', 'vegetables', 700, 25);
        break;
      case 'meat':
        this.addItem('steak', 'Filete', 'meat', 18000, 10);
        this.addItem('sausage', 'Salchicha', 'meat', 3000, 20);
        this.addItem('chicken_leg', 'Muslo de Pollo', 'meat', 5000, 15);
        break;
      case 'fish':
        this.addItem('trout', 'Trucha', 'fish', 14000, 10);
        this.addItem('salmon', 'Salmón', 'fish', 28000, 5);
        break;
      case 'bakery':
        this.addItem('bread', 'Pan', 'bakery', 500, 50);
        this.addItem('croissant', 'Croissant', 'bakery', 3500, 30);
        this.addItem('baguette_bread', 'Baguette', 'bakery', 2500, 40);
        break;
      default:
        // General or fallback
        this.addItem('lemon', 'Limón', 'fruits', 400, 10);
        this.addItem('bread', 'Pan', 'bakery', 500, 10);
        break;
    }
  }

  private addItem(id: string, name: string, category: any, baseValue: number, quantity: number)
  {
    this.inventory.push({ id, name, category, baseValue, quantity });
  }

  /**
   * Adds items to the stand's inventory.
   */
  public stockItem(item: Item, quantity: number): void
  {
    const existingItem = this.inventory.find(i => i.id === item.id);
    if (existingItem)
    {
      existingItem.quantity += quantity;
    } else
    {
      this.inventory.push({ ...item, quantity });
    }
  }

  /**
   * Processes a trade request from the player. Delegates value calculation to EconomyService.
   * @returns An object indicating if the trade was successful and a message.
   */
  public receiveTradeRequest(playerItem: Item, requestedItemId: string, gameDay: number): { success: boolean, message: string }
  {
    if (!this.isOpen)
    {
      return { success: false, message: 'El puesto está cerrado.' };
    }

    const standItem = this.inventory.find(i => i.id === requestedItemId);

    if (!standItem || standItem.quantity <= 0)
    {
      return { success: false, message: 'No me queda de eso.' };
    }

    // Tarea 3: Delegar cálculo al EconomyService
    const valueOfPlayerOffer = this.economyService.getCurrentPrice(playerItem, gameDay);
    const valueOfStandItem = this.economyService.getCurrentPrice(standItem, gameDay);

    if (valueOfPlayerOffer >= valueOfStandItem)
    {
      const amountToGive = Math.floor(valueOfPlayerOffer / valueOfStandItem);

      if (standItem.quantity < amountToGive)
      {
        return { success: false, message: `Solo me quedan ${standItem.quantity}. No es suficiente para un trueque justo.` };
      }

      // Realizar el trueque
      standItem.quantity -= amountToGive;
      console.log(`Trade successful! Gave ${amountToGive} of ${standItem.name} for 1 ${playerItem.name}.`);

      // Tarea 4: Verificar agotamiento de stock
      if (standItem.quantity <= 0)
      {
        this.stockDepleted.emit(standItem.id);
        console.log(`${standItem.name} se ha agotado!`);
      }

      return { success: true, message: `¡Trato hecho! Aquí tienes ${amountToGive} de ${standItem.name}.` };
    } else
    {
      // Calcular cuántos items del jugador se necesitarían para un trueque justo
      const needed = Math.ceil(valueOfStandItem / valueOfPlayerOffer);
      return { success: false, message: `No es suficiente. Necesitaría ${needed} de los tuyos por uno de los míos.` };
    }
  }
}