export class Inventory
{
    private items: Map<string, number> = new Map();

    constructor() { }

    /**
     * Adds a specific quantity of an item to the inventory.
     * @param itemKey The unique identifier for the item (e.g., 'wood', 'lemon').
     * @param quantity The number of items to add.
     */
    public addItem(itemKey: string, quantity: number = 1): void
    {
        const currentQuantity = this.items.get(itemKey) || 0;
        this.items.set(itemKey, currentQuantity + quantity);
        //console.log(`[Inventory] Added ${quantity}x ${itemKey}. New total: ${this.items.get(itemKey)}`);
    }

    /**
     * Returns the entire collection of items.
     * @returns A Map with item keys and their quantities.
     */
    public getItems(): Map<string, number>
    {
        return this.items;
    }

    /**
     * Gets the quantity of a specific item.
     * @param itemKey The item's identifier.
     * @returns The quantity of the item, or 0 if not found.
     */
    public getQuantity(itemKey: string): number
    {
        return this.items.get(itemKey) || 0;
    }

    /**
     * Checks if a certain quantity of an item exists in the inventory.
     * @param itemKey The item's identifier.
     * @param quantity The amount to check for. Defaults to 1.
     * @returns True if the item exists in the required quantity, false otherwise.
     */
    public hasItem(itemKey: string, quantity: number = 1): boolean
    {
        return this.getQuantity(itemKey) >= quantity;
    }

    /**
     * Removes a specific quantity of an item from the inventory.
     * If the resulting quantity is zero or less, the item is removed completely.
     * @param itemKey The item's identifier.
     * @param quantity The amount to remove. Defaults to 1.
     * @returns True if the item was successfully removed, false if there weren't enough items.
     */
    public removeItem(itemKey: string, quantity: number = 1): boolean
    {
        const currentQuantity = this.getQuantity(itemKey);
        if (currentQuantity < quantity)
        {
            return false;
        }

        const newQuantity = currentQuantity - quantity;
        if (newQuantity > 0) { this.items.set(itemKey, newQuantity); }
        else { this.items.delete(itemKey); }
        return true;
    }
}