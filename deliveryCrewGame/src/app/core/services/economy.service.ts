import { Injectable } from '@angular/core';
import { Item } from '../../shared/models/trade.types';

@Injectable({
  providedIn: 'root'
})
export class EconomyService {
  // Cache for daily prices to ensure consistency within a game day
  private dailyPriceCache = new Map<string, number>();
  private lastCacheResetDay: number = -1;

  constructor() { }

  /**
   * Calculates the current market price for an item, including daily fluctuations.
   * @param item The item to price.
   * @param gameDay The current day of the game to manage price caching.
   * @returns The current market value.
   */
  public getCurrentPrice(item: Item, gameDay: number): number {
    // Reset cache for a new day
    if (gameDay !== this.lastCacheResetDay) {
      this.dailyPriceCache.clear();
      this.lastCacheResetDay = gameDay;
    }

    if (this.dailyPriceCache.has(item.id)) {
      return this.dailyPriceCache.get(item.id)!;
    }

    // Fluctuation: price can be between 80% and 120% of base value
    const fluctuation = 0.8 + Math.random() * 0.4;
    const currentPrice = Math.round(item.baseValue * fluctuation);
    
    this.dailyPriceCache.set(item.id, currentPrice);
    return currentPrice;
  }

  /**
   * Calculates how many units of itemB are needed to equal the value of one unit of itemA.
   * @param itemA The item being offered.
   * @param itemB The item being requested.
   * @param gameDay The current day of the game.
   * @returns The exchange rate (how many B's for one A).
   */
  public calculateExchangeRate(itemA: Item, itemB: Item, gameDay: number): number {
    const priceA = this.getCurrentPrice(itemA, gameDay);
    const priceB = this.getCurrentPrice(itemB, gameDay);

    if (priceB === 0) return Infinity;

    return priceA / priceB;
  }
}