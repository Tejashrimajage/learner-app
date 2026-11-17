import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import SafeAreaWrapper from '../../../components/SafeAreaWrapper/SafeAreaWrapper';
import globalStyles from '../../../utils/Helper/Style';
import SecondaryHeader from '../../../components/Layout/SecondaryHeader';
import { default as Octicons } from 'react-native-vector-icons/Octicons';
import { useTranslation } from '../../../context/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import MonthlyCalendar from './MonthlyCalendar';
import { eventList, getAttendance } from '../../../utils/API/AuthService';
import { getAttendanceHistoryRange } from '../../../utils/Helper/AttendanceHelper';
import { convertDates } from '../../../utils/Helper/JSHelper';
import {
  getCohortMembershipStartDate,
  getDataFromStorage,
} from '../../../utils/JsHelper/Helper';

import GlobalText from '@components/GlobalText/GlobalText';
import ActiveLoading from '../../LoadingScreen/ActiveLoading';
import NetworkAlert from '../../../components/NetworkError/NetworkAlert';

// Last ~3 months. This is only how far back the calendar looks for scheduled
// sessions, so a day with a class but no attendance mark can be shown as "not
// marked yet". Attendance itself is read over a longer window.
const SESSION_MARKER_DAYS = 91;

const FullAttendance = () => {
  const [eventDate, setEventDate] = useState(null);
  const [learnerAttendance, setLearnerAttendance] = useState(null);
  const [sessionDates, setSessionDates] = useState([]);
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [networkstatus, setNetworkstatus] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Sample data for the last 30 days

  const fetchData = async () => {
    setLoading(true);

    // Attendance is read over the learner's full record (every batch they have
    // been in), while the "session scheduled but not marked" markers stay on
    // the shorter window they have always used.
    const { todate, fromDate } = getAttendanceHistoryRange();

    const todayDate = new Date();
    const lastDate = new Date();
    lastDate.setDate(todayDate.getDate() - SESSION_MARKER_DAYS);

    const response = (await getAttendance({ todate, fromDate })) || [];
    console.log('response', response);

    if (response.length < 1) {
      setNetworkstatus(false);
    }

    // Ensure new state reference
    setLearnerAttendance(
      response?.attendanceList ? [...response.attendanceList] : []
    );
    await fetchSessionDates(lastDate, todayDate);
    setLoading(false);
  };

  // Days on which a session is scheduled - used to show an unmarked
  // attendance marker for those days in the calendar
  const fetchSessionDates = async (fromDate, todayDate) => {
    // 18:30:00 UTC is the start of the day in IST, same convention as the
    // timetable screen
    const startDate = new Date(fromDate);
    startDate.setUTCDate(startDate.getUTCDate() - 1);
    startDate.setUTCHours(18, 30, 0, 0);

    // Cover the remaining days of the current month as well, so upcoming
    // sessions of this month are shown as not marked yet
    const endDate = new Date(
      Date.UTC(
        todayDate.getFullYear(),
        todayDate.getMonth() + 1,
        0,
        18,
        29,
        59,
        999
      )
    );

    const data = await eventList({ startDate, endDate });
    const eventDates = data?.events?.map((item) => item?.startDateTime) || [];

    let dates = Array.from(new Set(convertDates(eventDates)));

    // eventList is scoped to the learner's current batch. When they were moved
    // into it mid-way, that batch's earlier sessions are not theirs to answer
    // for, so days before they joined are dropped. When the join date isn't in
    // the membership data, nothing is dropped.
    let cohort = null;
    try {
      cohort = JSON.parse((await getDataFromStorage('cohortData')) || 'null');
    } catch (e) {
      cohort = null;
    }
    const joinDate = getCohortMembershipStartDate(cohort);

    if (joinDate) {
      const joinDateKey = convertDates([joinDate])?.[0];
      dates = dates.filter((date) => date >= joinDateKey);
    }

    setSessionDates(dates);
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setLoading(true); // Start Refresh Indicator

    try {
      console.log('Fetching Data...');
      await fetchData();
      setRefreshKey((prevKey) => prevKey + 1);
      // navigation.navigate('SCPUserTabScreen');
    } catch (error) {
      console.log('Error fetching data:', error);
    } finally {
      setLoading(false); // Stop Refresh Indicator
    }
  };

  return (
    <SafeAreaWrapper
      key={refreshKey}
      style={{ flex: 1, backgroundColor: 'white' }}
    >
      <SecondaryHeader logo />

      <View style={styles.card}>
        <View style={styles.leftContainer}>
          <TouchableOpacity
            onPress={() => {
              navigation.goBack();
            }}
          >
            <Octicons
              name="arrow-left"
              style={{ marginHorizontal: 10 }}
              color={'#000'}
              size={30}
            />
            {/* <GlobalText >Back</GlobalText> */}
          </TouchableOpacity>
        </View>
        <View style={styles.rightContainer}>
          <GlobalText style={globalStyles.heading}>
            {t('my_full_attendance')}
          </GlobalText>
        </View>
      </View>
      {loading ? (
        <ActiveLoading />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
          }
          style={styles.scroll}
        >
          {learnerAttendance && (
            <MonthlyCalendar
              learnerAttendance={learnerAttendance}
              sessionDates={sessionDates}
              attendance
              setEventDate={setEventDate}
              key={refreshKey}
            />
          )}
        </ScrollView>
      )}
      <NetworkAlert
        onTryAgain={() => {
          navigation.goBack();
        }}
        isConnected={networkstatus}
        closeModal={() => {
          setNetworkstatus(!networkstatus);
        }}
      />
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  scroll: {
    // borderWidth: 1,
    height: '70%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  leftContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContainer: {
    flex: 4,
  },
});

export default FullAttendance;
