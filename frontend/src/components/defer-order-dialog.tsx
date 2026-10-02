import { useForm, Controller, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import AccessTimeOutlined from "@mui/icons-material/AccessTimeOutlined";
import AcUnitRounded from "@mui/icons-material/AcUnitRounded";
import LocalShippingOutlined from "@mui/icons-material/LocalShippingOutlined";
import ScaleOutlined from "@mui/icons-material/ScaleOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import WarningRounded from "@mui/icons-material/WarningRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { deferOrderSchema } from "@/lib/schema";
import type { DeferOrderFormValues } from "@/lib/types";

const deferReasons = [
  "No suitable vehicle capacity",
  "Store requested delay",
  "Route capacity constraint",
];

function CalendarClockIcon() {
  return (
    <span aria-hidden="true" className="relative block size-wp-space-5xl shrink-0 text-wp-yellow-600">
      <CalendarMonthOutlined fontSize="inherit" className="absolute top-wp-space-none left-wp-space-none size-wp-space-5xl" />
      <AccessTimeOutlined fontSize="inherit" className="absolute right-wp-space-none bottom-wp-space-none size-wp-space-3xl rounded-wp-radius-full bg-wp-neutral-50" />
    </span>
  );
}

function DeferOrderForm({
  form, onSubmit,
}: {
  form: UseFormReturn<DeferOrderFormValues>;
  onSubmit: (data: DeferOrderFormValues) => void;
}) {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-col">
      <div className="min-h-0 overflow-y-auto px-wp-space-3xl py-wp-space-xl">
        <div className="flex flex-col gap-wp-space-md rounded-wp-radius-md bg-wp-neutral-50 p-wp-space-lg outline outline-wp-neutral-200 -outline-offset-1">
          <div className="flex flex-col gap-wp-space-xxs">
            <h4 className="type-text-sm-semibold text-wp-text-primary">Fresh — Biyagama</h4>
            <p className="type-text-xs-regular text-wp-text-secondary">Requested delivery · Mon, 28 Sep 2026</p>
          </div>
          <div className="flex flex-wrap items-center gap-wp-space-md">
            <span className="inline-flex h-wp-space-3xl items-center gap-wp-space-sm rounded-wp-radius-full px-wp-space-lg type-text-xs-medium bg-wp-blue-100 text-wp-blue-600">
              <AcUnitRounded fontSize="inherit" className="size-wp-space-xl shrink-0" /> Chilled
            </span>
            <span className="inline-flex h-wp-space-3xl items-center gap-wp-space-sm rounded-wp-radius-full px-wp-space-lg type-text-xs-medium bg-wp-neutral-100 text-wp-text-tertiary">
              <LocalShippingOutlined fontSize="inherit" className="size-wp-space-xl shrink-0" /> Van only
            </span>
            <span className="inline-flex h-wp-space-3xl items-center gap-wp-space-sm rounded-wp-radius-full px-wp-space-lg type-text-xs-medium bg-wp-neutral-100 text-wp-text-tertiary">
              <ScaleOutlined fontSize="inherit" className="size-wp-space-xl shrink-0" /> 300 kg
            </span>
            <span className="inline-flex h-wp-space-3xl items-center gap-wp-space-sm rounded-wp-radius-full px-wp-space-lg type-text-xs-medium bg-wp-neutral-100 text-wp-text-tertiary">
              <Inventory2Outlined fontSize="inherit" className="size-wp-space-xl shrink-0" /> 1.2 m³
            </span>
          </div>
        </div>

        <div className="mt-wp-space-xl mb-wp-space-lg flex items-start gap-wp-space-md rounded-wp-radius-md bg-wp-yellow-50 p-wp-space-lg outline outline-wp-yellow-300 -outline-offset-1">
          <span className="flex size-wp-space-4xl shrink-0 items-center justify-center rounded-wp-radius-full bg-wp-yellow-100">
            <WarningRounded fontSize="inherit" className="size-wp-space-2xl text-wp-yellow-600" />
          </span>
          <div className="flex min-w-0 flex-col gap-wp-space-xs">
            <h5 className="type-text-sm-bold text-wp-text-primary">Chilled order needs a vehicle</h5>
            <p className="type-text-sm-regular text-wp-text-secondary">
              Automatic planning found no available chilled capacity. Vehicle availability has since changed.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-wp-space-lg">
          <Controller
            name="reason"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-wp-space-xs">
                <FieldLabel htmlFor="defer-reason" className="gap-wp-space-xs text-wp-text-secondary type-text-sm-medium!">
                  Reason <span aria-hidden="true" className="text-wp-text-error-primary">*</span>
                </FieldLabel>
                <Select name={field.name} value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                  <SelectTrigger
                    ref={field.ref}
                    onBlur={field.onBlur}
                    id="defer-reason"
                    aria-required="true"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={fieldState.invalid ? "defer-reason-error" : undefined}
                    className="data-[size=default]:h-wp-space-6xl w-full gap-wp-space-md rounded-wp-radius-md border-wp-neutral-300 bg-wp-neutral-50 px-wp-space-lg py-wp-space-none text-wp-text-primary data-placeholder:text-wp-text-placeholder type-text-sm-regular! [&_.MuiSvgIcon-root]:size-wp-space-2xl [&_.MuiSvgIcon-root]:text-wp-text-primary"
                  >
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent className="rounded-wp-radius-md bg-wp-neutral-50 text-wp-text-primary type-text-sm-regular!">
                    {deferReasons.map((reason) => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError id="defer-reason-error" className="type-text-sm-regular!" errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="additionalDetails"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-wp-space-xs">
                <FieldLabel htmlFor="defer-details" className="text-wp-text-secondary type-text-sm-medium!">Additional details</FieldLabel>
                <Textarea
                  {...field}
                  id="defer-details"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? "defer-details-error" : undefined}
                  placeholder="Add comments..."
                  className="h-wp-space-9xl min-h-wp-space-9xl field-sizing-fixed resize-none rounded-wp-radius-md border-wp-neutral-300 bg-wp-neutral-50 px-wp-space-lg py-wp-space-md text-wp-text-primary placeholder:text-wp-text-placeholder type-text-sm-regular!"
                />
                {fieldState.invalid && <FieldError id="defer-details-error" className="type-text-sm-regular!" errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <div className="mt-wp-space-xl flex flex-col gap-wp-space-xxs text-wp-text-secondary">
          <span className="type-text-xs-semibold">Delivery expectation</span>
          <span className="type-text-sm-medium text-wp-text-primary">Revised delivery date not confirmed.</span>
          <span className="type-text-xs-regular">Reconsider during the next eligible planning cycle.</span>
        </div>

        <div className="mt-wp-space-xl min-h-wp-space-8xl p-wp-space-lg flex flex-col gap-wp-space-md rounded-wp-radius-sm bg-wp-neutral-100 text-wp-text-secondary">
          <span className="type-text-xs-semibold">Store update preview</span>
          <div className="flex items-start gap-wp-space-lg">
            <DescriptionOutlined fontSize="inherit" className="size-wp-space-xl shrink-0" />
            <div className="min-w-0 type-text-xs-regular">
              <p>Your delivery has been deferred because suitable vehicle capacity is unavailable.</p>
              <p>A revised delivery date is not yet confirmed.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="h-wp-space-7xl gap-wp-space-md px-wp-space-3xl py-wp-space-lg flex shrink-0 items-center justify-end border-t border-wp-neutral-200 bg-wp-neutral-50">
        <DialogClose render={
          <Button type="button" variant="outline" className="h-wp-space-4xl w-wp-space-8xl shrink-0 rounded-wp-radius-xs border-wp-neutral-300 bg-wp-neutral-50 px-wp-space-none text-wp-text-primary type-text-sm-medium!" />
        }>Cancel</DialogClose>
        <Button type="submit" className="h-wp-space-4xl w-wp-space-10xl shrink-0 rounded-wp-radius-xs border border-wp-yellow-400 bg-wp-yellow-400 px-wp-space-none text-wp-text-primary shadow-none hover:bg-wp-yellow-500 type-text-sm-medium!">
          Confirm deferral
        </Button>
      </div>
    </form>
  );
}

export function DeferOrderDialog() {
  const form = useForm<DeferOrderFormValues>({
    resolver: zodResolver(deferOrderSchema),
    defaultValues: {
      reason: deferReasons[0],
      additionalDetails: "All compatible refrigerated vans are fully allocated.",
    },
  });

  function onSubmit(data: DeferOrderFormValues) {
    console.log("Deferral Submitted:", data);
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Defer Order DEMO-108</DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex w-wp-spacing-140 max-w-[calc(100%-var(--wp-space-4xl))] sm:max-w-[calc(100%-var(--wp-space-4xl))] max-h-[calc(100dvh-var(--wp-space-4xl))] flex-col gap-wp-space-none overflow-hidden rounded-wp-radius-md bg-wp-neutral-50 p-wp-space-none text-wp-text-primary shadow-none ring-0"
      >
        <DialogHeader className="min-h-wp-space-8xl shrink-0 flex-row items-start gap-wp-space-lg pt-wp-space-md pr-wp-space-2xl pl-wp-space-3xl max-sm:pb-wp-space-md">
          <div className="flex min-w-0 flex-1 items-center gap-wp-space-lg">
            <CalendarClockIcon />
            <div className="flex min-w-0 flex-1 flex-col gap-wp-space-xxs">
              <DialogTitle className="type-text-xl-medium text-wp-text-primary">Defer order DEMO-108?</DialogTitle>
              <DialogDescription className="type-text-xs-regular text-wp-text-secondary">
                Remove this order from the current delivery plan. It will remain pending for a future eligible run.
              </DialogDescription>
            </div>
          </div>
          <DialogClose aria-label="Close" className="flex size-wp-space-4xl shrink-0 items-center justify-center rounded-wp-radius-sm border border-wp-neutral-400 text-wp-neutral-600 transition-colors hover:bg-wp-neutral-100">
            <CloseRounded fontSize="inherit" className="size-wp-space-2xl" />
          </DialogClose>
        </DialogHeader>
        <DeferOrderForm form={form} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}
