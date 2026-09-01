import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShopShell from "@/components/shop/ShopShell";
import ShopProductDetailClient from "@/components/shop/ShopProductDetailClient";
import { getCurrentUserProfile } from "@/lib/auth/server";
import {
  getShopProductBySlug,
  getShopProductReviews,
} from "@/lib/shop/public-data";
import type {
  ShopPublicProduct,
  ShopPublicReview,
} from "@/lib/shop/public-types";
import { getSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/site";
import { getCspNonce } from "@/lib/csp";
import { extractTextFromBlocks } from "@/lib/shop/blocks";

// NOTE: no `dynamic = 'force-dynamic'` here. force-dynamic streams the shell
// immediately, which locks the response into HTTP 200 before notFound() can
// run (soft-404). The page is still per-request dynamic because it reads
// cookies (user profile) and headers (CSP nonce).

function toJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function getShopAvailability(product: ShopPublicProduct) {
  if (product.stock_status === "pre_order")
    return "https://schema.org/PreOrder";
  if (
    product.stock_status === "out_of_stock" ||
    product.stock_status === "unavailable"
  ) {
    return "https://schema.org/OutOfStock";
  }
  if (product.stock_status === "low_stock")
    return "https://schema.org/LimitedAvailability";
  return "https://schema.org/InStock";
}

function makeProductSchema(
  product: ShopPublicProduct,
  reviews: ShopPublicReview[],
  brandName: string,
) {
  const url = absoluteUrl(`/3d-shop/product/${product.slug}`);
  const images = [product.thumbnail_url, ...(product.image_urls ?? [])].filter(
    Boolean,
  ) as string[];
  const primarySku = product.skus[0]?.sku_code;
  const blocksText = extractTextFromBlocks(product.long_description_blocks);
  const specProperties = (product.long_description_blocks ?? [])
    .filter((block) => block.type === "specs_table")
    .flatMap((block) =>
      block.type === "specs_table"
        ? block.rows.map((row) => ({
            "@type": "PropertyValue" as const,
            name: row.label,
            value: row.value,
          }))
        : [],
    )
    .slice(0, 20);
  const schemaDescription =
    product.meta_description ||
    blocksText.slice(0, 300) ||
    product.description ||
    product.name;
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: schemaDescription,
    url,
    image: images,
    sku: primarySku ?? undefined,
    // No GTIN exists for custom-made products; MPN (= our SKU code) plus brand
    // keeps the merchant listing eligible.
    mpn: primarySku ?? undefined,
    brand: { "@type": "Brand", name: brandName },
    category: product.category_name ?? undefined,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      price: product.display_price,
      availability: getShopAvailability(product),
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: brandName },
    },
  };

  if (specProperties.length > 0) {
    schema.additionalProperty = specProperties;
  }

  if (product.review_count > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.avg_rating,
      reviewCount: product.review_count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  const reviewSchemas = reviews
    .filter((review) => review.rating > 0 && (review.body || review.title))
    .slice(0, 5)
    .map((review) => ({
      "@type": "Review",
      author: { "@type": "Person", name: review.reviewer_name },
      datePublished: review.created_at ?? undefined,
      name: review.title ?? undefined,
      reviewBody: review.body ?? review.title ?? undefined,
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
    }));
  if (reviewSchemas.length > 0) {
    schema.review = reviewSchemas;
  }

  return schema;
}

function makeBreadcrumbSchema(product: ShopPublicProduct) {
  const items = [
    { position: 1, name: "Home", item: absoluteUrl("/") },
    { position: 2, name: "3D Shop", item: absoluteUrl("/3d-shop") },
  ];

  if (product.category_slug && product.category_name) {
    items.push({
      position: 3,
      name: product.category_name,
      item: absoluteUrl(`/3d-shop/category/${product.category_slug}`),
    });
  }

  items.push({
    position: items.length + 1,
    name: product.name,
    item: absoluteUrl(`/3d-shop/product/${product.slug}`),
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item) => ({
      "@type": "ListItem",
      position: item.position,
      name: item.name,
      item: item.item,
    })),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getShopProductBySlug(slug);
  // Thrown here — metadata resolves before the response starts streaming, so
  // this reliably produces an HTTP 404 (a body-level notFound() can arrive
  // after headers are flushed on force-dynamic pages and degrade to a 200).
  if (!product) notFound();
  const imageUrl = product.landscape_image_url || product.thumbnail_url;
  const ogImage = imageUrl
    ? [
        {
          url: absoluteUrl(imageUrl as string),
          width: product.landscape_image_url ? 1200 : 800,
          height: product.landscape_image_url ? 630 : 800,
          alt: product.name,
        },
      ]
    : undefined;
  const title = product.meta_title || `${product.name} — 3D Shop`;
  const blocksText = extractTextFromBlocks(product.long_description_blocks);
  const description =
    product.meta_description ||
    blocksText.slice(0, 155) ||
    product.description ||
    `Shop ${product.name} on 3D Shop by Flux3D.`;
  // The id the Meta catalog uses for this product — lets Meta's automatic pixel
  // scraping match the page to catalog items instead of falling back to URL.
  const retailerItemId =
    product.skus[0]?.catalog_retailer_id ?? product.skus[0]?.sku_code;
  return {
    title,
    description,
    alternates: { canonical: `/3d-shop/product/${product.slug}` },
    other: retailerItemId
      ? {
          "product:retailer_item_id": retailerItemId,
        }
      : undefined,
    openGraph: {
      type: "website",
      title,
      description,
      url: absoluteUrl(`/3d-shop/product/${product.slug}`),
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage?.map((image) => image.url),
    },
  };
}

export default async function ShopProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getShopProductBySlug(slug);

  // Unknown slugs must return a real HTTP 404 (soft-404s with 200 status are
  // an SEO penalty and pollute the index).
  if (!product) notFound();

  const reviews = await getShopProductReviews(product.id, 1, 10);
  const auth = await getCurrentUserProfile();
  if (!product.is_active || product.is_archived) notFound();
  const nonce = await getCspNonce();
  const settings = await getSettings().catch(() => null);
  const brandName = settings?.brandName || settings?.businessName || "Flux3D";

  return (
    <ShopShell transparentNav>
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            makeProductSchema(product, reviews.reviews, brandName),
          ),
        }}
      />
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(makeBreadcrumbSchema(product)),
        }}
      />
      <ShopProductDetailClient
        product={product}
        initialReviews={reviews.reviews}
        currentUser={auth?.profile ?? null}
      />
    </ShopShell>
  );
}
