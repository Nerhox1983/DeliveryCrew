export type QuestObjectiveType = 'kill' | 'collect' | 'goto';
export type QuestStatus = 'inactive' | 'haggling' | 'active' | 'ready' | 'completed' | 'rejected';

export interface QuestReward
{
    itemType: string; // 'lemon', 'woodbox', 'pitcher_empty', etc.
    amount: number;
}

export interface QuestObjective
{
    type: QuestObjectiveType;
    target: string; // e.g., 'worm', 'box_wood'
    required: number;
    current: number;
}

export interface Quest
{
    id: string;
    title: string;
    description: string;
    originalReward: number;
    giverId: number;
    giverName?: string;
    giverFaceSrc?: string;
    objective: QuestObjective;
    status: QuestStatus;
    reward?: QuestReward;
    // Propiedades para el sistema de Regateo
    originalRewardAmount?: number; // El valor base inicial
    currentOffer?: number; // La oferta actual sobre la mesa
    hagglingAttemptsLeft?: number; // Intentos restantes (max 3)
    npcPatience?: number; // Factor de paciencia (0-100), si baja mucho, cancela
}