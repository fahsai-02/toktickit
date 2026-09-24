import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "../../src/index.css";
import "../../src/App.css";
import Button from "../../src/components/Button.js";
import Badge, {
  coloredStatusBadgeVariant,
  priorityBadgeVariant,
  roleBadgeVariant,
} from "../../src/components/Badge.js";

// Traceability: tests.md STYLE-01..04 (docs/lab-03/tests.md lines 146-149)
// anchored on ui-spec.md section 1 (tokens) and section 3 "Badges" table
// (statuses/priorities/roles) plus the visual checklist rows 5-7.

interface CssRule {
  selector: string;
  body: string;
}

function injectedCss(): string {
  return Array.from(document.querySelectorAll("style"))
    .map((s) => s.textContent ?? "")
    .join("\n");
}

function collectRules(css: string): CssRule[] {
  const rules: CssRule[] = [];
  const leaf = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = leaf.exec(css))) {
    const selector = m[1].trim();
    const body = m[2].trim();
    if (selector && body) rules.push({ selector, body });
  }
  return rules;
}

function rulesFor(css: string, selectorIncludes: string): CssRule[] {
  return collectRules(css).filter((r) =>
    r.selector.includes(selectorIncludes)
  );
}

function tokenValue(css: string, token: string): string | null {
  for (const rule of rulesFor(css, ":root")) {
    if (!rule.body.includes(token)) continue;
    const m = new RegExp(`${token}\\s*:\\s*([^;]+)`).exec(rule.body);
    if (m) return m[1].trim();
  }
  return null;
}

function ruleBody(css: string, selector: string, bodyIncludes: string): string {
  const rule = rulesFor(css, selector).find((r) =>
    r.body.includes(bodyIncludes)
  );
  return rule?.body ?? "";
}

const EIGHT_STATUSES: ReadonlyArray<readonly [status: string, className: string]> = [
  ["NEW", "badge-status-new"],
  ["OPEN", "badge-status-open"],
  ["IN_PROGRESS", "badge-status-in-progress"],
  ["WAITING_FOR_REQUESTER", "badge-status-waiting"],
  ["RESOLVED", "badge-status-resolved"],
  ["CLOSED", "badge-status-closed"],
  ["REOPENED", "badge-status-reopened"],
  ["CANCELLED", "badge-status-cancelled"],
];

