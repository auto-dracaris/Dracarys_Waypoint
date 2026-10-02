import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-wp-radius-lg border border-transparent bg-clip-padding type-text-sm-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-wp-space-xl",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-(--wp-space-xs) hover:underline",
      },
      size: {
        default:
          "h-wp-space-4xl gap-wp-space-sm px-[calc(var(--wp-space-md)+var(--wp-space-xxs))] has-data-[icon=inline-end]:pr-wp-space-md has-data-[icon=inline-start]:pl-wp-space-md",
        xs: "h-wp-space-3xl gap-wp-space-xs rounded-wp-radius-md px-wp-space-md type-text-xs-medium in-data-[slot=button-group]:rounded-wp-radius-lg has-data-[icon=inline-end]:pr-wp-space-sm has-data-[icon=inline-start]:pl-wp-space-sm [&_svg:not([class*='size-'])]:size-wp-space-lg",
        sm: "h-[calc(var(--wp-space-3xl)+var(--wp-space-xs))] gap-wp-space-xs rounded-wp-radius-md px-[calc(var(--wp-space-md)+var(--wp-space-xxs))] type-text-xs-medium in-data-[slot=button-group]:rounded-wp-radius-lg has-data-[icon=inline-end]:pr-wp-space-sm has-data-[icon=inline-start]:pl-wp-space-sm [&_svg:not([class*='size-'])]:size-[calc(var(--wp-space-md)+var(--wp-space-sm))]",
        lg: "h-[calc(var(--wp-space-4xl)+var(--wp-space-xs))] gap-wp-space-sm px-[calc(var(--wp-space-md)+var(--wp-space-xxs))] has-data-[icon=inline-end]:pr-wp-space-md has-data-[icon=inline-start]:pl-wp-space-md",
        icon: "size-wp-space-4xl",
        "icon-xs":
          "size-wp-space-3xl rounded-wp-radius-md in-data-[slot=button-group]:rounded-wp-radius-lg [&_svg:not([class*='size-'])]:size-wp-space-lg",
        "icon-sm":
          "size-[calc(var(--wp-space-3xl)+var(--wp-space-xs))] rounded-wp-radius-md in-data-[slot=button-group]:rounded-wp-radius-lg",
        "icon-lg": "size-[calc(var(--wp-space-4xl)+var(--wp-space-xs))]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
