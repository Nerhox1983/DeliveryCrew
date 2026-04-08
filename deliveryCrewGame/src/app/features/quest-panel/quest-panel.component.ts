import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Quest, QuestReward } from '../../shared/models/quest.model';
import { QuestManager } from '../../core/services/quest-manager.service';

@Component({
  selector: 'app-quest-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quest-panel.component.html',
  styleUrls: ['./quest-panel.component.css']
})
export class QuestPanelComponent
{
  private readonly DEFAULT_HAGGLING_ATTEMPTS = 3;

  private readonly iconMap: { [key: string]: string } = {
    'limones': 'lemon',
    'lemon': 'lemon',
    'worm': 'worm',
    'cardboardbox': 'cardboardBox_type01',
    'pitcher_full': 'pitcher_full'
  };

  private readonly targetFormatMap: { [key: string]: string } = {
    worm: 'Lombrices',
    cardboardbox: 'Cajas de Cartón',
    lemon: 'Limones',
    pitcher_full: 'Olleta con Agua',
  };

  visible = false;
  quest: Quest | null = null;
  feedbackMessage = '';
  lastResult: boolean | null = null;
  attemptsLeft = 3;

  // Nuevas propiedades para la UI mejorada
  rewardValue: number | null = null;
  rewardIsItem: boolean = false;

  constructor(
    private questManager: QuestManager,
    private cdr: ChangeDetectorRef
  ) { }

  open(quest: Quest)
  {
    console.log('[QuestPanel] Abriendo panel UI para:', quest.title);
    this.quest = quest;
    //console.log(`[QuestPanel] Abriendo misión. Giver ID recibido: ${quest.giverId}`);
    //console.log(`[QuestPanel] Nombre resuelto para UI: ${this.getNpcName(quest.giverId)}`);

    this.feedbackMessage = '';
    this.lastResult = null;
    this.attemptsLeft = quest.hagglingAttemptsLeft || this.DEFAULT_HAGGLING_ATTEMPTS;

    if (!this.quest.currentOffer)
    {
      const baseAmount = this.quest.reward?.amount || 0;
      // Inicializar en un múltiplo de 50 (redondeo hacia arriba)
      this.quest.currentOffer = Math.ceil(baseAmount / 50) * 50;
    }

    // Calcular valor de recompensa para la UI
    this.calculateRewardValue();

    // CORRECCIÓN: Usamos setTimeout para desacoplar la renderización del ciclo de eventos actual.
    setTimeout(() => {
      this.visible = true;
      this.cdr.detectChanges();
    }, 0);
  }

  private calculateRewardValue()
  {
    if (!this.quest || !this.quest.reward)
    {
      this.rewardValue = null;
      this.rewardIsItem = false;
      return;
    }

    const { itemType, amount } = this.quest.reward;
    if (itemType.startsWith('coin_') || itemType.startsWith('bill_'))
    {
      const parts = itemType.split('_');
      if (parts.length === 2 && !isNaN(parseInt(parts[1])))
      {
        const value = parseInt(parts[1]);
        this.rewardValue = value * amount;
        this.rewardIsItem = false;
      } else
      {
        console.error(`[QuestPanel] Formato de itemType monetario inesperado: ${itemType}`);
        this.rewardValue = null;
        this.rewardIsItem = false;
      }
    } else
    {
      // La recompensa es un item, no dinero.
      this.rewardValue = amount;
      this.rewardIsItem = true;
    }
  }

  getObjectiveIcon(target: string): string
  {
    const filename = this.iconMap[target] || target;
    return `assets/img/${filename}.png`;
  }

  getRewardIcon(itemType: string): string
  {
    // Reutilizamos la lógica de los íconos de objetivo si aplica
    return this.getObjectiveIcon(itemType);
  }

  // Helpers para datos del NPC (Simulados por ahora)
  getNpcName(giverId: number): string
  {
    // 1. Prioridad: Nombre dinámico en la misión (ej. Faker)
    if (this.quest && this.quest.giverName) return this.quest.giverName;

    return 'Ciudadano';
  }

