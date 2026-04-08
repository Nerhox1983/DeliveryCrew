import { Component, EventEmitter, HostListener, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EconomyService } from '../../core/services/economy.service';
import { Item } from '../../shared/models/trade.types';
import { MarketStandEntity } from '../../entities/objects/market-stand.entity';
import { Player } from '../../entities/player';

interface TradeItem extends Item
{
  currentPrice: number;
  iconSrc: string;
}

@Component({
  selector: 'app-trade-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trade-panel.component.html',
  styleUrls: ['./trade-panel.component.css']
})
export class TradePanelComponent implements OnInit
{
  // Evento que se emitirá al padre (game-board) cuando una compra sea exitosa.
  @Output() itemPurchased = new EventEmitter<{ item: { fileName: string, type: string, value: number }, stand: MarketStandEntity }>();

  public isVisible: boolean = false;
  public tradeItems: TradeItem[] = [];
  public message: string = ''; // Para feedback visual (ej. "No hay nadie cerca")
  private messageTimer: any;
  private player: Player | null = null;
  private currentStand: MarketStandEntity | null = null;

  constructor(private economyService: EconomyService) { }

  ngOnInit(): void { }

  /**
   * Abre el panel y recalcula los precios del día.
   * @param gameDay Día actual del juego para la fluctuación de precios.
   */
  public open(gameDay: number, stand: MarketStandEntity, player: Player): void
  {
    this.player = player;
    this.currentStand = stand;
    this.updatePrices(gameDay, stand);
    this.isVisible = true;
    this.message = ''; // Limpiar mensajes previos
  }

  public close(): void
  {
    this.isVisible = false;
  }

  public showMessage(msg: string): void
  {
    this.message = msg;
    this.isVisible = false; // Asegurar que el panel principal esté cerrado si mostramos error

    if (this.messageTimer) clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() =>
    {
      this.message = '';
    }, 2000); // El mensaje desaparece a los 2 segundos
  }

  private updatePrices(gameDay: number, stand: MarketStandEntity): void
  {
    this.tradeItems = stand.inventory.map(fruit => ({
      ...fruit,
      currentPrice: this.economyService.getCurrentPrice(fruit, gameDay),
      // Mapeo de assets: Usar el ID directamente (asumiendo que los archivos son minúsculas/guiones bajos)
      iconSrc: `assets/img/${fruit.id}.png`
    }));
  }

  public buyItem(item: TradeItem): void
  {
    if (!this.player || !this.currentStand) return;

    // 1. Validar Stock en el puesto
    const stockItem = this.currentStand.inventory.find(i => i.id === item.id);
    if (!stockItem || stockItem.quantity <= 0)
    {
      this.showMessage("¡Agotado!");
      return;
    }

    // 2. Validar Dinero del jugador
    if (this.player.wallet.getTotal() < item.currentPrice)
    {
      this.showMessage("No tienes suficiente dinero.");
      return;
    }

    // 3. Realizar la Transacción
    if (this.player.wallet.pay(item.currentPrice))
    {
      stockItem.quantity--; // Reducir stock del puesto
      this.showMessage(`¡Compraste ${item.name}! con id ${item.id}`);

      // Emitir el evento para que el GameBoard genere el objeto en el mapa
      this.itemPurchased.emit({
        item: {
          fileName: `../img/${item.id}.png`, // ej: '../img/bread.png'
          type: item.category,        // ej: 'bakery', 'meat', 'fruits'
          value: item.currentPrice,
        },
        stand: this.currentStand
      });
    }
  }

  @HostListener('window:keydown.escape')
  onEsc()
  {
    if (this.isVisible) this.close();
  }
}
