import { Injectable } from '@angular/core';
import { fakerES_MX as faker } from '@faker-js/faker';

@Injectable({
  providedIn: 'root'
})
export class NpcNameGeneratorService {

  private readonly APELLIDOS_COLOMBIANOS: string[] = [
    'Rodríguez', 'Gómez', 'González', 'Martínez', 'García', 'López', 'Pérez',
    'Sánchez', 'Ramírez', 'Hernández', 'Díaz', 'Torres', 'Rojas', 'Vargas',
    'Moreno', 'Jiménez', 'Muñoz', 'Castro', 'Ortiz', 'Suárez', 'Restrepo',
    'Zapata', 'Cardona', 'Henao', 'Giraldo', 'Montoya', 'Osorio', 'Castaño',
    'Rincón', 'Mesa', 'Correa', 'Betancur', 'Arango', 'Jaramillo', 'Londoño',
    'Campuzano', 'Higuita', 'Escobar', 'Uribe', 'Valencia', 'Ospina', 'Mejía',
    'Gallego', 'Quintero', 'Cárdenas', 'Bedoya', 'Patiño', 'Salazar'
  ];

  constructor() { }

  /**
   * Genera un nombre completo para un NPC con un apellido colombiano.
   * @param genero El género para el primer nombre ('male' o 'female').
   * @returns Un string con el formato "[Primer Nombre] [Apellido]".
   */
  public generarNombreNPC(genero: 'male' | 'female'): string {
    const primerNombre = faker.person.firstName(genero);
    const apellido = this.APELLIDOS_COLOMBIANOS[Math.floor(Math.random() * this.APELLIDOS_COLOMBIANOS.length)];

    return `${primerNombre} ${apellido}`;
  }
}