"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Barcode, Check, ChevronRight, Minus, Plus, Search, ShoppingBasket, Trash2, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { currency } from "@/lib/format";
import { db, queueForSync } from "@/lib/db";
import { cartTotal, usePosStore } from "@/lib/store";
import type { Category, Product } from "@/lib/types";

const categories: Category[] = ["All", "Vegetables", "Drinks", "Household", "Snacks"];
const categoryKeys: Record<Category, "all" | "vegetables" | "drinks" | "household" | "snacks"> = {
  All: "all", Vegetables: "vegetables", Drinks: "drinks", Household: "household", Snacks: "snacks",
};
type DetectedBarcode = { rawValue: string };
type Detector = { detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]> };
type DetectorWindow = Window & { BarcodeDetector?: new () => Detector };

export default function SellPage() {
  const t = useTranslations();
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [scannerMessage, setScannerMessage] = useState("");
  const [streamActive, setStreamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrame = useRef<number | null>(null);
  const cart = usePosStore((state) => state.cart);
  const addProduct = usePosStore((state) => state.addProduct);
  const updateQuantity = usePosStore((state) => state.updateQuantity);
  const updatePrice = usePosStore((state) => state.updatePrice);
  const removeLine = usePosStore((state) => state.removeLine);
  const holdCart = usePosStore((state) => state.holdCart);
  const showToast = usePosStore((state) => state.showToast);
  const total = cartTotal(cart);
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);

  useEffect(() => { api.listProducts().then(setProducts).catch((error: unknown) => console.error("Could not load products", error)); }, []);

  const visibleProducts = useMemo(() => products.filter((product) =>
    (category === "All" || product.category === category)
    && `${product.name} ${product.category}`.toLowerCase().includes(search.toLowerCase()),
  ), [products, category, search]);

  function addScannedProduct(value: string) {
    const found = products.find((product) => product.barcode === value);
    if (found) {
      addProduct(found);
      setScannerMessage(t("productAdded", { name: found.name }));
      setBarcode("");
    } else {
      setScannerMessage(t("noProductFound"));
    }
  }

  async function startCamera() {
    setScannerMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerMessage("Camera is not available. Enter the barcode below.");
      return;
    }
    if (!(window as DetectorWindow).BarcodeDetector) {
      setScannerMessage("Barcode scanning is not supported on this phone. Enter the barcode below.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreamActive(true);
        const detector = new (window as DetectorWindow).BarcodeDetector!();
        const scan = async () => {
          if (!videoRef.current || !streamRef.current) return;
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) {
            addScannedProduct(codes[0].rawValue);
            stopCamera();
            return;
          }
          scanFrame.current = window.requestAnimationFrame(() => { void scan(); });
        };
        void scan();
      }
    } catch (error) {
      console.error("Could not start barcode camera", error);
      setScannerMessage("Camera access was blocked. Enter the barcode below.");
    }
  }

  function stopCamera() {
    if (scanFrame.current !== null) window.cancelAnimationFrame(scanFrame.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStreamActive(false);
  }

  useEffect(() => () => {
    if (scanFrame.current !== null) window.cancelAnimationFrame(scanFrame.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function saveHeldOrder() {
    const order = holdCart();
    if (!order) return;
    void db.heldOrders.put(order).then(async () => {
      if (!navigator.onLine) { await queueForSync(order.id, "held-order"); return; }
      try { await api.saveHeldOrder(order); }
      catch (error) {
        console.error("Could not sync held order; keeping it offline", error);
        await queueForSync(order.id, "held-order");
      }
    }).catch((error: unknown) => {
      console.error("Could not save held order offline", error);
      showToast("Could not save order on this device");
    });
    setCartOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-[var(--muted)]">{t("tillToday")}</p><h1 className="mt-1 text-2xl font-extrabold">{t("newSale")}</h1></div><button onClick={() => setScannerOpen(true)} className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold"><Barcode size={20} /> {t("scan")}</button></div>
      <label className="flex h-14 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4">
        <Search className="shrink-0 text-[var(--muted)]" size={20} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("searchProducts")} className="w-full bg-transparent text-base outline-none placeholder:text-[var(--muted)]" />
        {search && <button aria-label={t("clearSearch")} onClick={() => setSearch("")} className="flex min-h-12 items-center gap-1 text-sm font-bold"><X size={18} />{t("clearSearch")}</button>}
      </label>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`min-h-12 shrink-0 rounded-full border px-4 text-sm font-bold ${category === item ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"}`}>{t(categoryKeys[item])}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-3 pb-3 sm:grid-cols-3 lg:grid-cols-4">
        {visibleProducts.map((product) => {
          const inCart = cart.find((line) => line.product.id === product.id);
          return <button key={product.id} onClick={() => addProduct(product)} className="relative min-h-[151px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left shadow-[0_1px_2px_rgba(20,40,28,.04)] active:scale-[.98]">
            {inCart && <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-[var(--primary)] text-xs font-extrabold text-white">{inCart.quantity}</span>}
            <span className={`grid size-[58px] place-items-center rounded-2xl text-[32px] ${product.color}`}>{product.emoji}</span>
            <span className="mt-3 block text-sm font-bold leading-tight">{product.name}</span>
            <span className="mt-1 block text-xs text-[var(--muted)]">{product.unit}</span>
            <span className="mt-2 block text-2xl font-extrabold text-[var(--primary)]">{currency(product.price)}</span>
          </button>;
        })}
      </div>
      {visibleProducts.length === 0 && <div className="rounded-2xl border border-dashed border-[var(--border)] py-12 text-center"><ShoppingBasket className="mx-auto text-[var(--muted)]" /><p className="mt-3 font-bold">{t("noProducts")}</p><p className="mt-1 text-sm text-[var(--muted)]">{t("searchHint")}</p></div>}

      {cart.length > 0 && <button onClick={() => setCartOpen(true)} className="no-print safe-bottom fixed inset-x-3 bottom-[82px] z-20 mx-auto flex min-h-16 max-w-2xl items-center justify-between rounded-2xl bg-[var(--primary)] px-4 text-white shadow-xl">
        <span className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-white/15 font-extrabold">{count}</span><span className="text-left"><span className="block text-xs font-semibold text-white/80">{t(count === 1 ? "oneItem" : "manyItems", { count })}</span><span className="text-2xl font-extrabold">{currency(total)}</span></span></span><span className="flex items-center gap-1 font-extrabold">{t("viewCart")} <ChevronRight size={20} /></span>
      </button>}

      <Dialog.Root open={cartOpen} onOpenChange={setCartOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-t-[24px] bg-[var(--surface)] p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-2xl focus:outline-none">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300" />
            <div className="flex items-center justify-between"><div><Dialog.Title className="text-xl font-extrabold">{t("yourCart")}</Dialog.Title><Dialog.Description className="mt-1 text-sm text-[var(--muted)]">{t("cartDescription")}</Dialog.Description></div><Dialog.Close asChild><button className="flex h-12 items-center gap-1 rounded-xl bg-gray-100 px-2 text-sm font-bold" aria-label={t("close")}><X />{t("close")}</button></Dialog.Close></div>
            <div className="mt-4 divide-y divide-[var(--border)]">
              {cart.map((line) => <div key={line.product.id} className="py-4">
                <div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className={`grid size-11 place-items-center rounded-xl text-2xl ${line.product.color}`}>{line.product.emoji}</span><div><p className="font-bold">{line.product.name}</p><p className="text-xs text-[var(--muted)]">{currency(line.unitPrice)} {t("each")} · {line.product.unit}</p></div></div><button onClick={() => removeLine(line.product.id)} aria-label={`${t("remove")} ${line.product.name}`} className="flex min-h-12 items-center gap-1 rounded-xl px-2 text-sm font-bold text-red-700"><Trash2 size={17} />{t("remove")}</button></div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2"><button onClick={() => updateQuantity(line.product.id, line.quantity - 1)} aria-label={`Decrease ${line.product.name} quantity`} className="grid size-12 place-items-center rounded-xl border border-[var(--border)]"><Minus size={17} /></button><span className="min-w-7 text-center text-lg font-extrabold">{line.quantity}</span><button onClick={() => updateQuantity(line.product.id, line.quantity + 1)} aria-label={`Increase ${line.product.name} quantity`} className="grid size-12 place-items-center rounded-xl border border-[var(--border)]"><Plus size={17} /></button></div>
                  <label className="flex h-12 w-[145px] items-center rounded-xl border border-[var(--border)] px-2"><span className="mr-1 text-xs font-bold text-[var(--muted)]">KES</span><input aria-label={`${line.product.name} price`} type="number" min="0" value={line.unitPrice} onChange={(event) => updatePrice(line.product.id, Math.max(0, Number(event.target.value)))} className="w-full bg-transparent text-right font-extrabold outline-none" /></label>
                </div>
                <p className="mt-2 text-right text-sm font-bold">{currency(line.quantity * line.unitPrice)}</p>
              </div>)}
            </div>
            <div className="border-t border-[var(--border)] pt-4"><div className="flex items-center justify-between"><span className="text-base font-bold">{t("total")}</span><span className="text-4xl font-extrabold">{currency(total)}</span></div>
              <Link href="/checkout" onClick={() => setCartOpen(false)} className="mt-4 flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] text-lg font-extrabold text-white">{t("continuePayment")} <ChevronRight /></Link>
              <button onClick={saveHeldOrder} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] font-bold">{t("holdOrder")}</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={scannerOpen} onOpenChange={(open) => { setScannerOpen(open); if (!open) stopCamera(); }}>
        <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" /><Dialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-2xl bg-[var(--surface)] p-5 shadow-xl focus:outline-none">
          <div className="flex items-center justify-between"><Dialog.Title className="text-xl font-extrabold">{t("scanBarcode")}</Dialog.Title><Dialog.Close asChild><button aria-label={t("close")} className="flex h-12 items-center gap-1 rounded-xl bg-gray-100 px-2 text-sm font-bold"><X />{t("close")}</button></Dialog.Close></div>
          <video ref={videoRef} className={`mt-4 aspect-video w-full rounded-xl bg-black object-cover ${streamActive ? "block" : "hidden"}`} muted playsInline />
          <p className="mt-3 text-sm text-[var(--muted)]">{scannerMessage || t("scanInstructions")}</p>
          {!streamActive && <button onClick={() => void startCamera()} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] font-bold"><Barcode size={18} /> {t("openCamera")}</button>}
          {streamActive && <button onClick={stopCamera} className="mt-3 min-h-12 w-full rounded-xl border border-[var(--border)] font-bold">{t("stopCamera")}</button>}
          <form onSubmit={(event) => { event.preventDefault(); addScannedProduct(barcode); }} className="mt-3 flex gap-2"><input autoFocus value={barcode} onChange={(event) => setBarcode(event.target.value)} inputMode="numeric" placeholder={t("enterBarcode")} className="min-w-0 flex-1 rounded-xl border border-[var(--border)] px-3 outline-none focus:border-[var(--primary)]" /><button className="flex min-h-12 items-center gap-1 rounded-xl bg-[var(--primary)] px-3 font-bold text-white"><Check size={18} />{t("add")}</button></form>
        </Dialog.Content></Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
