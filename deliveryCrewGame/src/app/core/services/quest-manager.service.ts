import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, BehaviorSubject, firstValueFrom } from 'rxjs';
import { Quest, QuestObjective, QuestReward } from '../../shared/models/quest.model';
import { NpcNameGeneratorService } from './npc-name-generator.service';

type QuestTemplate = {
    id: string;
    title: string;
    description: string;
    objective: Omit<QuestObjective, 'current'>;
    reward: QuestReward | 'random';
};

@Injectable({ providedIn: 'root' })
export class QuestManager
{
    private availableQuests: Quest[] = [];
    public activeQuests: Quest[] = [];
    private completedQuestIds: string[] = [];
    public activeQuests$ = new BehaviorSubject<Quest[]>([]); // Fuente de verdad reactiva para la UI
    public questCompleted$ = new Subject<Quest>();

    private questsLoaded = new BehaviorSubject<boolean>(false);
    public questsLoaded$ = this.questsLoaded.asObservable();

    constructor(
        private npcNameGen: NpcNameGeneratorService,
        private http: HttpClient
    )
    {
        this.initializeQuests();
    }

    private async initializeQuests()
    {
        //const questTemplates = await firstValueFrom(this.http.get<QuestTemplate[]>('../../entities/npc/quests.json'));
        const questTemplates = await firstValueFrom(
            this.http.get<QuestTemplate[]>('assets/data/quests.json')
        );

        this.availableQuests = questTemplates.map(template =>
        {
            const reward = template.reward === 'random' ? this.generateRandomReward() : template.reward;

            let description = template.description;
            description = description.replace('{required}', template.objective.required.toString());
            if (reward)
            {
                description = description.replace('{reward_amount}', reward.amount.toString());
                description = description.replace('{reward_item}', this.formatItemType(reward.itemType));
            }

            return {
                ...template,
                description,
                giverId: 0,
                objective: { ...template.objective, current: 0 },
                reward,
                status: 'inactive',
            } as Quest;
        });

        this.questsLoaded.next(true);
    }

    // Helper para formatear nombres en descripciones
    private formatItemType(itemType: string): string
    {
        const map: { [key: string]: string } = {
            'lemon': 'Limones',
            'woodbox': 'Cajas de Madera',
            'cardboardbox': 'Cajas de Cartón',
            'pitcher_empty': 'Olleta Vacía'
        };
        return map[itemType] || itemType;
    }

    private generateRandomReward(): QuestReward
    {
        const possibleRewards = [
            { id: 'lemon', min: 3, max: 8 },         // Limones: Cantidad media
            { id: 'woodbox', min: 1, max: 3 },       // Cajas madera: Pocas
            { id: 'cardboardbox', min: 2, max: 5 },  // Cajas cartón: Varias
            { id: 'pitcher_empty', min: 1, max: 1 }  // Olleta: Solo una (es valiosa/rara)
        ];

        // Seleccionar un tipo de premio al azar
        const selection = possibleRewards[Math.floor(Math.random() * possibleRewards.length)];
        // Calcular cantidad aleatoria entre min y max
        const amount = Math.floor(Math.random() * (selection.max - selection.min + 1)) + selection.min;

        return { itemType: selection.id, amount: amount };
    }

    getQuestForGiver(giverId: number, giverName?: string, giverFaceSrc?: string): Quest | null
    {
        // Lógica flexible: Busca misiones que no estén activas para este NPC o completadas globalmente.
        const questPool = this.availableQuests.filter(q =>
            !this.activeQuests.some(aq => aq.id === q.id) &&
            !this.completedQuestIds.includes(q.id)
        );

        if (questPool.length > 0)
        {
            // Selecciona una misión aleatoria del pool disponible
            const quest = questPool[Math.floor(Math.random() * questPool.length)];

            //console.log(`[QuestManager] Asignando misión '${quest.title}' al NPC con ID: ${giverId}`);

            // Si no viene nombre, generamos uno con FAKER (asumimos masculino por defecto o aleatorio)
            const finalName = giverName || this.npcNameGen.generarNombreNPC('male');

            // Devolver una copia de la misión con los datos del NPC actualizados
            return {
                ...quest,
                giverId: giverId,
                giverName: finalName,       // Inyectamos el nombre (Faker o el recibido)
                giverFaceSrc: giverFaceSrc, // Inyectamos la cara dinámica
                status: 'inactive',
                objective: { ...quest.objective, current: 0 } // Reiniciar progreso
            };
        }

        return null; // No hay más misiones disponibles para asignar.
    }

    // --- SISTEMA DE REGATEO ---

    startHaggling(quest: Quest)
    {
        if (quest.status !== 'inactive') return;

        quest.status = 'haggling';
        quest.hagglingAttemptsLeft = 3;
        quest.npcPatience = 100;

        // Guardar valor original si no existe
        if (!quest.originalRewardAmount && quest.reward)
        {
            quest.originalRewardAmount = quest.reward.amount;
        }
        quest.currentOffer = quest.reward?.amount || 0;

        //console.log(`[REGATEO] Iniciado para '${quest.title}'. Oferta inicial: $${quest.currentOffer}. Intentos: ${quest.hagglingAttemptsLeft}`);
    }

