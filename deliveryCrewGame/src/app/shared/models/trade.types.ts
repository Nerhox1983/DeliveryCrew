export type ItemCategory = 'fruits' | 'bakery' | 'fish' | 'meat' | 'general';

export interface Item {
  id: string; // e.g., 'lemon', 'woodbox'
  name: string; // e.g., 'Limón', 'Caja de Madera'
  category: ItemCategory;
  baseValue: number; // The base price in the game's currency
}

export interface InventoryItem extends Item {
  quantity: number;
}