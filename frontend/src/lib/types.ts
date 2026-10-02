import * as z from "zod";
import type { deferOrderSchema } from "./schema";

export type DeferOrderFormValues = z.infer<typeof deferOrderSchema>;
