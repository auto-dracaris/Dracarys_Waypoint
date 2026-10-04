import * as z from 'zod'
import type { deferOrderSchema, forgotPasswordSchema, loginSchema, otpSchema, placeOrderSchema, registerSchema, reportIssueSchema, resetPasswordSchema } from './schema'

export type DeferOrderFormValues = z.infer<typeof deferOrderSchema>
export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
export type OtpFormValues = z.infer<typeof otpSchema>
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
export type PlaceOrderFormValues = z.infer<typeof placeOrderSchema>
export type PlaceOrderFormInput = z.input<typeof placeOrderSchema>
export type ReportIssueFormValues = z.infer<typeof reportIssueSchema>

export interface TimelineStep {
  id: number
  title: string
  timestamp: string
  status: 'completed' | 'current' | 'pending'
}

export interface DeliveryDetails {
  vehicleId: string
  vehicleType: string
  status: string
  statusVariant: 'green' | 'yellow' | 'blue' | 'red'
  quantity: string
  timeline: TimelineStep[]
  depot: { name: string; position: [number, number] | null }
  outletPosition: [number, number] | null
  // Null when where the vehicle is is not known.
  vehiclePosition: [number, number] | null
  route: [number, number][]
}

export interface DeliverySummaryMetrics {
  expectedToday: number
  awaitingConfirmation: number
  issuesOpen: number
}

export interface DeliveryHistoryItem {
  id: string
  requirement: 'Ambient' | 'Chilled'
  deliveryDate: string
  latestUpdate: string
  status: string
  statusVariant: 'green' | 'yellow' | 'red' | 'blue' | 'default'
}

export interface DeliveryTimelineStep {
  id: string | number
  title: string
  timestamp: string
  status: 'completed' | 'current' | 'pending'
}

export interface DeliveryDetailsData extends DeliveryHistoryItem {
  // Cases the driver recorded handing over; null until they do.
  deliveredUnits: number | null
  subtitle: string
  vehicle: string
  orderedQuantity: string
  driverRecorded: string
  timeline: DeliveryTimelineStep[]
}
