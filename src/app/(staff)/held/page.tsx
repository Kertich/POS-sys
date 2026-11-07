"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Clock3, Play, Trash2 } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { currency, timeLabel } from "@/lib/format";
import { db, queueForSync, removeQueuedSync } from "@/lib/db";
import { api } from "@/lib/api/client";
import { useTranslations } from "next-intl";

export default function HeldPage() {
  const t = useTranslations();
  const orders = usePosStore((state) => state.heldOrders);
  const resumeOrder = usePosStore((state) => state.resumeOrder);
  const deleteOrder = usePosStore((state) => state.deleteOrder);
  const loadLocalData = usePosStore((state) => state.loadLocalData);

  useEffect(() => {
    void db.heldOrders.toArray().then((items) => loadLocalData([], items)).catch((error: unknown) => console.error("Could not load offline orders", error));
  }, [loadLocalData]);

  function resume(id: string) {
    resumeOrder(id);
    void db.heldOrders.delete(id).then(async () => {
      await removeQueuedSync(id, "held-order");
      if (navigator.onLine) {
        try { await api.deleteHeldOrder(id); }
        catch (error) {
          console.error("Could not sync resumed order deletion; keeping it in the offline queue", error);
          await queueForSync(id, "held-order", "delete");
        }
      } else {
        await queueForSync(id, "held-order", "delete");
      }
    }).catch((error: unknown) => console.error("Could not remove resumed order", error));
  }

  function remove(id: string) {
    deleteOrder(id);
    void db.heldOrders.delete(id).then(async () => {
      if (navigator.onLine) {
        await removeQueuedSync(id, "held-order");
        try { await api.deleteHeldOrder(id); }
        catch (error) {
          console.error("Could not sync held order deletion; keeping it in the offline queue", error);
          await queueForSync(id, "held-order", "delete");
        }
      } else {
        await queueForSync(id, "held-order", "delete");
      }
    }).catch((error: unknown) => console.error("Could not delete held order offline", error));
  }

  return <div className="space-y-5">
    <div><p className="text-sm font-bold text-[var(--muted)]">{t("savedCarts")}</p><h1 className="mt-1 text-2xl font-extrabold">{t("heldOrdersTitle")}</h1></div>
    {orders.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-12 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-orange-50 text-orange-800"><Clock3 size={27} /></span><h2 className="mt-4 text-lg font-extrabold">{t("nothingHeld")}</h2><p className="mt-1 text-sm text-[var(--muted)]">{t("heldDescription")}</p><Link href="/sell" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-[var(--primary)] px-5 font-bold text-white">{t("startSale")}</Link></div> :
      <div className="space-y-3">{orders.map((order) => <article key={order.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-start justify-between gap-3"><div><h2 className="font-extrabold">{order.name}</h2><p className="mt-1 text-sm text-[var(--muted)]">{timeLabel(order.createdAt)} · {order.items.reduce((sum, line) => sum + line.quantity, 0)} items</p></div><span className="text-xl font-extrabold">{currency(order.total)}</span></div>
        <p className="mt-3 text-sm text-[var(--muted)]">{order.items.map((line) => `${line.quantity}× ${line.product.name}`).join(" · ")}</p>
        <div className="mt-4 flex gap-2"><Link href="/sell" onClick={() => resume(order.id)} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] font-extrabold text-white"><Play size={17} fill="currentColor" /> {t("resumeOrder")}</Link><button onClick={() => { if (window.confirm(t("deleteOrderConfirm"))) remove(order.id); }} aria-label={t("delete")} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 font-bold text-red-800"><Trash2 size={17} />{t("delete")}</button></div>
      </article>)}</div>}
  </div>;
}
