import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  emphasis?: "primary" | "secondary" | "ghost" | "ink";
}

export function ActionButton({
  children,
  className,
  emphasis = "secondary",
  type = "button",
  ...props
}: ActionButtonProps) {
  const classes = ["action-button", `action-button--${emphasis}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
