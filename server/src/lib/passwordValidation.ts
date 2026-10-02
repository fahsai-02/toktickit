// Password rule validator shared by the authentication API (Issue 16) and the
// Administrator user management endpoints (Issue 21). Messages match
// `docs/lab-03/api-spec.md` section 2.4 exactly so tests can assert them.

export type PasswordValidationResult =
  | { valid: true }
  | { valid: false; fieldMessage: string };

const MIN_LENGTH = 8;

const RULES: ReadonlyArray<{ test: (password: string) => boolean; message: string }> = [
  { test: (password) => password.length >= MIN_LENGTH, message: "Password must be at least 8 characters." },
  { test: (password) => /[A-Z]/.test(password), message: "Password must include at least one uppercase letter." },
  { test: (password) => /[a-z]/.test(password), message: "Password must include at least one lowercase letter." },
  { test: (password) => /\d/.test(password), message: "Password must include at least one digit." },
  // A "special character" is any non-alphanumeric character that is not whitespace.
  { test: (password) => /[^A-Za-z0-9\s]/.test(password), message: "Password must include at least one special character." },
];

export function validateNewPassword(password: string): PasswordValidationResult {
  for (const rule of RULES) {
    if (!rule.test(password)) {
      return { valid: false, fieldMessage: rule.message };
    }
  }
  return { valid: true };
}