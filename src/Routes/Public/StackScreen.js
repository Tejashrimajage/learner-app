import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabScreen from './TabScreen';
import LoadingScreen from '../../screens/LoadingScreen/LoadingScreen';
import LanguageScreen from '../../screens/LanguageScreen/LanguageScreen';
import ForgotPassword from '../../screens/ForgotPassword/ForgotPassword';
import RegisterScreen from '../../screens/RegisterScreen/RegisterScreen';
import LoginSignUpScreen from '../../screens/LoginSignUpScreen/LoginSignUpScreen';
import RegisterStart from '../../screens/RegisterStart/RegisterStart';
import LoginScreen from '../../screens/LoginScreen/LoginScreen';
import TermsAndCondition from '../../screens/LoginScreen/TermsAndCondition';
import { View } from 'react-native';
import PlayerScreen from '../../screens/PlayerScreen/PlayerScreen';
import QuMLPlayer from '../../screens/PlayerScreen/QuMLPlayer/QuMLPlayer';
import QuMLPlayerOffline from '../../screens/PlayerScreen/QuMLPlayer/QuMLPlayerOffline';
import PdfPlayer from '../../screens/PlayerScreen/PdfPlayer/PdfPlayer';
import PdfPlayerOffline from '../../screens/PlayerScreen/PdfPlayer/PdfPlayerOffline';
import VideoPlayer from '../../screens/PlayerScreen/VideoPlayer/VideoPlayer';
import VideoPlayerOffline from '../../screens/PlayerScreen/VideoPlayer/VideoPlayerOffline';
import EpubPlayer from '../../screens/PlayerScreen/EpubPlayer/EpubPlayer';
import EpubPlayerOffline from '../../screens/PlayerScreen/EpubPlayer/EpubPlayerOffline';
import ECMLPlayer from '../../screens/PlayerScreen/ECMLPlayer/ECMLPlayer';
import ECMLPlayerOffline from '../../screens/PlayerScreen/ECMLPlayer/ECMLPlayerOffline';
import H5PPlayer from '../../screens/PlayerScreen/H5PPlayer/H5PPlayer';
import H5PPlayerOffline from '../../screens/PlayerScreen/H5PPlayer/H5PPlayerOffline';
import HTMLPlayer from '../../screens/PlayerScreen/HTMLPlayer/HTMLPlayer';
import HTMLPlayerOffline from '../../screens/PlayerScreen/HTMLPlayer/HTMLPlayerOffline';
import YoutubePlayer from '../../screens/PlayerScreen/YoutubePlayer/YoutubePlayer';
import StandAlonePlayer from '../../screens/PlayerScreen/StandAlonePlayer/StandAlonePlayer';
import EnableLocationScreen from '../../screens/Location/EnableLocationScreen';
import DashboardStack from './DashboardStack';
import SCPUserTabScreen from '../SCPUser/SCPUserTabScreen';
import YouthNetTabScreen from '../Youthnet/YouthNetTabScreen';
import UnauthorizedScreen from '../../screens/Unauthorized/UnauthorizedScreen';
import PlpWebViewScreen from '../../screens/PlpWebViewScreen/PlpWebViewScreen';
import ProgramsScreen from '../../screens/ProgramsScreen/ProgramsScreen';
import ProfileWebViewScreen from '../../screens/ProfileWebViewScreen/ProfileWebViewScreen';
import SupportRequestWebViewScreen from '../../screens/SupportRequestWebViewScreen/SupportRequestWebViewScreen';

