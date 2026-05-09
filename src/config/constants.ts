import { Platform } from 'react-native';

/**
 * App configuration.
 *
 * Mapbox (`pk.*`) and Claude keys must go in `.env` as EXPO_PUBLIC_* vars — see `.env.example`.
 * Do not paste real tokens into this file (GitHub push protection will block the push).
 */

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ??
  Platform.select({
    android: 'http://192.168.1.3:8080',
    ios: 'http://192.168.1.3:8080',
    default: 'http://192.168.1.3:8080',
  })) as string;

export const SUPABASE_URL = 'https://lybbdmdpdtbmguzuzquc.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5YmJkbWRwZHRibWd1enV6cXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTE4MjcsImV4cCI6MjA5MzgyNzgyN30.TMt9e4AAh2SK7z3P8g-YSQ6Gc8BmgrVfawTY4T-9u7M';

/**
 * Mapbox Search Box — public token (pk.*); restrict in Mapbox dashboard by bundle/URL.
 */
export const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

export const MAPBOX_SEARCH_BASE_URL = 'https://api.mapbox.com/search/searchbox/v1';
export const MAPBOX_DEFAULT_COUNTRY = 'in';
export const MAPBOX_REQUEST_TIMEOUT_MS = 8000;

export const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? '';
export const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
export const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';
export const CLAUDE_API_VERSION = '2023-06-01';
export const CLAUDE_REQUEST_TIMEOUT_MS = 90000;
export const CLAUDE_MAX_TOKENS = 2048;
