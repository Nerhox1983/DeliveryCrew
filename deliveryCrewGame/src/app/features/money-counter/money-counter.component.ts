import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

interface MoneyItem {
  key: string;
  value: number;
  count: number;
  img: string;
  changed: boolean;
}

@Component({
  selector: 'app-money-counter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './money-counter.component.html',
  styleUrls: ['./money-counter.component.css']
})
export class MoneyCounterComponent implements OnChanges {
  @Input() wallet: { [key: string]: number } = {};

  public items: MoneyItem[] = [];
  public displayTotal: number = 0;
  private targetTotal: number = 0;

  // Configuración de denominaciones (Orden descendente para la UI)
  private readonly DENOMINATIONS = [
    { key: 'bill_100000', value: 100000 },
    { key: 'bill_50000', value: 50000 },
    { key: 'bill_20000', value: 20000 },
    { key: 'bill_10000', value: 10000 },
    { key: 'bill_5000', value: 5000 },
    { key: 'bill_2000', value: 2000 },
    { key: 'coin_1000', value: 1000 },
    { key: 'coin_500', value: 500 },
    { key: 'coin_200', value: 200 },
    { key: 'coin_100', value: 100 },
    { key: 'coin_50', value: 50 }
  ];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['wallet']) {
      this.updateState();
    }
  }

  private updateState() {
    let newTotal = 0;
    const newItems: MoneyItem[] = [];

    this.DENOMINATIONS.forEach(denom => {
      const count = this.wallet[denom.key] || 0;
      
      // Solo mostramos denominaciones que el jugador tiene
      if (count > 0) {
        newTotal += count * denom.value;
        
        // Detectar si hubo cambio para la animación
        const existingItem = this.items.find(i => i.key === denom.key);
        const hasChanged = existingItem ? existingItem.count !== count : true;

        newItems.push({
          key: denom.key,
          value: denom.value,
          count: count,
          // Asumimos la ruta de assets con _cop según tu AssetManager
          img: `assets/img/${denom.key}_cop.png`, 
          changed: hasChanged
        });
      }
    });

    this.items = newItems;
    this.targetTotal = newTotal;
    
    // Iniciar animación de conteo
    this.animateTotal();

    // Limpiar flag de animación de ítems después de un breve periodo
    setTimeout(() => {
      this.items.forEach(i => i.changed = false);
    }, 500);
  }

  private animateTotal() {
    if (this.displayTotal === this.targetTotal) return;

    const diff = this.targetTotal - this.displayTotal;
    // Easing simple: moverse un 10% de la diferencia o mínimo 1 unidad
    const step = Math.abs(diff) < 10 ? diff : Math.ceil(diff / 10);

    this.displayTotal += step;

    if (this.displayTotal !== this.targetTotal) {
      requestAnimationFrame(() => this.animateTotal());
    }
  }
}
