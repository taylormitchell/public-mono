import { z } from "zod";

// z.enum(["meditated", "ankied", "eye-patch", "workout", "custom"]),

export const DatetimeSchema = z
  .union([
    z.date(),
    z
      .string()
      .refine((str) => !isNaN(Date.parse(str)), {
        message: "Invalid date string",
        path: ["datetime"],
      })
      .transform((str) => new Date(str)),
  ])
  .optional()
  .describe("A datetime string or date object");

export const DurationSchema = z
  .string()
  .regex(/^\d+[hms]$/)
  .optional()
  .describe("A duration string (e.g. 5s, 10m, 2h)");

export const MessageSchema = z.string().optional().describe("An optional message");

export const DrinkAmountStringSchema = z
  .string()
  .regex(/^\d+(\.\d+)?\s*(ml|l|liter|oz|cup|bottle|drink|glasse?|can)s?$/)
  .optional();

export const LogEntrySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("meditated"),
    datetime: DatetimeSchema,
    duration: DurationSchema,
    message: MessageSchema,
  }),
  z.object({
    type: z.literal("eye-patch"),
    datetime: DatetimeSchema,
    duration: DurationSchema,
    message: MessageSchema,
  }),
  z.object({
    type: z.literal("ankied"),
    datetime: DatetimeSchema,
    duration: DurationSchema,
    message: MessageSchema,
  }),
  z.object({
    type: z.literal("workout"),
    datetime: DatetimeSchema,
    duration: DurationSchema,
    message: MessageSchema,
  }),
  z.object({
    type: z.literal("custom"),
    datetime: DatetimeSchema,
    duration: DurationSchema,
    message: MessageSchema,
  }),
  z.object({
    type: z.literal("poop"),
    datetime: DatetimeSchema,
    duration: DurationSchema,
    effort: z
      .union([z.number().int(), z.string()])
      .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val))
      .refine((val) => val >= 1 && val <= 5, {
        message: "Effort must be between 1 and 5",
      })
      .optional()
      .describe("How much effort was put into the poop"),
    emptiness: z
      .union([z.number().int(), z.string()])
      .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val))
      .refine((val) => val >= 1 && val <= 5, {
        message: "Emptiness must be between 1 and 5",
      })
      .optional()
      .describe("How empty the poop feels"),
    burning: z
      .union([z.boolean(), z.string()])
      .transform((val) => {
        if (typeof val === "string") {
          return val.toLowerCase() === "true";
        }
        return val;
      })
      .optional()
      .describe("If the poop is burning"),
    // 1-7 are standard types, 0 means I couldn't go
    poopType: z
      .union([z.number().int(), z.string()])
      .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val))
      .refine((val) => val >= 0 && val <= 7, {
        message: "Type must be between 0 and 7",
      })
      .optional()
      .describe("The type of poop (0 means I couldn't go)"),
    message: MessageSchema,
  }),
  z.object({
    type: z.literal("water"),
    datetime: DatetimeSchema,
    amount: DrinkAmountStringSchema.describe("Amount of water consumed"),
    message: MessageSchema,
  }),
  z.object({
    type: z.literal("coffee"),
    datetime: DatetimeSchema,
    amount: DrinkAmountStringSchema.describe("Amount of coffee consumed"),
    message: MessageSchema,
  }),
  z.object({
    type: z.literal("alcohol"),
    datetime: DatetimeSchema,
    amount: DrinkAmountStringSchema.describe("Amount of alcohol consumed"),
    message: MessageSchema,
  }),
  z.object({
    type: z.literal("food"),
    datetime: DatetimeSchema,
    amount: z.enum(["small", "medium", "large"]).optional().describe("Amount of food consumed"),
    healthiness: z
      .union([z.number().int(), z.string()])
      .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val))
      .refine((val) => val >= 1 && val <= 5, {
        message: "Healthiness must be between 1 and 5",
      })
      .optional()
      .describe("The healthiness of the food consumed (1-5 scale)"),
    message: MessageSchema,
  }),
  z.object({
    type: z.literal("fiber"),
    datetime: DatetimeSchema,
    amount: z
      .union([z.number(), z.string()])
      .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
      .default(2.4)
      .describe("Amount of fiber supplement in grams"),
    message: MessageSchema,
  }),
]);

export const LOG_TYPES = new Set(LogEntrySchema.options.map((option) => option.shape.type.value));

export type LogType = typeof LOG_TYPES extends Set<infer T> ? T : never;

export type LogEntry = z.infer<typeof LogEntrySchema>;

export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([hms])$/);
  if (!match) return 0;
  const [, value, unit] = match;
  switch (unit) {
    case "h":
      return parseInt(value) * 60 * 60;
    case "m":
      return parseInt(value) * 60;
    case "s":
      return parseInt(value);
    default:
      return 0;
  }
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);
  return parts.join(" ");
}

export function validateDuration(duration: string | undefined): boolean {
  if (duration && !/^\d+[hms]$/.test(duration)) {
    console.error(
      "Invalid duration format. Use a number followed by 'h' (hours), 'm' (minutes), or 's' (seconds)."
    );
    return false;
  }
  return true;
}

export function validateDatetime(datetime: string | undefined): boolean {
  if (datetime && isNaN(Date.parse(datetime))) {
    console.error(
      "Invalid datetime format. Use ISO 8601 format (e.g., '2023-04-15T14:30:00-04:00')"
    );
    return false;
  }
  return true;
}
