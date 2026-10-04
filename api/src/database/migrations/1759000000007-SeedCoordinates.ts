import { MigrationInterface, QueryRunner } from 'typeorm';
import { Depot } from '../../common/enums/depot.enum';

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

const GOLDEN_ANGLE = 2.399963;

function nearCentre([lat, lng]: [number, number], n: number): [number, number] {
  const radius = 0.012 + 0.0015 * (n % 12);
  return [
    Number((lat + radius * Math.cos(n * GOLDEN_ANGLE)).toFixed(6)),
    Number((lng + radius * Math.sin(n * GOLDEN_ANGLE)).toFixed(6)),
  ];
}

/**
 * Browsed geographic coordinates for every outlet in the dataset (OUT001..OUT120)
 * based solely on its district property.
 * No two outlets in the same district share the same coordinate.
 */
const OUTLET_COORDINATES: Record<string, [number, number]> = {
  // Colombo District (OUT001 - OUT024)
  OUT001: [6.9334, 79.8501],
  OUT002: [6.9117, 79.8494],
  OUT003: [6.8965, 79.855],
  OUT004: [6.8745, 79.8635],
  OUT005: [6.887, 79.865],
  OUT006: [6.9048, 79.8698],
  OUT007: [6.914, 79.879],
  OUT008: [6.9312, 79.8785],
  OUT009: [6.927, 79.862],
  OUT010: [6.937, 79.853],
  OUT011: [6.9461, 79.8647],
  OUT012: [6.9221, 79.8524],
  OUT013: [6.9532, 79.8752],
  OUT014: [6.9712, 79.8721],
  OUT015: [6.903, 79.897],
  OUT016: [6.87, 79.8883],
  OUT017: [6.8473, 79.9265],
  OUT018: [6.935, 79.98],
  OUT019: [6.8513, 79.866],
  OUT020: [6.8331, 79.8674],
  OUT021: [6.8185, 79.8782],
  OUT022: [6.7731, 79.8816],
  OUT023: [6.8988, 79.9192],
  OUT024: [6.8415, 80.0033],

  // Gampaha District (OUT025 - OUT039)
  OUT025: [6.9553, 79.922],
  OUT026: [6.9899, 79.8927],
  OUT027: [6.9778, 79.9272],
  OUT028: [7.0021, 79.9512],
  OUT029: [7.0142, 79.8985],
  OUT030: [7.0266, 79.9213],
  OUT031: [7.0482, 79.8964],
  OUT032: [7.0744, 79.8919],
  OUT033: [7.1265, 79.8782],
  OUT034: [7.1698, 79.8883],
  OUT035: [7.2083, 79.8358],
  OUT036: [7.0873, 80.0144],
  OUT037: [7.1693, 79.9485],
  OUT038: [7.1535, 80.0603],
  OUT039: [7.2414, 80.1325],

  // Kalutara District (OUT040 - OUT049)
  OUT040: [6.7132, 79.9026],
  OUT041: [6.664, 79.9305],
  OUT042: [6.5982, 79.9584],
  OUT043: [6.5854, 79.9607],
  OUT044: [6.4754, 79.9856],
  OUT045: [6.4526, 80.0055],
  OUT046: [6.7214, 80.0212],
  OUT047: [6.7167, 79.9833],
  OUT048: [6.5222, 80.1144],
  OUT049: [6.7412, 80.1724],

  // Galle District (OUT050 - OUT058)
  OUT050: [6.4258, 79.9984],
  OUT051: [6.2442, 80.0591],
  OUT052: [6.1367, 80.103],
  OUT053: [6.0267, 80.217],
  OUT054: [6.0535, 80.221],
  OUT055: [6.0536, 80.2104],
  OUT056: [6.0094, 80.2486],
  OUT057: [5.9912, 80.3275],
  OUT058: [6.1833, 80.1833],

  // Matara District (OUT059 - OUT064)
  OUT059: [5.9739, 80.4294],
  OUT060: [5.9467, 80.4578],
  OUT061: [5.9452, 80.5489],
  OUT062: [5.95, 80.533],
  OUT063: [5.9255, 80.5898],
  OUT064: [6.0984, 80.4735],

  // Kurunegala District (OUT065 - OUT072)
  OUT065: [7.4833, 80.3667],
  OUT066: [7.4706, 80.0456],
  OUT067: [7.4333, 80.2167],
  OUT068: [7.6167, 80.2333],
  OUT069: [7.3333, 80.3],
  OUT070: [7.2833, 80.2333],
  OUT071: [7.4333, 80.4333],
  OUT072: [7.5333, 80.4333],

  // Puttalam District (OUT073 - OUT075)
  OUT073: [7.583, 79.8],
  OUT074: [7.4167, 79.8167],
  OUT075: [8.0362, 79.8283],

  // Kandy District (OUT076 - OUT095)
  OUT076: [7.2936, 80.635],
  OUT077: [7.2622, 80.5841],
  OUT078: [7.3385, 80.6277],
  OUT079: [7.2812, 80.6245],
  OUT080: [7.1645, 80.5758],
  OUT081: [7.275, 80.6864],
  OUT082: [7.2884, 80.7341],
  OUT083: [7.2667, 80.5333],
  OUT084: [7.2542, 80.5211],
  OUT085: [7.2833, 80.65],
  OUT086: [7.2167, 80.5833],
  OUT087: [7.05, 80.5333],
  OUT088: [7.3167, 80.7667],
  OUT089: [7.35, 80.6833],
  OUT090: [7.3667, 80.6167],
  OUT091: [7.3167, 80.7],
  OUT092: [7.4, 80.6],
  OUT093: [7.3667, 80.5667],
  OUT094: [7.2833, 80.6667],
  OUT095: [7.275, 80.6],

  // Matale District (OUT096 - OUT103)
  OUT096: [7.4667, 80.6167],
  OUT097: [7.8578, 80.6525],
  OUT098: [7.4167, 80.6333],
  OUT099: [7.5167, 80.6667],
  OUT100: [7.7667, 80.5667],
  OUT101: [7.6167, 80.5833],
  OUT102: [7.9542, 80.7558],
  OUT103: [7.7, 80.65],

  // Nuwara Eliya District (OUT104 - OUT109)
  OUT104: [6.9667, 80.7667],
  OUT105: [6.8897, 80.5981],
  OUT106: [6.9372, 80.6567],
  OUT107: [6.9167, 80.6],
  OUT108: [6.9833, 80.4833],
  OUT109: [6.95, 80.7333],

  // Badulla District (OUT110 - OUT115)
  OUT110: [6.9847, 81.0564],
  OUT111: [6.8333, 80.9833],
  OUT112: [6.8667, 81.0467],
  OUT113: [6.95, 81.0333],
  OUT114: [6.9, 80.9],
  OUT115: [7.3167, 81.0],

  // Kegalle District (OUT116 - OUT120)
  OUT116: [7.2531, 80.3453],
  OUT117: [7.2533, 80.4464],
  OUT118: [7.3167, 80.4],
  OUT119: [7.2333, 80.2],
  OUT120: [7.05, 80.25],
};

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
      if (OUTLET_COORDINATES[outlet.unique_id]) {
        const [lat, lng] = OUTLET_COORDINATES[outlet.unique_id];
        await queryRunner.query(
          `UPDATE outlets SET lat = $1, lng = $2 WHERE id = $3;`,
          [lat, lng, outlet.id],
        );
        continue;
      }

      const centre = DISTRICT_CENTRES[outlet.district];
      if (!centre) {
        continue;
      }
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
