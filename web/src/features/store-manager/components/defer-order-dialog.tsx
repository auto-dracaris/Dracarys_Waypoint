import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/shadcn/dialog";
import { Button } from "@/components/ui/shadcn/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/shadcn/field";
import { Textarea } from "@/components/ui/shadcn/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import {
  AlertTriangle,
  Package,
  Truck,
  Weight,
  Box,
  Info,
  X,
} from "lucide-react";
import { deferOrderSchema } from "@/features/store-manager/schema";
import type { DeferOrderFormValues } from "@/features/store-manager/types";

export function DeferOrderDialog() {
  const form = useForm<DeferOrderFormValues>({
    resolver: zodResolver(deferOrderSchema),
    defaultValues: {
      reason: "", // Empty by default so validation error can be previewed if submitted empty
      additionalDetails:
        "All compatible refrigerated vans are fully allocated.",
    },
  });

  function onSubmit(data: DeferOrderFormValues) {
    console.log("Deferral Submitted:", data);
  }

  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="outline">Defer Order DEMO-108</Button>
      </DialogTrigger>

      <DialogContent className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 bg-white rounded-xl shadow-2xl border-0 [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-0 flex flex-row items-start justify-between space-y-0">
          <div className="flex items-start gap-3.5">
            <div className="h-9 w-9 relative flex items-center justify-center shrink-0 mt-1">
              <AlertTriangle className="h-7 w-7 text-orange-500" />
            </div>
            <div className="flex flex-col gap-px">
              <DialogTitle className="text-gray-800 text-xl font-medium">
                Defer order DEMO-108?
              </DialogTitle>
              <p className="text-slate-600 text-xs font-normal">
                Remove this order from the current delivery plan. It will remain
                pending for a future eligible run.
              </p>
            </div>
          </div>
          <DialogClose className="p-1.5 rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        {/* Form Body */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
          <div className="px-5 py-4 flex flex-col gap-4">
            {/* Order Metadata Box */}
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex flex-col gap-2">
              <div>
                <h4 className="text-slate-900 text-sm font-semibold">
                  Fresh — Biyagama
                </h4>
                <p className="text-slate-500 text-xs font-normal">
                  Requested delivery · Mon, 28 Sep 2026
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="h-6 px-3 bg-blue-100 rounded-full flex items-center gap-1.5 text-blue-600 text-xs font-medium">
                  <Package className="h-3.5 w-3.5" /> Chilled
                </div>
                <div className="h-6 px-3 bg-neutral-100 rounded-full flex items-center gap-1.5 text-neutral-600 text-xs font-medium">
                  <Truck className="h-3.5 w-3.5" /> Van only
                </div>
                <div className="h-6 px-3 bg-neutral-100 rounded-full flex items-center gap-1.5 text-neutral-600 text-xs font-medium">
                  <Weight className="h-3.5 w-3.5" /> 300 kg
                </div>
                <div className="h-6 px-3 bg-neutral-100 rounded-full flex items-center gap-1.5 text-neutral-600 text-xs font-medium">
                  <Box className="h-3.5 w-3.5" /> 1.2 m³
                </div>
              </div>
            </div>

            {/* Warning Context Banner */}
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-300 flex items-start gap-3">
              <div className="h-8 w-8 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex flex-col gap-1">
                <h5 className="text-slate-900 text-sm font-bold">
                  Chilled order needs a vehicle
                </h5>
                <p className="text-slate-600 text-sm font-normal">
                  Automatic planning found no available chilled capacity.
                  Vehicle availability has since changed.
                </p>
              </div>
            </div>

            {/* Form Fields with Explicit Error Handling */}
            <div className="flex flex-col gap-3">
              {/* Reason Field */}
              <Controller
                name="reason"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field
                    data-invalid={fieldState.invalid}
                    className="space-y-1"
                  >
                    <FieldLabel
                      htmlFor="defer-reason"
                      className="text-slate-600 text-sm font-medium"
                    >
                      Reason <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Select
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id="defer-reason"
                        aria-invalid={fieldState.invalid}
                        className="h-11 px-3 bg-neutral-50 rounded-lg border-neutral-300 text-slate-900 text-sm w-full"
                      >
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No suitable vehicle capacity">
                          No suitable vehicle capacity
                        </SelectItem>
                        <SelectItem value="Store requested delay">
                          Store requested delay
                        </SelectItem>
                        <SelectItem value="Route capacity constraint">
                          Route capacity constraint
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Additional Details Field */}
              <Controller
                name="additionalDetails"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field
                    data-invalid={fieldState.invalid}
                    className="space-y-1"
                  >
                    <FieldLabel
                      htmlFor="defer-details"
                      className="text-slate-600 text-sm font-medium"
                    >
                      Additional details
                    </FieldLabel>
                    <Textarea
                      {...field}
                      id="defer-details"
                      aria-invalid={fieldState.invalid}
                      placeholder="Add comments..."
                      className="min-h-20 px-3 py-2 bg-neutral-50 rounded-lg border-neutral-300 text-slate-900 text-sm resize-none"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            {/* Delivery Expectation Info Block */}
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-600 text-xs font-semibold">
                Delivery expectation
              </span>
              <span className="text-gray-800 text-sm font-medium">
                Revised delivery date not confirmed.
              </span>
              <span className="text-slate-600 text-xs font-normal">
                Reconsider during the next eligible planning cycle.
              </span>
            </div>

            {/* Store Update Preview Card */}
            <div className="p-3.5 bg-slate-100 rounded-md flex flex-col gap-2">
              <span className="text-slate-600 text-xs font-semibold">
                Store update preview
              </span>
              <div className="flex items-start gap-3">
                <Info className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
                <p className="text-slate-600 text-xs font-normal leading-relaxed">
                  Your delivery has been deferred because suitable vehicle
                  capacity is unavailable.
                  <br />A revised delivery date is not yet confirmed.
                </p>
              </div>
            </div>
          </div>

          {/* Dialog Footer Actions */}
          <div className="h-16 px-6 py-3.5 border-t border-zinc-200 flex justify-end items-center gap-2 bg-white">
            <DialogClose>
              <Button
                type="button"
                variant="outline"
                className="w-20 h-9 rounded-[5px] border-slate-300 text-slate-800 font-medium text-sm"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className="w-32 h-9 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium text-sm rounded-[5px] shadow-none"
            >
              Confirm deferral
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
