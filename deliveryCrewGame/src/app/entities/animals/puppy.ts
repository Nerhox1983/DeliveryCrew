import { Dog } from './dog';
import { Tile } from '../../shared/models/tile.model';
import { GameConstants } from '../../shared/config/GameConstants';

export class Puppy extends Dog
{
    // Objetivo actual a seguir (puede ser un Perro adulto o un NPC)
    private followTarget: any | null = null;
    private readonly FOLLOW_VISION = 300; // Radio de visión

    constructor(sprite: HTMLImageElement, r: number, c: number)
    {
        super(sprite, r, c);
        
        // Sobrescribimos propiedades de Dog
        this.isAdult = false; // Siempre es cachorro
        this.isMale = Math.random() < 0.5;
        this.speed = 2.2; // Un poco más rápido y juguetón
        this.sound = 'dog_puppy_barking.mp3';
    }

    /**
     * Actualización con lógica de seguimiento.
     * Se espera que 'npcs' sean pasados en los argumentos variables de update.
     */
    public override update(grid: Tile[][], buildingGrid: number[][], ...args: any[]): void
    {
        // Extraer listas de posibles objetivos de los argumentos
        // Asumimos que el game loop pasa: update(grid, bGrid, dogs, npcs, ...)
        const dogs: Dog[] = args[0] || [];
        const npcs: any[] = args[1] || [];

        if (this.shouldCheckAI())
        {
            this.followTarget = this.findFollowTarget(dogs, npcs);
        }

        // Si tiene a quien seguir, intentamos movernos hacia él
        if (this.followTarget && this.moveToTarget(this.followTarget, grid, buildingGrid))
        {
            return; // Si se mueve hacia el objetivo, saltamos el deambular normal
        }

        // Comportamiento por defecto (deambular)
        super.update(grid, buildingGrid);
    }

    private findFollowTarget(dogs: Dog[], npcs: any[]): any | null
    {
        let closest: any = null;
        let minDistSq = this.FOLLOW_VISION * this.FOLLOW_VISION;

        // 1. Buscar Perros Adultos
        for (const dog of dogs)
        {
            if (dog === this || !dog.isAdult) continue; // Ignorar otros cachorros o a sí mismo

            const distSq = Math.pow(dog.x - this.x, 2) + Math.pow(dog.y - this.y, 2);
            if (distSq < minDistSq)
            {
                minDistSq = distSq;
                closest = dog;
            }
        }

        // 2. Si no hay perros cerca, buscar NPCs Humanos (man/woman)
        if (!closest)
        {
            for (const npc of npcs)
            {
                // Verificación segura del sprite del NPC
                const spriteSrc = npc.spriteSheet?.src || npc.image?.src || '';
                const isHuman = spriteSrc.includes('woman') || spriteSrc.includes('man');

                if (isHuman)
                {
                    const distSq = Math.pow(npc.x - this.x, 2) + Math.pow(npc.y - this.y, 2);
                    if (distSq < minDistSq)
                    {
                        minDistSq = distSq;
                        closest = npc;
                    }
                }
            }
        }

        return closest;
    }

    private moveToTarget(target: any, grid: Tile[][], buildingGrid: number[][]): boolean
    {
        // Usamos targetX/Y de la clase base Animal para configurar el movimiento
        this.targetX = target.x;
        this.targetY = target.y;
        
        // Reutilizamos la lógica de movimiento de 'Duckling' adaptada
        const dx = target.x - this.x;
        const dy = target.y - this.y;

        // Mantener distancia mínima (no chocar con el líder)
        if (Math.abs(dx) < GameConstants.AI.MIN_SEPARATION_DISTANCE && Math.abs(dy) < GameConstants.AI.MIN_SEPARATION_DISTANCE) 
        {
            this.isMoving = false;
            return false;
        }

        const directions: ('north' | 'south' | 'east' | 'west')[] = [];
        
        // Priorizar eje más lejano
        if (Math.abs(dx) > Math.abs(dy)) {
            directions.push(dx > 0 ? 'east' : 'west');
            directions.push(dy > 0 ? 'south' : 'north');
        } else {
            directions.push(dy > 0 ? 'south' : 'north');
            directions.push(dx > 0 ? 'east' : 'west');
        }

        for (const dir of directions) {
            if (this.trySetMove(dir, grid, buildingGrid)) {
                this.updateAnimation(true); // Animación rápida al seguir
                return true;
            }
        }
        return false;
    }
}