import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { listCollections } from "@/lib/collections";
import { localeAlternates } from "@/lib/site";
import { CollectionsIndexView } from "@/components/pages/CollectionViews";
import { asTranslator } from "@/lib/translator";

// Fully static: pure fs reads, prerendered per locale at build time — zero
// function invocations and zero ISR writes, no matter how hard crawlers hit it.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "collections" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: localeAlternates(locale, "/collections"),
  };
}

export default async function CollectionsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("collections");
  const tBlog = await getTranslations("blog");
  return (
    <CollectionsIndexView
      locale={locale}
      collections={listCollections()}
      t={asTranslator(t)}
      tBlog={asTranslator(tBlog)}
    />
  );
}
