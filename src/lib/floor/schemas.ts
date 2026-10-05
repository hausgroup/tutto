import { z } from "zod";
import {
  FLOOR_CANVAS,
  TABLE_SHAPES,
  TABLE_STATUSES,
} from "@/lib/floor/types";

export const floorAreaInputSchema = z.object({
  restaurantId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export const floorAreaUpdateSchema = floorAreaInputSchema
  .extend({
    id: z.string().uuid(),
  })
  .partial({ name: true, sortOrder: true });

export const tableInputSchema = z.object({
  restaurantId: z.string().uuid(),
  floorAreaId: z.string().uuid(),
  label: z.string().trim().min(1).max(20),
  capacity: z.number().int().min(1).max(30),
  shape: z.enum(TABLE_SHAPES).default("rectangle"),
});

export const tableLayoutSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  posX: z
    .number()
    .min(0)
    .max(FLOOR_CANVAS.width - 80),
  posY: z
    .number()
    .min(0)
    .max(FLOOR_CANVAS.height - 80),
  width: z.number().min(80).max(FLOOR_CANVAS.width),
  height: z.number().min(80).max(FLOOR_CANVAS.height),
  rotationDeg: z.number().min(-180).max(180),
});

export const tablePropertiesSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  label: z.string().trim().min(1).max(20),
  capacity: z.number().int().min(1).max(30),
  shape: z.enum(TABLE_SHAPES),
  status: z.enum(TABLE_STATUSES),
  floorAreaId: z.string().uuid(),
  isActive: z.boolean(),
});

export const tableStatusSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  status: z.enum(TABLE_STATUSES),
});

export const tableReservationSchema = z.object({
  tableId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  guestName: z.string().trim().min(1).max(120),
  partySize: z.number().int().min(1).max(99),
  occasion: z.string().trim().min(1).max(120),
  scheduledAt: z.string().datetime(),
});
