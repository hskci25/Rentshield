import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Callout, Marker, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  LocationSuggestion,
  resetLocationSearchSession,
  retrieveLocation,
  searchLocations,
} from '../api/locationSearch';
import PropertyMediaGallery from '../components/PropertyMediaGallery';
import { mockProperties, PropertyRecord } from '../data/mockProperties';
import { colors, spacing, typography } from '../theme/tokens';

const DEFAULT_REGION: Region = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

const SUGGESTION_DEBOUNCE_MS = 250;
const POI_LATITUDE_DELTA = 0.02;
const POI_LONGITUDE_DELTA = 0.02;

export default function PropertyExploreScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const areaInputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeAbortController = useRef<AbortController | null>(null);
  const currentRegionRef = useRef<Region>(DEFAULT_REGION);
  const suppressNextSuggestRef = useRef(false);

  const [area, setArea] = useState('');
  const [rooms, setRooms] = useState<number | null>(null);
  const [minRent, setMinRent] = useState<number | null>(null);
  const [maxRent, setMaxRent] = useState<number | null>(null);

  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [retrievingId, setRetrievingId] = useState<string | null>(null);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const filteredProperties = useMemo(() => {
    return mockProperties.filter((property) => {
      if (rooms !== null && property.rooms !== rooms) {
        return false;
      }
      if (minRent !== null && property.rent < minRent) {
        return false;
      }
      if (maxRent !== null && property.rent > maxRent) {
        return false;
      }
      return true;
    });
  }, [maxRent, minRent, rooms]);

  const selectedProperty = useMemo(
    () => filteredProperties.find((property) => property.id === selectedPropertyId) ?? null,
    [filteredProperties, selectedPropertyId],
  );

  const cancelInflightRequest = useCallback(() => {
    activeAbortController.current?.abort();
    activeAbortController.current = null;
  }, []);

  const runSearch = useCallback((query: string) => {
    cancelInflightRequest();
    const controller = new AbortController();
    activeAbortController.current = controller;

    setLoadingSuggestions(true);
    setSearchError(null);

    searchLocations(query, {
      signal: controller.signal,
      proximity: {
        latitude: currentRegionRef.current.latitude,
        longitude: currentRegionRef.current.longitude,
      },
    })
      .then((results) => {
        if (controller.signal.aborted) {
          return;
        }
        setSuggestions(results);
        setSuggestionsVisible(true);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        setSuggestions([]);
        setSearchError(error instanceof Error ? error.message : 'Could not search locations.');
        setSuggestionsVisible(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingSuggestions(false);
        }
      });
  }, [cancelInflightRequest]);

  useEffect(() => {
    if (suppressNextSuggestRef.current) {
      suppressNextSuggestRef.current = false;
      return;
    }

    const trimmed = area.trim();
    if (trimmed.length < 2) {
      cancelInflightRequest();
      setSuggestions([]);
      setLoadingSuggestions(false);
      setSearchError(null);
      setSuggestionsVisible(false);
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => runSearch(trimmed), SUGGESTION_DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, [area, cancelInflightRequest, runSearch]);

  useEffect(() => {
    return () => {
      cancelInflightRequest();
      resetLocationSearchSession();
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [cancelInflightRequest]);

  const handleSelectSuggestion = useCallback(async (suggestion: LocationSuggestion) => {
    Keyboard.dismiss();
    areaInputRef.current?.blur();
    cancelInflightRequest();
    setRetrievingId(suggestion.id);
    setSearchError(null);

    try {
      const details = await retrieveLocation(suggestion.mapboxId);
      const nextRegion = regionFromDetails(details);

      suppressNextSuggestRef.current = true;
      setArea(details.displayName);
      setSuggestions([]);
      setSuggestionsVisible(false);

      currentRegionRef.current = nextRegion;
      mapRef.current?.animateToRegion(nextRegion, 600);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Could not load that location.');
    } finally {
      setRetrievingId(null);
    }
  }, [cancelInflightRequest]);

  const handleSubmitEditing = useCallback(() => {
    const first = suggestions[0];
    if (first) {
      handleSelectSuggestion(first).catch(() => undefined);
    } else {
      Keyboard.dismiss();
      areaInputRef.current?.blur();
    }
  }, [handleSelectSuggestion, suggestions]);

  const handleSelectProperty = useCallback((property: PropertyRecord) => {
    setSelectedPropertyId(property.id);
    const nextRegion: Region = {
      ...currentRegionRef.current,
      latitude: property.latitude,
      longitude: property.longitude,
    };
    currentRegionRef.current = nextRegion;
    mapRef.current?.animateToRegion(nextRegion, 350);
  }, []);

  const handleRegionChangeComplete = useCallback((nextRegion: Region) => {
    currentRegionRef.current = nextRegion;
  }, []);

  const dismissSuggestions = useCallback(() => {
    setSuggestionsVisible(false);
    Keyboard.dismiss();
    areaInputRef.current?.blur();
  }, []);

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={dismissSuggestions}
      >
        {filteredProperties.map((property) => (
          <Marker
            key={property.id}
            coordinate={{ latitude: property.latitude, longitude: property.longitude }}
            onPress={() => handleSelectProperty(property)}
          >
            <View style={styles.rentPin}>
              <Text style={styles.rentPinText}>{formatRupees(property.rent)}</Text>
            </View>
            <Callout>
              <Text>{property.title}</Text>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.topOverlay, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.filterCard}>
          <View style={styles.searchRow}>
            <TextInput
              ref={areaInputRef}
              style={styles.areaInput}
              value={area}
              onChangeText={setArea}
              placeholder="Search area, neighborhood, or address"
              placeholderTextColor={colors.outline}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="words"
              onFocus={() => {
                if (suggestions.length > 0) {
                  setSuggestionsVisible(true);
                }
              }}
              onSubmitEditing={handleSubmitEditing}
            />
            {(loadingSuggestions || retrievingId !== null) && (
              <ActivityIndicator color={colors.onSurfaceVariant} style={styles.searchSpinner} />
            )}
            {area.length > 0 && retrievingId === null && (
              <Pressable
                onPress={() => {
                  suppressNextSuggestRef.current = false;
                  setArea('');
                  setSuggestions([]);
                  setSuggestionsVisible(false);
                  areaInputRef.current?.focus();
                }}
                style={styles.clearButton}
                hitSlop={8}
              >
                <Text style={styles.clearButtonText}>X</Text>
              </Pressable>
            )}
          </View>

          {suggestionsVisible && (suggestions.length > 0 || searchError) && (
            <View style={styles.suggestionPanel}>
              {searchError ? (
                <Text style={styles.errorText}>{searchError}</Text>
              ) : (
                <FlatList
                  keyboardShouldPersistTaps="handled"
                  data={suggestions}
                  keyExtractor={(item) => item.id}
                  ItemSeparatorComponent={() => <View style={styles.suggestionDivider} />}
                  renderItem={({ item }) => (
                    <Pressable
                      style={({ pressed }) => [
                        styles.suggestionRow,
                        pressed && styles.suggestionRowPressed,
                      ]}
                      onPress={() => {
                        handleSelectSuggestion(item).catch(() => undefined);
                      }}
                    >
                      <View style={styles.suggestionTextWrap}>
                        <Text style={styles.suggestionPrimary} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.placeFormatted ? (
                          <Text style={styles.suggestionSecondary} numberOfLines={1}>
                            {item.placeFormatted}
                          </Text>
                        ) : null}
                      </View>
                      {retrievingId === item.id && (
                        <ActivityIndicator color={colors.onSurfaceVariant} />
                      )}
                    </Pressable>
                  )}
                />
              )}
            </View>
          )}

          <View style={styles.roomsRow}>
            {[null, 1, 2, 3].map((roomOption) => {
              const active = roomOption === rooms;
              const label = roomOption === null ? 'Any' : `${roomOption}RK/BHK`;
              return (
                <Pressable
                  key={String(roomOption)}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setRooms(roomOption)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.rentRow}>
            <TextInput
              value={minRent?.toString() ?? ''}
              onChangeText={(value) => setMinRent(parseNullableNumber(value))}
              placeholder="Min rent"
              keyboardType="number-pad"
              placeholderTextColor={colors.outline}
              style={styles.rentInput}
            />
            <Text style={styles.rangeSeparator}>to</Text>
            <TextInput
              value={maxRent?.toString() ?? ''}
              onChangeText={(value) => setMaxRent(parseNullableNumber(value))}
              placeholder="Max rent"
              keyboardType="number-pad"
              placeholderTextColor={colors.outline}
              style={styles.rentInput}
            />
          </View>
        </View>
      </View>

      <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + spacing.md }]}>
        {selectedProperty ? (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>{selectedProperty.title}</Text>
            <Text style={styles.detailMeta}>
              {selectedProperty.rooms} rooms · {formatRupees(selectedProperty.rent)} ·{' '}
              {selectedProperty.area}
            </Text>
            <Text style={styles.detailBody}>{selectedProperty.details}</Text>
            <PropertyMediaGallery media={selectedProperty.media} />
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Tap a rent pin to view photos, video placeholder, and details.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function regionFromDetails(details: { latitude: number; longitude: number; bbox?: [number, number, number, number] }): Region {
  const { bbox, latitude, longitude } = details;
  if (bbox && bbox.length === 4) {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latitudeDelta = Math.max(Math.abs(maxLat - minLat) * 1.2, 0.01);
    const longitudeDelta = Math.max(Math.abs(maxLng - minLng) * 1.2, 0.01);
    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta,
      longitudeDelta,
    };
  }

  return {
    latitude,
    longitude,
    latitudeDelta: POI_LATITUDE_DELTA,
    longitudeDelta: POI_LONGITUDE_DELTA,
  };
}

function parseNullableNumber(input: string): number | null {
  const cleaned = input.trim();
  if (!cleaned) {
    return null;
  }
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatRupees(value: number): string {
  return `Rs ${value.toLocaleString('en-IN')}`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  topOverlay: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
  },
  filterCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  areaInput: {
    flex: 1,
    color: colors.onSurface,
    fontFamily: typography.body.fontFamily,
    paddingVertical: 0,
  },
  searchSpinner: {
    marginLeft: spacing.xs,
  },
  clearButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  suggestionPanel: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
    maxHeight: 320,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  suggestionRowPressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionPrimary: {
    fontFamily: typography.label.fontFamily,
    fontSize: 14,
    color: colors.onSurface,
  },
  suggestionSecondary: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  suggestionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginLeft: spacing.md,
  },
  errorText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  roomsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.ink,
  },
  chipText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 11,
    color: colors.onSurface,
  },
  chipTextActive: {
    color: colors.onInk,
  },
  rentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rentInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.onSurface,
    fontFamily: typography.body.fontFamily,
  },
  rangeSeparator: {
    fontFamily: typography.label.fontFamily,
    color: colors.onSurfaceVariant,
  },
  rentPin: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
  },
  rentPinText: {
    color: colors.onInk,
    fontFamily: typography.label.fontFamily,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  bottomOverlay: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 0,
  },
  detailCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  detailTitle: {
    fontFamily: typography.serif.fontFamily,
    fontSize: 21,
    color: colors.onSurface,
  },
  detailMeta: {
    fontFamily: typography.label.fontFamily,
    color: colors.onSurfaceVariant,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  detailBody: {
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 20,
    color: colors.onSurface,
  },
  emptyCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
  },
  emptyText: {
    fontFamily: typography.body.fontFamily,
    color: colors.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 20,
  },
});
