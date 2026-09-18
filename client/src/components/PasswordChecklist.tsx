export interface PasswordRuleState {
  minLength: boolean;
  upperAndLower: boolean;
  numberAndSpecial: boolean;
}

/** Mirrors the backend rules in `POST /api/auth/change-password` exactly.
 * NOTE: "special" excludes whitespace, matching
 * `server/src/lib/passwordValidation.ts` (`/[^A-Za-z0-9\s]/`) — a password
 * whose only "special" char is a space must NOT check this rule off. */
export function checkPasswordRules(password: string): PasswordRuleState {
  return {
    minLength: password.length >= 8,
    upperAndLower: /[A-Z]/.test(password) && /[a-z]/.test(password),
    numberAndSpecial: /[0-9]/.test(password) && /[^A-Za-z0-9\s]/.test(password),
  };
}

export function allPasswordRulesMet(state: PasswordRuleState): boolean {
  return state.minLength && state.upperAndLower && state.numberAndSpecial;
}

const RULES: { key: keyof PasswordRuleState; label: string }[] = [
  { key: "minLength", label: "Be at least 8 characters" },
  { key: "upperAndLower", label: "Include upper and lower case letters" },
  { key: "numberAndSpecial", label: "Include a number and a special character" },
];

export default function PasswordChecklist({
  password,
}: {
  password: string;
}) {
  const state = checkPasswordRules(password);
  return (
    <ul className="password-checklist" aria-label="Password requirements">
      {RULES.map((rule) => {
        const met = state[rule.key];
        return (
          <li
            key={rule.key}
            className={met ? "password-rule password-rule--met" : "password-rule"}
            data-testid={`password-rule-${rule.key}`}
            data-met={met ? "true" : "false"}
          >
            <span aria-hidden="true">{met ? "✓" : "○"}</span> {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
