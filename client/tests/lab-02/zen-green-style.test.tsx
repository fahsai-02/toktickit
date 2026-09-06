import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "../../src/index.css";
import "../../src/App.css";
import Button from "../../src/components/Button.js";
import TextField from "../../src/components/TextField.js";
import ReadOnlyField from "../../src/components/ReadOnlyField.js";
import Badge, {
  statusBadgeVariant,
  priorityBadgeVariant,
} from "../../src/components/Badge.js";

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

describe("STYLE-01: Primary button styling (ui-spec section 1 tokens)", () => {
  it("maps --color-primary to #006B3C and styles the primary button with it", () => {
    const css = injectedCss();
    expect(tokenValue(css, "--color-primary")).toBe("#006B3C");

    const body = ruleBody(css, ".btn-primary", "var(--color-primary)");
    expect(body).toMatch(/background\s*:\s*var\(--color-primary\)/);
    expect(body).toMatch(/color\s*:\s*#fff/);

    render(<Button variant="primary">Submit</Button>);
    expect(
      screen.getByRole("button", { name: "Submit" })
    ).toHaveClass("btn-primary");
  });
});

describe("STYLE-02: Editable vs read-only distinction (ui-spec sections 1 and 3)", () => {
  it("shades read-only fields with #F0F4F2 while editable fields stay white with a border", () => {
    const css = injectedCss();
    expect(tokenValue(css, "--color-field-readonly")).toBe("#F0F4F2");
    expect(tokenValue(css, "--color-surface")).toBe("#FFFFFF");

    const readonlyBody = ruleBody(
      css,
      ".field-readonly",
      "var(--color-field-readonly)"
    );
    expect(readonlyBody).toMatch(
      /background\s*:\s*var\(--color-field-readonly\)/
    );

    const editableBody = ruleBody(
      css,
      ".field-input",
      "background: var(--color-surface)"
    );
    expect(editableBody).toMatch(/background\s*:\s*var\(--color-surface\)/);
    expect(editableBody).toMatch(/border\s*:\s*1px solid var\(--color-border\)/);

    const ro = render(
      <ReadOnlyField id="requester" label="Requester" value="Jennifer Anderson" />
    );
    expect(ro.container.querySelector(".field-readonly")).toHaveClass(
      "field-readonly"
    );

    const editable = render(<TextField id="summary" label="Summary" />);
    expect(editable.container.querySelector("input")).toHaveClass(
      "field-input"
    );
  });
});

describe("STYLE-03: Badge palette mapping (ui-spec section 3)", () => {
  it("maps NEW to pale green and LOW/MEDIUM/HIGH/URGENT to gray/green/amber/red tints", () => {
    const css = injectedCss();
    expect(tokenValue(css, "--color-pale")).toBe("#EAF6EF");
    expect(tokenValue(css, "--color-warning")).toBe("#D97706");
    expect(tokenValue(css, "--color-error")).toBe("#B91C1C");

    const statusNew = ruleBody(css, ".badge-status-new", "color-pale");
    expect(statusNew).toMatch(/background\s*:\s*var\(--color-pale\)/);
    expect(statusNew).toMatch(/color\s*:\s*var\(--color-success\)/);

    const low = ruleBody(css, ".badge-priority-low", "#f3f4f6");
    expect(low).toMatch(/background\s*:\s*#f3f4f6/);

    const medium = ruleBody(css, ".badge-priority-medium", "color-pale");
    expect(medium).toMatch(/background\s*:\s*var\(--color-pale\)/);

    const high = ruleBody(css, ".badge-priority-high", "#fef3c7");
    expect(high).toMatch(/background\s*:\s*#fef3c7/);
    expect(high).toMatch(/color\s*:\s*var\(--color-warning\)/);

    const urgent = ruleBody(css, ".badge-priority-urgent", "185, 28, 28");
    expect(urgent).toMatch(
      /background\s*:\s*rgba\(185,\s*28,\s*28,\s*0\.1\)/
    );
    expect(urgent).toMatch(/color\s*:\s*var\(--color-error\)/);

    expect(statusBadgeVariant("NEW")).toBe("status-new");
    expect(priorityBadgeVariant("LOW")).toBe("priority-low");
    expect(priorityBadgeVariant("MEDIUM")).toBe("priority-medium");
    expect(priorityBadgeVariant("HIGH")).toBe("priority-high");
    expect(priorityBadgeVariant("URGENT")).toBe("priority-urgent");

    render(<Badge variant="priority-urgent">URGENT</Badge>);
    expect(screen.getByText("URGENT")).toHaveClass(
      "badge",
      "badge-priority-urgent"
    );
  });
});

describe("STYLE-04: Accessibility basics (AC-26)", () => {
  it("wires label htmlFor, aria-describedby error links, and a visible focus outline", () => {
    render(
      <TextField
        id="summary"
        label="Summary"
        required
        error="Summary is required"
      />
    );

    const label = screen.getByText("Summary");
    expect(label).toHaveAttribute("for", "summary");

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("id", "summary");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).toHaveAttribute("aria-describedby", "summary-error");

    const error = document.getElementById("summary-error");
    expect(error).toBeInTheDocument();
    expect(error).toHaveClass("field-error-msg");
    expect(error).toHaveTextContent("Summary is required");

    const css = injectedCss();
    const focusVisible = rulesFor(css, "focus-visible").find((r) =>
      r.body.includes("var(--color-secondary)")
    );
    expect(focusVisible).toBeTruthy();
    expect(focusVisible!.body).toMatch(
      /outline\s*:\s*2px solid var\(--color-secondary\)/
    );
    expect(focusVisible!.body).toMatch(/outline-offset\s*:\s*2px/);
  });
});