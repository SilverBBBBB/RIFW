export type RoutineReviewStatus = "Pending" | "Reviewed";

export const hasMeaningfulRoutineChanges = (delta: Record<string, unknown>): boolean =>
  Object.keys(delta).length > 0;

export const canReviewRoutine = (
  lastChangedByUserId: number | null | undefined,
  reviewerUserId: number
): boolean => lastChangedByUserId != null && lastChangedByUserId !== reviewerUserId;

export const rowVersionMatches = (storedVersion: unknown, suppliedBase64: string): boolean => {
  if (!Buffer.isBuffer(storedVersion)) return false;
  return storedVersion.equals(Buffer.from(suppliedBase64, "base64"));
};
