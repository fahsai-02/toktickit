import { type ReactNode } from "react";

type Variant = "error" | "success" | "info";

const variantClass: Record<Variant, string> = {
  error: "callout-error",
  success: "callout-success",
  info: "callout-info",
};

const variantRole: Record<Variant, "alert" | "status"> = {
  error: "alert",
  success: "status",
  info: "status",
};

interface CalloutProps {
  variant?: Variant;
  children: ReactNode;
}

export default function Callout({
  variant = "info",
  children,
}: CalloutProps) {
  return (
    <div role={variantRole[variant]} className={`callout ${variantClass[variant]}`.trim()}>
      {children}
    </div>
  );
}
