import { createClient } from "@supabase/supabase-js";

import type { AlertLog, Subscription } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type NewAlertLog = Omit<AlertLog, "id" | "delivered_at"> &
  Partial<Pick<AlertLog, "id" | "delivered_at">>;

export type NewSubscription = Omit<Subscription, "id" | "created_at"> &
  Partial<Pick<Subscription, "id" | "created_at">>;

export async function getSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch subscriptions: ${error.message}`);
  }

  return (data ?? []) as Subscription[];
}

export async function saveAlertLog(alertLog: NewAlertLog): Promise<AlertLog> {
  const { data, error } = await supabase
    .from("alert_logs")
    .insert(alertLog)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to save alert log: ${error.message}`);
  }

  return data as AlertLog;
}

export async function getAlertHistory(limit = 20): Promise<AlertLog[]> {
  const { data, error } = await supabase
    .from("alert_logs")
    .select("*")
    .order("delivered_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch alert history: ${error.message}`);
  }

  return (data ?? []) as AlertLog[];
}

export async function saveSubscription(
  subscription: NewSubscription,
): Promise<Subscription> {
  const { data, error } = await supabase
    .from("subscriptions")
    .upsert(subscription, { onConflict: "telegram_id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to save subscription: ${error.message}`);
  }

  return data as Subscription;
}
