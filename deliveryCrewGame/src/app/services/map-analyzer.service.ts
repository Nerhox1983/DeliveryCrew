import { Injectable } from '@angular/core';
import { House, HouseData } from '../shared/models/house.model';

@Injectable({
  providedIn: 'root'
})
export class MapAnalyzerService {
  
  /**
   * Analiza la matriz de edificios y devuelve un array de objetos House.
   */
  public extractHousesFromGrid(buildingGrid: number[][], tileSize: number = 64): House[] {
    const houseMap = new Map<number, HouseData>();

    for (let r = 0; r < buildingGrid.length; r++) {
      for (let c = 0; c < buildingGrid[r].length; c++) {
        const id = buildingGrid[r][c];
        if (id === 0) continue; // Si es 0, es terreno vacío

        if (!houseMap.has(id)) {
          houseMap.set(id, {
            id,
            originRow: r,
            originCol: c,
            width: 1,
            height: 1,
            pixelWidth: tileSize,
            pixelHeight: tileSize
          });
        } else {
          const house = houseMap.get(id)!;
          // Actualizamos el ancho y alto máximo encontrados para ese ID
          house.width = Math.max(house.width, (c - house.originCol) + 1);
          house.height = Math.max(house.height, (r - house.originRow) + 1);
          house.pixelWidth = house.width * tileSize;
          house.pixelHeight = house.height * tileSize;
        }
      }
    }

    return Array.from(houseMap.values()).map(data => new House(data));
  }
}