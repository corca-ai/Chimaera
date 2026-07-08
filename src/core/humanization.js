const AI_TELL_RULES = [
  {
    id: "A-1",
    category: "translationese",
    severity: "S1",
    label: "~에 대해/대해서 남발",
    pattern: /에 대해(?:서)?/g,
    replacement: "를"
  },
  {
    id: "A-2",
    category: "translationese",
    severity: "S1",
    label: "~을/를 통해 남발",
    pattern: /([을를]) 통해/g,
    replacement: "$1 거쳐"
  },
  {
    id: "A-3",
    category: "translationese",
    severity: "S1",
    label: "~에 있어서",
    pattern: /에 있어서/g,
    replacement: "에서"
  },
  {
    id: "A-7",
    category: "translationese",
    severity: "S1",
    label: "가지고 있다",
    pattern: /가지고 있(습니다|다|고|는)/g,
    replacement: "있$1"
  },
  {
    id: "A-9",
    category: "passive",
    severity: "S2",
    label: "~에 의해 피동문",
    pattern: /에 의해/g,
    replacement: "가"
  },
  {
    id: "D-1",
    category: "signature-phrase",
    severity: "S1",
    label: "결론적으로",
    pattern: /결론적으로,?\s*/g,
    replacement: ""
  },
  {
    id: "D-2",
    category: "signature-phrase",
    severity: "S1",
    label: "시사하는 바가 크다",
    pattern: /시사하는 바가 (큽니다|크다)/g,
    replacement: "의미가 분명합니다"
  },
  {
    id: "D-3",
    category: "signature-phrase",
    severity: "S2",
    label: "주목할 만하다",
    pattern: /주목할 만(합니다|하다|한)/g,
    replacement: "눈여겨볼 만$1"
  },
  {
    id: "H-1",
    category: "connector-overuse",
    severity: "S2",
    label: "문두 접속사 남발",
    pattern: /^(또한|따라서|나아가|그러므로),?\s*/gm,
    replacement: ""
  },
  {
    id: "I-1",
    category: "formal-noun",
    severity: "S2",
    label: "것이다 종결",
    pattern: /것입니다/g,
    replacement: "점입니다"
  },
  {
    id: "F-1",
    category: "over-modifier",
    severity: "S3",
    label: "정도부사 과다",
    pattern: /(매우|정말|대단히)\s/g,
    replacement: ""
  },
  {
    id: "J-1",
    category: "visual-decoration",
    severity: "S3",
    label: "본문 볼드 과다",
    pattern: /\*\*/g,
    replacement: ""
  }
];

export function humanizeDraft(draft) {
  const before = detectAiTellPatterns(draft.markdown);
  let markdown = draft.markdown;
  const highlights = [];

  for (const rule of AI_TELL_RULES) {
    const previous = markdown;
    markdown = markdown.replace(rule.pattern, rule.replacement);
    if (previous !== markdown) {
      highlights.push({
        id: rule.id,
        label: rule.label,
        severity: rule.severity,
        before: sampleMatch(previous, rule.pattern),
        after: sampleMatch(markdown, rule.pattern) || "removed-or-rewritten"
      });
    }
  }

  markdown = markdown
    .replaceAll("본 글에서는", "이 글에서는")
    .replaceAll("가능성이 큽니다", "가능성이 높습니다")
    .replaceAll("을(를)", "")
    .replaceAll("이(가)", "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ");

  const after = detectAiTellPatterns(markdown);
  const changeRate = estimateChangeRate(draft.markdown, markdown);
  const grade = gradeHumanization(after, changeRate);

  return {
    engine: "im-not-ai-inspired-local-fast-gate",
    source: {
      name: "epoko77-ai/im-not-ai",
      url: "https://github.com/epoko77-ai/im-not-ai",
      appliedScope: "local fast gate, not the full strict Claude Code pipeline"
    },
    rules: [
      "의미, 수치, 고유명사, 인용은 보존",
      "탐지된 AI 티 패턴만 국소적으로 수정",
      "블로그 장르와 존대 문체 유지",
      "번역투, 기계적 접속사, AI 관용구 제거",
      "과윤문 방지를 위해 변경률 모니터링"
    ],
    audit: {
      grade,
      changeRate,
      before,
      after,
      summary: summarizeAudit(before, after, changeRate, grade),
      highlights
    },
    markdown
  };
}

