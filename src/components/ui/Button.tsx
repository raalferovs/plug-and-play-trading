import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-pp-pill transition-all duration-[180ms] ease-pp-out tracking-tight disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pp-brand/20";

const sizeStyles: Record<Size, string> = {
  sm: "px-[14px] py-[8px] text-xs",
  md: "px-[22px] py-[12px] text-sm",
};

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-pp-brand text-pp-brand-deep hover:bg-pp-accent-hover active:bg-pp-accent-press",
  secondary:
    "bg-transparent text-pp-fg border border-pp-border-strong hover:bg-white/[0.06]",
  ghost: "bg-transparent text-pp-fg hover:opacity-70 px-4",
  destructive: "bg-pp-down text-pp-fg hover:opacity-90",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      className = "",
      ...props
    },
    ref
  ) {
    const cls = [
      base,
      sizeStyles[size],
      variantStyles[variant],
      fullWidth ? "w-full" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");
    return <button ref={ref} className={cls} {...props} />;
  }
);
