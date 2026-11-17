import React, { useEffect, useState } from 'react';
import { CopilotStep, useCopilot, walkthroughable } from 'react-native-copilot';
import {
  FlatList,
  // SafeAreaView,
  StatusBar,
  StyleSheet,
  Image,
  View,
} from 'react-native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper/SafeAreaWrapper';
import { Layout } from '@ui-kitten/components';
import { CommonActions, useNavigation } from '@react-navigation/native';
import Logo from '../../assets/images/png/logo.png';
import CustomBottomCard from '../../components/CustomBottomCard/CustomBottomCard';
import HorizontalLine from '../../components/HorizontalLine/HorizontalLine';
import CustomCardLanguage from '../../components/CustomCardLanguage/CustomCardLanguage';
import AppUpdatePopup from '../../components/AppUpdate/AppUpdatePopup';
import { languages } from '@context/Languages';
// Multi-language context
import { useTranslation } from '../../context/LanguageContext';

import FastImage from '@changwoolab/react-native-fast-image';

import {
  deleteSavedItem,
  getActiveCohortData,
  getActiveCohortIds,
  getBatchAssignmentCacheKey,
  getDataFromStorage,
  logEventFunction,
  setDataInStorage,
} from '../../utils/JsHelper/Helper';
import { NotificationUnsubscribe } from '../../utils/Helper/JSHelper';
import {
  isAccessTokenExpired,
  isAccessTokenExpiringSoon,
} from '../../utils/API/sessionManager';
import { refreshSession } from '../../utils/API/RestClient';

import {
  getCohort,
  getProfileDetails,
  getProgramDetails,
} from '../../utils/API/AuthService';
import Loading from '../LoadingScreen/Loading';
import { useInternet } from '../../context/NetworkContext';
import { alterTable, createTable } from '../../utils/JsHelper/SqliteHelper';

import GlobalText from '@components/GlobalText/GlobalText';
import globalStyles from '../../utils/Helper/Style';

const CopilotView = walkthroughable(View); // Wrap Text to make it interactable

