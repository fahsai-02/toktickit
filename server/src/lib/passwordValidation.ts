// Password rule validator shared by the authentication API (Issue 16) and the
// Administrator user management endpoints (Issue 21). Messages match
// `docs/lab-03/api-spec.md` section 2.4 exactly so tests can assert them.

export type PasswordValidationResult =
  | { valid: true }
  | { valid: false; fieldMessage: string };

const MIN_LENGTH = 8;

const RULE_MESSAGES = [
  "Password must be at least 8 characters.",
  "Password must include at least one uppercase letter.",
  "Password must include at least one lowercase letter.",
  "Password must include at least one digit.",
  "Password must include at least one special character.",
];

export function validateNewPassword(password: string): PasswordValidationResult {
  const rules: Array<boolean> = [
    password.length >= MIN_LENGTH,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];

  for (let i = 0; i < RULE_MESSAGES.length; i += 1) {
    if (!rules[i]) {
      return { valid: false, fieldMessage: RULE_MESSAGES[i]! };
    }
  }
  return { valid: true };
}