import { useCallback, useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { getDataFromStorage, setDataInStorage } from '../JsHelper/Helper';
import { getCohort } from '../API/AuthService';

// Same rule SCPUserTabScreen uses to show the Home / My Class tabs, except that
// a Vocational Training learner's member status is 'in_training' while they are
// enrolled, so both statuses count as an active batch member.
const ACTIVE_MEMBER_STATUSES = ['active', 'in_training'];

const isActiveBatch = (cohortData) =>
  cohortData?.type === 'BATCH' &&
  ACTIVE_MEMBER_STATUSES.includes(cohortData?.cohortMemberStatus) &&
  cohortData?.cohortStatus === 'active';

// `cohortData` is shared by every program, so it may still hold another
// program's batch (e.g. SCP) after a program switch. Only trust the stored copy
// when this hook saved it for the current tenant.
const BATCH_TENANT_KEY = 'activeBatchTenantId';

const readStoredEligibility = async (tenantid) => {
  try {
    const storedTenantId = await getDataFromStorage(BATCH_TENANT_KEY);
    if (!tenantid || storedTenantId !== tenantid) {
      return false;
    }
    const cohortparse = await getDataFromStorage('cohortData');
    if (!cohortparse) {
      return false;
    }
    return isActiveBatch(JSON.parse(cohortparse));
  } catch (error) {
    console.error('useActiveBatchEligibility: stored cohortData invalid', error);
    return false;
  }
};

/**
 * Returns true when the logged-in learner has an active batch.
 * Based on SCPUserTabScreen.refreshCohortData: re-fetches the cohort and falls
 * back to the stored `cohortData` when the API call fails or required keys are
 * missing. Unlike SCP it only writes `cohortData` / `cohortId` when it finds a
 * matching batch, so it never wipes what login stored.
 *
 * Unlike SCP it does NOT poll. The cohort is fetched only when the hosting
 * screen mounts (page reload, program switch) and each time it regains focus
 * (coming back from another route).
 *
 * Pass `enabled = false` to make the hook inert (no API calls, no listeners).
 */
const useActiveBatchEligibility = (enabled = true) => {
  const isFocused = useIsFocused();
  const [eligible, setEligible] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setEligible(false);
      return;
    }

    let tenantid;
    try {
      const tenantData = JSON.parse(
        (await getDataFromStorage('tenantData')) || '[]'
      );
      tenantid = tenantData?.[0]?.tenantId;
      const user_id = await getDataFromStorage('userId');
      const academicYearId = await getDataFromStorage('academicYearId');

      if (!tenantid || !user_id || !academicYearId) {
        setEligible(await readStoredEligibility(tenantid));
        return;
      }

      const cohort = await getCohort({ user_id, tenantid, academicYearId });

      if (Array.isArray(cohort)) {
        const activeBatch = cohort.find(isActiveBatch);

        if (activeBatch) {
          // Assessment screens read the learner's board and cohort id from these keys.
          await setDataInStorage('cohortData', JSON.stringify(activeBatch));
          await setDataInStorage('cohortId', activeBatch.cohortId);
          await setDataInStorage(BATCH_TENANT_KEY, tenantid);
        }
        setEligible(!!activeBatch);
      } else if (cohort?.params?.status === 'failed') {
        // The server answered and reported no cohort for this tenant / year.
        setEligible(false);
      } else {
        // No answer from the server (e.g. offline): use what this hook saved
        // earlier for the same tenant.
        setEligible(await readStoredEligibility(tenantid));
      }
    } catch (error) {
      console.error('useActiveBatchEligibility: refresh failed', error);
      setEligible(await readStoredEligibility(tenantid));
    }
  }, [enabled]);

  // Mount (reload / program switch), enable change and every time the screen
  // regains focus (coming back from another route).
  useEffect(() => {
    if (isFocused) {
      refresh();
    }
  }, [isFocused, refresh]);

  return eligible;
};

export default useActiveBatchEligibility;
