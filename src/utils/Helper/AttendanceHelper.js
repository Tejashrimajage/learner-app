// Pure attendance helpers - no API, no storage, no React.
//
// Background: attendance rows are stored against the batch (cohort) that was
// current on the day of the session. A learner who is reassigned from batch A
// to batch B keeps their batch A rows, so their overall record is the union of
// the rows of every batch they have been a member of. These helpers hold the
// date window that record is read over, the merge of several batches' rows, and
// the percentage shown on the dashboard.

// How far back the learner's attendance record is read. One year matches the
// academic year the program runs on, and stays inside the 300-row page the
// attendance API returns per batch.
export const ATTENDANCE_HISTORY_DAYS = 365;

// Date range covering the learner's attendance history, as the 'YYYY-MM-DD'
// strings the attendance API expects. Shared by the dashboard card and the full
// attendance calendar so both read the same record.
export const getAttendanceHistoryRange = () => {
  const todayDate = new Date();
  const lastDate = new Date();
  lastDate.setDate(todayDate.getDate() - ATTENDANCE_HISTORY_DAYS);

  return {
    todate: todayDate.toISOString().split('T')[0],
    fromDate: lastDate.toISOString().split('T')[0],
    fromDateObject: lastDate,
    toDateObject: todayDate,
  };
};

// Collapses the rows of several batches into one record per day, oldest first.
// A day can only carry one mark in the UI, and on a reassignment day the old
// and the new batch can both hold a row, so 'present' wins over anything else
// and a day is never counted twice in the percentage.
export const mergeAttendanceLists = (lists) => {
  const byDate = new Map();

  for (const list of lists || []) {
    for (const item of list || []) {
      const dateKey = String(item?.attendanceDate || '').split('T')[0];
      if (!dateKey) continue;

      const existing = byDate.get(dateKey);
      const beatsExisting =
        !existing ||
        (existing?.attendance !== 'present' && item?.attendance === 'present');

      if (beatsExisting) byDate.set(dateKey, item);
    }
  }

  return Array.from(byDate.values()).sort(
    (a, b) => new Date(a?.attendanceDate) - new Date(b?.attendanceDate)
  );
};

// Percentage of marked days the learner was present for, as a 2-decimal string.
// Every marked day on record counts, across every batch they have been part of,
// which is what makes the figure survive a batch reassignment. Days with no
// mark at all (no session, or a session nobody marked) are not counted either
// way, so an unmarked session never drags the percentage down.
export const calculateAttendancePercentage = (attendanceList) => {
  const present =
    attendanceList?.filter((item) => item?.attendance === 'present')?.length ||
    0;
  const absent =
    attendanceList?.filter((item) => item?.attendance === 'absent')?.length || 0;

  const totalDaysWithData = present + absent;
  const percentage =
    totalDaysWithData > 0 ? (present / totalDaysWithData) * 100 : 0;

  return percentage.toFixed(2);
};