export function cleanGeneratedMarkdown(markdown) {
  return String(markdown || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^(\s{0,3}#{1,6}\s+.*?)\s+\{#[A-Za-z0-9_-]+\}\s*$/gm, "$1")
    .replace(/\*\*([^*\n][\s\S]*?[^*\n])\*\*/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function polishGeneratedMarkdown(markdown) {
  let polished = cleanGeneratedMarkdown(markdown);
  const replacements = [
    [/여기까지 읽으셨다면 다음 행동은 분명합니다\.?/g, "이제 할 일은 복잡하지 않습니다."],
    [/거창한 전사 계획을 세우는 게 아니라/g, "처음부터 전사 계획을 만들 필요는 없습니다"],
    [/적용 가능한 업무 하나를 좁히는 것/g, "바로 적용해 볼 업무 하나를 고르는 일"],
    [/어디서부터 작게 시작할 수 있는지 함께 점검해 드립니다/g, "어떤 업무부터 작게 시작하면 좋을지 같이 보겠습니다"],
    [/기능 소개보다 업무 흐름, 데이터 권한, 성과 지표를 먼저 정리해 도입 판단을 돕습니다/g, "기능을 길게 늘어놓기보다 업무 흐름, 데이터 권한, 성과 지표를 먼저 정리해 판단 기준을 잡아드립니다"],
    [/자동화에 적합한지부터 같이 판단해 드립니다/g, "자동화에 맞는 일인지부터 같이 판단하겠습니다"],
    [/말씀해 주시면/g, "알려주시면"],
    [/도입 판단을 돕습니다/g, "판단 기준을 잡아드립니다"],
    [/에 있어서/g, "에서"],
    [/와 관련하여/g, "에서"],
    [/관련된/g, "관련한"],
    [/에 기반하여/g, "를 근거로"],
    [/바탕으로/g, "보고"],
    [/를 통해/g, "로"],
    [/을 통해/g, "으로"],
    [/에 의해/g, "가"],
    [/가지고 있습니다/g, "있습니다"],
    [/가지고 있다/g, "있다"],
    [/결론적으로,?\s*/g, ""],
    [/따라서,?\s*/g, ""],
    [/이를 통해,?\s*/g, ""],
    [/주목할 만합니다/g, "눈여겨볼 만합니다"],
    [/시사하는 바가 큽니다/g, "의미가 분명합니다"],
    [/혁신적인/g, "이전과 다른"],
    [/획기적인/g, "이전과 다른"],
    [/매우\s/g, ""],
    [/정말\s/g, ""],
    [/대단히\s/g, ""],
    [/([가-힣]+(?:고|며|지만|면서|아서|어서)),/g, "$1"]
  ];

  for (const [pattern, replacement] of replacements) {
    polished = polished.replace(pattern, replacement);
  }

  return polished
    .replace(/필요는 없습니다,\s*/g, "필요는 없습니다. ")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function detectAiTellPatterns(markdown) {
  const findings = [];
  for (const rule of AI_TELL_RULES) {
    const matches = [...markdown.matchAll(rule.pattern)];
    if (!matches.length) continue;
    findings.push({
      id: rule.id,
      category: rule.category,
      severity: rule.severity,
      label: rule.label,
      count: matches.length,
      sample: matches.slice(0, 3).map((match) => match[0])
    });
  }

  const rhythm = rhythmFinding(markdown);
  if (rhythm) findings.push(rhythm);

  const severityCounts = findings.reduce(
    (counts, finding) => ({
      ...counts,
      [finding.severity]: (counts[finding.severity] || 0) + finding.count
    }),
    { S1: 0, S2: 0, S3: 0 }
  );

  return {
    findingCount: findings.reduce((sum, finding) => sum + finding.count, 0),
    severityCounts,
    findings
  };
}

function sampleMatch(text, pattern) {
  pattern.lastIndex = 0;
  const match = pattern.exec(text);
  pattern.lastIndex = 0;
  return match?.[0] || "";
}

function rhythmFinding(markdown) {
  const sentences = markdown
    .replace(/^#+\s.+$/gm, "")
    .split(/[.!?。！？]|다\.|요\./)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 8);
  if (sentences.length < 8) return null;
  const lengths = sentences.map((sentence) => sentence.length);
  const average = lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
  const variance =
    lengths.reduce((sum, length) => sum + (length - average) ** 2, 0) / lengths.length;
  const stdev = Math.sqrt(variance);
  if (stdev >= 18) return null;
  return {
    id: "E-1",
    category: "rhythm-uniformity",
    severity: "S3",
    label: "문장 길이 리듬 균일",
    count: 1,
    sample: [`avg ${average.toFixed(1)} / stdev ${stdev.toFixed(1)}`]
  };
}

function estimateChangeRate(before, after) {
  const beforeTokens = tokenize(before);
  const afterTokens = tokenize(after);
  if (!beforeTokens.length) return 0;
  return Number(Math.min(editDistance(beforeTokens, afterTokens) / beforeTokens.length, 1).toFixed(3));
}

function tokenize(text) {
  return text
    .split(/(\s+|[.,!?()[\]{}"'])/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function editDistance(left, right) {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[right.length];
}

function gradeHumanization(after, changeRate) {
  if (changeRate >= 0.5) return "D";
  if (after.severityCounts.S1 > 0) return "C";
  if (after.severityCounts.S2 > 4 || changeRate > 0.3) return "B";
  if (after.severityCounts.S2 <= 2 && changeRate <= 0.25) return "A";
  return "B";
}

function summarizeAudit(before, after, changeRate, grade) {
  return `AI 티 탐지 ${before.findingCount}건에서 ${after.findingCount}건으로 조정했습니다. 변경률은 ${Math.round(
    changeRate * 100
  )}%이고, fast gate 등급은 ${grade}입니다.`;
}
