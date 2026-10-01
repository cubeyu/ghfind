import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeAlternates } from "@/lib/site";
import { listPosts } from "@/lib/blog";
import { BlogIndexView } from "@/components/pages/BlogViews";
import { asTranslator } from "@/lib/translator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  return {
    title: `${t("heading")} · ${(await getTranslations({ locale, namespace: "meta" }))("siteName")}`,
    description: t("subtitle"),
    alternates: localeAlternates(locale, "/blog"),
  };
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blog");
  const posts = listPosts(locale);
  return <BlogIndexView locale={locale} posts={posts} t={asTranslator(t)} />;
}
