import { Injectable } from '@angular/core';

export interface LootItem
{
  value: number;
  type: 'coin' | 'bill';
  imageUrl: string;
  denomination: string; // Para logs o UI
}

@Injectable({
  providedIn: 'root'
})
export class LootService
{
  private readonly BASE_DROP_CHANCE = 0.1; // 10% de probabilidad base

  constructor() { }

  /**
   * Evalúa si el jugador encuentra algo al caminar.
   * @param luckModifier Modificador opcional (ej. 1.2 para 20% más de suerte)
   */
  public checkForLoot(luckModifier: number = 1.0): LootItem | null
  {
    // 1. Check de probabilidad global
    if (Math.random() > (this.BASE_DROP_CHANCE * luckModifier))
    {
      return null;
    }

    // 2. Determinar Tipo (Moneda 80% vs Billete 20%)
    const isCoin = Math.random() < 0.8;

    return isCoin ? this.generateCoin() : this.generateBill();
  }

  private generateCoin(): LootItem
  {
    const rand = Math.random();
    let value = 0;

    // Pesos: 50 (45%), 100 (30%), 200 (15%), 500 (8%), 1000 (2%)
    if (rand < 0.45) value = 50;
    else if (rand < 0.75) value = 100; // 0.45 + 0.30
    else if (rand < 0.90) value = 200; // 0.75 + 0.15
    else if (rand < 0.98) value = 500; // 0.90 + 0.08
    else value = 1000;

    return {
      value,
      type: 'coin',
      denomination: `coin_${value}`,
      imageUrl: `/assets/img/coin_${value}_cop.png`
    };
  }

  private generateBill(): LootItem
  {
    const rand = Math.random();
    let value = 0;

    // Pesos: 2k (65%), 5k (20%), 10k (10%), 20k (4%), 50k (0.9%), 100k (0.1%)
    if (rand < 0.65) value = 2000;
    else if (rand < 0.85) value = 5000;
    else if (rand < 0.95) value = 10000;
    else if (rand < 0.99) value = 20000;
    else if (rand < 0.999) value = 50000;
    else value = 100000;

    return {
      value,
      type: 'bill',
      denomination: `bill_${value}`,
      imageUrl: `/assets/img/bill_${value}_cop.png`
    };
  }
}
