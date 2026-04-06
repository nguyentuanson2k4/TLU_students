/**
 * Attendance Warning Constants
 * 
 * Defines thresholds for student attendance warning levels
 * Used throughout the application to determine severity of absence
 */

export const ATTENDANCE_WARNING_THRESHOLDS = {
  /**
   * Low severity threshold: 10%
   * Warning triggered when student absence rate >= 10%
   */
  LOW: 10,

  /**
   * Medium severity threshold: 15%
   * Warning triggered when student absence rate >= 15%
   */
  MEDIUM: 15,

  /**
   * High severity threshold: 20%
   * Warning triggered when student absence rate >= 20%
   */
  HIGH: 20,
};

/**
 * Helper function to determine warning severity based on absence percentage
 * @param absencePercentage - Student's absence percentage
 * @returns Severity level: 'High', 'Medium', 'Low', or null
 */
export function getWarningSeverity(
  absencePercentage: number,
): 'High' | 'Medium' | 'Low' | null {
  if (absencePercentage >= ATTENDANCE_WARNING_THRESHOLDS.HIGH) {
    return 'High';
  }
  if (absencePercentage >= ATTENDANCE_WARNING_THRESHOLDS.MEDIUM) {
    return 'Medium';
  }
  if (absencePercentage >= ATTENDANCE_WARNING_THRESHOLDS.LOW) {
    return 'Low';
  }
  return null;
}

/**
 * Helper function to check if warning should be triggered
 * @param absencePercentage - Student's absence percentage
 * @returns true if warning should be triggered, false otherwise
 */
export function shouldTriggerWarning(absencePercentage: number): boolean {
  return absencePercentage >= ATTENDANCE_WARNING_THRESHOLDS.LOW;
}
