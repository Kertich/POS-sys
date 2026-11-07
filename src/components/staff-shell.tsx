"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CloudOff, CloudUpload, Leaf, Sun, Wifi, X } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { db, queueForSync } from "@/lib/db";

const links = [
  { href: "/sell", key: "sell", icon: "＋" },
  { href: "/held", key: "held", icon: "▣" },
  { href: "/history", key: "history", icon: "↻" },
  { href: "/shift/close", key: "shift", icon: "◷" },
] as const;

export function StaffShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const t = useTranslations();
  const heldCount = usePosStore((state) => state.heldOrders.length);
  const toast = usePosStore((state) => state.toast);
  const locale = usePosStore((state) => state.settings.locale);
  const sunMode = usePosStore((state) => state.settings.sunMode);
  const setLocale = usePosStore((state) => state.setLocale);
  const setSunMode = usePosStore((state) => state.setSunMode);
  const [online, setOnline] = useState(true);
  const [syncPending, setSyncPending] = useState(0);
  const isLogin = pathname === "/login";
  const isReceipt = pathname.startsWith("/receipt/");
  const toastLabel = toast === "Sale voided" ? t("voided")
    : toast === "Void undone" ? t("voidUndone")
      : toast === "Sale complete" ? t("saleComplete")
        : toast === "Order saved for later" ? t("shiftSaved")
          : toast === "Order ready to continue" ? t("orderReady")
            : toast === "Shift closed" ? t("shiftClosed")
              : toast === "Could not save order on this device" ? t("couldNotSave")
                : toast === "Sale completed, but its offline copy could not be saved." ? t("saleStorageError")
                  : toast === "Sale saved on this device, but could not be added to sync queue." ? t("syncQueueError")
              : toast;

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    const updatePending = () => { void db.syncQueue.count().then(setSyncPending).catch((error: unknown) => console.error("Could not read sync status", error)); };
    sync();
    updatePending();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    window.addEventListener("pos-sync-queue-updated", updatePending);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      window.removeEventListener("pos-sync-queue-updated", updatePending);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => usePosStore.setState({ toast: null }), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function toggleLocale() {
    setLocale(locale === "en" ? "sw" : "en");
  }

  function toggleSunMode() {
    setSunMode(!sunMode);
  }

  useEffect(() => {
    document.documentElement.classList.toggle("sun-mode", sunMode);
  }, [sunMode]);

  return (
    <div className="min-h-dvh">
      <header className="no-print sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex min-h-[60px] max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 md:h-[60px] md:flex-nowrap md:py-0">
          <Link href="/home" className="flex items-center gap-2 font-extrabold tracking-tight text-[var(--primary)]" aria-label="Soko POS home">
            <span className="grid size-9 place-items-center rounded-xl bg-[var(--primary)] text-white"><Leaf size={21} /></span>
            <span className="text-[17px]">soko<span className="text-[var(--text)]">pos</span></span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={toggleSunMode} className="flex h-12 items-center gap-1 rounded-xl border border-[var(--border)] px-2 text-sm font-bold text-[var(--text)]" aria-label="Toggle bright sunlight mode">
              <Sun size={19} />{t("sunMode")}
            </button>
            <button type="button" onClick={toggleLocale} className="h-12 min-w-12 rounded-xl border border-[var(--border)] px-2 text-sm font-bold text-[var(--text)]" aria-label="Change language">
              {locale.toUpperCase()}
            </button>
          </div>
          <div className={`order-3 flex h-8 basis-full items-center justify-center gap-1.5 rounded-full px-3 text-xs font-bold md:order-none md:ml-auto md:h-9 md:basis-auto ${online ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}>
            {online ? <Wifi size={15} /> : <CloudOff size={15} />}
            <span>{online ? t("online") : t("offline")}</span>
            <span className="mx-0.5 opacity-50">·</span><CloudUpload size={14} /><span>{syncPending ? online ? t("syncing") : t("pending") : t("synced")}</span>
          </div>
        </div>
      </header>
      {isLogin || isReceipt ? children : <main className="mx-auto min-h-[calc(100dvh-140px)] max-w-6xl px-4 pb-28 pt-5 md:px-8">{children}</main>}
      {!isLogin && !isReceipt && <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)] md:left-1/2 md:w-[640px] md:-translate-x-1/2 md:rounded-t-2xl md:border-x" aria-label="Staff navigation">
        <div className="mx-auto grid h-[72px] max-w-xl grid-cols-4">
          {links.map(({ href, key, icon }) => {
            const active = pathname === href || (key === "shift" && pathname.startsWith("/shift"));
            const label = t(key);
            return (
              <Link key={href} href={href} className={`relative flex min-h-12 flex-col items-center justify-center gap-1 text-xs font-bold ${active ? "text-[var(--primary)]" : "text-[var(--muted)]"}`}>
                <span className={`relative grid size-8 place-items-center rounded-xl text-xl ${active ? "bg-[var(--primary-soft)]" : ""}`}>
                  {icon}
                  {key === "held" && heldCount > 0 && <span className="absolute -right-2 -top-1 grid size-5 place-items-center rounded-full bg-[var(--warning)] text-[10px] text-white">{heldCount}</span>}
                </span>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>}
      {toast && (
        <div role="status" className="no-print fixed bottom-24 left-1/2 z-50 flex min-h-12 -translate-x-1/2 items-center gap-3 rounded-xl bg-[#17231c] px-4 py-3 text-sm font-semibold text-white shadow-xl">
          <span>{toastLabel}</span>
          {toast === "Sale voided" && <button onClick={() => {
            const sale = usePosStore.getState().undoVoid();
            if (sale) void db.sales.put(sale)
              .then(() => queueForSync(sale.id, "sale"))
              .catch((error: unknown) => console.error("Could not undo sale void offline", error));
          }} className="min-h-9 rounded-lg bg-white/15 px-2 font-extrabold">{t("undo")}</button>}
          <button aria-label="Dismiss notification" onClick={() => usePosStore.setState({ toast: null })} className="grid size-8 place-items-center rounded-lg"><X size={17} /></button>
        </div>
      )}
    </div>
  );
}
