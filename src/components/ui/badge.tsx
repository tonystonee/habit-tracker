import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        outline: "border-border text-muted-foreground bg-transparent",
        success: "border-green-400/20 bg-green-400/10 text-green-400",
        warning: "border-yellow-400/20 bg-yellow-400/10 text-yellow-400",
        danger:  "border-red-400/20  bg-red-400/10  text-red-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
