import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { fetchProfileByMobile } from './api/profile';
import SideMenu, { SideMenuTarget } from './components/SideMenu';
import AgreementReviewScreen from './screens/AgreementReviewScreen';
import LoginMobileScreen from './screens/LoginMobileScreen';
import MoveInDocumentationScreen from './screens/MoveInDocumentationScreen';
import OtpVerificationScreen from './screens/OtpVerificationScreen';
import ProfileRequirementsScreen from './screens/ProfileRequirementsScreen';
import PropertyExploreScreen from './screens/PropertyExploreScreen';
import SplashScreen from './screens/SplashScreen';
import { colors, motion } from './theme/tokens';

type Route =
  | 'splash'
  | 'login'
  | 'otp'
  | 'profile'
  | 'explore'
  | 'agreement'
  | 'movein';
type ProfileMode = 'onboarding' | 'edit';

const MENU_ROUTES: ReadonlyArray<Route> = [
  'profile',
  'explore',
  'agreement',
  'movein',
];

/**
 * Top-level navigator for the early-onboarding flow.
 *
 * Splash plays its entrance + exit sequence and signals when the wordmark
 * has "come out". At that point we crossfade into the login screen and
 * unmount the splash to free its animation resources.
 *
 * After OTP verification, we check Supabase for an existing profile by
 * mobile number. If found, we skip straight to the explore screen;
 * otherwise we route to onboarding profile.
 */
export function AppRoot(): React.JSX.Element {
  const [route, setRoute] = useState<Route>('splash');
  const [mobileNumber, setMobileNumber] = useState('');
  const [profileMode, setProfileMode] = useState<ProfileMode>('onboarding');

  // Drives the crossfade between the splash and the login surface.
  // 0 = splash visible, 1 = login visible.
  const transition = useRef(new Animated.Value(0)).current;
  const [splashUnmounted, setSplashUnmounted] = useState(false);

  const handleSplashExit = useCallback(() => {
    setRoute('login');
  }, []);

  useEffect(() => {
    if (route === 'login') {
      Animated.timing(transition, {
        toValue: 1,
        duration: motion.loginEnter,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setSplashUnmounted(true);
        }
      });
    }
  }, [route, transition]);

  const handleOtpVerified = useCallback(async () => {
    try {
      const profile = await fetchProfileByMobile(mobileNumber);
      if (profile?.full_name?.trim()) {
        setRoute('explore');
        return;
      }
    } catch {
      // Network or supabase error - fall through to onboarding profile.
    }
    setProfileMode('onboarding');
    setRoute('profile');
  }, [mobileNumber]);

  const handleMenuNavigate = useCallback(
    (target: SideMenuTarget) => {
      if (target === 'profile') {
        setProfileMode('edit');
        setRoute('profile');
        return;
      }
      if (target === 'agreement') {
        setRoute('agreement');
        return;
      }
      if (target === 'movein') {
        setRoute('movein');
        return;
      }
      setRoute('explore');
    },
    [],
  );

  const splashOpacity = transition.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const loginOpacity = transition;

  return (
    <View style={styles.root}>
      {route === 'login' && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: loginOpacity }]}
        >
          <LoginMobileScreen
            onOtpSent={(mobile) => {
              setMobileNumber(mobile);
              setRoute('otp');
            }}
          />
        </Animated.View>
      )}
      {route === 'otp' && (
        <View style={StyleSheet.absoluteFill}>
          <OtpVerificationScreen
            mobileNumber={mobileNumber}
            onBack={() => setRoute('login')}
            onVerified={() => {
              handleOtpVerified().catch(() => undefined);
            }}
          />
        </View>
      )}
      {route === 'profile' && (
        <View style={StyleSheet.absoluteFill}>
          <ProfileRequirementsScreen
            mobileNumber={mobileNumber}
            onSaved={() => setRoute('explore')}
            isOnboarding={profileMode === 'onboarding'}
          />
        </View>
      )}
      {route === 'explore' && (
        <View style={StyleSheet.absoluteFill}>
          <PropertyExploreScreen />
        </View>
      )}
      {route === 'agreement' && (
        <View style={StyleSheet.absoluteFill}>
          <AgreementReviewScreen />
        </View>
      )}
      {route === 'movein' && (
        <View style={StyleSheet.absoluteFill}>
          <MoveInDocumentationScreen mobileNumber={mobileNumber} />
        </View>
      )}
      {MENU_ROUTES.includes(route) && (
        <SideMenu
          currentTarget={route as SideMenuTarget}
          onNavigate={handleMenuNavigate}
        />
      )}
      {!splashUnmounted && (
        <Animated.View
          pointerEvents={route === 'splash' ? 'auto' : 'none'}
          style={[StyleSheet.absoluteFill, { opacity: splashOpacity }]}
        >
          <SplashScreen onExitComplete={handleSplashExit} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default AppRoot;
