"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ReceiptText, Banknote, Smartphone, CreditCard, CircleAlert } from "lucide-react";
import { api } from "@/lib/api/client";
import { currency, timeLabel } from "@/lib/format";
import { db, queueForSync } from "@/lib/db";
import { usePosStore } from "@/lib/store";
import type { Sale } from "@/lib/types";
import { useTranslations } from "next-intl";

export default function HistoryPage() {
  const t = useTranslations();
  const localSales = usePosStore((state) => state.sales);
  const shiftStartedAt = usePosStore((state) => state.shift?.startedAt);
  const voidSale = usePosStore((state) => state.voidSale);
  const loadLocalData = usePosStore((state) => state.loadLocalData);
  const [remoteSales, setRemoteSales] = useState<Sale[]>([]);
  const [selected, setSelected] = useState<Sale | null>(null);
  const [reason, setReason] = useState("");
  const [showVoidForm, setShowVoidForm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([db.sales.toArray(), api.listSales()])
      .then(([stored, remote]) => { loadLocalData([...stored, ...remote], []); setRemoteSales(remote); })
      .catch((cause: unknown) => console.error("Could not load sales history", cause));
  }, [loadLocalData]);

  const sales = useMemo(() => {
    const all = [...localSales, ...remoteSales];
    return all.filter((sale, index) => all.findIndex((item) => item.id === sale.id) === index)
      .filter((sale) => !shiftStartedAt || sale.createdAt >= shiftStartedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [localSales, remoteSales, shiftStartedAt]);

  function confirmVoid() {
    if (!selected || !reason.trim()) { setError(t("reasonRequired")); return; }
    voidSale(selected.id, reason.trim());
    const updated = { ...selected, voidReason: reason.trim() };
    void db.sales.put(updated).then(() => queueForSync(updated.id, "sale")).catch((cause: unknown) => console.error("Could not update voided sale offline", cause));
    setSelected(null);
    setShowVoidForm(false);
    setReason("");
    setError("");
  }

  return <div className="space-y-5">
    <div><p className="text-sm font-bold text-[var(--muted)]">{t("salesOnDevice")}</p><h1 className="mt-1 text-2xl font-extrabold">{t("salesHistory")}</h1></div>
    {sales.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-12 text-center"><ReceiptText className="mx-auto text-[var(--muted)]" size={30} /><h2 className="mt-4 font-extrabold">{t("noSales")}</h2><p className="mt-1 text-sm text-[var(--muted)]">{t("salesAppearHere")}</p></div> :
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {sales.map((sale) => {
          const Icon = sale.method === "Cash" ? Banknote : sale.method === "M-Pesa" ? Smartphone : CreditCard;
          return <button key={sale.id} onClick={() => { setSelected(sale); setShowVoidForm(false); }} className="flex min-h-[76px] w-full items-center justify-between gap-3 border-b border-[var(--border)] px-4 text-left last:border-0 active:bg-gray-50">
            <span className="flex min-w-0 items-center gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${sale.voidReason ? "bg-gray-100 text-gray-500" : "bg-green-50 text-[var(--primary)]"}`}><Icon size={20} /></span><span className="min-w-0"><span className="block truncate font-bold">{sale.method === "Cash" ? t("cash") : sale.method} · {sale.id}</span><span className="mt-1 block text-xs text-[var(--muted)]">{timeLabel(sale.createdAt)} · {t("manyItems", { count: sale.items.length })} {sale.voidReason && `· ${t("voided").toUpperCase()}`}</span></span></span>
            <span className={`shrink-0 text-lg font-extrabold ${sale.voidReason ? "text-[var(--muted)] line-through" : ""}`}>{currency(sale.total)}</span>
          </button>;
        })}
      </section>}

    {selected && <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 sm:items-center" onClick={() => { setSelected(null); setShowVoidForm(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="sale-detail-title" onClick={(event) => event.stopPropagation()} className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-5 sm:rounded-3xl">
        <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{t("saleDetails")}</p><h2 id="sale-detail-title" className="mt-1 text-xl font-extrabold">{selected.id}</h2></div><button onClick={() => setSelected(null)} aria-label={t("close")} className="flex h-12 items-center gap-1 rounded-xl bg-gray-100 px-2 text-sm font-bold"><X />{t("close")}</button></div>
        <p className="mt-2 text-sm text-[var(--muted)]">{new Date(selected.createdAt).toLocaleDateString("en-KE")} · {timeLabel(selected.createdAt)} · {selected.method === "Cash" ? t("cash") : selected.method}</p>
        <div className="mt-4 divide-y divide-[var(--border)]">{selected.items.map((line) => <div key={line.product.id} className="flex justify-between py-3 text-sm"><span>{line.quantity}× {line.product.name}</span><span className="font-bold">{currency(line.quantity * line.unitPrice)}</span></div>)}</div>
        <div className="flex justify-between border-t border-[var(--border)] pt-3 text-lg font-extrabold"><span>Total</span><span>{currency(selected.total)}</span></div>
        {selected.voidReason && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">Voided: {selected.voidReason}</p>}
        {!selected.voidReason && !showVoidForm && <button onClick={() => setShowVoidForm(true)} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-300 font-bold text-red-800"><CircleAlert size={18} /> {t("void")}</button>}
        {!selected.voidReason && showVoidForm && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3"><p className="font-extrabold text-red-900">{t("confirmVoid")}</p><p className="mt-1 text-sm text-red-900">{t("voidWarning")}</p><label htmlFor="void-reason" className="mt-3 block text-sm font-bold">{t("voidReason")}</label><textarea id="void-reason" value={reason} onChange={(event) => { setReason(event.target.value); setError(""); }} rows={2} className="mt-1 w-full rounded-xl border border-red-200 bg-white p-3 outline-none" placeholder={t("voidReason")} />{error && <p role="alert" className="mt-1 text-sm font-bold text-red-800">{error}</p>}<div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => setShowVoidForm(false)} className="min-h-12 rounded-xl border border-red-200 font-bold">{t("keepSale")}</button><button onClick={confirmVoid} className="min-h-12 rounded-xl bg-red-800 font-bold text-white">{t("confirm")}</button></div></div>}
      </section>
    </div>}
  </div>;
}
