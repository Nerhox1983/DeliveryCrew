export interface CensusData
{
    dogs: { male: number; female: number; total: number };
    cats: { male: number; female: number; total: number };
    birds: { chicks: number; hens: number; roosters: number; total: number };
    ducks: { male: number; female: number; total: number };
    rabbits: { male: number; female: number; total: number };
    pests: { mice: number };
    frogs: { total: number };
    toads?: { total: number };
    pigs: { total: number };
    sheeps: { total: number; }
    worms: { total: number };
    parrots: { total: number };
    totalPopulation: number;
}

export class CensusManager
{
    /**
     * Ejecuta el censo de todas las entidades del mapa.
     */
    public generateReport(entities:
        {
            dogs: any[],
            cats: any[],
            chicks: any[],
            hens: any[],
            roosters: any[],
            mice: any[],
            worms: any[],
            ducks: any[],
            rabbits: any[],
            frogs: any[],
            pigs: any[],
            sheeps: any[],
            parrots: any[],
            toads?: any[]
        }): CensusData 
    {
        // 1. Filtrado seguro con nombres en inglés
        // Ya filtramos los nulos en game-board.ts, así que accedemos directamente
        const dogsMale = entities.dogs.filter(d => d.isMale === true).length;
        const dogsFemale = entities.dogs.filter(d => d.isMale === false).length;

        const catsMale = entities.cats.filter(c => c.isMale === true).length;
        const catsFemale = entities.cats.filter(c => c.isMale === false).length;

        const rabbitsMale = entities.rabbits.filter(r => r.isMale === true).length;
        const rabbitsFemale = entities.rabbits.filter(r => r.isMale === false).length;

        const ducksMale = entities.ducks.filter(d => d.isMale === true).length;
        const ducksFemale = entities.ducks.filter(d => d.isMale === false).length;

        const report: CensusData = {
            dogs: {
                male: dogsMale,
                female: dogsFemale,
                total: entities.dogs.filter(d => d).length // Solo contamos los que no son nulos
            },
            cats: {
                male: catsMale,
                female: catsFemale,
                total: entities.cats.filter(c => c).length
            },
            birds: {
                chicks: entities.chicks.filter(c => c).length,
                hens: entities.hens.filter(h => h).length,
                roosters: entities.roosters.filter(r => r).length,
                total: 0 // Se suma abajo
            },
            ducks: {
                male: ducksMale,
                female: ducksFemale,
                total: entities.ducks.filter(d => d).length
            },
            rabbits: {
                male: rabbitsMale,
                female: rabbitsFemale,
                total: entities.rabbits.filter(r => r).length
            },
            pests: {
                mice: entities.mice.filter(m => m).length
            },
            frogs: {
                total: entities.frogs.filter(f => f).length
            },
            toads: {
                total: entities.toads ? entities.toads.filter(t => t).length : 0
            },
            pigs: {
                total: entities.pigs.filter(p => p).length
            },
            worms: {
                total: entities.worms.filter(w => w).length
            },
            sheeps: {
                total: entities.sheeps.filter(s => s).length
            },
            parrots: {
                total: entities.parrots.filter(p => p).length
            },
            totalPopulation: 0
        };

        // 2. Cálculos finales
        report.birds.total = report.birds.chicks + report.birds.hens + report.birds.roosters;
        report.totalPopulation = report.dogs.total + report.cats.total + report.birds.total + report.pests.mice + report.worms.total + report.ducks.total + report.rabbits.total + report.frogs.total + (report.toads?.total || 0) + report.pigs.total + report.sheeps.total + report.parrots.total;

        return report;
    }
}