import * as z from "zod";
import type {
  deferOrderSchema,
  loginSchema,
  placeOrderSchema,
  reportIssueSchema,
} from "./schema";

export type DeferOrderFormValues = z.infer<typeof deferOrderSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type PlaceOrderFormValues = z.infer<typeof placeOrderSchema>;
export type ReportIssueFormValues = z.infer<typeof reportIssueSchema>;

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

export interface DeliverySummaryMetrics {
  expectedToday: number;
  awaitingConfirmation: number;
  issuesOpen: number;
}

export interface DeliveryHistoryItem {
  id: string;
  requirement: "Ambient" | "Chilled";
  deliveryDate: string;
  latestUpdate: string;
  status: string;
  statusVariant: "green" | "yellow" | "red" | "blue" | "default";
}

export interface DeliveryTimelineStep {
  id: string | number;
  title: string;
  timestamp: string;
  status: "completed" | "current" | "pending";
}

export interface DeliveryDetailsData extends DeliveryHistoryItem {
  subtitle: string;
  vehicle: string;
  orderedQuantity: string;
  driverRecorded: string;
  timeline: DeliveryTimelineStep[];
}
