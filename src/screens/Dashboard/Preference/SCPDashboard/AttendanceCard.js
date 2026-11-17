import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import globalStyles from '../../../../utils/Helper/Style';
import { useTranslation } from '../../../../context/LanguageContext';
import { default as Octicons } from 'react-native-vector-icons/Octicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import BG from '../../../../assets/images/png/BG.png';
import FastImage from '@changwoolab/react-native-fast-image';
import { getAttendance } from '../../../../utils/API/AuthService';
import {
  calculateAttendancePercentage,
  getAttendanceHistoryRange,
} from '../../../../utils/Helper/AttendanceHelper';
import { setDataInStorage } from '../../../../utils/JsHelper/Helper';

import GlobalText from '@components/GlobalText/GlobalText';

const AttendanceCard = ({ attendance }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [presentPercentage, setPresentPercentage] = useState('');

  const fetchData = async () => {
    const { todate, fromDate } = getAttendanceHistoryRange();

    // The percentage covers the learner's whole record, across every batch they
    // have been part of, so a reassignment doesn't send it back to 0%.
    const response = await getAttendance({ todate, fromDate });
    setPresentPercentage(
      calculateAttendancePercentage(response?.attendanceList)
    );
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  return (
    <ImageBackground
      source={BG}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View
        style={[
          styles.viewBox,
          globalStyles.flexrow,
          { justifyContent: 'space-between' },
        ]}
      >
        <View>
          <FastImage
            style={styles.img}
            source={
              presentPercentage <= 35
                ? require('../../../../assets/images/gif/turtle.gif')
                : presentPercentage <= 65
                  ? require('../../../../assets/images/gif/rabbit.gif')
                  : presentPercentage <= 99
                    ? require('../../../../assets/images/gif/horse.gif')
                    : require('../../../../assets/images/gif/happy.gif')
            }
            resizeMode={FastImage.resizeMode.contain}
            priority={FastImage.priority.high} // Set the priority here
          />
        </View>
        <View style={{ width: '80%', marginLeft: 25 }}>
          <GlobalText style={[globalStyles.heading2, { fontWeight: 800 }]}>
            {presentPercentage}%
          </GlobalText>
          <GlobalText style={[globalStyles.text, { color: '#635E57' }]}>
            {t('overall_attendance')}
          </GlobalText>
          <GlobalText
            style={[globalStyles.text, { color: '#1A8825', width: '95%' }]}
          >
            {presentPercentage <= 35
              ? t('attendance_1')
              : presentPercentage <= 65
                ? t('attendance_2')
                : presentPercentage <= 99
                  ? t('attendance_3')
                  : t('attendance_4')}
          </GlobalText>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate('FullAttendance');
            }}
            style={[globalStyles.flexrow, { marginTop: 10 }]}
          >
            <GlobalText style={[globalStyles.subHeading, { color: '#0D599E' }]}>
              {t('see_my_full_attendance')}
            </GlobalText>
            <Octicons
              name="arrow-right"
              style={{ marginHorizontal: 10 }}
              color={'#0D599E'}
              size={20}
            />
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    borderRadius: 20,
    overflow: 'hidden',
    // borderWidth: 1,
  },
  viewBox: {
    padding: 20,
    justifyContent: 'space-between',
    // backgroundColor: 'rgba(255, 255, 255, 0.5)', // Optional: Add a semi-transparent background to make text readable
    borderRadius: 20,
    // borderWidth: 1,
    // borderColor: 'red',
  },
  img: {
    width: 70,
    height: 70,
  },
});

AttendanceCard.propTypes = {};

export default AttendanceCard;
