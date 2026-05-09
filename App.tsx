import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
  useFonts as useInterFonts,
} from '@expo-google-fonts/inter';
import {
  SourceSerif4_400Regular,
  SourceSerif4_500Medium,
  useFonts as useSerifFonts,
} from '@expo-google-fonts/source-serif-4';

import AppRoot from './src/AppRoot';
import { colors } from './src/theme/tokens';

ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  // No-op: this only fails if hide was already called.
});

export default function App(): React.JSX.Element | null {
  const [interLoaded, interError] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });
  const [serifLoaded, serifError] = useSerifFonts({
    SourceSerif4_400Regular,
    SourceSerif4_500Medium,
  });

  const fontsReady = interLoaded && serifLoaded;
  const fontError = interError ?? serifError;

  useEffect(() => {
    if (fontError) {
      console.warn('Failed to load app fonts', fontError);
    }
  }, [fontError]);

  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    if (fontsReady || fontError) {
      setAppIsReady(true);
    }
  }, [fontsReady, fontError]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await ExpoSplashScreen.hideAsync().catch(() => undefined);
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root} onLayout={onLayoutRootView}>
        <StatusBar style="dark" backgroundColor={colors.background} />
        <AppRoot />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
