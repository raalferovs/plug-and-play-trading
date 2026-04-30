import { HTMLAttributes, forwardRef } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { elevated = false, className = "", ...props },
  ref
) {
  const cls = [
    "rounded-pp-lg border border-pp-border p-6",
    elevated ? "bg-pp-bg-elevated" : "bg-pp-bg-elevated/60",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <div ref={ref} className={cls} {...props} />;
});
