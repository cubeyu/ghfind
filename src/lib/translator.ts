/**
 * A resolved, namespace-scoped message function. Page views take it as a prop
 * so the same sync React tree renders on both stacks: the Next app passes
 * `await getTranslations(ns)`, the Astro app its use-intl translator.
 */
export type Translator = {
  (key: string, values?: Record<string, string | number>): string;
  /** Raw message value (arrays/objects in the catalog). */
  raw(key: string): unknown;
};

/** next-intl's typed `t` → the structural Translator the shared views take. */
export const asTranslator = (t: unknown): Translator => t as Translator;
