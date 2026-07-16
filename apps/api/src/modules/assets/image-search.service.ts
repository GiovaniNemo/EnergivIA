import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { SearchImagesDto } from "./dto/search-images.dto";

export interface StockImageResult {
  id: string;
  url: string;
  thumb: string;
  author: string;
  source: "unsplash";
}

interface UnsplashResponse {
  results?: Array<{
    id?: string;
    urls?: { regular?: string; small?: string };
    user?: { name?: string };
    alt_description?: string;
    description?: string;
    tags?: Array<{ title?: string }>;
  }>;
}

type SearchStyle = "photo" | "illustration";

const QUERY_HINT_BY_STYLE: Record<SearchStyle, string> = {
  photo: "modern, clean, business",
  illustration:
    "generic business illustration background, vector style, clean composition, minimal visual",
};

const GENERIC_QUERIES_BY_STYLE: Record<SearchStyle, string[]> = {
  photo: [
    "modern office background photo, clean corporate environment, high quality",
    "professional meeting room background photo, minimal design, soft natural light",
    "business workspace background photo, neutral tones, realistic photography",
  ],
  illustration: [
    "generic business vector illustration background, clean flat design",
    "minimal modern illustration background, abstract corporate shapes",
    "soft gradient illustration backdrop, simple geometric style",
  ],
};

const SOLAR_FALLBACK_QUERIES: string[] = [
  "residential rooftop solar panels installation, professional photo, daylight",
  "solar technician installing photovoltaic panels on roof, real photo",
  "home solar energy system on rooftop, renewable electricity project, landscape photo",
];

const STYLE_POSITIVE_KEYWORDS: Record<SearchStyle, string[]> = {
  photo: ["photo", "photography", "real", "realistic", "natural light", "workspace"],
  illustration: ["illustration", "vector", "flat", "draw", "drawing", "graphic", "artwork"],
};

const STYLE_NEGATIVE_KEYWORDS: Record<SearchStyle, string[]> = {
  photo: ["vector", "illustration", "blueprint", "diagram"],
  illustration: ["photo", "photography", "realistic", "documentary"],
};

function buildSearchQuery(rawQuery: string, style: SearchStyle): string {
  const normalized = rawQuery.trim().replace(/\s+/g, " ");
  if (!normalized) return QUERY_HINT_BY_STYLE[style];
  return normalized;
}

function compactQuery(style: SearchStyle): string {
  if (style === "photo")
    return "residential solar rooftop, photovoltaic installation, realistic photo";
  return "generic vector illustration background, minimal style";
}

function splitQueryClauses(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/\s+/g, " "))
    .filter((part) => part.length >= 3);
}

function buildQueryVariants(primaryQuery: string): string[] {
  const clauses = splitQueryClauses(primaryQuery);
  if (!clauses.length) return [];

  const variants = new Set<string>();
  variants.add(clauses.join(" "));

  variants.add(clauses.join(" OR "));

  if (clauses.length > 3) {
    variants.add(clauses.slice(0, 3).join(", "));
    variants.add(clauses.slice(0, 3).join(" OR "));
  }

  for (const clause of clauses.slice(0, 4)) {
    variants.add(clause);
  }

  return Array.from(variants);
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex]!, copy[index]!];
  }
  return copy;
}

function scoreImageMetadata(
  input: { description: string; tags: string[] },
  style: SearchStyle
): number {
  const text = `${input.description} ${input.tags.join(" ")}`.toLowerCase();
  let score = 0;
  for (const keyword of STYLE_POSITIVE_KEYWORDS[style]) {
    if (text.includes(keyword)) score += 3;
  }
  for (const keyword of STYLE_NEGATIVE_KEYWORDS[style]) {
    if (text.includes(keyword)) score -= 2;
  }
  return score;
}

const FALLBACK_IMAGES: StockImageResult[] = [
  {
    id: "fallback-1",
    url: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1600&q=80",
    thumb:
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=320&q=70",
    author: "Unsplash",
    source: "unsplash",
  },
  {
    id: "fallback-2",
    url: "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?auto=format&fit=crop&w=1600&q=80",
    thumb:
      "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?auto=format&fit=crop&w=320&q=70",
    author: "Unsplash",
    source: "unsplash",
  },
  {
    id: "fallback-3",
    url: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1600&q=80",
    thumb:
      "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=320&q=70",
    author: "Unsplash",
    source: "unsplash",
  },
];

