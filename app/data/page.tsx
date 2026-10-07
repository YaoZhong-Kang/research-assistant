"use client";

import {
  useMemo,
  useState,
} from "react";

import Papa from "papaparse";
import * as XLSX from "xlsx";

import {
  Row,
  CleaningOptions,
  calculateColumnIssues,
  calculateDataIssues,
  countDuplicates,
  calculateNumericStatistics,
  calculateOutliers,
  cleanRows,
  isMissing,
} from "@/lib/data-utils";


export default function DataPage() {

  const [
    fileName,
    setFileName,
  ] = useState("");

  const [
    rows,
    setRows,
  ] = useState<Row[]>([]);

  const [
    headers,
    setHeaders,
  ] = useState<
    string[]
  >([]);

  const [
    error,
    setError,
  ] = useState("");

  const [
    previewRows,
    setPreviewRows,
  ] = useState<
    Row[] | null
  >(null);

  const [
  workbook,
  setWorkbook,
] =
  useState<XLSX.WorkBook | null>(
    null
  );

  const [
    sheetNames,
    setSheetNames,
  ] =
    useState<string[]>([]);

  const [
    selectedSheet,
    setSelectedSheet,
  ] =
    useState("");

  const [
    cleaningOptions,
    setCleaningOptions,
  ] =
    useState<CleaningOptions>({
      removeDuplicates: false,
      trimWhitespace: false,
      removeMissingRows: false,
      removeInvalidRows: false,
    });


  function loadWorksheet(
    workbookToLoad:
      XLSX.WorkBook,

    sheetName: string
  ) {
    const worksheet =
      workbookToLoad
        .Sheets[
          sheetName
        ];

    if (!worksheet) {
      setError(
        "无法读取所选工作表。"
      );

      return;
    }

    const matrix =
      XLSX.utils
        .sheet_to_json<
          (
            | string
            | number
            | boolean
            | null
          )[]
        >(
          worksheet,
          {
            header: 1,
            defval: "",
            raw: false,
            blankrows: false,
          }
        );

    if (
      matrix.length === 0
    ) {
      setError(
        "该工作表为空。"
      );

      return;
    }

    const rawHeaders =
      matrix[0];

    // 防止空列名或重复列名
    const usedNames =
      new Map<
        string,
        number
      >();

    const parsedHeaders =
      rawHeaders.map(
        (
          value,
          index
        ) => {
          let name =
            String(
              value ?? ""
            ).trim();

          if (!name) {
            name =
              `Column_${
                index + 1
              }`;
          }

          const count =
            usedNames.get(
              name
            ) ?? 0;

          usedNames.set(
            name,
            count + 1
          );

          if (count > 0) {
            return `${name}_${
              count + 1
            }`;
          }

          return name;
        }
      );

    const parsedRows: Row[] =
      matrix
        .slice(1)
        .map(
          (values) => {
            const row: Row =
              {};

            parsedHeaders.forEach(
              (
                header,
                index
              ) => {
                row[header] =
                  String(
                    values[
                      index
                    ] ??
                      ""
                  );
              }
            );

            return row;
          }
        );

    setHeaders(
      parsedHeaders
    );

    setRows(
      parsedRows
    );

    setPreviewRows(
      null
    );

    setSelectedSheet(
      sheetName
    );
  }

  async function handleFile(
    file: File
  ) {
    setError("");

    setPreviewRows(null);

    setWorkbook(null);

    setSheetNames([]);

    setSelectedSheet("");

    setCleaningOptions({
      removeDuplicates: false,
      trimWhitespace: false,
      removeMissingRows: false,
      removeInvalidRows: false,
      removeOutlierRows: false,
    });

    const lowerName =
      file.name.toLowerCase();

    const isCsv =
      lowerName.endsWith(
        ".csv"
      );

    const isExcel =
      lowerName.endsWith(
        ".xlsx"
      );

    if (
      !isCsv &&
      !isExcel
    ) {
      setError(
        "目前支持 CSV 和 XLSX 文件。"
      );

      return;
    }

    setFileName(
      file.name
    );

    // CSV
    if (isCsv) {
      Papa.parse<Row>(
        file,
        {
          header: true,

          skipEmptyLines: true,

          complete:
            (result) => {
              const parsedRows =
                result.data;

              const parsedHeaders =
                result.meta
                  .fields ||
                [];

              setRows(
                parsedRows
              );

              setHeaders(
                parsedHeaders
              );

              if (
                result.errors
                  .length > 0
              ) {
                console.warn(
                  "CSV parse warnings:",
                  result.errors
                );
              }
            },

          error: () => {
            setError(
              "CSV 文件读取失败。"
            );
          },
        }
      );

      return;
    }

    // XLSX
    try {
      const arrayBuffer =
        await file.arrayBuffer();

      const loadedWorkbook =
        XLSX.read(
          arrayBuffer,
          {
            type: "array",
          }
        );

      if (
        loadedWorkbook
          .SheetNames
          .length === 0
      ) {
        setError(
          "Excel 文件中没有可读取的工作表。"
        );

        return;
      }

      setWorkbook(
        loadedWorkbook
      );

      setSheetNames(
        loadedWorkbook
          .SheetNames
      );

      const firstSheet =
        loadedWorkbook
          .SheetNames[0];

      loadWorksheet(
        loadedWorkbook,
        firstSheet
      );
    } catch (error) {
      console.error(
        error
      );

      setError(
        "XLSX 文件读取失败。"
      );
    }
  }


  const originalColumnIssues =
    useMemo(
      () =>
        calculateColumnIssues(
          rows,
          headers
        ),
      [
        rows,
        headers,
      ]
    );


  const originalDataIssues =
    useMemo(
      () =>
        calculateDataIssues(
          rows,
          headers
        ),
      [
        rows,
        headers,
      ]
    );


  const originalDuplicateCount =
    useMemo(
      () =>
        countDuplicates(
          rows,
          headers
        ),
      [
        rows,
        headers,
      ]
    );


  const originalMissingCount =
    useMemo(
      () =>
        originalColumnIssues.reduce(
          (
            total,
            issue
          ) =>
            total +
            issue.missingCount,
          0
        ),
      [
        originalColumnIssues,
      ]
    );


  const originalInvalidCount =
    useMemo(
      () =>
        originalColumnIssues.reduce(
          (
            total,
            issue
          ) =>
            total +
            issue.invalidCount,
          0
        ),
      [
        originalColumnIssues,
      ]
    );


  const originalNumericStats =
    useMemo(
      () =>
        calculateNumericStatistics(
          rows,
          headers
        ),
      [
        rows,
        headers,
      ]
    );


  const previewColumnIssues =
    useMemo(
      () =>
        previewRows
          ? calculateColumnIssues(
              previewRows,
              headers
            )
          : [],
      [
        previewRows,
        headers,
      ]
    );


  const previewDuplicateCount =
    useMemo(
      () =>
        previewRows
          ? countDuplicates(
              previewRows,
              headers
            )
          : 0,
      [
        previewRows,
        headers,
      ]
    );


  const previewMissingCount =
    useMemo(
      () =>
        previewRows
          ? previewColumnIssues.reduce(
              (
                total,
                issue
              ) =>
                total +
                issue.missingCount,
              0
            )
          : 0,
      [
        previewRows,
        previewColumnIssues,
      ]
    );


  const previewInvalidCount =
    useMemo(
      () =>
        previewRows
          ? previewColumnIssues.reduce(
              (
                total,
                issue
              ) =>
                total +
                issue.invalidCount,
              0
            )
          : 0,
      [
        previewRows,
        previewColumnIssues,
      ]
    );

  const originalOutliers =
    useMemo(
      () =>
        calculateOutliers(
          rows,
          headers
        ),
      [
        rows,
        headers,
      ]
    );

  const previewOutliers =
    useMemo(
      () =>
        previewRows
          ? calculateOutliers(
              previewRows,
              headers
            )
          : [],
      [
        previewRows,
        headers,
      ]
    );

  function toggleOption(
    option:
      keyof CleaningOptions
  ) {

    setCleaningOptions(
      (previous) => ({
        ...previous,

        [option]:
          !previous[
            option
          ],
      })
    );

    setPreviewRows(null);
  }


  function previewCleaning() {

    const cleaned =
      cleanRows(
        rows,
        headers,
        cleaningOptions
      );

    setPreviewRows(
      cleaned
    );
  }


  function resetPreview() {

    setPreviewRows(null);

    setCleaningOptions({
      removeDuplicates: false,
      trimWhitespace: false,
      removeMissingRows: false,
      removeInvalidRows: false,
    });
  }


  function downloadCSV() {

    if (!previewRows) {
      return;
    }

    const csv =
      Papa.unparse(
        previewRows
      );

    const blob =
      new Blob(
        [
          "\uFEFF" +
            csv,
        ],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    const baseName =
      fileName.replace(
        /\.csv$/i,
        ""
      ) || "data";

    link.download =
      `${baseName}-cleaned.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      url
    );
  }


  const displayedRows =
    previewRows ??
    rows;


  return (

    <main className="mx-auto max-w-6xl px-6 py-16">

      <div className="max-w-2xl">

        <p className="text-sm font-medium text-gray-500">
          Data Assistant
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          数据助手
        </h1>

        <p className="mt-4 leading-7 text-gray-600">
          上传 CSV 或 XLSX 科研数据，检查缺失值、
          重复行、数据类型和常见格式问题。
          清理操作由用户自主选择，原始文件不会被修改。
        </p>

      </div>


      <section className="mt-10 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8">

        <label className="block cursor-pointer">

          <span className="text-sm font-medium text-gray-900">
            选择 CSV 或 XLSX 文件
          </span>

          <input
            type="file"

            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

            className="mt-4 block w-full text-sm text-gray-600"

            onChange={(
              event
            ) => {

              const file =
                event.target
                  .files?.[0];

              if (file) {

                handleFile(
                  file
                );
              }
            }}
          />

        </label>


        {fileName && (

          <p className="mt-4 text-sm text-gray-500">
            当前文件：
            {sheetNames.length > 0 && (
              <div className="mt-5">

                <label className="text-sm font-medium text-gray-700">
                  Excel 工作表
                </label>

                <select
                  value={
                    selectedSheet
                  }

                  onChange={(
                    event
                  ) => {
                    const sheet =
                      event.target
                        .value;

                    if (
                      workbook
                    ) {
                      loadWorksheet(
                        workbook,
                        sheet
                      );
                    }
                  }}

                  className="ml-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {sheetNames.map(
                    (sheet) => (
                      <option
                        key={sheet}
                        value={sheet}
                      >
                        {sheet}
                      </option>
                    )
                  )}
                </select>

              </div>
            )}
            {" "}
            {fileName}
          </p>

          

        )}

      </section>


      {error && (

        <p className="mt-4 text-sm text-red-600">
          {error}
        </p>

      )}


      {rows.length >
        0 && (

        <>

          <section className="mt-10">

            <h2 className="text-xl font-semibold text-gray-900">
              原始数据概览
            </h2>


            <div className="mt-5 grid gap-4 md:grid-cols-3 lg:grid-cols-6">

              <StatCard
                label="数值离群值"
                value={
                  originalOutliers.length
                }
              />

              <StatCard
                label="行数"
                value={
                  rows.length
                }
              />

              <StatCard
                label="列数"
                value={
                  headers.length
                }
              />

              <StatCard
                label="缺失值"
                value={
                  originalMissingCount
                }
              />

              <StatCard
                label="重复行"
                value={
                  originalDuplicateCount
                }
              />

              <StatCard
                label="格式异常"
                value={
                  originalInvalidCount
                }
              />

            </div>

          </section>


          <section className="mt-12">

            <h2 className="text-xl font-semibold text-gray-900">
              数据质量检查
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              自动检测每一列的缺失值、
              推测类型与异常格式。
            </p>


            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">

              <table className="w-full text-left text-sm">

                <thead className="bg-gray-50">

                  <tr>

                    <th className="px-4 py-3">
                      列名
                    </th>

                    <th className="px-4 py-3">
                      推测类型
                    </th>

                    <th className="px-4 py-3">
                      缺失值
                    </th>

                    <th className="px-4 py-3">
                      格式异常
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {originalColumnIssues.map(
                    (item) => (

                    <tr
                      key={
                        item.column
                      }

                      className="border-t border-gray-100"
                    >

                      <td className="px-4 py-3 font-medium">

                        {
                          item.column
                        }

                      </td>

                      <td className="px-4 py-3 text-gray-600">

                        {
                          item.detectedType
                        }

                      </td>

                      <td className="px-4 py-3">

                        {
                          item.missingCount
                        }

                      </td>

                      <td className="px-4 py-3">

                        {
                          item.invalidCount
                        }

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </section>


          {originalDataIssues.length >
            0 && (

            <section className="mt-10">

              <h2 className="text-xl font-semibold text-gray-900">
                问题详情
              </h2>


              <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200">

                <table className="w-full text-left text-sm">

                  <thead className="bg-gray-50">

                    <tr>

                      <th className="px-4 py-3">
                        CSV 行号
                      </th>

                      <th className="px-4 py-3">
                        列名
                      </th>

                      <th className="px-4 py-3">
                        原始值
                      </th>

                      <th className="px-4 py-3">
                        问题
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {originalDataIssues.map(
                      (
                        issue,
                        index
                      ) => (

                      <tr
                        key={`${issue.rowNumber}-${issue.column}-${index}`}

                        className="border-t border-gray-100"
                      >

                        <td className="px-4 py-3">
                          {
                            issue.rowNumber
                          }
                        </td>

                        <td className="px-4 py-3 font-medium">
                          {
                            issue.column
                          }
                        </td>

                        <td className="px-4 py-3">
                          {issue.value ||
                            "（空）"}
                        </td>

                        <td className="px-4 py-3 text-red-600">
                          {
                            issue.message
                          }
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </section>

          )}


          {originalNumericStats.length >
            0 && (

            <section className="mt-12">

              <h2 className="text-xl font-semibold text-gray-900">
                数值列统计
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                仅使用可识别的有效数值进行统计，
                缺失值和非法值不会参与计算。
              </p>


              <div className="mt-6 grid gap-5">

                {originalNumericStats.map(
                  (stats) => (

                  <div
                    key={
                      stats.column
                    }

                    className="rounded-2xl border border-gray-200 bg-white p-6"
                  >

                    <h3 className="font-semibold text-gray-900">

                      {
                        stats.column
                      }

                    </h3>


                    <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">

                      <MiniStat
                        label="有效值"
                        value={
                          stats.validCount
                        }
                      />

                      <MiniStat
                        label="缺失值"
                        value={
                          stats.missingCount
                        }
                      />

                      <MiniStat
                        label="异常值"
                        value={
                          stats.invalidCount
                        }
                      />

                      <MiniStat
                        label="平均值"
                        value={
                          formatNumber(
                            stats.mean
                          )
                        }
                      />

                      <MiniStat
                        label="中位数"
                        value={
                          formatNumber(
                            stats.median
                          )
                        }
                      />

                      <MiniStat
                        label="标准差"
                        value={
                          formatNumber(
                            stats.standardDeviation
                          )
                        }
                      />

                      <MiniStat
                        label="最小值"
                        value={
                          formatNumber(
                            stats.min
                          )
                        }
                      />

                      <MiniStat
                        label="最大值"
                        value={
                          formatNumber(
                            stats.max
                          )
                        }
                      />

                    </div>

                  </div>

                ))}

              </div>

            </section>

          )}


          <section className="mt-12">

            <h2 className="text-xl font-semibold text-gray-900">
              清理选项
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              请选择需要执行的操作。
              默认不会修改任何数据。
            </p>


            <div className="mt-5 grid gap-3">

              <CleaningCheckbox
                checked={
                  cleaningOptions.removeDuplicates
                }

                onChange={() =>
                  toggleOption(
                    "removeDuplicates"
                  )
                }

                title="删除完全重复行"

                description="仅删除所有列内容完全相同的重复记录。"
              />


              <CleaningCheckbox
                checked={
                  cleaningOptions.trimWhitespace
                }

                onChange={() =>
                  toggleOption(
                    "trimWhitespace"
                  )
                }

                title="去除文本前后空格"

                description="例如将 “ test ” 清理为 “test”。"
              />


              <CleaningCheckbox
                checked={
                  cleaningOptions.removeMissingRows
                }

                onChange={() =>
                  toggleOption(
                    "removeMissingRows"
                  )
                }

                title="删除含缺失值的行"

                description="该操作可能影响科研数据量，请确认后使用。"

                warning
              />


              <CleaningCheckbox
                checked={
                  cleaningOptions.removeInvalidRows
                }

                onChange={() =>
                  toggleOption(
                    "removeInvalidRows"
                  )
                }

                title="删除含格式异常值的行"

                description="例如数值列中出现 abc 的记录。"

                warning
              />

            </div>


            <div className="mt-6 flex flex-wrap gap-3">

              <button
                onClick={
                  previewCleaning
                }

                className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-700"
              >
                预览清理结果
              </button>


              {previewRows && (

                <button
                  onClick={
                    resetPreview
                  }

                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  恢复原始预览
                </button>

              )}


              <button
                onClick={
                  downloadCSV
                }

                disabled={
                  !previewRows
                }

                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                下载清理结果
              </button>

            </div>

          </section>


          {previewRows && (

            <section className="mt-12">

              <h2 className="text-xl font-semibold text-gray-900">
                清理前后对比
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                原始文件不会发生修改，
                下面仅显示当前清理方案的预览结果。
              </p>


              <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">

                <table className="w-full text-left text-sm">

                  <thead className="bg-gray-50">

                    <tr>

                      <th className="px-4 py-3">
                        指标
                      </th>

                      <th className="px-4 py-3">
                        原始数据
                      </th>

                      <th className="px-4 py-3">
                        清理后
                      </th>

                      <th className="px-4 py-3">
                        变化
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    <ComparisonRow
                      label="行数"

                      before={
                        rows.length
                      }

                      after={
                        previewRows.length
                      }
                    />


                    <ComparisonRow
                      label="缺失值"

                      before={
                        originalMissingCount
                      }

                      after={
                        previewMissingCount
                      }
                    />


                    <ComparisonRow
                      label="重复行"

                      before={
                        originalDuplicateCount
                      }

                      after={
                        previewDuplicateCount
                      }
                    />


                    <ComparisonRow
                      label="格式异常"

                      before={
                        originalInvalidCount
                      }

                      after={
                        previewInvalidCount
                      }
                    />

                  </tbody>

                </table>

              </div>

            </section>

          )}


          <section className="mt-12">

            <h2 className="text-xl font-semibold text-gray-900">
              数据预览
            </h2>


            <p className="mt-2 text-sm text-gray-500">

              当前显示前 20 行。

              {previewRows
                ? " 当前为清理后的预览。"
                : " 当前为原始数据预览。"}

            </p>


            <div className="mt-5 overflow-x-auto rounded-2xl border border-gray-200">

              <table className="min-w-full text-left text-sm">

                <thead className="bg-gray-50">

                  <tr>

                    {headers.map(
                      (
                        header
                      ) => (

                      <th
                        key={
                          header
                        }

                        className="whitespace-nowrap px-4 py-3 font-medium"
                      >
                        {
                          header
                        }
                      </th>

                    ))}

                  </tr>

                </thead>


                <tbody>

                  {displayedRows
                    .slice(
                      0,
                      20
                    )
                    .map(
                      (
                        row,
                        index
                      ) => (

                    <tr
                      key={
                        index
                      }

                      className="border-t border-gray-100"
                    >

                      {headers.map(
                        (
                          header
                        ) => {

                        const value =
                          row[
                            header
                          ];

                        return (

                          <td
                            key={
                              header
                            }

                            className="whitespace-nowrap px-4 py-3 text-gray-700"
                          >

                            {isMissing(
                              value
                            ) ? (

                              <span className="text-red-500">
                                缺失
                              </span>

                            ) : (

                              value

                            )}

                          </td>

                        );
                      })}

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </section>

        </>

      )}

    </main>
  );
}


function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {

  return (

    <div className="rounded-2xl border border-gray-200 bg-white p-5">

      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold text-gray-900">
        {value}
      </p>

    </div>

  );
}


function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {

  return (

    <div className="rounded-xl bg-gray-50 p-4">

      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 font-medium text-gray-900">
        {value}
      </p>

    </div>

  );
}


function CleaningCheckbox({
  checked,
  onChange,
  title,
  description,
  warning = false,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
  warning?: boolean;
}) {

  return (

    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">

      <input
        type="checkbox"

        checked={
          checked
        }

        onChange={
          onChange
        }

        className="mt-1 h-4 w-4"
      />


      <div>

        <p className="font-medium text-gray-900">
          {title}
        </p>

        <p
          className={`mt-1 text-sm ${
            warning
              ? "text-amber-700"
              : "text-gray-500"
          }`}
        >
          {
            description
          }
        </p>

      </div>

    </label>

  );
}


function ComparisonRow({
  label,
  before,
  after,
}: {
  label: string;
  before: number;
  after: number;
}) {

  const difference =
    after - before;

  const change =
    difference === 0
      ? "无变化"
      : difference > 0
      ? `+${difference}`
      : `${difference}`;

  return (

    <tr className="border-t border-gray-100">

      <td className="px-4 py-3 font-medium">
        {label}
      </td>

      <td className="px-4 py-3">
        {before}
      </td>

      <td className="px-4 py-3">
        {after}
      </td>

      <td className="px-4 py-3 text-gray-600">
        {change}
      </td>

    </tr>

  );
}


function formatNumber(
  value: number | null
) {

  if (value === null) {
    return "—";
  }

  return Number(
    value.toFixed(4)
  ).toString();
}