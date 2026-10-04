import type {Notice} from "./engine";
export const DIGEST_MS=60*60_000;
export function urgent(n:Notice):boolean {
  return n.severity>=2 && (n.kind==="open"||n.kind==="escalation") && (n.key.startsWith("Service:")&&n.key.endsWith(":errors") || n.key==="account:burn" || n.key==="Billing:account:daily");
}
export function selectMail(pending:Notice[],now:number,nextDigest:number):Notice[]{
  return now>=nextDigest ? pending : pending.filter(urgent);
}
