export interface Category {
  id: string;
  parentId?: string | null;
  name: string;
  slug: string;
  iconUrl?: string | null;
  commissionRate: number;
  orderIndex: number;
  subcategories?: Category[];
}
