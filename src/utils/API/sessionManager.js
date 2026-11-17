// sessionManager.js
//
// Keeps the user's session alive while the app is in use, and ends it when it can't be.
//
//  - Every 30s while the app is in the foreground, the access token's expiry is checked
//    locally (no API call). Only when it expires within 30 minutes (or half its lifetime, if
//    that is shorter) and the device is online is the refresh API called; the new access and
//    refresh tokens are stored in AsyncStorage by refreshAccessToken().
//  - At app launch LanguageScreen uses the same rule (isAccessTokenExpiringSoon): online, it
//    refreshes only when needed; offline, an expired token logs the user out
//    (isAccessTokenExpired), otherwise the user enters the app.
//  - The user is logged out only when the server rejects the refresh token (expired/revoked),
//    never because the device is offline or a request failed to reach the server.

import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { refreshAccessToken, setSessionExpiredHandler } from './RestClient';
import { navigationRef } from '../NavigationService';
import { deleteSavedItem, logEventFunction } from '../JsHelper/Helper';
import { NotificationUnsubscribe } from '../Helper/JSHelper';

const CHECK_INTERVAL_MS = 30 * 1000;
const REFRESH_WINDOW_MS = 30 * 60 * 1000;

// Same keys LanguageScreen clears on logout.
const SESSION_KEYS = [
  'refreshToken',
  'Accesstoken',
  'userId',
  'cohortId',
  'cohortData',
  'attendanceCohortIds',
  'weightedProgress',
  'courseTrackData',
  'profileData',
  'tenantData',
  'academicYearId',
  'uiConfig',
  'cohortAssignedToAnyAcademicYearId',
  'preferred_language',
  'registerationTestQuestionSetIdentifier',
];

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// Dependency-free base64url decoder (JWT payloads are ASCII JSON).
const decodeBase64Url = (input) => {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const char of input.replace(/=+$/, '')) {
    const index = BASE64_CHARS.indexOf(char === '+' ? '-' : char === '/' ? '_' : char);
    if (index === -1) throw new Error('Invalid base64');
    value = (value << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((value >> bits) & 0xff);
    }
  }
  return output;
};

/** Returns the JWT's { iat, exp } (seconds), or null when the token isn't a readable JWT. */
export const getTokenTimes = (token) => {
  try {
    return JSON.parse(decodeBase64Url(token.split('.')[1] || ''));
  } catch {
    return null;
  }
};

/**
 * True when the access token's expiry time has passed. A token without a readable expiry is
 * treated as valid, so an unexpected token format never locks an offline user out.
 */
export const isAccessTokenExpired = (token) => {
  const exp = getTokenTimes(token)?.exp;
  return Boolean(exp) && exp * 1000 <= Date.now();
};

/**
 * True when the access token expires within 30 minutes, capped at half its lifetime: for
 * tokens living <= 1 hour every fresh token would otherwise count as "expiring" and refresh
 * on every check. A token without a readable expiry is never "expiring".
 */
export const isAccessTokenExpiringSoon = (token) => {
  const { iat, exp } = getTokenTimes(token) || {};
  if (!exp) return false;
  const lifetimeMs = iat ? (exp - iat) * 1000 : REFRESH_WINDOW_MS * 2;
  return exp * 1000 - Date.now() <= Math.min(REFRESH_WINDOW_MS, lifetimeMs / 2);
};

let intervalRef = null;
let appStateSubscription = null;
let checking = false;
let lastAttemptedToken = null;
let loggingOut = false;

const refreshIfExpiringSoon = async () => {
  if (checking || AppState.currentState !== 'active') return;
  checking = true;
  try {
    const token = await AsyncStorage.getItem('Accesstoken');
    // One attempt per token: a rejected refresh logs out, other failures wait for the 401.
    if (!token || token === lastAttemptedToken || !isAccessTokenExpiringSoon(token)) return;

    // Offline: try again on a later tick, once the device is back online.
    const { isConnected } = await NetInfo.fetch();
    if (!isConnected) return;

    lastAttemptedToken = token;
    await refreshAccessToken();
  } catch (e) {
    console.log('Session check failed', e?.message);
  } finally {
    checking = false;
  }
};

/** Clears the session and returns to the login screen (refresh token expired/revoked). */
export const logoutSessionExpired = async () => {
  if (loggingOut) return;
  loggingOut = true;
  try {
    try {
      await NotificationUnsubscribe();
    } catch {
      // Logout must not depend on the network.
    }
    for (const key of SESSION_KEYS) {
      await deleteSavedItem(key);
    }
    logEventFunction({
      eventName: 'auto_logout',
      method: 'refresh-token',
      screenName: navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : '',
    });
    if (navigationRef.isReady()) {
      navigationRef.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'LoginScreen' }] })
      );
    }
  } finally {
    loggingOut = false;
    lastAttemptedToken = null;
  }
};

export const startSessionManager = () => {
  if (intervalRef) return;
  // No check here at launch: LanguageScreen does the launch check before navigating.
  intervalRef = setInterval(refreshIfExpiringSoon, CHECK_INTERVAL_MS);
  // Check straight away when the app returns to the foreground.
  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') refreshIfExpiringSoon();
  });
};

export const stopSessionManager = () => {
  if (intervalRef) clearInterval(intervalRef);
  intervalRef = null;
  appStateSubscription?.remove();
  appStateSubscription = null;
};

// Registered on import (not in startSessionManager) so a rejection during the launch refresh
// in LanguageScreen, which runs before App's effects, also logs out.
setSessionExpiredHandler(logoutSessionExpired);
