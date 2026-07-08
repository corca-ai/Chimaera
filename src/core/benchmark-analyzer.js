const VOID_TAGS = new Set(["meta", "link", "img", "br", "hr", "input"]);

export async function analyzeBenchmarkUrls(urls = []) {
  const cleaned = urls.map((url) => String(url).trim()).filter(Boolean);
  const pages = [];

  for (const url of cleaned) {
    try {
      pages.push(await analyzeBenchmarkUrl(url));
    } catch (error) {
      pages.push({ url, status: "error", error: error.message });
    }
  }

  return {
    analyzedAt: new Date().toISOString(),
    count: pages.length,
    pages,
    common: summarizeCommonPatterns(pages)
  };
}

export async function analyzeBenchmarkUrl(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 SEO Loop Harness benchmark reader",
      accept: "text/html,application/xhtml+xml"
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const html = await response.text();
  const parsed = parseHtml(html);
  const title = getTitle(html);
  const description = getMeta(html, "description");
  const canonical = getLink(html, "canonical");
  const ogImage = getMeta(html, "og:image");
  const schemaTypes = getSchemaTypes(html);
  const images = parsed.images
    .filter((image) => image.src && !/logo|footer|nav|breadcrumb/i.test(image.src))
    .slice(0, 12);
  const h2 = parsed.headings.filter((heading) => heading.tag === "h2");
  const h3 = parsed.headings.filter((heading) => heading.tag === "h3");
  const text = parsed.text.join(" ");

  return {
    url,
    status: "ok",
    title,
    description,
    canonical,
    ogImage,
    h1: parsed.headings.filter((heading) => heading.tag === "h1").map((heading) => heading.text),
    h2Count: h2.length,
    h2: h2.map((heading) => heading.text).slice(0, 12),
    h3Count: h3.length,
    schemaTypes,
    imageCount: parsed.images.length,
    contentImages: images,
    altCoverage: parsed.images.length
      ? Math.round(
          (parsed.images.filter((image) => image.alt && image.alt.trim()).length /
            parsed.images.length) *
            100
        )
      : 0,
    hasToc: text.includes("목차") || /table of contents/i.test(text),
    hasFaq: text.includes("자주 묻") || text.includes("자주묻") || /faq/i.test(text),
    ctaSignals: {
      consultation: countIncludes(text, ["상담", "문의", "예약", "신청"]),
      phone: countIncludes(html, ["tel:"]),
      kakao: countIncludes(html.toLowerCase(), ["kakao", "pf.kakao"])
    }
  };
}

function summarizeCommonPatterns(pages) {
  const ok = pages.filter((page) => page.status === "ok");
  if (!ok.length) {
    return {
      hasTocRate: 0,
      hasFaqRate: 0,
      avgH2: 0,
      avgAltCoverage: 0,
      schemaTypes: [],
      recommendations: ["No benchmark pages could be analyzed."]
    };
  }

  const schemaTypes = Array.from(new Set(ok.flatMap((page) => page.schemaTypes))).sort();
  const hasTocRate = average(ok.map((page) => (page.hasToc ? 1 : 0)));
  const hasFaqRate = average(ok.map((page) => (page.hasFaq ? 1 : 0)));
  const avgH2 = average(ok.map((page) => page.h2Count));
  const avgAltCoverage = average(ok.map((page) => page.altCoverage));

  const recommendations = [
    hasTocRate >= 0.5
      ? "목차를 기본 UI로 유지합니다."
      : "목차는 검색 의도가 복잡한 글에 선택 적용합니다.",
    hasFaqRate >= 0.5
      ? "FAQ 섹션과 FAQPage JSON-LD를 함께 생성합니다."
      : "FAQ는 실제 질문이 있을 때만 생성합니다.",
    avgAltCoverage >= 70
      ? "이미지 ALT 기준을 필수 게이트로 둡니다."
      : "벤치마크보다 더 강한 ALT 품질 게이트를 적용합니다.",
    schemaTypes.includes("FAQPage") || schemaTypes.includes("BlogPosting")
      ? "BlogPosting/Article, BreadcrumbList, FAQPage 조합을 기본 후보로 둡니다."
      : "구조화 데이터는 페이지 타입별로 별도 검토합니다."
  ];

  return {
    hasTocRate,
    hasFaqRate,
    avgH2,
    avgAltCoverage,
    schemaTypes,
    recommendations
  };
}

function parseHtml(html) {
  const headings = [];
  const images = [];
  const text = [];
  const tagRe = /<\/?([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  const stack = [];
  let match;

  while ((match = tagRe.exec(html))) {
    if (match[3]) {
      const data = cleanText(match[3]);
      if (data && !isInside(stack, ["script", "style", "noscript", "svg"])) {
        text.push(data);
        const current = stack[stack.length - 1];
        if (current && /^h[1-6]$/.test(current.tag)) {
          current.text.push(data);
        }
      }
      continue;
    }

    const raw = match[0];
    const tag = match[1].toLowerCase();
    const attrs = parseAttrs(match[2] || "");

    if (raw.startsWith("</")) {
      const index = stack.map((item) => item.tag).lastIndexOf(tag);
      if (index >= 0) {
        const closed = stack.splice(index).shift();
        if (closed && /^h[1-6]$/.test(closed.tag)) {
          const headingText = cleanText(closed.text.join(" "));
          if (headingText) headings.push({ tag: closed.tag, text: headingText });
        }
      }
      continue;
    }

    if (tag === "img") {
      images.push({
        src: attrs.src || attrs["data-src"] || "",
        alt: attrs.alt || "",
        width: attrs.width || "",
        height: attrs.height || ""
      });
    }

    if (!VOID_TAGS.has(tag) && !raw.endsWith("/>")) {
      stack.push({ tag, attrs, text: [] });
    }
  }

  return { headings, images, text };
}

function parseAttrs(raw) {
  const attrs = {};
  const attrRe = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match;
  while ((match = attrRe.exec(raw))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function getTitle(html) {
  return cleanText((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
}

function getMeta(html, name) {
  const escaped = name.replace(":", "\\:");
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escaped}["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escaped}["']`, "i")
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return cleanText(match[1]);
  }
  return "";
}

function getLink(html, rel) {
  const pattern = new RegExp(`<link[^>]+rel=["'][^"']*${rel}[^"']*["'][^>]+href=["']([^"']*)["']`, "i");
  return cleanText((html.match(pattern) || [])[1] || "");
}

function getSchemaTypes(html) {
  const scripts = Array.from(
    html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  ).map((match) => match[1]);
  const types = [];
  for (const script of scripts) {
    try {
      collectSchemaTypes(JSON.parse(script), types);
    } catch {
      types.push("parse_error");
    }
  }
  return Array.from(new Set(types));
}

function collectSchemaTypes(value, types) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectSchemaTypes(item, types));
    return;
  }
  if (!value || typeof value !== "object") return;
  if (value["@type"]) {
    if (Array.isArray(value["@type"])) types.push(...value["@type"]);
    else types.push(value["@type"]);
  }
  if (Array.isArray(value["@graph"])) value["@graph"].forEach((item) => collectSchemaTypes(item, types));
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isInside(stack, tags) {
  return stack.some((item) => tags.includes(item.tag));
}

function countIncludes(text, needles) {
  return needles.reduce((sum, needle) => sum + String(text).split(needle).length - 1, 0);
}

function average(values) {
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}
