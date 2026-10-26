import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper/SafeAreaWrapper';
import { useTranslation } from '../../context/LanguageContext';
import Header from '../../components/Layout/Header';
import TestBox from '../../components/TestBox.js/TestBox';
import {
  assessmentListApi,
  getAssessmentStatus,
} from '../../utils/API/AuthService';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  getDataFromStorage,
  setDataInStorage,
} from '../../utils/JsHelper/Helper';
import globalStyles from '../../utils/Helper/Style';
import { isBatchEnded } from '../../utils/Helper/batchEndDate';
import ActiveLoading from '../LoadingScreen/ActiveLoading';

import NetworkAlert from '../../components/NetworkError/NetworkAlert';
import SyncCard from '../../components/SyncComponent/SyncCard';
import SecondaryHeader from '../../components/Layout/SecondaryHeader';

import GlobalText from '@components/GlobalText/GlobalText';

const Assessment = ({ header, background }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [networkstatus, setNetworkstatus] = useState(true);
  const [batchEnded, setBatchEnded] = useState(false);

  /*useEffect(() => {
    fetchData();
  }, [navigation]);*/

  useFocusEffect(
    useCallback(() => {
      // console.log('########## in focus assessments');

      fetchData();
    }, []) // Make sure to include the dependencies
  );

  const fetchData = async () => {
    setNetworkstatus(true);
    setLoading(true);
    const user_id = await getDataFromStorage('userId');
    const cohortparse = await getDataFromStorage('cohortData');
    const cohort = JSON.parse(cohortparse);
    const cohort_id = await getDataFromStorage('cohortId');
    //console.log('########### cohort', cohort);

    // Once the batch is over the learner keeps the screen but gets no tests.
    if (isBatchEnded(cohort)) {
      setBatchEnded(true);
      setAssessments([]);
      setLoading(false);
      return;
    }
    setBatchEnded(false);

    let board = null;
    // let state = null;
    console.log('cohort==>', JSON.stringify(cohort));

    try {
      board = cohort?.customField?.find((field) => field.label === 'BOARD');
      // state = cohort?.customField?.find((field) => field.label === 'STATES');
    } catch (e) {
      console.log('e', e);
    }

    // Vocational Training batches have no BOARD; the assessments assigned to the
    // batch are listed in its ASSESSMENTS custom field and are the only ones shown.
    const userType = await getDataFromStorage('userType');
    const isVT = userType === 'youthnet';
    let assignedAssessmentIds = [];
    if (isVT) {
      const assessmentsField = cohort?.customField?.find(
        (field) => field.label === 'ASSESSMENTS'
      );
      assignedAssessmentIds = (assessmentsField?.selectedValues || [])
        .map((value) => (typeof value === 'string' ? value : value?.id))
        .filter(Boolean);
    }

    //fix for public user get maharashtra board assessments
    /*if (!board?.value) {
      board = { value: 'maharashtra' };
    }*/

    console.log('########### board', board);

    console.log('VT-ASSESS[tmp] list', {
      userType,
      isVT,
      assignedAssessmentIds,
      hasCohort: !!cohort,
      cohortName: cohort?.cohortName,
      fields: cohort?.customField?.map((field) => field.label),
    });

    if (isVT && assignedAssessmentIds.length === 0) {
      // No assessment attached to the learner's batch.
      setAssessments([]);
    } else if (board || isVT) {
      const boardName = board?.selectedValues?.[0];
      // const stateName = state.value;

      const assessmentList = await assessmentListApi({
        boardName,
        ...(isVT ? { identifiers: assignedAssessmentIds } : {}),
        // stateName,
        user_id,
      });
      console.log('VT-ASSESS[tmp] result count', assessmentList?.count, assessmentList?.QuestionSet?.length);
      if (assessmentList) {
        const OfflineAssessmentList = assessmentList;
        const uniqueAssessments = [
          ...new Set(
            OfflineAssessmentList?.QuestionSet?.map(
              (item) => item.assessmentType
            )
          ),
        ];

        // Sort uniqueAssessments according to specified order: Pre Test, Post Test, Other
        const assessmentOrder = [
          'Pre Test',
          'Post Test',
          'Other',
          'Mock Test',
          'Unit Test',
        ];
        const sortedUniqueAssessments = uniqueAssessments.sort((a, b) => {
          const indexA = assessmentOrder.indexOf(a);
          const indexB = assessmentOrder.indexOf(b);

          // If both are in the order array, sort by their position
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          // If only a is in the order array, a comes first
          if (indexA !== -1) {
            return -1;
          }
          // If only b is in the order array, b comes first
          if (indexB !== -1) {
            return 1;
          }
          // If neither is in the order array, maintain original order
          return 0;
        });

        //extract all question list with assessment type
        let questionSetData = {};
        let assessmentStatusData = {};
        if (sortedUniqueAssessments) {
          for (let i = 0; i < sortedUniqueAssessments.length; i++) {
            let key = sortedUniqueAssessments[i];
            let questionSetDataId = [];
            let uniqueAssessmentsId = [];
            if (OfflineAssessmentList?.QuestionSet) {
              for (
                let j = 0;
                j < OfflineAssessmentList?.QuestionSet.length;
                j++
              ) {
                let question_set = OfflineAssessmentList.QuestionSet[j];
                if (question_set?.assessmentType == key) {
                  // Extract DO_id from assessmentList (content)
                  questionSetDataId.push(question_set);
                  uniqueAssessmentsId.push(question_set?.IL_UNIQUE_ID);
                }
              }
            }
            const assessmentStatusDataResponse =
              (await getAssessmentStatus({
                user_id,
                cohort_id,
                uniqueAssessmentsId,
              })) || [];
            assessmentStatusData[key] = assessmentStatusDataResponse;
            questionSetData[key] = questionSetDataId;
          }
        }

        if (assessmentStatusData) {
          await setDataInStorage(
            'assessmentStatusData',
            JSON.stringify(assessmentStatusData) || ''
          );
        }

        //set question set
        await setDataInStorage(
          'QuestionSet',
          JSON.stringify(questionSetData) || ''
        );
        // console.log('#########atm uniqueAssessments', JSON.stringify(uniqueAssessments));
        //change uniqueAssessments sequence to match the assessmentStatusData sequence

        setAssessments(sortedUniqueAssessments);
      } else {
        setNetworkstatus(false);
      }
    }
    setLoading(false);
  };

  return (
    <SafeAreaWrapper style={{ flex: 1, backgroundColor: 'white' }}>
      {!header && <SecondaryHeader logo />}
      {loading ? (
        <ActiveLoading />
      ) : (
        <View>
          <SyncCard doneSync={fetchData} />
          {!header && (
            <GlobalText style={[globalStyles.heading, { padding: 20 }]}>
              {t('Assessments')}
            </GlobalText>
          )}

          <View
            style={[styles.card, { backgroundColor: !background && '#FBF4E4' }]}
          >
            {assessments.length > 0 ? (
              assessments?.map((item) => {
                return <TestBox key={item} testText={item} />;
              })
            ) : (
              <GlobalText style={globalStyles.subHeading}>
                {batchEnded
                  ? t('no_assessments_batch_completed')
                  : t('no_data_found')}
              </GlobalText>
            )}
          </View>
          {/* Use the BackButtonHandler component */}
          {/* <BackButtonHandler exitRoutes={['Assessment']} /> */}
        </View>
      )}
      <NetworkAlert
        onTryAgain={fetchData}
        isConnected={networkstatus}
        closeModal={() => {
          setNetworkstatus(!networkstatus);
        }}
      />
    </SafeAreaWrapper>
  );
};

Assessment.propTypes = {};

const styles = StyleSheet.create({
  card: {
    justifyContent: 'space-between',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
});

export default Assessment;
