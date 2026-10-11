"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppSelectOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

type AppSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  "aria-label"?: string;
  id?: string;
  size?: "sm" | "default";
};

type MenuPos = { top: number; left: number; width: number; maxHeight: number; openUp: boolean };

/**
 * Custom select — portals the menu (escapes dialog overflow), RTL-friendly, clickable options.
 * Pair with Dialog `modal="trap-focus"` so portaled menus remain interactive.
 */
export function AppSelect({
  value,
  onValueChange,
  options,
  placeholder = "…",
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  "aria-label": ariaLabel,
  id,
  size = "default",
}: AppSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<MenuPos | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();

  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? placeholder;

  React.useEffect(() => setMounted(true), []);

  const updatePos = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 6;
    const spaceBelow = window.innerHeight - r.bottom - gap - 12;
    const spaceAbove = r.top - gap - 12;
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(280, Math.max(120, openUp ? spaceAbove : spaceBelow));
    setPos({
      top: openUp ? r.top - gap : r.bottom + gap,
      left: r.left,
      width: Math.max(r.width, 200),
      maxHeight,
      openUp,
    });
  }, []);

  React.useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePos();
    const onWin = () => updatePos();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [open, updatePos, options.length]);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const menu =
    open && mounted && pos
      ? createPortal(
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            dir="auto"
            className={cn(
              "fixed z-[400] overflow-x-hidden overflow-y-auto rounded-xl bg-popover p-1.5 text-popover-foreground shadow-xl ring-1 ring-foreground/10",
              contentClassName,
            )}
            style={{
              top: pos.openUp ? undefined : pos.top,
              bottom: pos.openUp ? window.innerHeight - pos.top : undefined,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
            }}
          >
            {options.length === 0 ? (
              <p className="px-2.5 py-2 text-sm text-muted-foreground">{placeholder}</p>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    className={cn(
                      "flex w-full touch-manipulation cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2.5 text-start text-sm outline-none transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:bg-accent focus-visible:text-accent-foreground",
                      "disabled:pointer-events-none disabled:opacity-50",
                      isSelected && "bg-accent/70 font-medium text-accent-foreground",
                    )}
                    onClick={() => {
                      onValueChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0 flex-1 whitespace-normal break-words text-start leading-snug">
                      {opt.label}
                    </span>
                    {isSelected ? (
                      <Check className="mt-0.5 size-4 shrink-0 opacity-80" aria-hidden />
                    ) : (
                      <span className="mt-0.5 size-4 shrink-0" aria-hidden />
                    )}
                  </button>
                );
              })
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={cn(
          "flex w-full min-w-0 touch-manipulation items-center justify-between gap-2 rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm",
          "outline-none transition-[box-shadow,border-color,background-color]",
          "hover:border-border hover:bg-muted/40",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:bg-input/30 dark:hover:bg-input/50",
          size === "default" && "h-11 min-h-11",
          size === "sm" && "h-8 min-h-8 text-xs",
          !selected && "text-muted-foreground",
          open && "border-ring ring-2 ring-ring/35",
          triggerClassName,
        )}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
      >
        <span className="min-w-0 flex-1 truncate text-start">{label}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  );
}
