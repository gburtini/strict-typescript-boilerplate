import type { ComponentProps, ReactElement } from "react";
import { cn } from "@template/ui/utils";

type LabelProps = ComponentProps<"label">;

export function Label({ className, ...props }: LabelProps): ReactElement {
  return (
    <label
      className={cn("text-sm font-medium leading-none", className)}
      data-slot="label"
      {...props}
    />
  );
}
