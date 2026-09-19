import type { ComponentProps, ReactElement } from "react";
import { cn } from "@template/ui/utils";

type CardProps = ComponentProps<"div">;

export function Card({ className, ...props }: CardProps): ReactElement {
  return (
    <div
      className={cn(
        "w-full max-w-2xl space-y-6 rounded-xl border border-border bg-card p-12 text-card-foreground shadow-xl",
        className,
      )}
      data-slot="card"
      {...props}
    />
  );
}
