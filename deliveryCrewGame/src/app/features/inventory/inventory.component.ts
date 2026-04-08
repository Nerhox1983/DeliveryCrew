import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Inventory } from '../../shared/models/inventory.model';

@Component({
    selector: 'app-inventory',

    standalone: true,
    imports: [CommonModule],
    templateUrl: './inventory.component.html',
    styleUrls: ['./inventory.component.css']
})
export class InventoryComponent
{
    @Input() inventory: Inventory | null | undefined; // Recibe el objeto inventario del jugador

    // Mapa para corregir nombres de archivos de assets específicos
    private readonly iconMap: { [key: string]: string } = {
        'cardboardbox': 'cardboardBox_type01',
        'woodbox': 'woodBox_type01',
        'pitcher': 'metal_pitcher'
    };

    constructor() { }

    // Obtiene la ruta del icono (puedes ajustar la ruta base según tu estructura de assets)
    getItemIcon(itemKey: string): string
    {
        // Verifica si hay un mapeo especial, si no, usa el itemKey tal cual
        const filename = this.iconMap[itemKey] || itemKey;
        return `assets/img/${filename}.png`;
    }


    // Formatea el nombre del ítem (ej: "madera_roble" -> "Madera Roble")
    formatItemName(itemKey: string): string
    {
        if (!itemKey) return '';

        // Reemplaza guiones bajos por espacios y capitaliza
        if (itemKey === 'bread_crumb')
        {
            return 'Trozo de Pan';
        }
        return itemKey.replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase());
    }
}