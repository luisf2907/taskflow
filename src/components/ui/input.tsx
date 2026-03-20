"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg px-3 py-2 text-sm outline-none transition-smooth disabled:opacity-50",
          className
        )}
        style={{
          background: "var(--tf-surface)",
          border: "2px solid var(--tf-border)",
          color: "var(--tf-text)",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
export { Input };
