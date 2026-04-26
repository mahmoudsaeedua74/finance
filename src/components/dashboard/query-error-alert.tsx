import { cn } from "@/lib/utils";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type QueryErrorAlertProps = {
  error: unknown;
  className?: string;
} & (
  | { variant?: "inline" }
  | { variant: "callout"; title: string; trailing?: string }
);

export function QueryErrorAlert(props: QueryErrorAlertProps) {
  if (!props.error) return null;
  const msg = messageOf(props.error);
  if (props.variant === "callout") {
    return (
      <div
        className={cn(
          "rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive",
          props.className
        )}
        role="alert"
      >
        <p className="font-medium">{props.title}</p>
        <p className="mt-0.5 text-destructive/90">
          {msg}
          {props.trailing ? ` ${props.trailing}` : ""}
        </p>
      </div>
    );
  }
  return (
    <p className={cn("text-destructive text-sm", props.className)} role="alert">
      {msg}
    </p>
  );
}
