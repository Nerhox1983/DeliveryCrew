import { Component } from '@angular/core';
import { GameBoard } from './features/game-board/game-board';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GameBoard],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App
{
  title = 'deliveryCrewGame';
}
