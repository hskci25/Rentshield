import {
  MAPBOX_ACCESS_TOKEN,
  MAPBOX_DEFAULT_COUNTRY,
  MAPBOX_REQUEST_TIMEOUT_MS,
  MAPBOX_SEARCH_BASE_URL,
} from '../config/constants';

export interface LocationSuggestion {
  id: string;
  name: string;
  placeFormatted: string;
  fullAddress: string;
  mapboxId: string;
  featureType?: string;
}

export interface LocationDetails {
  latitude: number;
  longitude: number;
  displayName: string;
  bbox?: [number, number, number, number];
}

export interface SearchLocationsOptions {
  proximity?: { latitude: number; longitude: number };
  country?: string;
  signal?: AbortSignal;
}

interface SuggestApiFeature {
  name?: string;
  mapbox_id: string;
  feature_type?: string;
  place_formatted?: string;
  full_address?: string;
}

interface SuggestApiResponse {
  suggestions?: SuggestApiFeature[];
}

interface RetrieveApiFeature {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    name?: string;
    full_address?: string;
    place_formatted?: string;
    bbox?: [number, number, number, number];
  };
}

interface RetrieveApiResponse {
  features?: RetrieveApiFeature[];
}

const SUGGEST_TYPES = 'region,district,place,locality,neighborhood,address,poi';
const SUGGEST_LIMIT = 8;
const CACHE_MAX_ENTRIES = 50;

let activeSessionToken: string | null = null;
const suggestionCache = new Map<string, LocationSuggestion[]>();

function getOrCreateSessionToken(): string {
  if (activeSessionToken) {
    return activeSessionToken;
  }
  activeSessionToken = generateUuid();
  return activeSessionToken;
}

export function resetLocationSearchSession(): void {
  activeSessionToken = null;
}

function generateUuid(): string {
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoRef?.randomUUID) {
    try {
      return cryptoRef.randomUUID();
    } catch {
      // Fall through to manual implementation.
    }
  }
  // RFC 4122 v4 fallback using Math.random; sufficient for billing session tokens.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function cacheKey(query: string, country: string, proximity?: { latitude: number; longitude: number }): string {
  const proximityKey = proximity
    ? `${proximity.longitude.toFixed(2)},${proximity.latitude.toFixed(2)}`
    : 'none';
  return `${country}|${query}|${proximityKey}`;
}

function rememberSuggestions(key: string, suggestions: LocationSuggestion[]): void {
  if (suggestionCache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = suggestionCache.keys().next().value;
    if (oldestKey !== undefined) {
      suggestionCache.delete(oldestKey);
    }
  }
  suggestionCache.set(key, suggestions);
}

function ensureToken(): void {
  if (!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN.startsWith('pk.YOUR_')) {
    throw new Error(
      'Mapbox access token is not configured. Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env (copy from .env.example).',
    );
  }
}

async function fetchWithTimeout(
  url: string,
  externalSignal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  let externalSubscribed = false;
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else if (typeof externalSignal.addEventListener === 'function') {
      externalSignal.addEventListener('abort', onExternalAbort);
      externalSubscribed = true;
    }
  }

  try {
    return await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
  } finally {
    clearTimeout(timeoutId);
    if (externalSubscribed && externalSignal && typeof externalSignal.removeEventListener === 'function') {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

export async function searchLocations(
  query: string,
  options: SearchLocationsOptions = {},
): Promise<LocationSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  ensureToken();

  const country = options.country ?? MAPBOX_DEFAULT_COUNTRY;
  const key = cacheKey(trimmed.toLowerCase(), country, options.proximity);
  const cached = suggestionCache.get(key);
  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    q: trimmed,
    access_token: MAPBOX_ACCESS_TOKEN,
    session_token: getOrCreateSessionToken(),
    language: 'en',
    limit: String(SUGGEST_LIMIT),
    types: SUGGEST_TYPES,
  });

  if (country) {
    params.set('country', country);
  }
  if (options.proximity) {
    params.set('proximity', `${options.proximity.longitude},${options.proximity.latitude}`);
  }

  const url = `${MAPBOX_SEARCH_BASE_URL}/suggest?${params.toString()}`;

  let response: Response;
  try {
    response = await fetchWithTimeout(url, options.signal, MAPBOX_REQUEST_TIMEOUT_MS);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    throw new Error('Could not reach location search. Check your connection.');
  }

  if (!response.ok) {
    throw new Error(`Location search failed (status ${response.status}).`);
  }

  const payload = (await response.json()) as SuggestApiResponse;
  const suggestions: LocationSuggestion[] = (payload.suggestions ?? []).map((feature, index) => ({
    id: feature.mapbox_id ?? String(index),
    mapboxId: feature.mapbox_id,
    name: feature.name ?? feature.place_formatted ?? feature.full_address ?? trimmed,
    placeFormatted: feature.place_formatted ?? feature.full_address ?? '',
    fullAddress: feature.full_address ?? feature.place_formatted ?? '',
    featureType: feature.feature_type,
  }));

  rememberSuggestions(key, suggestions);
  return suggestions;
}

export async function retrieveLocation(mapboxId: string): Promise<LocationDetails> {
  if (!mapboxId) {
    throw new Error('Missing location id.');
  }

  ensureToken();

  const params = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    session_token: getOrCreateSessionToken(),
    language: 'en',
  });

  const url = `${MAPBOX_SEARCH_BASE_URL}/retrieve/${encodeURIComponent(mapboxId)}?${params.toString()}`;

  let response: Response;
  try {
    response = await fetchWithTimeout(url, undefined, MAPBOX_REQUEST_TIMEOUT_MS);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    throw new Error('Could not load that location. Please try again.');
  }

  if (!response.ok) {
    throw new Error(`Location retrieve failed (status ${response.status}).`);
  }

  const payload = (await response.json()) as RetrieveApiResponse;
  const feature = payload.features?.[0];
  const coordinates = feature?.geometry?.coordinates;

  if (!feature || !coordinates || coordinates.length < 2) {
    throw new Error('No coordinates returned for that location.');
  }

  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Invalid coordinates returned for that location.');
  }

  const details: LocationDetails = {
    latitude,
    longitude,
    displayName:
      feature.properties?.name ??
      feature.properties?.place_formatted ??
      feature.properties?.full_address ??
      'Selected location',
    bbox: feature.properties?.bbox,
  };

  // Mapbox best practice: end the session after the user picks a result.
  resetLocationSearchSession();

  return details;
}
