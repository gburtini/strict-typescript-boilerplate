import type { ComponentProps, ReactElement } from "react";
import { cn } from "@template/ui/utils";

type CardProps = ComponentProps<"div">;

export function Card({ className, ...props }: CardProps): ReactElement {
  return (
    <div
      className={cn(
        "min-w-0 w-full max-w-2xl space-y-6 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-xl sm:p-12",
        className,
      )}
      data-slot="card"
      {...props}
    />
  );
}