  getNpcAvatar(giverId: number): string
  {
    // 1. Prioridad: Avatar dinámico en la misión
    if (this.quest && this.quest.giverFaceSrc) return this.quest.giverFaceSrc;

    return 'assets/npcs/default.png';
  }

  close()
  {
    this.visible = false;
    this.quest = null;
    this.cdr.detectChanges(); // Forzar actualización al cerrar
  }

  startHaggling()
  {
    if (this.quest)
    {
      this.questManager.startHaggling(this.quest);
      this.attemptsLeft = this.quest.hagglingAttemptsLeft || this.DEFAULT_HAGGLING_ATTEMPTS;
      this.feedbackMessage = '¡Hagamos un trato justo!';
      this.lastResult = null;
      setTimeout(() => {
        this.cdr.detectChanges();
      }, 0);
    }
  }

  /*makeCounterOffer(amountStr: string)
  {
    if (!this.quest || !amountStr) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount)) return;
    const result = this.questManager.playerCounterOffer(this.quest, amount);
    this.feedbackMessage = result.message;
    this.lastResult = result.success;
    this.attemptsLeft = this.quest.hagglingAttemptsLeft || 0;

    // Actualizar el valor mostrado si hay una contraoferta
    this.calculateRewardValue();

    if (result.success)
    {
      setTimeout(() => this.close(), 2000);
    }
    this.cdr.markForCheck();
  }*/
  makeCounterOffer(offer: string | number): void
  {
    if (!this.quest) return;
    // 1. Convertir a número y validar que sea un valor real
    let numericOffer = Number(offer);

    if (isNaN(numericOffer) || numericOffer <= 0)
    {
      this.feedbackMessage = "Ingresa una oferta válida en pesos ($).";
      this.lastResult = false;
      return;
    }

    // 2. Ajuste a denominación colombiana ($50 COP)
    // Si el usuario escribe 123, esto lo convierte en 100 o 150 según cercanía
    if (numericOffer % 50 !== 0)
    {
      numericOffer = Math.round(numericOffer / 50) * 50;
      this.feedbackMessage = `Ajustado a la denominación más cercana: $${numericOffer}`;
    }

    // 3. Control de intentos de regateo
    if (this.attemptsLeft > 0)
    {
      this.attemptsLeft--;

      // 4. Lógica de negociación (Ejemplo: el NPC acepta si es al menos el 80% de lo pedido)
      // Aquí comparas con el valor esperado de tu lógica de juego
      const minAcceptable = this.quest.originalReward * 0.8;

      if (numericOffer >= minAcceptable)
      {
        this.quest.currentOffer = numericOffer;
        this.lastResult = true;
        this.feedbackMessage = "¡Trato hecho! He actualizado la recompensa.";

        // Opcional: Aceptar automáticamente si el trato es muy bueno
        // this.acceptQuest(); 
      } else
      {
        this.lastResult = false;
        this.feedbackMessage = this.attemptsLeft > 0
          ? "Eso es muy poco, ¡oferta algo mejor!"
          : "Se acabó el tiempo de negociar. Toma lo que hay o vete.";

        if (this.attemptsLeft === 0)
        {
          this.quest.status = 'inactive'; // O el estado que decidas para "fallo"
        }
      }
    }
  }

  acceptQuest()
  {
    if (this.quest)
    {
      this.questManager.acceptQuest(this.quest);
      this.close();
    }
  }
  completeQuest()
  {
    if (this.quest)
    {
      this.questManager.completeQuest(this.quest.id);
      this.close();
    }
  }

  rejectOffer()
  {
    if (this.quest)
    {
      this.questManager.rejectQuest(this.quest);
      this.close();
    }
  }

  formatTarget(target: string): string
  {
    return this.targetFormatMap[target] || target;
  }

  public increaseOffer(): void
  {
    if (this.quest && this.quest.currentOffer !== undefined)
    {
      this.quest.currentOffer += 50;
      this.cdr.detectChanges();
    }
  }

  public decreaseOffer(): void
  {
    if (this.quest && this.quest.currentOffer !== undefined && this.quest.currentOffer >= 50)
    {
      this.quest.currentOffer -= 50;
      this.cdr.detectChanges();
    }
  }
}