// Make the Text component walkthroughable for the copilot tutorial
const LanguageScreen = () => {
  const { start, copilotEvents } = useCopilot();
  const navigation = useNavigation();
  const { t, setLanguage, language } = useTranslation();
  const [loading, setLoading] = useState(true);
  // const [CopilotStarted, setCopilotStarted] = useState(false);
  const { isConnected } = useInternet();

  // Listen to tutorial start and stop events
  // useEffect(() => {
  //   const fetchData = async () => {
  //     const languageScreenTour = await getDataFromStorage('languageScreenTour');
  //     const COPILOT_ENABLE = Config.COPILOT_ENABLE;

  //     if (
  //       !CopilotStarted &&
  //       languageScreenTour !== 'completed' &&
  //       COPILOT_ENABLE
  //     ) {
  //       start();
  //       copilotEvents.on('start', () => setCopilotStarted(true));
  //       copilotEvents.on('stop', () =>
  //         setDataInStorage('languageScreenTour', 'completed')
  //       );
  //     }
  //   };
  //   fetchData();
  // }, [start]);

  const getProgramData = async () => {
    const data = await getProgramDetails();

    await setDataInStorage('tenantDetails', JSON.stringify(data));
  };

  const setCurrentCohort = async () => {
    const tenantData = JSON.parse(await getDataFromStorage('tenantData'));
    const tenantid = tenantData?.[0]?.tenantId;
    const user_id = await getDataFromStorage('userId');
    const academicYearId = await getDataFromStorage('academicYearId');
    const cohort = await getCohort({
      user_id,
      tenantid,
      academicYearId,
    });

    const getActiveCohort = await getActiveCohortData(cohort);
    const getActiveCohortId = await getActiveCohortIds(cohort);

    const cohort_id = getActiveCohortId?.[0];

    await setDataInStorage(
      'cohortData',
      JSON.stringify(getActiveCohort?.[0]) || ''
    );
    await setDataInStorage(
      'cohortId',
      cohort_id || '00000000-0000-0000-0000-000000000000'
    );
  };

  const logoutEvent = async () => {
    const obj = {
      eventName: 'auto_logout',
      method: 'refresh-token',
      screenName: 'dashboard',
    };
    await logEventFunction(obj);
  };

  const handleLogout = () => {
    const fetchData = async () => {
      await NotificationUnsubscribe();
      await deleteSavedItem('refreshToken');
      await deleteSavedItem('Accesstoken');
      await deleteSavedItem('userId');
      await deleteSavedItem('cohortId');
      await deleteSavedItem('cohortData');
      await deleteSavedItem('attendanceCohortIds');
      await deleteSavedItem('weightedProgress');
      await deleteSavedItem('courseTrackData');
      await deleteSavedItem('profileData');
      await deleteSavedItem('tenantData');
      await deleteSavedItem('academicYearId');
      await deleteSavedItem('uiConfig');
      await deleteSavedItem(await getBatchAssignmentCacheKey());
      await deleteSavedItem('preferred_language');
      await deleteSavedItem('registerationTestQuestionSetIdentifier');
      logoutEvent();
      // Reset the navigation stack and navigate to LoginSignUpScreen
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'LoginScreen' }],
        })
      );
    };

    fetchData();
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      //create tables local
      //APIResponses
      let tableName = 'APIResponses';
      let columns = [
        'id INTEGER PRIMARY KEY AUTOINCREMENT',
        'user_id TEXT',
        'api_url TEXT',
        'api_type TEXT',
        'payload TEXT',
        'response TEXT',
      ];
      await createTable({ tableName, columns });
      //asessment_offline_2
      tableName = 'Asessment_Offline_2';
      columns = [
        'id INTEGER PRIMARY KEY AUTOINCREMENT',
        'user_id TEXT',
        'content_id TEXT',
        'payload TEXT',
      ];
      await createTable({
        tableName,
        columns,
      });
      //telemetry_offline
      tableName = 'Telemetry_Offline';
      columns = [
        'id INTEGER PRIMARY KEY AUTOINCREMENT',
        'user_id TEXT',
        'telemetry_object TEXT',
      ];
      await createTable({ tableName, columns });
      //Tracking_Offline_2
      tableName = 'Tracking_Offline_2';
      columns = [
        'id INTEGER PRIMARY KEY AUTOINCREMENT',
        'user_id TEXT',
        'course_id TEXT',
        'content_id TEXT',
        'content_type TEXT',
        'content_mime TEXT',
        'lastAccessOn TEXT',
        'detailsObject TEXT',
      ];
      await createTable({ tableName, columns });
      //TenantAssessment
      tableName = 'TenantAssessment';
      columns = [
        'id INTEGER PRIMARY KEY AUTOINCREMENT',
        'user_id TEXT',
        'content_id TEXT',
        'tenant_id TEXT',
      ];
      await createTable({ tableName, columns });

      //alter table for new columns add
      //add unit_id in Tracking_Offline_2
      tableName = 'Tracking_Offline_2';
      columns = ['unit_id TEXT'];
      await alterTable({
        tableName,
        newColumns: columns,
      });
      const cohort_id = await getDataFromStorage('cohortId');
      const token = await getDataFromStorage('Accesstoken');
      const userType = await getDataFromStorage('userType');
      const userId = await getDataFromStorage('userId');

      // console.log('userId', userId);
      // console.log('token', token);
      // console.log('userType', userType);
      // console.log('cohort_id', cohort_id);
      // console.log('isConnected', isConnected);

      // Opens the user's home screen. Online, the cohort and profile are loaded first.
      const goToHome = async (online) => {
        if (
          cohort_id !== '00000000-0000-0000-0000-000000000000' &&
          userType === 'scp'
        ) {
          if (online) await setCurrentCohort(cohort_id);
          navigation.navigate('SCPUserTabScreen');
        } else {
          if (online && userType === 'youthnet') {
            const user_id = await getDataFromStorage('userId');
            const profileData = await getProfileDetails({
              userId: user_id,
            });
            await setDataInStorage('profileData', JSON.stringify(profileData));
          }
          navigation.navigate('Dashboard');
        }
      };

      if (token && userId) {
        if (isConnected && isAccessTokenExpiringSoon(token)) {
          // The access token expires soon: get a new access + refresh token first.
          const { accessToken, rejected } = await refreshSession();
          if (rejected) {
            // Refresh token expired/revoked: sessionManager has logged the user out.
          } else if (accessToken || !isAccessTokenExpired(token)) {
            await goToHome(true);
          } else {
            // Server unreachable and the access token has already expired.
            handleLogout();
          }
        } else if (isConnected) {
          // Access token still has enough time: no refresh call needed.
          await goToHome(true);
        } else if (isAccessTokenExpired(token)) {
          // Offline: an expired access token can't be refreshed, so end the session.
          handleLogout();
        } else {
          await goToHome(false);
        }
      } else {
        setLoading(false);
      }
      await getProgramData();
    };
    fetchData();
  }, [navigation]);

  const changeLanguage = (lng) => {
    setLanguage(lng);
  };

  const renderItem = ({ item }) => (
    <CustomCardLanguage
      key={item.value}
      title={item.title}
      clickEvent={changeLanguage}
      value={item.value}
      active={item.value == language}
    />
  );

  const handlethis = () => {
    navigation.navigate('PlpWebViewScreen');
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <SafeAreaWrapper style={styles.safeArea}>
      <AppUpdatePopup />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" />
      <Layout style={styles.container}>
        <View style={{ flex: 1 }}>
          <View style={{ flex: 0 }}>
            {/* fixed top part */}
            <Image style={styles.image} source={Logo} resizeMode="contain" />
            {/* Text Samples here */}
            <View style={{ alignItems: 'center', flexDirection: 'row' }}>
              <GlobalText category="s1" style={globalStyles.h3}>
                {t('welcome')}!
              </GlobalText>
              {/* Use to load gif and images fast */}
              <FastImage
                style={styles.gif_image}
                // eslint-disable-next-line no-undef
                source={require('../../assets/images/gif/smile.gif')}
                resizeMode={FastImage.resizeMode.contain}
                priority={FastImage.priority.high} // Set the priority here
              />
            </View>
            <GlobalText style={globalStyles.h5}>
              {t('choose_language')}
            </GlobalText>
            <GlobalText category="p1" style={globalStyles.text}>
              {t('select_language')}
            </GlobalText>
          </View>
          <View style={{ flex: 1 }}>
            {/* content will be here and will be ajustable within this space */}
            <CopilotStep text={t('select_language')} order={1} name="start">
              <CopilotView style={{ width: '100%' }}>
                <View>
                  <FlatList
                    showsVerticalScrollIndicator={false}
                    style={styles.list}
                    data={languages}
                    renderItem={renderItem}
                    initialNumToRender={10} // Adjust the number of items to render initially
                    maxToRenderPerBatch={10} // Number of items rendered per batch
                    numColumns={2}
                    windowSize={21} // Controls the number of items rendered around the current index
                  />
                </View>
              </CopilotView>
            </CopilotStep>
          </View>
          <View style={{ flex: 0 }}>
            {/* fixed bottom part */}
            <HorizontalLine />
            <CustomBottomCard
              onPress={handlethis}
              copilotStepText="click_here_to_continue"
              copilotStepOrder={2}
              copilotStepName="continueButton"
            />
          </View>
        </View>
      </Layout>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 3,
    padding: 10,
    // borderWidth: 1,
  },
  image: {
    height: 50,
    width: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: 25,
    fontFamily: 'Poppins-Regular',
    marginTop: 15,
    fontWeight: '600',
    color: 'black',
  },
  subtitle: {
    marginTop: 5,
    fontFamily: 'Poppins-Bold',
    color: 'black',
  },
  description: {
    marginTop: 5,
    fontFamily: 'Poppins-Regular',
    color: 'black',
  },
  list: {
    marginTop: 10,
  },
  gif_image: {
    width: 25,
    height: 25,
    marginLeft: 5,
  },
  // container: {
  //   flex: 1,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'red',
  },
});

LanguageScreen.propTypes = {};

export default LanguageScreen;
