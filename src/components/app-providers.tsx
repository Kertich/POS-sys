"use client";

import { NextIntlClientProvider } from "next-intl";
import { useEffect, useState } from "react";
import { messages } from "@/lib/i18n";
import { db, syncPendingChanges } from "@/lib/db";
import { usePosStore } from "@/lib/store";

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = usePosStore((state) => state.settings.locale);
  const loadLocalData = usePosStore((state) => state.loadLocalData);

  useEffect(() => {
    let active = true;
    const sync = () => {
      void syncPendingChanges().catch((error: unknown) => console.error("Could not process offline sync queue", error));
    };
    window.addEventListener("online", sync);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error: unknown) => console.error("Service worker registration failed", error));
    }
    const initialize = async () => {
      try {
        await usePosStore.persist.rehydrate();
      } catch (error) {
        console.error("Could not restore POS settings", error);
      }
      if (!active) return;
      try {
        const [sales, heldOrders] = await Promise.all([db.sales.toArray(), db.heldOrders.toArray()]);
        loadLocalData(sales, heldOrders);
      } catch (error) {
        console.error("Could not load offline POS data", error);
      }
      sync();
    };
    void initialize();
    return () => {
      active = false;
      window.removeEventListener("online", sync);
    };
  }, [loadLocalData]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <NextIntlClientProvider locale={locale} timeZone="Africa/Nairobi" messages={messages[locale]}>{children}</NextIntlClientProvider>;
}
