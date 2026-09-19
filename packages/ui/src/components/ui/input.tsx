import type { ComponentProps, ReactElement } from "react";
import { cn } from "@template/ui/utils";

type InputProps = ComponentProps<"input">;

export function Input({
  className,
  type = "text",
  ...props
}: InputProps): ReactElement {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}
