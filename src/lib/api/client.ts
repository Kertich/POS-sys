import type { HeldOrder, Product, Sale } from "@/lib/types";
import { mockRepository } from "./mock";

export interface PosApi {
  listProducts(): Promise<Product[]>;
  listSales(): Promise<Sale[]>;
  createSale(sale: Sale): Promise<Sale>;
  saveHeldOrder(order: HeldOrder): Promise<void>;
  deleteHeldOrder(id: string): Promise<void>;
}

export const api: PosApi = mockRepository;
