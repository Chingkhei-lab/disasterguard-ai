"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";
import { SUBSCRIBE_LOCATIONS } from "@/lib/constants";

type SubscribeResponse = {
  success: boolean;
  data: { message?: string } | null;
  error: string | null;
};

function SubscribePageContent() {
  const params = useSearchParams();

  const [telegramId, setTelegramId] = useState("");
  const [selectedLocationIndex, setSelectedLocationIndex] = useState(0);
  const [locationName, setLocationName] = useState<string>(SUBSCRIBE_LOCATIONS[0].name);
  const [latitude, setLatitude] = useState<number>(SUBSCRIBE_LOCATIONS[0].lat);
  const [longitude, setLongitude] = useState<number>(SUBSCRIBE_LOCATIONS[0].lng);

  const [language, setLanguage] = useState<"hindi" | "english">("hindi");
  const [alertMode, setAlertMode] = useState<"text" | "voice" | "both">("both");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Handle ?location= query param
  useEffect(() => {
    const queryLoc = params.get("location");
    if (queryLoc) {
      const index = SUBSCRIBE_LOCATIONS.findIndex(
        (l) => l.name.toLowerCase() === queryLoc.toLowerCase()
      );
      if (index !== -1) {
        const loc = SUBSCRIBE_LOCATIONS[index];
        setSelectedLocationIndex(index);
        setLocationName(loc.name);
        setLatitude(loc.lat);
        setLongitude(loc.lng);
      }
    }
  }, [params]);

  const groupedLocations = useMemo(() => {
    const groups: Record<string, { index: number; name: string; state: string }[]> = {};
    SUBSCRIBE_LOCATIONS.forEach((loc, index) => {
      if (!groups[loc.state]) groups[loc.state] = [];
      groups[loc.state].push({ ...loc, index });
    });
    return groups;
  }, []);

  const onLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const index = parseInt(e.target.value);
    const loc = SUBSCRIBE_LOCATIONS[index];
    setSelectedLocationIndex(index);
    setLocationName(loc.name);
    setLatitude(loc.lat);
    setLongitude(loc.lng);
  };

  const validate = (): string | null => {
    const parsedTelegramId = Number(telegramId);
    if (!telegramId.trim() || !Number.isFinite(parsedTelegramId)) {
      return "Telegram Chat ID must be a valid number.";
    }
    return null;
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId: Number(telegramId),
          locationName,
          latitude,
          longitude,
          language,
          alertMode,
        }),
      });

      const payload = (await response.json()) as SubscribeResponse;

      if (!response.ok || !payload.success) {
        setErrorMessage(payload.error ?? "Failed to subscribe. Please try again.");
        return;
      }

      setSuccessMessage(payload.data?.message ?? "You are subscribed!");
      setTelegramId("");
    } catch {
      setErrorMessage("Network error while subscribing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <section className="rounded-xl border border-[#475569] bg-[#1e293b] p-6">
        <h1 className="text-2xl font-bold text-white">Get Early Warning Alerts</h1>
        <p className="mt-1 text-sm text-slate-300">Delivered to your Telegram</p>

        <div className="mt-6 space-y-4 rounded-lg bg-slate-800/70 p-4 text-sm text-slate-200">
          <p className="font-semibold text-slate-100">Step 1: Set up your Telegram Bot</p>

          <div className="rounded-md border border-slate-700 bg-slate-900/40 p-3">
            <p className="font-medium text-slate-100">1. Open our Telegram Bot</p>
            <a
              href="https://t.me/DisasterGuardBot"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-2 rounded-md bg-[#3b82f6] px-3 py-2 font-semibold text-white transition hover:bg-[#2563eb]"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>Open @DisasterGuardBot on Telegram</span>
            </a>
          </div>

          <div className="rounded-md border border-slate-700 bg-slate-900/40 p-3">
            <p className="font-medium text-slate-100">2. Send /start to the bot to activate it</p>
            <pre className="mt-2 overflow-x-auto rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-cyan-200">
              <code>/start</code>
            </pre>
          </div>

          <div className="rounded-md border border-slate-700 bg-slate-900/40 p-3">
            <p className="font-medium text-slate-100">3. The bot will reply with your Chat ID number</p>
            <p className="mt-1">Copy that number and paste it below</p>
            <p className="mt-2 text-xs text-slate-400">
              Alternatively, message <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-sky-300 underline decoration-sky-300/50 underline-offset-2 hover:text-sky-200">@userinfobot</a> on Telegram to get your Chat ID
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <p className="text-sm font-semibold text-slate-100">Step 2</p>

          <div>
            <label className="mb-1 block text-sm text-slate-200" htmlFor="telegramId">
              Telegram Chat ID
            </label>
            <input
              id="telegramId"
              type="number"
              value={telegramId}
              onChange={(event) => setTelegramId(event.target.value)}
              placeholder="e.g. 2050602746"
              className="h-11 w-full rounded-lg border border-[#475569] bg-slate-900/60 px-3 text-slate-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-200" htmlFor="location">
              Select Your Location
            </label>
            <select
              id="location"
              value={selectedLocationIndex}
              onChange={onLocationChange}
              className="h-11 w-full rounded-lg border border-[#475569] bg-slate-900/60 px-3 text-slate-100"
            >
              {Object.entries(groupedLocations).map(([state, locations]) => (
                <optgroup label={state} key={state}>
                  {locations.map((loc) => (
                    <option value={loc.index} key={loc.index}>
                      {loc.name}, {loc.state}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-200" htmlFor="language">
              Alert Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(event) => setLanguage(event.target.value as "hindi" | "english")}
              className="h-11 w-full rounded-lg border border-[#475569] bg-slate-900/60 px-3 text-slate-100"
            >
              <option value="hindi">Hindi</option>
              <option value="english">English</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-200" htmlFor="alertMode">
              Alert Mode
            </label>
            <select
              id="alertMode"
              value={alertMode}
              onChange={(event) =>
                setAlertMode(event.target.value as "text" | "voice" | "both")
              }
              className="h-11 w-full rounded-lg border border-[#475569] bg-slate-900/60 px-3 text-slate-100"
            >
              <option value="text">Text</option>
              <option value="voice">Voice</option>
              <option value="both">Both</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full rounded-lg bg-[#3b82f6] px-4 text-sm font-semibold text-white transition hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Subscribing..." : "Subscribe Now"}
          </button>
        </form>

        {successMessage ? (
          <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/15 p-3 text-emerald-200">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>You are subscribed!</span>
            </div>
            <p className="mt-1 text-sm">A test alert has been sent to your Telegram</p>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/15 p-3 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-7xl px-4 py-6"><div className="h-96 animate-pulse rounded-xl bg-slate-700/60" /></div>}>
      <SubscribePageContent />
    </Suspense>
  );
}