const StackScreen = () => {
  const Stack = createNativeStackNavigator();

  const headerBackground = () => {
    return <View style={{ backgroundColor: 'white', flex: 1 }}></View>;
  };

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      //solved blanck screen issue for long time
      initialRouteName="LoadingScreen"
      //initialRouteName="LanguageScreen"
    >
      <Stack.Screen
        name="LoadingScreen"
        component={LoadingScreen}
        options={{ lazy: true }} // Lazily load the screen
      />
      <Stack.Screen
        name="LanguageScreen"
        component={LanguageScreen}
        options={{ lazy: true }} // Lazily load the screen
      />
      <Stack.Screen
        name="RegisterScreen"
        component={RegisterScreen}
        options={{
          headerShown: false,
          headerBackground: () => headerBackground(),
          lazy: true,
        }}
      />

      <Stack.Screen
        name="LoginSignUpScreen"
        component={LoginSignUpScreen}
        options={{
          headerShown: false,
          headerBackground: () => headerBackground(),
          lazy: true,
        }}
      />
      <Stack.Screen name="RegisterStart" component={RegisterStart} />
      <Stack.Screen
        name="LoginScreen"
        component={LoginScreen}
        options={{ headerShown: false, lazy: true }}
      />

      <Stack.Screen
        name="Dashboard"
        component={TabScreen} // Changed to TabScreen for now to show content in dashboard
        //component={AssessmentStack} // Changed to AssessmentStack for now to show only Assessment
        options={{ headerShown: false, lazy: true }}
      />
      <Stack.Screen
        name="SCPUserTabScreen"
        component={SCPUserTabScreen} // Changed to TabScreen for now to show content in dashboard
        //component={AssessmentStack} // Changed to AssessmentStack for now to show only Assessment
        options={{ headerShown: false, lazy: true }}
      />
      <Stack.Screen
        name="YouthNetTabScreen"
        component={YouthNetTabScreen}
        options={{ headerShown: false, lazy: true }}
      />

      <Stack.Screen
        name="PlayerScreen"
        component={PlayerScreen}
        options={{
          headerShown: false,
          headerBackground: () => (
            <View style={{ backgroundColor: 'white', flex: 1 }}></View>
          ),
          lazy: true,
        }}
      />
      <Stack.Screen
        name="QuMLPlayer"
        component={QuMLPlayer}
        options={{
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="QuMLPlayerOffline"
        component={QuMLPlayerOffline}
        options={{
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="PdfPlayer"
        component={PdfPlayer}
        options={{
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="PdfPlayerOffline"
        component={PdfPlayerOffline}
        options={{
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="VideoPlayer"
        component={VideoPlayer}
        options={{
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="VideoPlayerOffline"
        component={VideoPlayerOffline}
        options={{
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="EpubPlayer"
        component={EpubPlayer}
        options={{
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="EpubPlayerOffline"
        component={EpubPlayerOffline}
        options={{
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="ECMLPlayer"
        component={ECMLPlayer}
        options={{
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="ECMLPlayerOffline"
        component={ECMLPlayerOffline}
        options={{
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="H5PPlayer"
        component={H5PPlayer}
        options={{
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="H5PPlayerOffline"
        component={H5PPlayerOffline}
        options={{
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="HTMLPlayer"
        component={HTMLPlayer}
        options={{
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="HTMLPlayerOffline"
        component={HTMLPlayerOffline}
        options={{
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="YoutubePlayer"
        component={YoutubePlayer}
        options={{
          headerShown: true,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="StandAlonePlayer"
        component={StandAlonePlayer}
        options={{
          headerShown: false,
          lazy: true,
        }}
      />
      <Stack.Screen
        name="TermsAndCondition"
        component={TermsAndCondition}
        options={{
          headerShown: false,
          lazy: true,
        }}
      />

      <Stack.Screen
        name="DashboardStack"
        component={DashboardStack} // Changed to Assessment for now
        options={{ headerShown: false, lazy: true }}
      />

      <Stack.Screen
        name="EnableLocationScreen"
        component={EnableLocationScreen} // Changed to Assessment for now
        options={{ headerShown: false, lazy: true }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPassword} // Changed to Assessment for now
        options={{ headerShown: false, lazy: true }}
      />
      <Stack.Screen
        name="UnauthorizedScreen"
        component={UnauthorizedScreen}
        options={{ headerShown: false, lazy: true }}
      />
      <Stack.Screen
        name="PlpWebViewScreen"
        component={PlpWebViewScreen}
        options={{ headerShown: false, lazy: true }}
      />
      <Stack.Screen
        name="ProgramsScreen"
        component={ProgramsScreen}
        options={{ headerShown: false, lazy: true }}
      />
      {/* Registered on the root stack so both profile entry points reach it: the profile
          menu (nested in ProfileStack) and the complete-profile banner (nested in the
          dashboard stacks). Presented full screen, like the other WebView screens. */}
      <Stack.Screen
        name="ProfileWebViewScreen"
        component={ProfileWebViewScreen}
        options={{ headerShown: false, lazy: true }}
      />
      {/* Registered on the root stack alongside ProfileWebViewScreen so it can be reached
          from the profile menu (nested in ProfileStack) and from anywhere else that needs
          to link to the support desk. Presented full screen, like the other WebView
          screens. Named ...WebViewScreen because ProfileStack already has a 'SupportRequest'
          route for the legacy JotForm screen. */}
      <Stack.Screen
        name="SupportRequestWebViewScreen"
        component={SupportRequestWebViewScreen}
        options={{ headerShown: false, lazy: true }}
      />
    </Stack.Navigator>
  );
};

export default StackScreen;
