"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Banknote, CheckCircle2, Clock3, CreditCard, LoaderCircle, Smartphone, XCircle } from "lucide-react";
import { currency } from "@/lib/format";
import { db, queueForSync } from "@/lib/db";
import { api } from "@/lib/api/client";
import { cartTotal, usePosStore } from "@/lib/store";
import type { PaymentMethod } from "@/lib/types";

type MpesaState = "idle" | "waiting" | "confirmed" | "failed" | "timeout";

async function finishSale(method: PaymentMethod, amountTendered?: number) {
  const sale = usePosStore.getState().completeSale(method, amountTendered);
  if (!sale) return null;
  try {
    await db.sales.put(sale);
  } catch (error) {
    console.error("Could not save sale offline", error);
    usePosStore.getState().showToast("Sale completed, but its offline copy could not be saved.");
  }
  if (!navigator.onLine) {
    try { await queueForSync(sale.id, "sale"); }
    catch (error) {
      console.error("Could not queue offline sale for sync", error);
      usePosStore.getState().showToast("Sale saved on this device, but could not be added to sync queue.");
    }
  } else {
    void api.createSale(sale).catch(async (error: unknown) => {
      console.error("Could not sync sale; keeping it in the offline queue", error);
      try { await queueForSync(sale.id, "sale"); }
      catch (queueError) {
        console.error("Could not queue sale for sync", queueError);
        usePosStore.getState().showToast("Sale saved on this device, but could not be added to sync queue.");
      }
    });
  }
  return sale;
}

