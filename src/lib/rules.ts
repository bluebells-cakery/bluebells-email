// Translates Klaviyo-style segment/flow condition definitions to plain English and to SQL over our tables.
import { METRICS } from "@/lib/sync/klaviyo-flows";

type Cond = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export type Definition = { condition_groups?: { conditions: Cond[] }[] };

const OPS: Record<string, string> = { "greater-than": ">", "greater-than-or-equal": ">=", "less-than": "<", "less-than-or-equal": "<=", equals: "=", "not-equals": "<>" };
const OPW: Record<string, string> = { "greater-than": "more than", "greater-than-or-equal": "at least", "less-than": "fewer than", "less-than-or-equal": "at most", equals: "exactly", "not-equals": "not" };

const METRIC_SQL: Record<string, (tf: string) => string> = {
  "Placed Order": tf => `(select count(*) from orders o where o.contact_id = c.id ${tf ? `and o.placed_at ${tf}` : ""})`,
  "Opened Email": tf => `(select count(*) from events e where e.contact_id = c.id and e.type = 'open' ${tf ? `and e.occurred_at ${tf}` : ""})`,
  "Clicked Email": tf => `(select count(*) from events e where e.contact_id = c.id and e.type = 'click' ${tf ? `and e.occurred_at ${tf}` : ""})`,
  "Received Email": tf => `(select count(*) from events e where e.contact_id = c.id and e.type in ('sent','delivered','open','click') ${tf ? `and e.occurred_at ${tf}` : ""})`,
  "Checkout Started": tf => `(select count(*) from events e where e.contact_id = c.id and e.type = 'checkout_started' ${tf ? `and e.occurred_at ${tf}` : ""})`,
};

function timeframe(tf: Cond | null | undefined): { sql: string; words: string } {
  if (!tf || tf.operator === "alltime") return { sql: "", words: "ever" };
  if (tf.operator === "in-the-last") return { sql: `>= now() - interval '${Number(tf.quantity)} ${tf.unit}'`, words: `in the last ${tf.quantity} ${tf.unit}${tf.quantity === 1 ? "" : "s"}` };
  if (tf.operator === "flow-start") return { sql: "", words: "since the flow started" };
  return { sql: "", words: tf.operator };
}

export function condition(c: Cond): { words: string; sql: string | null; supported: boolean } {
  switch (c.type) {
    case "profile-marketing-consent":
      return { words: c.consent?.can_receive_marketing === false ? "cannot receive email marketing" : "can receive email marketing", sql: c.consent?.can_receive_marketing === false ? "c.status <> 'subscribed'" : "c.status = 'subscribed'", supported: true };
    case "profile-metric": {
      const name = METRICS[c.metric_id] ?? c.metric_id; const tf = timeframe(c.timeframe_filter); const mf = c.measurement_filter ?? {};
      const verb = name.replace(/^Placed Order$/, "ordered").replace(/^Opened Email$/, "opened an email").replace(/^Clicked Email$/, "clicked an email").replace(/^Received Email$/, "received an email").replace(/^Checkout Started$/, "started a checkout").replace(/^Active on Site$/, "visited the site");
      const isZero = mf.operator === "equals" && Number(mf.value) === 0, isAny = mf.operator === "greater-than" && Number(mf.value) === 0;
      const words = isZero ? `has not ${verb} ${tf.words}` : isAny ? `has ${verb} ${tf.words}` : `has ${verb} ${OPW[mf.operator] ?? mf.operator} ${mf.value} time${mf.value === 1 ? "" : "s"} ${tf.words}`;
      const gen = METRIC_SQL[name];
      return { words, sql: gen ? `${gen(tf.sql)} ${OPS[mf.operator] ?? "="} ${Number(mf.value)}` : null, supported: !!gen };
    }
    case "profile-property": {
      const prop = String(c.property); const f = c.filter ?? {};
      if (/city/.test(prop)) {
        const esc = (v: string) => v.replace(/'/g, "''");
        if (f.operator === "in" && Array.isArray(f.value)) {
          const vals: string[] = f.value.map((v: string) => v.trim().toLowerCase()).filter(Boolean);
          const auckland = vals.some(v => /auckland|akl/.test(v));
          const sqlParts = [...new Set(vals)].map(v => `lower(trim(c.city)) = '${esc(v)}'`);
          if (auckland) sqlParts.push("c.city ilike '%auckland%'", "lower(trim(c.city)) = 'akl'");
          return { words: auckland ? "lives in Auckland" : `city is one of ${vals.slice(0, 5).join(", ")}${vals.length > 5 ? "…" : ""}`, sql: `(${sqlParts.join(" OR ")})`, supported: true };
        }
        if (f.operator === "contains") return { words: /auckland/i.test(String(f.value)) ? "lives in Auckland" : `city contains "${f.value}"`, sql: `c.city ilike '%${esc(String(f.value))}%'`, supported: true };
        if (f.operator === "equals") return { words: `city is "${f.value}"`, sql: `c.city = '${esc(String(f.value))}'`, supported: true };
        return { words: `city ${f.operator} "${f.value}"`, sql: null, supported: false };
      }
      return { words: `${prop} ${f.operator} "${f.value}"`, sql: null, supported: false };
    }
    case "profile-predictive-analytics": {
      const f = c.filter ?? {};
      if (c.dimension === "average_order_value") return { words: `average order value ${OPW[f.operator] ?? f.operator} $${f.value}`, sql: `(case when c.order_count > 0 then c.total_spent / c.order_count else 0 end) ${OPS[f.operator] ?? ">"} ${Number(f.value)}`, supported: true };
      return { words: `${c.dimension} ${f.operator} ${f.value}`, sql: null, supported: false };
    }
    case "profile-not-in-flow": { const tf = timeframe(c.timeframe_filter); return { words: `has not been in this flow ${tf.words}`, sql: "true", supported: true }; }
    case "profile-in-segment": case "profile-group-membership": return { words: `is in segment/list ${c.group_ids ?? c.segment_id ?? ""}`, sql: null, supported: false };
    default: return { words: JSON.stringify(c), sql: null, supported: false };
  }
}

/** Klaviyo semantics: groups are ANDed, conditions inside a group are ORed. */
export function translate(def: Definition | null | undefined) {
  const groups = def?.condition_groups ?? [];
  const parts = groups.map(g => g.conditions.map(condition));
  const words = parts.map(g => g.map(x => x.words).join(" OR ")).map(w => (parts.length > 1 ? `(${w})` : w)).join("\nAND ");
  const supported = parts.every(g => g.every(x => x.supported));
  const sql = supported && parts.length ? parts.map(g => "(" + g.map(x => x.sql).join(" OR ") + ")").join(" AND ") : null;
  return { words: words || "everyone", sql, supported, unsupported: parts.flat().filter(x => !x.supported).map(x => x.words) };
}
