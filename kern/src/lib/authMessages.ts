/** Shown when sign-up is attempted for an email that already has an account. */
export const EMAIL_ALREADY_REGISTERED_MESSAGE =
  'An account with this email already exists. Sign in with your password instead.';

/** Supabase throttles confirmation / auth emails per address and per project. */
export const EMAIL_RATE_LIMIT_MESSAGE =
  'Too many emails were sent to this address. Please wait a few minutes before trying again.';

export function isEmailAlreadyRegisteredMessage(message: string): boolean {
  return message.includes('already exists');
}

/** Maps Supabase Auth errors to readable inline copy (keeps technical messages off the UI). */
export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Something went wrong. Try again.';
  }
  const code =
    'code' in error && typeof (error as { code: string }).code === 'string'
      ? (error as { code: string }).code
      : '';
  const msg = error.message.toLowerCase();
  if (
    code === 'over_email_send_rate_limit' ||
    (msg.includes('rate limit') && msg.includes('email'))
  ) {
    return EMAIL_RATE_LIMIT_MESSAGE;
  }
  return error.message;
}
