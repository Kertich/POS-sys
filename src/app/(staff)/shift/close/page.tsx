"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Banknote, CheckCircle2, Clock3, Smartphone } from "lucide-react";
import { currency, timeLabel } from "@/lib/format";
import { usePosStore } from "@/lib/store";

export default function ShiftClosePage() {
  const t = useTranslations();
  const shift = usePosStore((state) => state.shift);
  const sales = usePosStore((state) => state.sales);
  const endShift = usePosStore((state) => state.endShift);
  const [counted, setCounted] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [closed, setClosed] = useState(false);
  const shiftSales = useMemo(() => sales.filter((sale) =>
    !sale.voidReason && (!shift || sale.createdAt >= shift.startedAt),
  ), [sales, shift]);
  const cashSales = shiftSales.filter((sale) => sale.method === "Cash").reduce((sum, sale) => sum + sale.total, 0);
  const mpesaSales = shiftSales.filter((sale) => sale.method === "M-Pesa").reduce((sum, sale) => sum + sale.total, 0);
  const cardSales = shiftSales.filter((sale) => sale.method === "Card").reduce((sum, sale) => sum + sale.total, 0);
  const expected = (shift?.openingFloat || 0) + cashSales;
  const difference = Number(counted || 0) - expected;

  if (closed) return <div className="mx-auto max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 text-center"><CheckCircle2 className="mx-auto text-[var(--primary)]" size={48} /><h1 className="mt-4 text-2xl font-extrabold">{t("shiftClosed")}</h1><p className="mt-2 text-sm text-[var(--muted)]">{t("allDone")}</p><Link href="/home" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-[var(--primary)] px-5 font-bold text-white">{t("backToHome")}</Link></div>;

  if (!shift) return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center"><Clock3 className="mx-auto text-[var(--muted)]" size={32} /><h1 className="mt-4 text-xl font-extrabold">{t("noShift")}</h1><p className="mt-2 text-sm text-[var(--muted)]">{t("loginToStart")}</p><Link href="/login" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-[var(--primary)] px-5 font-bold text-white">{t("startAShift")}</Link></div>;

  return <div className="mx-auto max-w-xl space-y-5">
    <div><p className="text-sm font-bold text-[var(--muted)]">{t("tillStarted", { name: shift.staffName, time: timeLabel(shift.startedAt) })}</p><h1 className="mt-1 text-2xl font-extrabold">{t("closeShift")}</h1></div>
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="font-extrabold">{t("shiftSummary")}</h2>
      <div className="mt-3 divide-y divide-[var(--border)]">
        <SummaryRow icon={<Banknote size={19} />} label={t("openingFloatLabel")} value={shift.openingFloat} />
        <SummaryRow icon={<Banknote size={19} />} label={t("cashSales", { count: shiftSales.filter((sale) => sale.method === "Cash").length })} value={cashSales} />
        <SummaryRow icon={<Smartphone size={19} />} label={t("mpesaSales", { count: shiftSales.filter((sale) => sale.method === "M-Pesa").length })} value={mpesaSales} />
        {cardSales > 0 && <SummaryRow icon={<Banknote size={19} />} label={t("cardSales")} value={cardSales} />}
        <div className="flex items-center justify-between py-4"><span className="font-extrabold">{t("expectedCash")}</span><span className="text-2xl font-extrabold">{currency(expected)}</span></div>
      </div>
    </section>
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <label htmlFor="counted" className="font-extrabold">{t("countCash")}</label>
      <div className="mt-2 flex h-14 items-center rounded-xl border border-[var(--border)] px-3"><span className="mr-2 text-sm font-bold text-[var(--muted)]">KES</span><input id="counted" type="number" inputMode="numeric" min="0" value={counted} onChange={(event) => setCounted(event.target.value)} placeholder="Enter amount" className="w-full bg-transparent text-xl font-extrabold outline-none" /></div>
      {counted !== "" && <div className={`mt-4 rounded-xl p-4 ${difference === 0 ? "bg-green-50 text-green-900" : "bg-amber-50 text-amber-950"}`}><p className="text-sm font-bold">{difference === 0 ? t("tillBalances") : difference < 0 ? t("cashShort") : t("cashOver")}</p><p className="mt-1 text-3xl font-extrabold">{difference > 0 ? "+" : ""}{currency(difference)}</p></div>}
    </section>
    {!confirming ? <button onClick={() => setConfirming(true)} disabled={counted === ""} className="min-h-14 w-full rounded-xl bg-[var(--primary)] text-lg font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50">{t("reviewClose")}</button> :
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4"><h2 className="font-extrabold text-amber-950">{t("sureClose")}</h2><p className="mt-1 text-sm text-amber-950">{t("closeDescription", { amount: currency(Number(counted)) })}</p><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => setConfirming(false)} className="min-h-12 rounded-xl border border-amber-300 font-bold">{t("goBack")}</button><button onClick={() => { endShift(); setClosed(true); }} className="min-h-12 rounded-xl bg-[var(--primary)] font-extrabold text-white">{t("confirm")}</button></div></div>}
  </div>;
}

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="flex min-h-[54px] items-center justify-between gap-3 py-2"><span className="flex items-center gap-2 text-sm font-semibold"><span className="text-[var(--muted)]">{icon}</span>{label}</span><span className="font-extrabold">{currency(value)}</span></div>;
}
