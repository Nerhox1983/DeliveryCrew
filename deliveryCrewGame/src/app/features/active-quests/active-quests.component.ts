import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Quest } from '../../shared/models/quest.model';
import { QuestManager } from '../../core/services/quest-manager.service';

@Component({
  selector: 'app-active-quests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './active-quests.component.html',
  styleUrls: ['./active-quests.component.css']
})
export class ActiveQuestsComponent implements OnInit {
  activeQuests: Quest[] = [];

  constructor(private questManager: QuestManager) {}

  ngOnInit() {
    // Suscripción automática: Mantiene la lista sincronizada siempre
    this.questManager.activeQuests$.subscribe(quests => this.activeQuests = quests);
  }

  getProgress(quest: Quest): number {
    if (!quest.objective || quest.objective.required === 0) {
      return 0;
    }
    return (quest.objective.current / quest.objective.required) * 100;
  }
}