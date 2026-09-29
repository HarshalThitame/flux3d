import type {
  ShopPublicCategory,
  ShopPublicProduct,
} from "@/lib/shop/public-types";

export const HOME_SHELF_PRODUCT_LIMIT = 8;

export type ShopCategoryShelf = {
  id: string;
  anchorId: string;
  name: string;
  description: string | null;
  href: string;
  category: ShopPublicCategory | null;
  children: ShopPublicCategory[];
  totalCount: number;
  products: ShopPublicProduct[];
};

function categoryCandidates(product: ShopPublicProduct) {
  return Array.from(
    new Set(
      [
        product.categories.find((category) => category.is_primary)?.id,
        product.product_categories.find((category) => category.is_primary)
          ?.category_id,
        product.category_id,
        product.categories[0]?.id,
        product.product_categories[0]?.category_id,
      ].filter((id): id is string => Boolean(id)),
    ),
  );
}

function rootCategoryId(
  categoryId: string | null,
  categoriesById: Map<string, ShopPublicCategory>,
) {
  if (!categoryId || !categoriesById.has(categoryId)) return null;

  const visited = new Set<string>();
  let current = categoriesById.get(categoryId) ?? null;

  while (current?.parent_category_id) {
    if (visited.has(current.id)) return null;
    visited.add(current.id);
    const parent = categoriesById.get(current.parent_category_id);
    if (!parent) return current.id;
    current = parent;
  }

  return current?.id ?? null;
}

function productRank(product: ShopPublicProduct) {
  if (product.in_stock) return 0;
  if (product.has_preorder || product.stock_status === "pre_order") return 1;
  if (product.stock_status === "out_of_stock") return 2;
  return 3;
}

function sortShelfProducts(products: ShopPublicProduct[]) {
  return [...products].sort((a, b) => {
    const availability = productRank(a) - productRank(b);
    if (availability !== 0) return availability;

    const featured = Number(b.is_featured) - Number(a.is_featured);
    if (featured !== 0) return featured;

    return (
      new Date(b.created_at ?? 0).getTime() -
      new Date(a.created_at ?? 0).getTime()
    );
  });
}

export function buildShopHomeShelves(
  categories: ShopPublicCategory[],
  products: ShopPublicProduct[],
  limit = HOME_SHELF_PRODUCT_LIMIT,
): ShopCategoryShelf[] {
  const safeLimit = Math.max(1, Math.floor(limit));
  const categoriesById = new Map(
    categories.map((category) => [
      category.id,
      { ...category, children: [] as ShopPublicCategory[] },
    ]),
  );
  const roots: ShopPublicCategory[] = [];

  for (const category of categoriesById.values()) {
    const parent = category.parent_category_id
      ? categoriesById.get(category.parent_category_id)
      : null;
    if (parent && parent.id !== category.id) {
      parent.children?.push(category);
    } else {
      roots.push(category);
    }
  }

  const productsByRoot = new Map<string, ShopPublicProduct[]>();
  const uncategorized: ShopPublicProduct[] = [];

  for (const product of products) {
    const rootId =
      categoryCandidates(product)
        .map((categoryId) => rootCategoryId(categoryId, categoriesById))
        .find((id): id is string => Boolean(id)) ?? null;
    if (!rootId) {
      uncategorized.push(product);
      continue;
    }
    const bucket = productsByRoot.get(rootId) ?? [];
    bucket.push(product);
    productsByRoot.set(rootId, bucket);
  }

  const shelves = roots.flatMap<ShopCategoryShelf>((category) => {
    const shelfProducts = sortShelfProducts(
      productsByRoot.get(category.id) ?? [],
    );
    if (shelfProducts.length === 0) return [];

    return [
      {
        id: category.id,
        anchorId: `category-${category.slug}`,
        name: category.name,
        description: category.description,
        href: `/3d-shop/category/${category.slug}`,
        category,
        children: category.children ?? [],
        totalCount: shelfProducts.length,
        products: shelfProducts.slice(0, safeLimit),
      },
    ];
  });

  if (uncategorized.length > 0) {
    const productsForShelf = sortShelfProducts(uncategorized);
    shelves.push({
      id: "more-products",
      anchorId: "category-more-products",
      name: "More products",
      description: "Discover more ready-to-ship pieces from the Flux3D store.",
      href: "/3d-shop/search",
      category: null,
      children: [],
      totalCount: productsForShelf.length,
      products: productsForShelf.slice(0, safeLimit),
    });
  }

  return shelves;
}
