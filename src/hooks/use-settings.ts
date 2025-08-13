import { useCallback, useEffect, useState } from "react";

export type Aspect = "9:16" | "16:9" | "1:1";
export type TelopPosition = "top" | "bottom";
export type ScreenshotPosition = "top" | "center" | "bottom";

export interface OutputSettings {
  resolution: string; // e.g. 1080x1920
  aspect: Aspect;
  lengthSec: number;
  bgmPath?: string;
  backgroundVideoPath?: string;
  screenshotPosition: ScreenshotPosition;
  telopPosition: TelopPosition;
}

export interface AppSettings {
  accounts: string[];
  intervalMinutes: number;
  output: OutputSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  accounts: [],
  intervalMinutes: 10,
  output: {
    resolution: "1080x1920",
    aspect: "9:16",
    lengthSec: 20,
    bgmPath: "",
    backgroundVideoPath: "",
    screenshotPosition: "center",
    telopPosition: "bottom",
  },
};

const STORAGE_KEY = "xbuzz_settings";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = useCallback(
    (patch: Partial<AppSettings>) => setSettings((s) => ({ ...s, ...patch })),
    []
  );

  const updateOutput = useCallback(
    (patch: Partial<OutputSettings>) =>
      setSettings((s) => ({ ...s, output: { ...s.output, ...patch } })),
    []
  );

  return { settings, setSettings, update, updateOutput };
}
