"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Clock3, Plus, ReceiptText, ShoppingBag, Sparkles } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { currency, timeLabel } from "@/lib/format";
import { api } from "@/lib/api/client";
import { useEffect, useState } from "react";
import type { Sale } from "@/lib/types";
import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations();
  const staffName = usePosStore((state) => state.shift?.staffName || "Mary");
  const shift = usePosStore((state) => state.shift);
  const heldCount = usePosStore((state) => state.heldOrders.length);
  const [remoteSales, setRemoteSales] = useState<Sale[]>([]);
  const localSales = usePosStore((state) => state.sales);
  useEffect(() => { api.listSales().then(setRemoteSales).catch((error: unknown) => console.error("Could not load sales", error)); }, []);

  const allSales = [...localSales, ...remoteSales].filter((sale, index, sales) =>
    sales.findIndex((item) => item.id === sale.id) === index,
  );
  const today = new Date();
  const sales = allSales.filter((sale) => {
    const created = new Date(sale.createdAt);
    return created.getFullYear() === today.getFullYear()
      && created.getMonth() === today.getMonth()
      && created.getDate() === today.getDate();
  });
  const todaySales = sales.reduce((sum, sale) => sum + (sale.voidReason ? 0 : sale.total), 0);

  return (
    <div className="space-y-5">
      <section className="flex items-center justify-between gap-3 pt-1">
        <div><p className="text-sm font-semibold text-[var(--muted)]">{t("hello", { name: staffName })}</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight">{t("readyToServe")}</h1></div>
        <div className="grid size-12 place-items-center rounded-2xl bg-[#ffefd2] text-2xl" aria-hidden="true">👩🏾‍🌾</div>
      </section>

      <section className="rounded-2xl bg-[var(--primary)] p-5 text-white shadow-sm">
        <div className="flex items-start justify-between">
          <div><p className="text-sm font-semibold text-white/80">{t("todaySales")}</p><p className="mt-2 text-4xl font-extrabold leading-none tracking-tight">{currency(todaySales)}</p></div>
          <span className="grid size-11 place-items-center rounded-xl bg-white/15"><ArrowUpRight size={22} /></span>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-white/20 pt-4 text-sm">
          <span className="flex items-center gap-2 text-white/85"><ReceiptText size={17} /> {t("salesCount", { count: sales.length })}</span>
          <span className="rounded-full bg-white/15 px-3 py-1 font-bold">KES</span>
        </div>
      </section>

      <Link href="/sell" className="flex min-h-[68px] w-full items-center justify-between rounded-2xl bg-[#f1a900] px-5 text-[#211900] shadow-sm active:scale-[.99]">
        <span className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-black/10"><Plus size={27} strokeWidth={3} /></span><span className="text-lg font-extrabold">{t("newSale")}</span></span>
        <span className="text-sm font-bold">{t("startSelling")} <span aria-hidden="true">→</span></span>
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/held" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 active:bg-gray-50">
          <span className="grid size-10 place-items-center rounded-xl bg-orange-50 text-orange-800"><ShoppingBag size={21} /></span>
          <p className="mt-4 text-2xl font-extrabold">{heldCount}</p><p className="text-sm font-semibold text-[var(--muted)]">{t("heldOrders")}</p>
        </Link>
        <Link href="/shift/close" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 active:bg-gray-50">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-800"><Clock3 size={21} /></span>
          <p className="mt-4 text-sm font-extrabold">{shift ? t("shiftProgress") : t("noActiveShift")}</p><p className="mt-1 text-sm font-semibold text-[var(--muted)]">{shift ? `Since ${timeLabel(shift.startedAt)}` : t("tapToStart")}</p>
        </Link>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-extrabold">{t("recentSales")}</h2><Link href="/history" className="flex min-h-12 items-center gap-1 text-sm font-bold text-[var(--primary)]">{t("seeAll")} <ArrowUpRight size={15} /></Link></div>
        {sales.slice(0, 3).map((sale) => (
          <div key={sale.id} className="flex min-h-[58px] items-center justify-between border-t border-[var(--border)]">
            <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-green-50 text-green-800">{sale.method === "Cash" ? <ArrowDownLeft size={18} /> : <Sparkles size={17} />}</span><div><p className="text-sm font-bold">{sale.method === "Cash" ? t("cashSale") : t("mpesaSale")}</p><p className="text-xs text-[var(--muted)]">{timeLabel(sale.createdAt)}</p></div></div>
            <p className={`font-extrabold ${sale.voidReason ? "text-[var(--muted)] line-through" : ""}`}>{currency(sale.total)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
