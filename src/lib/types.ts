export type Category = "All" | "Vegetables" | "Drinks" | "Household" | "Snacks";
export type PaymentMethod = "Cash" | "M-Pesa" | "Card";

export interface Product {
  id: string;
  name: string;
  unit: string;
  price: number;
  category: Exclude<Category, "All">;
  color: string;
  emoji: string;
  barcode?: string;
}

export interface CartLine {
  product: Product;
  quantity: number;
  unitPrice: number;
}

export interface Sale {
  id: string;
  createdAt: string;
  items: CartLine[];
  total: number;
  method: PaymentMethod;
  amountTendered?: number;
  voidReason?: string;
}

export interface HeldOrder {
  id: string;
  name: string;
  createdAt: string;
  items: CartLine[];
  total: number;
}

export interface Shift {
  staffName: string;
  startedAt: string;
  openingFloat: number;
}
