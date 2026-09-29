import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ApprovedExcerpt = {
  id: string;
  title: string;
  documentNumber: string;
  excerpt: string;
};

export async function findApprovedExcerpts(question: string) {
  const tokens = questionTokens(question);
  if (tokens.length === 0) return [];
  const strict = await searchApproved(tokens.map((token) => `${token}:*`).join(" & "));
  if (strict.length > 0) return strict;
  if (tokens.length === 1) return [];
  return searchApproved(tokens.map((token) => `${token}:*`).join(" | "));
}

function questionTokens(question: string) {
  return question
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.slice(0, 40))
    .filter((token) => token.length >= 2)
    .slice(0, 8);
}

async function searchApproved(expression: string) {
  return prisma.$queryRaw<ApprovedExcerpt[]>(Prisma.sql`
    WITH q AS (
      SELECT to_tsquery('simple', ${expression}) AS query
    )
    SELECT
      p.id,
      p.title,
      p."documentNumber" AS "documentNumber",
      left(
        concat_ws(E'\n', p.description, coalesce(p."contentText", '')),
        1200
      ) AS excerpt
    FROM "Policy" p, q
    WHERE p."isCurrent" = true
      AND p.status = 'APPROVED'
      AND p."searchVector" @@ q.query
    ORDER BY ts_rank(p."searchVector", q.query) DESC
    LIMIT 5
  `);
}
