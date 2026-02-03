import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
}

export default function Button({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const baseClass =
    variant === "primary" ? "ss-button-primary" : "ss-button-secondary";

  return (
    <button className={`${baseClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
