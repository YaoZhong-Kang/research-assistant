import { NextRequest, NextResponse } from "next/server";

type OpenAlexWork = {
  id: string;
  doi: string | null;
  title: string;
  publication_year: number | null;
  cited_by_count?: number;

  authorships?: {
    author?: {
      display_name?: string;
    };
  }[];

  primary_location?: {
    source?: {
      display_name?: string | null;
    } | null;
  } | null;

  abstract_inverted_index?: Record<string, number[]> | null;

  biblio?: {
    volume?: string | null;
    issue?: string | null;
    first_page?: string | null;
    last_page?: string | null;
  } | null;
};

function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function normalizeDoi(input: string) {
  return input
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "");
}

function looksLikeDoi(input: string) {
  const doi = normalizeDoi(input);

  return /^10\.\d{4,9}\/\S+$/i.test(doi);
}

function metadataScore(work: OpenAlexWork) {
  let score = 0;

  if (work.doi) score += 5;

  if (work.abstract_inverted_index) {
    score += 3;
  }

  if (work.primary_location?.source?.display_name) {
    score += 2;
  }

  if (work.biblio?.volume) score += 1;
  if (work.biblio?.first_page) score += 1;

  // 引用量只作为辅助，不直接决定一切
  score += Math.min((work.cited_by_count || 0) / 1000, 10);

  return score;
}

export async function GET(request: NextRequest) {
  const query =
    request.nextUrl.searchParams.get("q");

  if (!query?.trim()) {
    return NextResponse.json(
      { error: "请输入论文标题、关键词或 DOI" },
      { status: 400 }
    );
  }

  try {
    const cleanQuery = query.trim();

    // ① DOI 精确查询
    if (looksLikeDoi(cleanQuery)) {
      const doi = normalizeDoi(cleanQuery);

      const doiUrl =
        "https://api.openalex.org/works" +
        `?filter=doi:${encodeURIComponent(
          `https://doi.org/${doi}`
        )}`;

      const response = await fetch(doiUrl);

      if (!response.ok) {
        throw new Error(
          `OpenAlex DOI 查询失败: ${response.status}`
        );
      }

      const data = await response.json();

      const results =
        Array.isArray(data.results)
          ? data.results
          : [];

      return NextResponse.json({
        results,
        searchMode: "doi",
      });
    }

    // ② 普通标题 / 关键词搜索
    const normalUrl =
      "https://api.openalex.org/works" +
      `?search=${encodeURIComponent(cleanQuery)}` +
      "&per_page=10";

    const response = await fetch(normalUrl);

    if (!response.ok) {
      throw new Error(
        `OpenAlex 搜索失败: ${response.status}`
      );
    }

    const data = await response.json();

    return NextResponse.json({
      results:
        Array.isArray(data.results)
          ? data.results
          : [],
      searchMode: "text",
    });

  } catch (error) {
    console.error(
      "Literature search error:",
      error
    );

    return NextResponse.json(
      { error: "文献搜索失败" },
      { status: 500 }
    );
  }
}