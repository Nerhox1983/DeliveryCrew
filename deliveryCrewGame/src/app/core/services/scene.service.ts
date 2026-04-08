import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SceneState } from '../../shared/models/scene.model';

@Injectable({
  providedIn: 'root'
})
export class SceneService {
  private currentSceneSubject = new BehaviorSubject<SceneState | null>(null);
  public currentScene$ = this.currentSceneSubject.asObservable();
  private sceneCache = new Map<string, SceneState>();

  public getStoredScene(id: string): SceneState | undefined {
    return this.sceneCache.get(id);
  }

  /**
   * Devuelve la lista de IDs de escenas actualmente en memoria.
   */
  public getCacheKeys(): string[] {
    return Array.from(this.sceneCache.keys());
  }

  /**
   * Método adaptador para guardar una escena pasando ID y datos por separado.
   * Facilita la llamada desde GameBoard sin necesidad de importar SceneState.
   */
  public saveScene(id: string, data: any): void {
    this.sceneCache.set(id, { id, ...data });
  }

  /**
   * Guarda una escena directamente en el caché, útil para la precarga inicial.
   * @param scene La instancia de SceneState que se guardará.
   */
  public saveSceneToCache(scene: SceneState): void {
    this.sceneCache.set(scene.id, scene);
  }

  /**
   * CORRECCIÓN CRÍTICA: Ahora guarda la escena que dejas atrás
   */
  public switchScene(nextScene: SceneState) {
    // 1. Guardar el estado de la escena que el jugador está abandonando
    const currentScene = this.currentSceneSubject.value;
    if (currentScene) {
      this.sceneCache.set(currentScene.id, currentScene);
    }

    // 2. Guardar/Actualizar la nueva escena en caché
    this.sceneCache.set(nextScene.id, nextScene);
    
    // 3. Emitir el cambio para que el GameBoard se actualice
    this.currentSceneSubject.next(nextScene);
  }
}