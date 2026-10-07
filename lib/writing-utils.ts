export type WritingIssue = {
  type: string;
  message: string;
  original?: string;
  suggestion?: string;
};

export function checkUnits(text: string): WritingIssue[] {
  const issues: WritingIssue[] = [];

  const regex =
  /(\d+(?:\.\d+)?)\s*(km\/h|m\/s|GHz|MHz|kHz|MPa|kPa|mV|mA|kW|°C|kg|mg|cm|mm|km|Hz|Pa|V|A|W|J|K|g|m|s|h|C)\b/g;

  let match;

  while ((match = regex.exec(text)) !== null) {
    const full = match[0];
    const number = match[1];
    const unit = match[2];

    if (!full.includes(" ")) {
      issues.push({
        type: "单位格式",
        message: `数字与单位之间建议保留空格：${full}`,
        original: full,
        suggestion: `${number} ${unit}`,
      });
    }
  }

  return issues;
}

export function checkMixedPunctuation(
  text: string
): WritingIssue[] {
  const issues: WritingIssue[] = [];

  const chineseWithEnglishComma =
    /[\u4e00-\u9fa5],[A-Za-z]/g;

  const chineseWithEnglishPeriod =
    /[\u4e00-\u9fa5]\.[\u4e00-\u9fa5]/g;

  const englishBeforeChineseComma =
    /[A-Za-z]，[\u4e00-\u9fa5]/g;

  const englishWithChinesePeriod =
    /[A-Za-z]。[A-Za-z]/g;

  const patterns = [
    {
      regex: chineseWithEnglishComma,
      message: "中文语境中可能混用了英文逗号",
    },
    {
      regex: chineseWithEnglishPeriod,
      message: "中文语境中可能混用了英文句号",
    },
    {
    regex: englishBeforeChineseComma,
    message: "英文与中文混合语境中可能使用了不合适的中文逗号",
    },
    {
      regex: englishWithChinesePeriod,
      message: "英文语境中可能混用了中文句号",
    },
  ];

  for (const item of patterns) {
    const matches = text.match(item.regex);

    if (matches) {
      for (const match of matches) {
        issues.push({
          type: "标点规范",
          message: item.message,
          original: match,
        });
      }
    }
  }

  return issues;
}

export function checkFigureNumbers(
  text: string
): WritingIssue[] {
  const issues: WritingIssue[] = [];

  const regex =
    /(?:图|Fig\.?|Figure)\s*(\d+)/gi;

  const numbers: number[] = [];

  let match;

  while ((match = regex.exec(text)) !== null) {
    numbers.push(Number(match[1]));
  }

  if (numbers.length < 2) {
    return issues;
  }

  const unique = Array.from(
    new Set(numbers)
  ).sort((a, b) => a - b);

  for (let i = 1; i < unique.length; i++) {
    if (unique[i] - unique[i - 1] > 1) {
      issues.push({
        type: "图表编号",
        message: `图编号可能不连续：${unique[i - 1]} → ${unique[i]}`,
      });
    }
  }

  return issues;
}

export function checkReferenceNumbers(
  text: string
): WritingIssue[] {
  const issues: WritingIssue[] = [];

  const regex = /\[(\d+)\]/g;

  const numbers: number[] = [];

  let match;

  while ((match = regex.exec(text)) !== null) {
    numbers.push(Number(match[1]));
  }

  if (numbers.length < 2) {
    return issues;
  }

  const unique = Array.from(
    new Set(numbers)
  ).sort((a, b) => a - b);

  for (let i = 1; i < unique.length; i++) {
    if (unique[i] - unique[i - 1] > 1) {
      issues.push({
        type: "参考文献编号",
        message: `参考文献编号可能不连续：缺少 ${
          unique[i - 1] + 1
        }`,
      });
    }
  }

  return issues;
}

export function checkAbbreviations(
  text: string
): WritingIssue[] {
  const issues: WritingIssue[] = [];

  const regex = /\b[A-Z]{2,6}\b/g;

  const abbreviations =
    text.match(regex) || [];

  const unique = Array.from(
    new Set(abbreviations)
  );

  for (const abbreviation of unique) {
    const definitionPattern =
      new RegExp(
        `[A-Za-z\\s]{3,}\\(${abbreviation}\\)`,
        "i"
      );

    if (!definitionPattern.test(text)) {
      issues.push({
        type: "缩写",
        message: `未检测到 ${abbreviation} 的完整名称定义，请确认首次出现时是否已给出全称`,
        original: abbreviation,
      });
    }
  }

  return issues;
}

export function analyzeWriting(
  text: string
) {
  return [
    ...checkUnits(text),
    ...checkMixedPunctuation(text),
    ...checkFigureNumbers(text),
    ...checkReferenceNumbers(text),
    ...checkAbbreviations(text),
  ];
}