import * as z from "zod";
import type { deferOrderSchema, loginSchema, placeOrderSchema } from "./schema";

export type DeferOrderFormValues = z.infer<typeof deferOrderSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type PlaceOrderFormValues = z.infer<typeof placeOrderSchema>;

export interface TimelineStep {
  id: number;
  title: string;
  timestamp: string;
  status: "completed" | "current" | "pending";
}

export interface DeliveryDetails {
  vehicleId: string;
  vehicleType: string;
  status: string;
  plannedArrival: string;
  receivingWindow: string;
  locationName: string;
  deliveryTitle: string;
  demoId: string;
  date: string;
  quantity: string;
  timeline: TimelineStep[];
}
