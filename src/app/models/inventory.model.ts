
export type InventoryItemType = 'product' | 'service';

export interface InventoryCategory {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface InventoryItem {
  id: number;
  category_id: number | null;
  sku: string;
  name: string;
  description: string | null;
  item_type: InventoryItemType;
  quantity_total: number;
  unit: string;
  replacement_cost: string | null;
  rental_price: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InventoryPayload {
  category_id?: number | null;
  sku: string;
  name: string;
  description?: string | null;
  item_type: InventoryItemType;
  quantity_total: number;
  unit: string;
  replacement_cost?: string | null;
  rental_price?: string | null;
}

export interface InventoryPage {
  items: InventoryItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
