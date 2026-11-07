"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, HeldOrder, PaymentMethod, Product, Sale, Shift } from "@/lib/types";
import type { Locale } from "@/lib/i18n";

interface PosSettings {
  locale: Locale;
  sunMode: boolean;
  cardEnabled: boolean;
}

interface PosState {
  cart: CartLine[];
  heldOrders: HeldOrder[];
  sales: Sale[];
  shift: Shift | null;
  settings: PosSettings;
  toast: string | null;
  lastVoidedId: string | null;
  addProduct: (product: Product) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updatePrice: (productId: string, price: number) => void;
  removeLine: (productId: string) => void;
  clearCart: () => void;
  holdCart: (name?: string) => HeldOrder | null;
  resumeOrder: (id: string) => void;
  deleteOrder: (id: string) => void;
  completeSale: (method: PaymentMethod, amountTendered?: number) => Sale | null;
  startShift: (staffName: string, openingFloat: number) => void;
  setLocale: (locale: Locale) => void;
  setSunMode: (enabled: boolean) => void;
  setCardEnabled: (enabled: boolean) => void;
  endShift: () => void;
  voidSale: (id: string, reason: string) => void;
  undoVoid: () => Sale | null;
  showToast: (message: string) => void;
  loadLocalData: (sales: Sale[], heldOrders: HeldOrder[]) => void;
}

const sum = (lines: CartLine[]) => lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0);

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      cart: [],
      heldOrders: [],
      sales: [],
      shift: null,
      settings: { locale: "en", sunMode: false, cardEnabled: false },
      toast: null,
      lastVoidedId: null,
      addProduct: (product) =>
        set((state) => {
          const found = state.cart.find((line) => line.product.id === product.id);
          return {
            cart: found
              ? state.cart.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line)
              : [...state.cart, { product, quantity: 1, unitPrice: product.price }],
          };
        }),
      updateQuantity: (productId, quantity) =>
        set((state) => ({ cart: quantity < 1 ? state.cart.filter((line) => line.product.id !== productId) : state.cart.map((line) => line.product.id === productId ? { ...line, quantity } : line) })),
      updatePrice: (productId, price) =>
        set((state) => ({ cart: state.cart.map((line) => line.product.id === productId ? { ...line, unitPrice: price } : line) })),
      removeLine: (productId) => set((state) => ({ cart: state.cart.filter((line) => line.product.id !== productId) })),
      clearCart: () => set({ cart: [] }),
      holdCart: (name) => {
        const { cart } = get();
        if (!cart.length) return null;
        const order: HeldOrder = { id: crypto.randomUUID(), name: name || `Order ${new Date().toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" })}`, createdAt: new Date().toISOString(), items: cart, total: sum(cart) };
        set((state) => ({ heldOrders: [order, ...state.heldOrders], cart: [], toast: "Order saved for later" }));
        return order;
      },
      resumeOrder: (id) => set((state) => {
        const order = state.heldOrders.find((item) => item.id === id);
        return order ? { cart: [...state.cart, ...order.items], heldOrders: state.heldOrders.filter((item) => item.id !== id), toast: "Order ready to continue" } : state;
      }),
      deleteOrder: (id) => set((state) => ({ heldOrders: state.heldOrders.filter((item) => item.id !== id), toast: "Held order deleted" })),
      completeSale: (method, amountTendered) => {
        const { cart } = get();
        if (!cart.length) return null;
        const sale: Sale = { id: `S-${Date.now().toString().slice(-6)}`, createdAt: new Date().toISOString(), items: cart, total: sum(cart), method, amountTendered };
        set((state) => ({ sales: [sale, ...state.sales], cart: [], toast: "Sale complete" }));
        return sale;
      },
      startShift: (staffName, openingFloat) => set({ shift: { staffName, openingFloat, startedAt: new Date().toISOString() }, toast: `Welcome, ${staffName}` }),
      setLocale: (locale) => set((state) => ({ settings: { ...state.settings, locale } })),
      setSunMode: (enabled) => set((state) => ({ settings: { ...state.settings, sunMode: enabled } })),
      setCardEnabled: (enabled) => set((state) => ({ settings: { ...state.settings, cardEnabled: enabled } })),
      endShift: () => set({ shift: null, toast: "Shift closed" }),
      voidSale: (id, reason) => set((state) => ({ sales: state.sales.map((sale) => sale.id === id ? { ...sale, voidReason: reason } : sale), lastVoidedId: id, toast: "Sale voided" })),
      undoVoid: () => {
        const { sales, lastVoidedId } = get();
        const sale = sales.find((item) => item.id === lastVoidedId);
        if (!sale?.voidReason) return null;
        const { voidReason: _voidReason, ...rest } = sale;
        set((state) => ({ sales: state.sales.map((item) => item.id === sale.id ? rest : item), lastVoidedId: null, toast: "Void undone" }));
        return rest;
      },
      showToast: (message) => set({ toast: message }),
      loadLocalData: (sales, heldOrders) => set((state) => ({
        sales: [
          ...sales.filter((sale, index) => sales.findIndex((item) => item.id === sale.id) === index),
          ...state.sales.filter((sale) => !sales.some((stored) => stored.id === sale.id)),
        ],
        heldOrders: [
          ...heldOrders.filter((order, index) => heldOrders.findIndex((item) => item.id === order.id) === index),
          ...state.heldOrders.filter((order) => !heldOrders.some((stored) => stored.id === order.id)),
        ],
      })),
    }),
    { name: "soko-pos-state", skipHydration: true },
  ),
);

export const cartTotal = (cart: CartLine[]) => sum(cart);