describe("STYLE-01: Login button styling (ui-spec section 1 + section 3 Buttons)", () => {
  it("renders the Sign in submit as a green primary button", () => {
    const css = injectedCss();
    // Token from ui-spec section 1 (--color-primary #006B3C).
    expect(tokenValue(css, "--color-primary")).toBe("#006B3C");

    const primary = ruleBody(css, ".btn-primary", "var(--color-primary)");
    expect(primary).toMatch(/background\s*:\s*var\(--color-primary\)/);
    expect(primary).toMatch(/color\s*:\s*#fff/);

    // Login.tsx omits the variant prop, so Button defaults to primary.
    render(<Button>Sign in</Button>);
    expect(screen.getByRole("button", { name: "Sign in" })).toHaveClass(
      "btn-primary"
    );
  });
});

describe("STYLE-02: Status badge palette (ui-spec section 3 'Badges')", () => {
  it("maps all 8 TicketStatus values to distinct tinted badge classes", () => {
    const css = injectedCss();

    for (const [status, className] of EIGHT_STATUSES) {
      expect(coloredStatusBadgeVariant(status).replace("status-", "")).toBe(
        className.replace("badge-status-", "")
      );

      const badge = ruleBody(css, `.${className}`, "background");
      expect(badge, `.${className} must define a background`).toMatch(
        /background\s*:/i
      );
      expect(badge, `.${className} must define a text color`).toMatch(
        /color\s*:/i
      );

      render(<Badge variant={coloredStatusBadgeVariant(status)}>{status}</Badge>);
      expect(screen.getByText(status)).toHaveClass("badge", className);
    }
  });

  it("uses the documented tint families (green/orange/yellow/blue/gray/purple/red)", () => {
    const css = injectedCss();
    // NEW -> pale green on success green (ui-spec "Status: NEW pale green bg, dark green text").
    expect(ruleBody(css, ".badge-status-new", "background")).toMatch(
      /background\s*:\s*var\(--color-pale\)/
    );
    expect(ruleBody(css, ".badge-status-new", "color")).toMatch(
      /color\s*:\s*var\(--color-success\)/
    );
    // OPEN -> orange, IN_PROGRESS -> yellow, WAITING -> blue, RESOLVED -> green.
    expect(ruleBody(css, ".badge-status-open", "background")).toMatch(
      /background\s*:\s*#ffedd5/
    );
    expect(ruleBody(css, ".badge-status-in-progress", "background")).toMatch(
      /background\s*:\s*#fef3c7/
    );
    expect(ruleBody(css, ".badge-status-waiting", "background")).toMatch(
      /background\s*:\s*#dbeafe/
    );
    expect(ruleBody(css, ".badge-status-resolved", "background")).toMatch(
      /background\s*:\s*#d1fae5/
    );
    // CLOSED -> gray, REOPENED -> purple, CANCELLED -> red (error token).
    expect(ruleBody(css, ".badge-status-closed", "background")).toMatch(
      /background\s*:\s*#f3f4f6/
    );
    expect(ruleBody(css, ".badge-status-reopened", "background")).toMatch(
      /background\s*:\s*#ede9fe/
    );
    const cancelled = ruleBody(css, ".badge-status-cancelled", "color");
    expect(cancelled).toMatch(/color\s*:\s*var\(--color-error\)/);
  });
});

describe("STYLE-03: Priority badge palette (ui-spec section 3 'Badges')", () => {
  it("maps LOW/MEDIUM/HIGH/URGENT to the documented classes and tints", () => {
    const css = injectedCss();
    expect(priorityBadgeVariant("LOW")).toBe("priority-low");
    expect(priorityBadgeVariant("MEDIUM")).toBe("priority-medium");
    expect(priorityBadgeVariant("HIGH")).toBe("priority-high");
    expect(priorityBadgeVariant("URGENT")).toBe("priority-urgent");

    // LOW -> neutral gray, MEDIUM -> pale green, HIGH -> amber, URGENT -> red.
    expect(ruleBody(css, ".badge-priority-low", "background")).toMatch(
      /background\s*:\s*#f3f4f6/
    );
    expect(ruleBody(css, ".badge-priority-medium", "background")).toMatch(
      /background\s*:\s*var\(--color-pale\)/
    );
    expect(ruleBody(css, ".badge-priority-medium", "color")).toMatch(
      /color\s*:\s*var\(--color-primary\)/
    );
    const high = ruleBody(css, ".badge-priority-high", "color");
    expect(high).toMatch(/color\s*:\s*var\(--color-warning\)/);
    const urgent = ruleBody(css, ".badge-priority-urgent", "color");
    expect(urgent).toMatch(/color\s*:\s*var\(--color-error\)/);

    render(<Badge variant="priority-medium">MEDIUM</Badge>);
    expect(screen.getByText("MEDIUM")).toHaveClass(
      "badge",
      "badge-priority-medium"
    );
  });

  it("falls back to neutral for unknown priorities", () => {
    expect(priorityBadgeVariant(undefined)).toBe("neutral");
    expect(priorityBadgeVariant("BOGUS")).toBe("neutral");
  });
});

describe("STYLE-04: Role badge palette (ui-spec section 3 'Badges')", () => {
  it("maps the three roles to blue/green/purple tints", () => {
    const css = injectedCss();
    expect(roleBadgeVariant("REQUESTER")).toBe("role-requester");
    expect(roleBadgeVariant("IT_STAFF")).toBe("role-it-staff");
    expect(roleBadgeVariant("ADMINISTRATOR")).toBe("role-administrator");

    expect(ruleBody(css, ".badge-role-requester", "background")).toMatch(
      /background\s*:\s*#dbeafe/
    );
    expect(ruleBody(css, ".badge-role-it-staff", "background")).toMatch(
      /background\s*:\s*var\(--color-pale\)/
    );
    expect(ruleBody(css, ".badge-role-administrator", "background")).toMatch(
      /background\s*:\s*#ede9fe/
    );

    render(<Badge variant="role-administrator">ADMINISTRATOR</Badge>);
    expect(screen.getByText("ADMINISTRATOR")).toHaveClass(
      "badge",
      "badge-role-administrator"
    );
  });

  it("falls back to neutral for unknown roles", () => {
    expect(roleBadgeVariant(undefined)).toBe("neutral");
    expect(roleBadgeVariant("BOGUS")).toBe("neutral");
  });
});