import { InputHTMLAttributes, forwardRef, useId } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className = "", id, ...props },
  ref
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const inputCls = [
    "w-full bg-pp-bg-elevated border rounded-pp-md px-4 py-2.5 text-pp-fg placeholder:text-pp-fg-subtle",
    "focus:outline-none transition-colors duration-[180ms] ease-pp-out",
    error
      ? "border-pp-down focus:border-pp-down focus:shadow-[0_0_0_4px_rgba(255,107,107,0.18)]"
      : "border-pp-border focus:border-pp-brand focus:shadow-[0_0_0_4px_rgba(100,231,158,0.18)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="pp-eyebrow">
          {label}
        </label>
      )}
      <input ref={ref} id={inputId} className={inputCls} {...props} />
      {(hint || error) && (
        <p
          className={`text-[11px] leading-tight ${error ? "text-pp-down" : "text-pp-fg-subtle"}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