    playerCounterOffer(quest: Quest, playerAskAmount: number): { success: boolean, message: string, final?: boolean }
    {
        if (quest.status !== 'haggling' || !quest.reward || !quest.originalRewardAmount)
        {
            return { success: false, message: "No se puede regatear ahora." };
        }

        quest.hagglingAttemptsLeft = (quest.hagglingAttemptsLeft || 3) - 1;
        const base = quest.originalRewardAmount;
        const maxLimit = base * 1.5; // El NPC nunca pagará más del 50% extra

        // 1. Evaluar la oferta del jugador
        if (playerAskAmount > maxLimit)
        {
            // Oferta insultante
            quest.npcPatience = (quest.npcPatience || 100) - 40;
            return { success: false, message: "¡Uy no! Eso es demasiado, ni que fuera rico." };
        } else if (playerAskAmount <= base * 1.1)
        {
            // Oferta razonable (hasta 10% extra), acepta de una
            quest.reward.amount = playerAskAmount;
            this.acceptQuest(quest);
            return { success: true, message: "Hágale pues, trato hecho.", final: true };
        } else
        {
            // Oferta media: El NPC contraataca
            const counterOffer = Math.floor((base + playerAskAmount) / 2); // Punto medio
            quest.currentOffer = counterOffer;
            quest.reward.amount = counterOffer;

            if ((quest.hagglingAttemptsLeft || 0) <= 0)
            {
                // Último intento: Tómalo o déjalo
                return { success: false, message: `Mire, le doy $${counterOffer} y no más. ¿Sí o no?`, final: true };
            }

            return { success: false, message: `No me alcanza... ¿Qué tal $${counterOffer}?` };
        }
    }

    acceptQuest(quest: Quest)
    {
        if (this.activeQuests.find(q => q.id === quest.id)) return;

        // Finalizar regateo si estaba activo
        if (quest.status === 'haggling')
        {
            //console.log(`[REGATEO] Finalizado. Precio acordado: $${quest.reward?.amount}`);
        }

        quest.status = 'active';
        this.activeQuests.push(quest);
        this.activeQuests$.next(this.activeQuests); // Notificar a la UI
        //console.log(`Misión aceptada: ${quest.title}`);
    }

    rejectQuest(quest: Quest)
    {
        quest.status = 'rejected';
        // Opcional: Poner en cooldown para que vuelva a aparecer luego
        //console.log(`Misión rechazada: ${quest.title}`);
        // Resetear valores para el futuro
        quest.hagglingAttemptsLeft = 3;
        if (quest.originalRewardAmount && quest.reward) quest.reward.amount = quest.originalRewardAmount;
    }

    updateKillCount(targetType: string)
    {
        let updated = false;
        for (const quest of this.activeQuests)
        {
            if (quest.status === 'active' && quest.objective.type === 'kill' && quest.objective.target === targetType)
            {
                if (quest.objective.current < quest.objective.required)
                {
                    quest.objective.current++;
                    updated = true;
                    //console.log(`Progreso de '${quest.title}': ${quest.objective.current}/${quest.objective.required}`);
                }
                if (quest.objective.current >= quest.objective.required)
                {
                    quest.status = 'ready'; // Ahora espera entrega
                    updated = true;
                    //console.log(`¡Objetivos de '${quest.title}' cumplidos! Regresa con el NPC.`);
                }
            }
        }
        if (updated)
        {
            // Emitir una nueva referencia del array para forzar la detección de cambios en Angular
            this.activeQuests$.next([...this.activeQuests]);
        }
    }

    updateCollectCount(targetType: string)
    {
        let updated = false;
        for (const quest of this.activeQuests)
        {
            if (quest.status === 'active' && quest.objective.type === 'collect' && quest.objective.target === targetType)
            {
                if (quest.objective.current < quest.objective.required)
                {
                    quest.objective.current++;
                    updated = true;
                    //console.log(`Progreso de '${quest.title}': ${quest.objective.current}/${quest.objective.required}`);
                }
                if (quest.objective.current >= quest.objective.required)
                {
                    quest.status = 'ready'; // Ahora espera entrega
                    updated = true;
                    //console.log(`¡Objetivos de '${quest.title}' cumplidos! Regresa con el NPC.`);
                }
            }
        }
        if (updated)
        {
            // Emitir una nueva referencia del array para forzar la detección de cambios en Angular
            this.activeQuests$.next([...this.activeQuests]);
        }
    }

    completeQuest(questId: string): Quest | undefined
    {
        const index = this.activeQuests.findIndex(q => q.id === questId);
        if (index !== -1)
        {
            const quest = this.activeQuests[index];
            quest.status = 'completed';
            this.activeQuests.splice(index, 1);
            this.completedQuestIds.push(quest.id);
            this.activeQuests$.next([...this.activeQuests]); // Actualizar UI (quitar de la lista)
            this.questCompleted$.next(quest);
            return quest;
        }
        return undefined;
    }
}