export default function CheckoutPage() {
  const t = useTranslations();
  const cart = usePosStore((state) => state.cart);
  const cardEnabled = usePosStore((state) => state.settings.cardEnabled);
  const setCardEnabled = usePosStore((state) => state.setCardEnabled);
  const total = cartTotal(cart);
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [tendered, setTendered] = useState("");
  const [phone, setPhone] = useState("");
  const [mpesaState, setMpesaState] = useState<MpesaState>("idle");
  const [error, setError] = useState("");
  const amount = Number(tendered);
  const change = Math.max(0, amount - total);

  useEffect(() => {
    setTendered((current) => current || String(total));
  }, [total]);

  async function completeCash() {
    if (!Number.isFinite(amount) || amount < total) { setError(t("amountError")); return; }
    const sale = await finishSale("Cash", amount);
    if (sale) window.location.href = `/receipt/${sale.id}`;
  }

  function requestMpesa() {
    if (!/^(\+?254|0)?[17]\d{8}$/.test(phone.replace(/\s/g, ""))) { setError(t("validPhone")); return; }
    setError("");
    setMpesaState("waiting");
  }

  async function settleMpesa(success: boolean) {
    if (!success) { setMpesaState("failed"); return; }
    setMpesaState("confirmed");
    const sale = await finishSale("M-Pesa");
    if (sale) window.setTimeout(() => { window.location.href = `/receipt/${sale.id}`; }, 900);
  }

  if (!cart.length) return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center"><h1 className="text-xl font-extrabold">{t("emptyCart")}</h1><p className="mt-2 text-sm text-[var(--muted)]">{t("addBeforePayment")}</p><Link href="/sell" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-[var(--primary)] px-5 font-bold text-white">{t("goToProducts")}</Link></div>;

  return <div className="mx-auto max-w-xl space-y-5">
    <Link href="/sell" className="inline-flex min-h-12 items-center gap-2 font-bold text-[var(--muted)]"><ArrowLeft size={18} /> {t("backToSale")}</Link>
    <div><p className="text-sm font-bold text-[var(--muted)]">{t("oneLastStep")}</p><h1 className="mt-1 text-2xl font-extrabold">{t("takePayment")}</h1></div>
    <section className="rounded-2xl bg-[var(--primary)] p-5 text-white"><p className="text-sm font-semibold text-white/80">{t("amountToPay")}</p><p className="mt-1 text-[38px] font-extrabold leading-tight">{currency(total)}</p><p className="mt-2 text-sm text-white/80">{t("manyItems", { count: cart.reduce((sum, line) => sum + line.quantity, 0) })}</p></section>
    <div className="grid grid-cols-3 gap-2">
      {(["Cash", "M-Pesa", ...(cardEnabled ? ["Card"] : [])] as PaymentMethod[]).map((item) => {
        const Icon = item === "Cash" ? Banknote : item === "M-Pesa" ? Smartphone : CreditCard;
        return <button key={item} onClick={() => { setMethod(item); setError(""); setMpesaState("idle"); }} className={`flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-2xl border-2 font-extrabold ${method === item ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border)] bg-[var(--surface)]"}`}><Icon size={23} />{item === "Cash" ? t("cash") : item}</button>;
      })}
    </div>

    {method === "Cash" && <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <label htmlFor="tendered" className="text-sm font-bold">{t("cashReceived")}</label>
      <div className="mt-2 flex h-14 items-center rounded-xl border border-[var(--border)] px-3"><span className="mr-2 text-sm font-bold text-[var(--muted)]">KES</span><input id="tendered" inputMode="numeric" type="number" min={total} value={tendered} onChange={(event) => { setTendered(event.target.value); setError(""); }} placeholder={String(total)} className="w-full bg-transparent text-xl font-extrabold outline-none" /></div>
      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{t("quickAmount")}</p><div className="mt-2 grid grid-cols-3 gap-2">{[total, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100].filter((value, index, list) => list.indexOf(value) === index).map((value) => <button key={value} onClick={() => { setTendered(String(value)); setError(""); }} className="min-h-12 rounded-xl border border-[var(--border)] font-extrabold">{currency(value)}</button>)}</div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-[#f2f5f2] p-3"><span className="font-bold">{t("change")}</span><span className="text-2xl font-extrabold">{currency(change)}</span></div>
      {error && <p role="alert" className="mt-2 text-sm font-bold text-red-700">{error}</p>}
      <button onClick={() => void completeCash()} className="mt-4 min-h-14 w-full rounded-xl bg-[var(--primary)] text-lg font-extrabold text-white">{t("completeSale")}</button>
    </section>}

    {method === "M-Pesa" && <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      {mpesaState === "idle" && <><label htmlFor="phone" className="text-sm font-bold">{t("mpesaNumber")}</label><div className="mt-2 flex h-14 items-center rounded-xl border border-[var(--border)] px-3"><span className="mr-2 font-bold text-[var(--muted)]">🇰🇪 +254</span><input id="phone" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="712 345 678" className="w-full bg-transparent text-lg font-bold outline-none" /></div>{error && <p role="alert" className="mt-2 text-sm font-bold text-red-700">{error}</p>}<button onClick={requestMpesa} className="mt-4 min-h-14 w-full rounded-xl bg-[var(--primary)] text-lg font-extrabold text-white">{t("sendStk")}</button></>}
      {mpesaState === "waiting" && <div className="py-5 text-center"><LoaderCircle className="mx-auto animate-spin text-[var(--primary)]" size={38} /><h2 className="mt-3 text-lg font-extrabold">{t("waitingPayment")}</h2><p className="mt-1 text-sm text-[var(--muted)]">{t("pinPrompt")}</p><p className="mt-2 font-extrabold">{currency(total)} · {phone}</p><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => void settleMpesa(true)} className="min-h-12 rounded-xl bg-[var(--primary)] font-bold text-white">{t("simulatePaid")}</button><button onClick={() => void settleMpesa(false)} className="min-h-12 rounded-xl border border-[var(--border)] font-bold">{t("simulateFailed")}</button></div><button onClick={() => setMpesaState("timeout")} className="mt-2 min-h-12 text-sm font-bold text-[var(--muted)]">{t("simulateTimeout")}</button></div>}
      {mpesaState === "confirmed" && <div className="py-7 text-center text-[var(--primary)]"><CheckCircle2 className="mx-auto" size={45} /><h2 className="mt-3 text-xl font-extrabold">{t("paymentConfirmed")}</h2><p className="mt-1 text-sm text-[var(--muted)]">{t("savingReceipt")}</p></div>}
      {mpesaState === "failed" && <div className="py-6 text-center"><XCircle className="mx-auto text-red-700" size={42} /><h2 className="mt-3 text-lg font-extrabold">{t("paymentNotReceived")}</h2><p className="mt-1 text-sm text-[var(--muted)]">{t("mayRetry")}</p><button onClick={() => setMpesaState("idle")} className="mt-4 min-h-12 w-full rounded-xl border border-[var(--border)] font-bold">{t("tryAgain")}</button></div>}
      {mpesaState === "timeout" && <div className="py-6 text-center"><Clock3 className="mx-auto text-[var(--warning)]" size={42} /><h2 className="mt-3 text-lg font-extrabold">{t("timedOut")}</h2><p className="mt-1 text-sm text-[var(--muted)]">{t("timeoutDescription")}</p><button onClick={() => setMpesaState("idle")} className="mt-4 min-h-12 w-full rounded-xl bg-[var(--primary)] font-bold text-white">{t("sendAgain")}</button></div>}
    </section>}

    {method === "Card" && <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center"><CreditCard className="mx-auto text-[var(--primary)]" size={32} /><h2 className="mt-3 font-extrabold">{t("cardPayment")}</h2><p className="mt-1 text-sm text-[var(--muted)]">{t("cardDescription")}</p><button onClick={() => { void finishSale("Card").then((sale) => { if (sale) window.location.href = `/receipt/${sale.id}`; }); }} className="mt-4 min-h-14 w-full rounded-xl bg-[var(--primary)] font-extrabold text-white">{t("confirmCard")}</button></section>}
    <label className="flex min-h-12 items-center gap-2 text-sm font-semibold text-[var(--muted)]"><input type="checkbox" checked={cardEnabled} onChange={(event) => setCardEnabled(event.target.checked)} className="size-5 accent-[var(--primary)]" /> {t("enableCard")}</label>
  </div>;
}
