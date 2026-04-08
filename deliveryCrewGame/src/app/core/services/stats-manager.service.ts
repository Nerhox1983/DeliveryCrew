// stats-manager.ts
export interface Necesidades {
  salud: number;
  energia: number;
  hidratacion: number;
  nutricion: number;
  higiene: number;
  confort: number;
}

export class StatsManager {
  /**
   * Procesa y devuelve el nuevo estado de las necesidades.
   */
  public updateNeeds(
    necesidades: Necesidades,
    isSleeping: boolean,
    totalGameMinutes: number,
    player: any // Pasamos el player para verificar sus booleanos activos
  ): { nuevasNecesidades: Necesidades; shouldSleep: boolean; shouldWakeUp: boolean } {
    
    let currentEnergia = necesidades.energia;
    let shouldSleep = isSleeping;
    let shouldWakeUp = false;

    if (isSleeping) {
      // Lógica de Recuperación: 1% cada 5 minutos
      if (totalGameMinutes % 5 === 0) {
        currentEnergia = Math.min(100, currentEnergia + 1);
      }
      // Verificar si debe despertar
      if (currentEnergia >= 100) {
        currentEnergia = 100;
        shouldSleep = false;
        shouldWakeUp = true;
      }
    } else {
      // Lógica de Consumo
      const isActive = player && (player.isMoving || player.isChopping || player.isCarrying);
      const consumptionInterval = isActive ? 10 : 60; // 10 min si actúa, 60 min si está en IDLE

      if (totalGameMinutes % consumptionInterval === 0) {
        currentEnergia = Math.max(0, currentEnergia - 1);
      }

      // Verificar umbral de sueño automático (15%)
      if (currentEnergia <= 15) {
        shouldSleep = true;
      }
    }

    return {
      nuevasNecesidades: { ...necesidades, energia: currentEnergia },
      shouldSleep: shouldSleep,
      shouldWakeUp: shouldWakeUp
    };
  }
}