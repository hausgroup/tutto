import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SIIGO_USERNAME: z.string().optional(),
  SIIGO_ACCESS_KEY: z.string().optional(),
  SIIGO_PARTNER_ID: z.string().optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function getServerEnv() {
  return serverEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SIIGO_USERNAME: process.env.SIIGO_USERNAME,
    SIIGO_ACCESS_KEY: process.env.SIIGO_ACCESS_KEY,
    SIIGO_PARTNER_ID: process.env.SIIGO_PARTNER_ID,
  });
}

export function isSupabaseConfigured(): boolean {
  return publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }).success;
}

export function isDemoModeEnabled(): boolean {
  return process.env.HAUS_DEMO_MODE === "true";
}

/** Preview Reportes with rich mock sales until real data exists. */
export function useMockReports(): boolean {
  return process.env.HAUS_MOCK_REPORTS !== "false";
}

/** Local UI development without Supabase credentials. */
export function canUseDemoExperience(): boolean {
  return isDemoModeEnabled() && !isSupabaseConfigured();
}
