import type { HeldOrder, Product, Sale } from "@/lib/types";
import type { PosApi } from "./client";

export const products: Product[] = [
  { id: "tomato", name: "Tomatoes", unit: "per kg", price: 80, category: "Vegetables", color: "bg-red-100", emoji: "🍅", barcode: "616110123456" },
  { id: "onion", name: "Red onions", unit: "per kg", price: 120, category: "Vegetables", color: "bg-purple-100", emoji: "🧅", barcode: "616110123457" },
  { id: "sukuma", name: "Sukuma wiki", unit: "per bunch", price: 20, category: "Vegetables", color: "bg-green-100", emoji: "🥬" },
  { id: "avocado", name: "Avocado", unit: "each", price: 20, category: "Vegetables", color: "bg-lime-100", emoji: "🥑" },
  { id: "milk", name: "Fresh milk 500ml", unit: "each", price: 65, category: "Drinks", color: "bg-blue-100", emoji: "🥛", barcode: "616110123458" },
  { id: "water", name: "Drinking water", unit: "500ml", price: 50, category: "Drinks", color: "bg-cyan-100", emoji: "💧", barcode: "616110123459" },
  { id: "soda", name: "Soda", unit: "300ml", price: 60, category: "Drinks", color: "bg-orange-100", emoji: "🥤" },
  { id: "soap", name: "Bar soap", unit: "each", price: 55, category: "Household", color: "bg-amber-100", emoji: "🧼" },
  { id: "flour", name: "Maize flour 2kg", unit: "packet", price: 165, category: "Household", color: "bg-yellow-100", emoji: "🌽", barcode: "616110123460" },
  { id: "bread", name: "White bread", unit: "loaf", price: 70, category: "Snacks", color: "bg-orange-100", emoji: "🍞" },
  { id: "eggs", name: "Eggs", unit: "each", price: 25, category: "Snacks", color: "bg-rose-100", emoji: "🥚" },
  { id: "mandazi", name: "Mandazi", unit: "each", price: 15, category: "Snacks", color: "bg-amber-100", emoji: "🥯" },
];

const sales: Sale[] = [
  { id: "S-1042", createdAt: new Date(Date.now() - 15 * 60_000).toISOString(), items: [], total: 435, method: "M-Pesa" },
  { id: "S-1041", createdAt: new Date(Date.now() - 48 * 60_000).toISOString(), items: [], total: 210, method: "Cash", amountTendered: 500 },
  { id: "S-1040", createdAt: new Date(Date.now() - 90 * 60_000).toISOString(), items: [], total: 780, method: "Cash", amountTendered: 1000 },
];
const heldOrders = new Map<string, HeldOrder>();

export const mockRepository: PosApi = {
  async listProducts() {
    return products;
  },
  async listSales() {
    return sales;
  },
  async createSale(sale) {
    const existingIndex = sales.findIndex((item) => item.id === sale.id);
    if (existingIndex >= 0) sales[existingIndex] = sale;
    else sales.unshift(sale);
    return sale;
  },
  async saveHeldOrder(order) {
    heldOrders.set(order.id, order);
  },
  async deleteHeldOrder(id) {
    heldOrders.delete(id);
  },
};
