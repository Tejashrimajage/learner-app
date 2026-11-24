import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  BackHandler,
} from 'react-native';
import WebView from 'react-native-webview';
import SafeAreaWrapper from '../../components/SafeAreaWrapper/SafeAreaWrapper';
import BackHeader from '../../components/Layout/BackHeader';
import { getDataFromStorage } from '../../utils/JsHelper/Helper';
import Config from 'react-native-config';

// Serialises a value into a JS string literal. JSON.stringify handles quoting and
// escaping; U+2028/U+2029 are legal in JSON but were illegal in JS string literals
// before ES2019, so they are escaped explicitly. Same helper as the profile/plp/survey
// WebViews — all four seed the same origin's localStorage.
const jsString = (value) =>
  JSON.stringify(String(value))
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

const buildInjectedJavaScript = (entries) => {
  const statements = Object.entries(entries).map(([key, value]) =>
    value === null || value === undefined || value === ''
      ? `window.localStorage.removeItem(${jsString(key)});`
      : `window.localStorage.setItem(${jsString(key)}, ${jsString(value)});`
  );

  return `
    (function() {
      try {
        ${statements.join('\n        ')}
        console.log('[BeforeLoad] support request WebView localStorage seeded');
      } catch (error) {
        console.error('[BeforeLoad] Error seeding support request WebView:', error);
      }
    })();
    true;
  `;
};

const SupportRequestWebViewScreen = () => {
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [injectedJavaScript, setInjectedJavaScript] = useState(null);
  const webViewRef = useRef(null);

  // ?src=android is what the web page uses to label tickets as coming from the mobile
  // app — it must survive any change to this URL.
  const url = `${Config.LEARNER_PLP_LINK}/support-request?src=android`;

  // No user id / name / email is passed in the URL on purpose: the page reads the login
  // token out of localStorage and exchanges it server-side for a short-lived signed
  // token, so identity is derived on the server and anything sent here is ignored.
  // As with the profile form, every key has to be seeded before the page loads, and the
  // values come from AsyncStorage — hence the WebView is not rendered until the
  // injection script is built.
  useEffect(() => {
    const buildInjection = async () => {
      try {
        const tenantData = JSON.parse(
          (await getDataFromStorage('tenantData')) || 'null'
        );
        const preferredLanguage = await getDataFromStorage('preferred_language');
        const tenantId =
          tenantData?.[0]?.tenantId ||
          (await getDataFromStorage('userTenantid')) ||
          '';

        setInjectedJavaScript(
          buildInjectedJavaScript({
            isAndroidApp: 'yes',
            token: await getDataFromStorage('Accesstoken'),
            // The web app reads refreshTokenForAndroid first and writes the rotated
            // value back to it after a 401 refresh.
            refreshTokenForAndroid: await getDataFromStorage('refreshToken'),
            userId: await getDataFromStorage('userId'),
            tenantId: tenantId,
            uiConfig: await getDataFromStorage('uiConfig'),
            userProgram: tenantData?.[0]?.tenantName || '',
            academicYearId: await getDataFromStorage('academicYearId'),
            preferred_language: preferredLanguage,
            lang: preferredLanguage,
          })
        );
      } catch (error) {
        console.error('Error building support request WebView injection:', error);
      }
    };

    buildInjection();
  }, []);

  // Hardware back navigates inside the page first (e.g. back out of "My Tickets", or
  // out of the embedded Apps Script iframe) and only leaves the screen once the WebView
  // has nothing left to go back to.
  useEffect(() => {
    const backAction = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [canGoBack]);

  return (
    <SafeAreaWrapper>
      {/* No title — the support desk renders its own heading. */}
      <BackHeader />
      <View style={styles.container}>
        <View style={styles.webviewContainer}>
          {(loading || !injectedJavaScript) && (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          )}
          {injectedJavaScript && (
            <WebView
              ref={webViewRef}
              source={{ uri: url }}
              originWhitelist={['*']}
              injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
              // Deliberately not re-injected after load or on navigation, unlike the
              // login and programs WebViews. Those only set a constant flag; this script
              // carries credentials, and re-running it would overwrite a token the web
              // app rotated during the session.
              onLoad={() => setLoading(false)}
              onNavigationStateChange={(navState) =>
                setCanGoBack(navState.canGoBack)
              }
              // No onShouldStartLoadWithRequest / link interception here on purpose: the
              // page embeds a Google Apps Script app in a nested iframe
              // (script.google.com → script.googleusercontent.com), and intercepting
              // loads would break it. The "Google Drive link" field is a plain text
              // input, so nothing needs to treat it as a link either.
              style={styles.webview}
              startInLoadingState={true}
              // REQUIRED. Off by default; without it the page cannot read the login
              // token from localStorage and always shows "We could not open the support
              // desk", with nothing in the logs explaining why.
              domStorageEnabled={true}
              javaScriptEnabled={true}
              renderLoading={() => (
                <View style={styles.loader}>
                  <ActivityIndicator size="large" color="#0000ff" />
                </View>
              )}
            />
          )}
        </View>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  webviewContainer: {
    flex: 1,
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    zIndex: 1,
  },
  webview: {
    flex: 1,
  },
});

export default SupportRequestWebViewScreen;
