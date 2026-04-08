export class Wallet
{
    private denominations: { [key: string]: number } = {};
    private total: number = 0;

    // Configuración de denominaciones para el recálculo (Algoritmo Greedy)
    private readonly VALUES = [
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

    constructor() { }

    /**
     * Añade una cantidad de una denominación específica a la billetera.
     * @param denomination La clave de la denominación (ej: 'coin_100').
     * @param value El valor numérico de esa denominación.
     */
    public add(denomination: string, value: number): void
    {
        this.denominations[denomination] = (this.denominations[denomination] || 0) + 1;
        this.total += value;
    }

    /**
     * Obtiene el valor total del dinero en la billetera.
     * @returns El total acumulado.
     */
    public getTotal(): number
    {
        return this.total;
    }

    /**
     * Devuelve el desglose de las denominaciones y sus cantidades.
     * Ideal para pasar a componentes de UI.
     * @returns Un objeto con las denominaciones y sus conteos.
     */
    public getDenominations(): { [key: string]: number }
    {
        return { ...this.denominations };
    }

    /**
     * Intenta pagar una cantidad. Si tiene suficiente saldo, lo descuenta y reorganiza las denominaciones.
     * @param amount Cantidad a pagar.
     * @returns true si el pago fue exitoso, false si no tiene fondos.
     */
    public pay(amount: number): boolean
    {
        if (this.total < amount) return false;

        this.total -= amount;
        this.recalculateDenominations();
        return true;
    }

    private recalculateDenominations()
    {
        this.denominations = {};
        let remaining = this.total;

        for (const denom of this.VALUES)
        {
            const count = Math.floor(remaining / denom.value);
            if (count > 0)
            {
                this.denominations[denom.key] = count;
                remaining -= count * denom.value;
            }
        }
    }
}