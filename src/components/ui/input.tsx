"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full h-9 px-3 text-[0.8125rem] outline-none transition-smooth",
          "rounded-[var(--tf-radius-sm)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "placeholder:text-[var(--tf-text-tertiary)]",
          className
        )}
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
          color: "var(--tf-text)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--tf-accent)";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255, 90, 31, 0.12)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--tf-border)";
          e.currentTarget.style.boxShadow = "none";
        }}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
export { Input };
