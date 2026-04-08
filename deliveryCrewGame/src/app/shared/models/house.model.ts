import { Pederestian } from "../../entities/npc/pederestian";

export interface HouseData 
{
    id: number;
    originRow: number;
    originCol: number;
    width: number;
    height: number;
    pixelWidth: number;
    pixelHeight: number;
}

export class House 
{
    public owner: Pederestian | null = null;

    constructor(public data: HouseData)
    {
        
    }
    /**
    * Determina si una celda (fila/columna) pertenece a esta casa.
    */
    isPositionInside(row: number, col: number): boolean 
    {
        return (
        row >= this.data.originRow &&
        row < this.data.originRow + this.data.height &&
        col >= this.data.originCol &&
        col < this.data.originCol + this.data.width
        );
    }
}