import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type SnippetPart = {
  text: string;
  match: boolean;
};

const START = "\u0001";
const END = "\u0002";

export async function searchPolicies(query: string) {
  const tsquery = toPrefixQuery(query);
  if (!tsquery) return [];

  return prisma.$queryRaw<{ id: string; snippet: string }[]>(Prisma.sql`
    WITH q AS (
      SELECT to_tsquery('simple', ${tsquery}) AS query
    )
    SELECT
      p.id,
      ts_headline(
        'simple',
        regexp_replace(coalesce(p."contentText", ''), '[[:punct:]]+', ' ', 'g'),
        q.query,
        'MaxFragments=1, MaxWords=24, MinWords=6, StartSel=' || chr(1) || ', StopSel=' || chr(2)
      ) AS snippet
    FROM "Policy" p, q
    WHERE p."searchVector" @@ q.query
    ORDER BY ts_rank(p."searchVector", q.query) DESC
    LIMIT 200
  `);
}

function toPrefixQuery(query: string) {
  const tokens = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.slice(0, 40))
    .filter((token) => token.length >= 2)
    .slice(0, 12);
  if (tokens.length === 0) return "";
  return tokens.map((token) => `${token}:*`).join(" & ");
}

export function snippetParts(raw: string): SnippetPart[] | null {
  if (!raw.includes(START)) return null;
  const parts: SnippetPart[] = [];
  const pattern = new RegExp(`${START}([\\s\\S]*?)${END}`, "g");
  let last = 0;
  for (const match of raw.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: raw.slice(last, index), match: false });
    if (match[1]) parts.push({ text: match[1], match: true });
    last = index + match[0].length;
  }
  if (last < raw.length) parts.push({ text: raw.slice(last), match: false });
  const visible = parts.filter((part) => part.text.trim().length > 0);
  return visible.length > 0 ? visible : null;
}
