import { Directive, Input, ElementRef, Renderer2, OnInit } from '@angular/core';
import animalConfigData from '../../../assets/config/animal-assets.json';

import { SpriteAnimalConfig } from '../models/sprite-config.model';

@Directive({
    selector: '[appAnimalSprite]',
    standalone: true
})
export class AnimalSpriteDirective implements OnInit
{
    @Input('appAnimalSprite') fileName: string = '';

    private config: SpriteAnimalConfig = animalConfigData as SpriteAnimalConfig;

    constructor(private el: ElementRef, private renderer: Renderer2) 
    {
    }

    ngOnInit(): void
    {
        const asset = this.config[this.fileName];

        if (asset)
        {
            const host = this.el.nativeElement;

            // Aplicamos los estilos calculados por tu script de auditoría
            this.renderer.setStyle(host, 'display', 'inline-block');
            this.renderer.setStyle(host, 'transform-origin', 'bottom center');
            this.renderer.setStyle(host, 'transform', `scale(${asset.scale})`);

            // El offset Y asegura que el animal no "flote" sobre el tile
            this.renderer.setStyle(host, 'margin-top', `${asset.offset.y}px`);

            // Opcional: Si quieres forzar el tamaño de la celda
            this.renderer.setStyle(host, 'width', '64px');
            this.renderer.setStyle(host, 'height', '64px');
        }
    }
}