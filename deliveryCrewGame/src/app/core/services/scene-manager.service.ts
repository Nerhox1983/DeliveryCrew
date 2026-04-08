import { SceneState } from "../../shared/models/scene.model";
import { SceneService } from "./scene.service";

// ... imports
export class SceneManager {
  private isTransitioning = false;

  constructor(private sceneService: SceneService) {}
  
  public async transitionToScene(targetSceneId: string) {
    const cachedScene = this.sceneService.getStoredScene(targetSceneId);
    if (cachedScene) {
        this.sceneService.switchScene(cachedScene);
    } else {
        console.error("DEBUG: La casa no existe en el estante. ID:", targetSceneId);
    }
}
  

  private delay(ms: number) { return new Promise(res => setTimeout(res, ms)); }
}