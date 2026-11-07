"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bluetooth, CheckCircle2, MessageCircle, Printer, Smartphone } from "lucide-react";
import { currency, timeLabel } from "@/lib/format";
import { db } from "@/lib/db";
import { printReceiptWithBluetooth } from "@/lib/printer";
import { usePosStore } from "@/lib/store";
import type { Sale } from "@/lib/types";
import { useTranslations } from "next-intl";

export default function ReceiptPage() {
  const t = useTranslations();
  const { id } = useParams<{ id: string }>();
  const saleFromStore = usePosStore((state) => state.sales.find((item) => item.id === id));
  const [storedSale, setStoredSale] = useState<Sale | undefined>();
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!saleFromStore) void db.sales.get(id).then(setStoredSale).catch((error: unknown) => console.error("Could not load receipt", error));
  }, [id, saleFromStore]);
  const sale = saleFromStore || storedSale;
  const receiptText = useMemo(() => sale
    ? t("receiptShare", { id: sale.id, total: currency(sale.total), method: sale.method === "Cash" ? t("cash") : sale.method })
    : "", [sale, t]);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(receiptText)}`;

  if (!sale) return <div className="mx-auto max-w-md py-12 text-center"><h1 className="text-xl font-extrabold">{t("receiptNotFound")}</h1><p className="mt-2 text-sm text-[var(--muted)]">{t("receiptMissing")}</p><Link href="/home" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-[var(--primary)] px-5 font-bold text-white">{t("backToHome")}</Link></div>;

  return <main className="mx-auto min-h-[calc(100dvh-60px)] max-w-md px-4 py-8">
    <div className="no-print text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-green-100 text-[var(--primary)]"><CheckCircle2 size={37} /></span><h1 className="mt-4 text-2xl font-extrabold">{t("saleComplete")}</h1><p className="mt-1 text-sm text-[var(--muted)]">{t("paymentReceived")}</p></div>
    <section className="receipt-print mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="text-center"><h2 className="text-lg font-extrabold">SOKO POS</h2><p className="mt-1 text-xs">{t("welcomeAgain")}</p><p className="mt-3 text-xs">Receipt {sale.id}</p><p className="text-xs">{new Date(sale.createdAt).toLocaleDateString("en-KE")} · {timeLabel(sale.createdAt)}</p></div>
      <div className="my-4 border-t border-dashed border-gray-400" />
      {sale.items.map((line) => <div key={line.product.id} className="flex justify-between gap-3 py-1 text-sm"><span>{line.quantity}× {line.product.name}</span><span className="font-bold">{currency(line.quantity * line.unitPrice)}</span></div>)}
      <div className="my-3 border-t border-dashed border-gray-400" />
      <div className="flex justify-between text-sm"><span>{t("paidBy")}</span><span className="font-bold">{sale.method === "Cash" ? t("cash") : sale.method}</span></div>
      {sale.amountTendered && <><div className="mt-1 flex justify-between text-sm"><span>{t("cashReceivedLabel")}</span><span>{currency(sale.amountTendered)}</span></div><div className="mt-1 flex justify-between text-sm"><span>{t("change")}</span><span>{currency(Math.max(0, sale.amountTendered - sale.total))}</span></div></>}
      <div className="mt-3 flex justify-between text-lg font-extrabold"><span>{t("total")}</span><span>{currency(sale.total)}</span></div>
      <p className="mt-4 text-center text-xs">Thank you for shopping local 💚</p>
    </section>
    {notice && <p role="status" className="no-print mt-3 text-center text-sm font-bold text-[var(--primary)]">{notice}</p>}
    <div className="no-print mt-5 grid grid-cols-2 gap-2">
      <button onClick={() => window.print()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] font-bold"><Printer size={18} /> {t("print")}</button>
      <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] font-bold"><MessageCircle size={18} /> {t("whatsapp")}</a>
      <a href={`sms:?body=${encodeURIComponent(receiptText)}`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] font-bold"><Smartphone size={18} /> {t("sms")}</a>
      <button onClick={() => void printReceiptWithBluetooth().catch((error: unknown) => {
        console.error("Bluetooth printer is unavailable", error);
        setNotice(error instanceof Error && error.message === "Bluetooth printing is not supported on this device."
          ? t("printerUnsupported")
          : t("printerUnconfigured"));
      })} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] font-bold"><Bluetooth size={18} /> {t("bluetooth")}</button>
    </div>
    <Link href="/sell" className="no-print mt-3 flex min-h-14 items-center justify-center rounded-xl bg-[var(--primary)] text-lg font-extrabold text-white">{t("newSaleButton")}</Link>
  </main>;
}
