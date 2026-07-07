import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  emphasis?: "primary" | "ink";
}

export function ActionButton({
  children,
  className,
  emphasis,
  type = "button",
  ...props
}: ActionButtonProps) {
  const classes = ["action-button", emphasis && `action-button--${emphasis}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
