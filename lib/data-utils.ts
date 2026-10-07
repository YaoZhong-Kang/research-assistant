export type Row = Record<string, string>;

export type ColumnType =
  | "number"
  | "date"
  | "text"
  | "unknown";

export type ColumnIssue = {
  column: string;
  missingCount: number;
  detectedType: ColumnType;
  invalidCount: number;
};

export type DataIssue = {
  rowNumber: number;
  column: string;
  value: string;
  message: string;
};

export type NumericStatistics = {
  column: string;
  validCount: number;
  missingCount: number;
  invalidCount: number;
  mean: number | null;
  median: number | null;
  standardDeviation: number | null;
  min: number | null;
  max: number | null;
};

export type CleaningOptions = {
  removeDuplicates: boolean;
  trimWhitespace: boolean;
  removeMissingRows: boolean;
  removeInvalidRows: boolean;
  removeOutlierRows: boolean;
};

export type DataOutlier = {
  rowNumber: number;
  column: string;
  value: number;
  lowerBound: number;
  upperBound: number;
};

export function isMissing(
  value: string | undefined | null
) {
  if (value === undefined || value === null) {
    return true;
  }

  const normalized = String(value)
    .trim()
    .toLowerCase();

  return (
    normalized === "" ||
    normalized === "na" ||
    normalized === "n/a" ||
    normalized === "null" ||
    normalized === "nan"
  );
}

export function looksLikeNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return false;

  return !Number.isNaN(Number(trimmed));
}

export function looksLikeDate(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return false;

  const timestamp = Date.parse(trimmed);

  return !Number.isNaN(timestamp);
}

export function detectColumnType(
  rows: Row[],
  column: string
): ColumnType {
  const values = rows
    .map((row) => row[column])
    .filter((value) => !isMissing(value));

  if (values.length === 0) {
    return "unknown";
  }

  const numericCount = values.filter((value) =>
    looksLikeNumber(value)
  ).length;

  const dateCount = values.filter((value) =>
    looksLikeDate(value)
  ).length;

  if (numericCount / values.length >= 0.6) {
    return "number";
  }

  if (dateCount / values.length >= 0.6) {
    return "date";
  }

  return "text";
}

export function getInvalidCount(
  rows: Row[],
  column: string,
  type: ColumnType
) {
  if (type === "text" || type === "unknown") {
    return 0;
  }

  let count = 0;

  for (const row of rows) {
    const value = row[column];

    if (isMissing(value)) {
      continue;
    }

    if (
      type === "number" &&
      !looksLikeNumber(value)
    ) {
      count++;
    }

    if (
      type === "date" &&
      !looksLikeDate(value)
    ) {
      count++;
    }
  }

  return count;
}

export function calculateColumnIssues(
  rows: Row[],
  headers: string[]
): ColumnIssue[] {
  return headers.map((column) => {
    const missingCount = rows.filter((row) =>
      isMissing(row[column])
    ).length;

    const detectedType = detectColumnType(
      rows,
      column
    );

    const invalidCount = getInvalidCount(
      rows,
      column,
      detectedType
    );

    return {
      column,
      missingCount,
      detectedType,
      invalidCount,
    };
  });
}

export function calculateDataIssues(
  rows: Row[],
  headers: string[]
): DataIssue[] {
  const issues: DataIssue[] = [];

  for (const column of headers) {
    const type = detectColumnType(
      rows,
      column
    );

    rows.forEach((row, index) => {
      const value = row[column];

      if (isMissing(value)) {
        issues.push({
          rowNumber: index + 2,
          column,
          value: "",
          message: "缺失值",
        });

        return;
      }

      if (
        type === "number" &&
        !looksLikeNumber(value)
      ) {
        issues.push({
          rowNumber: index + 2,
          column,
          value,
          message:
            "该列主要为数值，但此单元格不是有效数字",
        });
      }

      if (
        type === "date" &&
        !looksLikeDate(value)
      ) {
        issues.push({
          rowNumber: index + 2,
          column,
          value,
          message: "无法识别为有效日期",
        });
      }
    });
  }

  return issues;
}

export function countDuplicates(
  rows: Row[],
  headers: string[]
) {
  const seen = new Set<string>();

  let duplicates = 0;

  for (const row of rows) {
    const key = JSON.stringify(
      headers.map(
        (header) => row[header] ?? ""
      )
    );

    if (seen.has(key)) {
      duplicates++;
    } else {
      seen.add(key);
    }
  }

  return duplicates;
}

function quantile(
  sortedValues: number[],
  q: number
) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const position =
    (sortedValues.length - 1) * q;

  const base =
    Math.floor(position);

  const rest =
    position - base;

  if (
    sortedValues[base + 1] !==
    undefined
  ) {
    return (
      sortedValues[base] +
      rest *
        (
          sortedValues[base + 1] -
          sortedValues[base]
        )
    );
  }

  return sortedValues[base];
}

