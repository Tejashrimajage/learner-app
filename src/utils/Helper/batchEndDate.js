// Batch end date, read off the cohort object the `mycohorts` API returns and
// stores as `cohortData`.
//
// The date arrives either as a column on the cohort itself (`endDate`) or as a
// batch custom field ("End Date" / "END_DATE" / "BATCH_END_DATE"), depending on
// how the program configures its batch form, so both are looked at.

// Leading calendar day of an ISO date: '2025-07-31' or '2025-07-31T00:00:00Z'.
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})/;

const END_DATE_LABEL = /END[\s_-]?DATE/i;

// The learner keeps access for the whole of the end date, so a batch is over
// only once the day after its end date has started.
const toEndOfDay = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  const match = ISO_DAY.exec(value.trim());
  if (match) {
    const [, year, month, day] = match;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      23,
      59,
      59,
      999
    );
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// Custom field values come back as `selectedValues` (plain strings or
// `{ id, value }`) and sometimes as a bare `value`.
const readCustomFieldValue = (field) => {
  const selected = field?.selectedValues?.[0];
  if (typeof selected === 'string') {
    return selected;
  }
  if (typeof selected?.value === 'string') {
    return selected.value;
  }
  return typeof field?.value === 'string' ? field.value : null;
};

export const getBatchEndDate = (cohortData) => {
  const direct = toEndOfDay(cohortData?.endDate || cohortData?.end_date);
  if (direct) {
    return direct;
  }

  const field = cohortData?.customField?.find(
    (item) =>
      END_DATE_LABEL.test(item?.label || '') ||
      END_DATE_LABEL.test(item?.name || '')
  );

  return toEndOfDay(readCustomFieldValue(field));
};

/**
 * True when the batch's end date is in the past. A batch with no end date (or
 * an unparseable one) is never treated as finished, so a missing value can
 * never lock a learner out.
 */
export const isBatchEnded = (cohortData) => {
  const endDate = getBatchEndDate(cohortData);
  return !!endDate && endDate.getTime() < Date.now();
};
