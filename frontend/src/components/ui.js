import React from "react";
import { cn } from "../lib/utils";

export function Button({ variant = "primary", size = "md", className, ...props }) {
  const base = "inline-flex items-center justify-center gap-2 font-heading font-semibold tracking-tight transition-all active:scale-[.97] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary";
  const sizes = { sm: "text-xs px-3 h-8 rounded", md: "text-sm px-4 h-10 rounded", lg: "text-base px-5 h-12 rounded-md" };
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hi",
    ghost: "bg-transparent text-white/80 hover:text-white hover:bg-white/5 border border-transparent",
    outline: "bg-transparent text-white border border-border hover:border-white/30 hover:bg-white/5",
    danger: "bg-danger text-white hover:opacity-90",
    success: "bg-success text-black hover:opacity-90",
  };
  return <button className={cn(base, sizes[size], variants[variant], className)} {...props} />;
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "w-full h-10 px-3 rounded bg-bg border border-border text-white placeholder:text-muted",
        "font-body text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "w-full h-10 px-3 rounded bg-bg border border-border text-white",
        "font-body text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }) {
  return <label className={cn("block text-xs uppercase tracking-[0.15em] text-muted font-heading font-semibold mb-1.5", className)} {...props} />;
}

export function Card({ className, ...props }) {
  return <div className={cn("bg-surface border border-border rounded", className)} {...props} />;
}

export function Badge({ variant = "default", className, children }) {
  const variants = {
    default: "bg-white/5 text-soft border-white/10",
    success: "bg-success/10 text-success border-success/30",
    danger: "bg-danger/10 text-danger border-danger/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    primary: "bg-primary/10 text-primary border-primary/30",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-[11px] uppercase tracking-wider border rounded font-heading font-semibold", variants[variant], className)}>
      {children}
    </span>
  );
}