export function calculateOutliers(
  rows: Row[],
  headers: string[]
): DataOutlier[] {
  const outliers: DataOutlier[] = [];

  for (const column of headers) {
    const type =
      detectColumnType(
        rows,
        column
      );

    if (type !== "number") {
      continue;
    }

    const validValues: {
      value: number;
      rowIndex: number;
    }[] = [];

    rows.forEach(
      (row, index) => {
        const raw =
          row[column];

        if (isMissing(raw)) {
          return;
        }

        if (
          !looksLikeNumber(raw)
        ) {
          return;
        }

        validValues.push({
          value: Number(raw),
          rowIndex: index,
        });
      }
    );

    // 数据太少时不做离群判断
    if (
      validValues.length < 4
    ) {
      continue;
    }

    const sorted =
      validValues
        .map(
          (item) =>
            item.value
        )
        .sort(
          (a, b) => a - b
        );

    const q1 =
      quantile(
        sorted,
        0.25
      );

    const q3 =
      quantile(
        sorted,
        0.75
      );

    const iqr =
      q3 - q1;

    // IQR = 0 时暂不进行自动离群判断
    if (iqr === 0) {
      continue;
    }

    const lowerBound =
      q1 - 1.5 * iqr;

    const upperBound =
      q3 + 1.5 * iqr;

    for (
      const item
      of validValues
    ) {
      if (
        item.value <
          lowerBound ||
        item.value >
          upperBound
      ) {
        outliers.push({
          rowNumber:
            item.rowIndex + 2,

          column,

          value:
            item.value,

          lowerBound,

          upperBound,
        });
      }
    }
  }

  return outliers;
}

export function calculateNumericStatistics(
  rows: Row[],
  headers: string[]
): NumericStatistics[] {
  const statistics: NumericStatistics[] = [];

  for (const column of headers) {
    const type = detectColumnType(
      rows,
      column
    );

    if (type !== "number") {
      continue;
    }

    const numbers: number[] = [];

    let missingCount = 0;
    let invalidCount = 0;

    for (const row of rows) {
      const value = row[column];

      if (isMissing(value)) {
        missingCount++;
        continue;
      }

      if (!looksLikeNumber(value)) {
        invalidCount++;
        continue;
      }

      numbers.push(Number(value));
    }

    if (numbers.length === 0) {
      statistics.push({
        column,
        validCount: 0,
        missingCount,
        invalidCount,
        mean: null,
        median: null,
        standardDeviation: null,
        min: null,
        max: null,
      });

      continue;
    }

    const sorted = [...numbers].sort(
      (a, b) => a - b
    );

    const sum = numbers.reduce(
      (total, value) => total + value,
      0
    );

    const mean =
      sum / numbers.length;

    let median: number;

    if (sorted.length % 2 === 1) {
      median =
        sorted[
          Math.floor(sorted.length / 2)
        ];
    } else {
      const middle =
        sorted.length / 2;

      median =
        (sorted[middle - 1] +
          sorted[middle]) /
        2;
    }

    const variance =
      numbers.reduce(
        (total, value) =>
          total +
          Math.pow(
            value - mean,
            2
          ),
        0
      ) / numbers.length;

    const standardDeviation =
      Math.sqrt(variance);

    statistics.push({
      column,
      validCount: numbers.length,
      missingCount,
      invalidCount,
      mean,
      median,
      standardDeviation,
      min: sorted[0],
      max: sorted[sorted.length - 1],
    });
  }

  return statistics;
}

export function cleanRows(
  rows: Row[],
  headers: string[],
  options: CleaningOptions
) {
  const columnTypes =
    Object.fromEntries(
      headers.map(
        (header) => [
          header,
          detectColumnType(
            rows,
            header
          ),
        ]
      )
    );

  const outliers =
    calculateOutliers(
      rows,
      headers
    );

  const outlierRows =
    new Set(
      outliers.map(
        (outlier) =>
          outlier.rowNumber
      )
    );

  const cleanedRows: Row[] =
    [];

  const seen =
    new Set<string>();

  for (
    let index = 0;
    index < rows.length;
    index++
  ) {
    const originalRow =
      rows[index];

    const csvRowNumber =
      index + 2;

    const row: Row = {};

    for (
      const header
      of headers
    ) {
      const originalValue =
        originalRow[
          header
        ] ?? "";

      row[header] =
        options.trimWhitespace
          ? originalValue.trim()
          : originalValue;
    }

    // 删除缺失值行
    if (
      options.removeMissingRows
    ) {
      const hasMissing =
        headers.some(
          (header) =>
            isMissing(
              row[header]
            )
        );

      if (hasMissing) {
        continue;
      }
    }

    // 删除格式异常行
    if (
      options.removeInvalidRows
    ) {
      let hasInvalid = false;

      for (
        const header
        of headers
      ) {
        const value =
          row[header];

        if (
          isMissing(value)
        ) {
          continue;
        }

        const type =
          columnTypes[
            header
          ];

        if (
          type === "number" &&
          !looksLikeNumber(
            value
          )
        ) {
          hasInvalid = true;
          break;
        }

        if (
          type === "date" &&
          !looksLikeDate(
            value
          )
        ) {
          hasInvalid = true;
          break;
        }
      }

      if (hasInvalid) {
        continue;
      }
    }

    // 用户主动选择后才删除离群值行
    if (
      options.removeOutlierRows &&
      outlierRows.has(
        csvRowNumber
      )
    ) {
      continue;
    }

    // 删除重复行
    if (
      options.removeDuplicates
    ) {
      const key =
        JSON.stringify(
          headers.map(
            (header) =>
              row[header] ?? ""
          )
        );

      if (
        seen.has(key)
      ) {
        continue;
      }

      seen.add(key);
    }

    cleanedRows.push(row);
  }

  return cleanedRows;
}