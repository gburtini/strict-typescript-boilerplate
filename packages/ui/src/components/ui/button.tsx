import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactElement } from "react";
import { cn } from "@template/ui/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  asChild = false,
  className,
  size,
  type = "button",
  variant,
  ...props
}: ButtonProps): ReactElement {
  const buttonClassName = cn(buttonVariants({ className, size, variant }));

  if (asChild) {
    return <Slot className={buttonClassName} {...props} />;
  }

  const buttonProps = { className: buttonClassName, ...props };
  switch (type) {
    case "reset": {
      return <button {...buttonProps} type="reset" />;
    }
    case "submit": {
      return <button {...buttonProps} type="submit" />;
    }
    case "button": {
      return <button {...buttonProps} type="button" />;
    }
    default: {
      throw new TypeError("Unsupported button type");
    }
  }
}