const FALLBACK_IMAGES_BY_STYLE: Record<SearchStyle, StockImageResult[]> = {
  photo: FALLBACK_IMAGES,
  illustration: [
    {
      id: "fallback-illustration-1",
      url: "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1600&q=80",
      thumb:
        "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=320&q=70",
      author: "Unsplash",
      source: "unsplash",
    },
    ...FALLBACK_IMAGES,
  ],
};

@Injectable()
export class ImageSearchService {
  private readonly logger = new Logger(ImageSearchService.name);
  private readonly perPage = 6;

  private async searchUnsplash(
    accessKey: string,
    query: string,
    orientation: SearchImagesDto["orientation"],
    style: SearchStyle
  ): Promise<{ images: StockImageResult[]; rawCount: number; topScore: number }> {
    const page = Math.floor(Math.random() * 3) + 1;
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("orientation", orientation);
    url.searchParams.set("per_page", String(this.perPage));
    url.searchParams.set("content_filter", "high");
    url.searchParams.set("page", String(page));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
    if (!res.ok) {
      const responseText = await res.text().catch(() => "");
      const preview = responseText.replace(/\s+/g, " ").slice(0, 300);
      this.logger.error(
        `[unsplash] non-2xx status=${res.status} statusText="${res.statusText}" query="${query}" page=${page} response="${preview}"`
      );
      return { images: [], rawCount: 0, topScore: -99 };
    }
    const payload = (await res.json()) as UnsplashResponse;
    const scored = (payload.results ?? [])
      .map((item) => {
        const regular = item.urls?.regular;
        const thumb = item.urls?.small ?? regular;
        if (!regular || !thumb) return null;
        const description = [item.alt_description, item.description]
          .filter((value): value is string => Boolean(value && value.trim()))
          .join(" ");
        const tags = (item.tags ?? [])
          .map((tag) => tag.title)
          .filter((value): value is string => Boolean(value && value.trim()));
        const score = scoreImageMetadata({ description, tags }, style);
        return {
          image: {
            id: item.id ?? randomUUID(),
            url: regular,
            thumb,
            author: item.user?.name ?? "Unsplash",
            source: "unsplash" as const,
          },
          score,
        };
      })
      .filter((item): item is { image: StockImageResult; score: number } => item !== null);

    const ranked = scored.sort((a, b) => b.score - a.score);
    const bestScore = ranked[0]?.score ?? -99;

    const relevant = ranked.filter((entry) => entry.score >= 1).map((entry) => entry.image);
    const images = (relevant.length ? relevant : ranked.map((entry) => entry.image)).slice(
      0,
      this.perPage
    );

    return { images, rawCount: payload.results?.length ?? 0, topScore: bestScore };
  }

  async search(dto: SearchImagesDto): Promise<StockImageResult[]> {
    const accessKey = process.env["UNSPLASH_ACCESS_KEY"];
    const style: SearchStyle = dto.style ?? "photo";
    const searchQuery = buildSearchQuery(dto.query, style);
    if (!accessKey) {
      this.logger.warn(
        `[unsplash] fallback: missing UNSPLASH_ACCESS_KEY (query="${searchQuery}", orientation="${dto.orientation}")`
      );
      return FALLBACK_IMAGES_BY_STYLE[style];
    }
    try {
      const styleFallbacks =
        style === "photo"
          ? [...SOLAR_FALLBACK_QUERIES, compactQuery(style), ...GENERIC_QUERIES_BY_STYLE[style]]
          : [compactQuery(style), ...GENERIC_QUERIES_BY_STYLE[style]];
      const attempts = Array.from(
        new Set([searchQuery, ...buildQueryVariants(searchQuery), ...styleFallbacks])
      ).slice(0, 10);

      for (const query of attempts) {
        const result = await this.searchUnsplash(accessKey, query, dto.orientation, style);
        if (result.images.length) {
          const selected = shuffle(result.images).slice(0, this.perPage);
          this.logger.log(
            `[unsplash] success: fetched ${selected.length} images (query="${query}", orientation="${dto.orientation}", topScore=${result.topScore})`
          );
          return selected;
        } else {
          this.logger.warn(
            `[unsplash] empty result for query="${query}" (rawCount=${result.rawCount}), trying next fallback query`
          );
        }
      }

      this.logger.warn(
        `[unsplash] fallback: all query attempts returned empty. originalQuery="${searchQuery}"`
      );
      return FALLBACK_IMAGES_BY_STYLE[style];
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.error(
        `[unsplash] fallback: request error (query="${searchQuery}", orientation="${dto.orientation}", error="${message}")`
      );
      return FALLBACK_IMAGES_BY_STYLE[style];
    }
  }
}
