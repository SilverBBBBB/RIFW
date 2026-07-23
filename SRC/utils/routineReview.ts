import { Routine } from '../types';

const routineTimestamp = (routine: Routine): number => {
  const timestamp = new Date(routine.last_edited_date).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const sortRoutinesByRecency = (routines: Routine[]): Routine[] =>
  [...routines].sort((a, b) => {
    const dateDifference = routineTimestamp(b) - routineTimestamp(a);
    if (dateDifference !== 0) return dateDifference;
    const nameDifference = a.routine_name.localeCompare(b.routine_name);
    return nameDifference !== 0 ? nameDifference : a.id.localeCompare(b.id);
  });

export const routineReviewLabel = (routine: Routine): 'Review Pending' | 'Reviewed' =>
  routine.review_status === 'Pending' ? 'Review Pending' : 'Reviewed';
