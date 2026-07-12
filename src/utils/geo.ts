import { cachedFetch } from './fetch.ts';
import { buildUrl, time } from './shared.ts';

export interface LatLon {
  lat: number;
  lon: number;
}

export interface GeocodedPlace extends LatLon {
  displayName: string;
}

/**
 * Nominatim allows at most 1 request/second, so calls are serialized
 * through this queue; a network miss also starts a cooldown before the
 * next request (cache hits resolve near-instantly and skip it)
 */
let requestQueue: Promise<unknown> = Promise.resolve();
let cooldownUntil = 0;

/**
 * Anything slower than this is assumed to have hit the network rather
 * than the disk cache
 */
const NETWORK_THRESHOLD_MS = 50;

/**
 * Resolves a location query (e.g. "Foster City, California, US") to
 * lat/lon via Nominatim (OpenStreetMap).
 *
 * Responses are cached for a year; the set of locations in play is
 * small and they essentially never move.
 */
export function geocode(query: string): Promise<GeocodedPlace | null> {
  const url = buildUrl('https://nominatim.openstreetmap.org', '/search', {
    q: query,
    format: 'jsonv2',
    limit: 1,
    // prefer cities/towns over e.g. same-named counties ("Alameda, CA"
    // should resolve to the city of Alameda, not Alameda County);
    // despite the name, this also matches towns/villages
    featureType: 'city',
  }).toString();

  const task = requestQueue.then(async () => {
    const waitMs = cooldownUntil - Date.now();
    if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));

    const startMs = Date.now();
    const res = await cachedFetch.call({ cacheTTL: time.day * 365 }, url, {
      headers: {
        'User-Agent':
          'ai-job-finder (https://github.com/chrisdothtml/ai-job-finder)',
      },
    });
    if (Date.now() - startMs > NETWORK_THRESHOLD_MS) {
      cooldownUntil = Date.now() + 1100;
    }

    if (!res.ok) {
      throw new Error(`Nominatim request failed: ${res.status} (${query})`);
    }

    const [place] = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (!place) return null;

    return {
      lat: Number(place.lat),
      lon: Number(place.lon),
      displayName: place.display_name,
    };
  });

  // keep the queue alive even when a request fails
  requestQueue = task.catch(() => {});
  return task;
}

/**
 * Straight-line ("as the crow flies") distance between two points,
 * in miles
 */
export function haversineMiles(a: LatLon, b: LatLon): number {
  const R = 3958.7613; // Earth radius in miles

  const lat1 = degreesToRadians(a.lat);
  const lat2 = degreesToRadians(b.lat);
  const dLat = lat2 - lat1;
  const dLon = degreesToRadians(b.lon - a.lon);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
