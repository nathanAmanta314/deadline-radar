import { useEffect, useLayoutEffect, useState } from "react";
import { liveQuery } from "dexie";
import { db, initialize } from "../db/repository";
import {
  defaultSettings,
  settingsSchema,
  type Deadline,
  type Category,
  type Settings,
} from "../types";
export function useData() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]),
    [categories, setCategories] = useState<Category[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let sub: { unsubscribe: () => void } | undefined;
    initialize()
      .then(() => {
        sub = liveQuery(async () => ({
          deadlines: await db.deadlines.toArray(),
          categories: await db.categories.toArray(),
        })).subscribe({
          next: (v) => {
            setDeadlines(v.deadlines);
            setCategories(v.categories);
            setLoading(false);
          },
          error: () => {
            setError(
              "Your browser could not read local storage. Please allow site storage and reload.",
            );
            setLoading(false);
          },
        });
      })
      .catch(() => {
        setError(
          "Local storage is unavailable. Please allow site storage and reload before adding deadlines.",
        );
        setLoading(false);
      });
    return () => sub?.unsubscribe();
  }, []);
  return { deadlines, categories, error, loading };
}
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = settingsSchema.parse(
        JSON.parse(localStorage.getItem("radar-settings") || "null"),
      );
      return localStorage.getItem("radar-theme-revision") === "cream-v1"
        ? saved
        : { ...saved, theme: "light" };
    } catch {
      return defaultSettings;
    }
  });
  // Apply the requested cream redesign once, including already-open tabs on HMR.
  // Later explicit theme choices remain persistent.
  useLayoutEffect(() => {
    try {
      if (localStorage.getItem("radar-theme-revision") !== "cream-v1") {
        setSettings((current) => ({ ...current, theme: "light" }));
        localStorage.setItem("radar-theme-revision", "cream-v1");
      }
    } catch {
      /* The default cream theme also works without preference storage. */
    }
  }, []);
  useLayoutEffect(() => {
    try {
      localStorage.setItem("radar-settings", JSON.stringify(settings));
    } catch {
      /* Preferences remain usable in memory. */
    }
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      document.documentElement.dataset.theme =
        settings.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : settings.theme;
      document.documentElement.dataset.motion = settings.reducedMotion
        ? "reduce"
        : "auto";
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [settings]);
  return [settings, setSettings] as const;
}
export function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return now;
}
