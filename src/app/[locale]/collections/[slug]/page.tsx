import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { CollectionCommentBubbles } from "@/components/CollectionCommentBubbles";
import { CollectionView } from "@/components/pages/CollectionViews";
import {
  collectionAlternates,
  getCollection,
  getCollectionSlugs,
  pickText,
} from "@/lib/collections";
import { localePath } from "@/lib/site";
import { asTranslator } from "@/lib/translator";

// Fully static: pure fs reads, prerendered per slug × locale at build time —
// a feature piece landing on a hot feed never touches a function invocation.
export const dynamicParams = false;

export function generateStaticParams() {
  return getCollectionSlugs().flatMap((slug) =>
    routing.locales.map((locale) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const collection = getCollection(slug);
  if (!collection) return {};
  const title = pickText(collection.title, locale);
  const description = pickText(collection.intro, locale);
  const url = localePath(locale, `/collections/${slug}`);
  return {
    title: `${title} · ghfind`,
    description,
    alternates: collectionAlternates(locale, slug, collection.bodyLocales),
    openGraph: {
      title,
      description,
      type: "article",
      url,
      publishedTime: collection.publishedAt,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("collections");
  const tBlog = await getTranslations("blog");
  const tTiers = await getTranslations("tiers");

  return (
    <main className="relative isolate flex w-full flex-1 justify-center px-5 py-14 sm:px-6 sm:py-20">
      <CollectionCommentBubbles
        lang={locale === "zh" ? "zh" : "en"}
        collectionSlug={slug}
      />
      <CollectionView
        locale={locale}
        slug={slug}
        collection={collection}
        t={asTranslator(t)}
        tBlog={asTranslator(tBlog)}
        tTiers={asTranslator(tTiers)}
      />
    </main>
  );
}
