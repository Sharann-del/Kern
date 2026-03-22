/** Inline copy when the email field fails validation (replaces browser popups). */
export const INVALID_EMAIL_MESSAGE = 'Enter a valid email.';

/**
 * Practical email check for UX (not a full RFC parser). Rejects empty, spaces, and common typos
 * like commas in the local part.
 */
export function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  const at = v.indexOf('@');
  if (at <= 0 || at === v.length - 1) return false;
  const local = v.slice(0, at);
  const domain = v.slice(at + 1);
  if (
    local.includes(' ') ||
    local.includes(',') ||
    domain.includes(' ') ||
    domain.includes(',') ||
    !domain.includes('.')
  ) {
    return false;
  }
  return /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(v);
}
