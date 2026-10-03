import { MigrationInterface, QueryRunner } from 'typeorm';
import { Depot } from '../../common/enums/depot.enum';

// The dataset places outlets by district only, so there are no real outlet
// coordinates to load. The depots are where they really are; each outlet is
// put near its district's centre.
const DEPOTS: Record<Depot, [number, number]> = {
  [Depot.PELIYAGODA]: [6.9645, 79.888],
  [Depot.KANDY]: [7.2955, 80.6356],
};

const DISTRICT_CENTRES: Record<string, [number, number]> = {
  Colombo: [6.9271, 79.8612],
  Gampaha: [7.0873, 80.0144],
  Kalutara: [6.5854, 79.9607],
  Galle: [6.0535, 80.221],
  Matara: [5.9549, 80.555],
  Kurunegala: [7.4863, 80.3623],
  Puttalam: [8.0362, 79.8283],
  Kandy: [7.2906, 80.6337],
  Matale: [7.4675, 80.6234],
  'Nuwara Eliya': [6.9497, 80.7891],
  Badulla: [6.9934, 81.055],
  Kegalle: [7.2513, 80.3464],
};

// Spreads outlets around a centre without two landing on the same spot: each
// one steps round by the golden angle, 1.3 to 3 km out (0.012° is about 1.3 km).
const GOLDEN_ANGLE = 2.399963;

function nearCentre([lat, lng]: [number, number], n: number): [number, number] {
  const radius = 0.012 + 0.0015 * (n % 12);
  return [
    Number((lat + radius * Math.cos(n * GOLDEN_ANGLE)).toFixed(6)),
    Number((lng + radius * Math.sin(n * GOLDEN_ANGLE)).toFixed(6)),
  ];
}

/**
 * Gives depots and outlets a position for the driver app's map. It only fills
 * rows that have none, so a coordinate corrected by a dispatcher is kept.
 */
export class SeedCoordinates1759000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [name, [lat, lng]] of Object.entries(DEPOTS)) {
      await queryRunner.query(
        `UPDATE depots SET lat = $1, lng = $2 WHERE name = $3 AND lat IS NULL;`,
        [lat, lng, name],
      );
    }

    const outlets: { id: number; unique_id: string; district: string }[] =
      await queryRunner.query(
        `SELECT o.id, o.unique_id, d.name AS district
         FROM outlets o JOIN districts d ON d.id = o.district_id
         WHERE o.lat IS NULL;`,
      );
    for (const outlet of outlets) {
      const centre = DISTRICT_CENTRES[outlet.district];
      if (!centre) {
        continue;
      }
      // OUT014 -> 14; an id without a number falls back to the row id.
      const n = parseInt(outlet.unique_id.replace(/\D/g, ''), 10) || outlet.id;
      const [lat, lng] = nearCentre(centre, n);
      await queryRunner.query(
        `UPDATE outlets SET lat = $1, lng = $2 WHERE id = $3;`,
        [lat, lng, outlet.id],
      );
    }
  }

  public async down(): Promise<void> {
    // Seeded and corrected coordinates cannot be told apart, so nothing is undone.
  }
}
