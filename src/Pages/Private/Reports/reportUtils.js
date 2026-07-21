// Wrap a column sorter so the grand-total row always lands at the bottom,
// regardless of sort direction. AntD passes sortOrder as the third arg and
// flips the comparator result for descend, so we mirror our pin sign on it.
const isGT = (r) => r?.isGrandTotal || r?.isTotal;

export const pinGrandTotal = (cmp) => (a, b, sortOrder) => {
  if (isGT(a)) return sortOrder === "descend" ? -1 : 1;
  if (isGT(b)) return sortOrder === "descend" ? 1 : -1;
  return cmp(a, b);
};

export const openCustomerAnalysis = ({ customerCode, branchCode, channel, productCode }) => {
  if (!customerCode) return;
  const params = new URLSearchParams();
  params.set("customer_code", customerCode);
  if (branchCode && branchCode !== "ALL") params.set("branch_code", branchCode);
  if (channel)     params.set("channel_code", channel);
  if (productCode) params.set("product_code", productCode);
  window.open(`/customer-analysis?${params.toString()}`, "_blank", "noopener");
};

export const openSalesmanAnalysis = ({ salesmanCode, branchCode, productCode }) => {
  if (!salesmanCode) return;
  const params = new URLSearchParams();
  params.set("salesman_code", salesmanCode);
  if (branchCode && branchCode !== "ALL") params.set("branch_code", branchCode);
  if (productCode) params.set("product_code", productCode);
  window.open(`/salesman-analysis?${params.toString()}`, "_blank", "noopener");
};

/**
 * Render `rows` to an .xlsx file matching the navy/white style used elsewhere
 * in the reports module. Columns is an array of:
 *   { header, key, width?, align?, type?, format? }
 *     type: "number" | "text" (default "text")
 *     format: e.g. "#,##0" for thousands
 * sheetName is also used as the workbook filename (`<sheetName>.xlsx`).
 */
export const exportRowsToExcel = async ({
  sheetName,
  fileName,
  columns,
  rows,
  subtitle,
}) => {
  if (!rows?.length) return;
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Wazalytics";
  const ws = wb.addWorksheet(sheetName.slice(0, 31), {
    views: [{ state: "frozen", ySplit: subtitle ? 2 : 1 }],
  });

  const NAV = "FF1E3A5F";
  const GRAY = "FFF1F5F9";

  let headerRowIdx = 1;
  if (subtitle) {
    const r = ws.addRow([subtitle]);
    ws.mergeCells(r.number, 1, r.number, columns.length);
    r.font = { italic: true, size: 11, color: { argb: "FF64748B" } };
    headerRowIdx = 2;
  }

  ws.columns = columns.map((c) => ({
    header: c.header,
    key:    c.key,
    width:  c.width || 18,
  }));

  // ws.columns already created the header row; re-style it.
  const headerRow = ws.getRow(headerRowIdx);
  headerRow.values = columns.map((c) => c.header);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAV } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
  });
  headerRow.height = 22;

  rows.forEach((r) => {
    const row = ws.addRow(
      columns.reduce((acc, c) => {
        acc[c.key] = r[c.key] ?? (c.type === "number" ? 0 : "");
        return acc;
      }, {})
    );
    const isEven = row.number % 2 === 0;
    columns.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.alignment = {
        horizontal: c.align || (c.type === "number" ? "right" : "left"),
        vertical:   "middle",
      };
      if (c.type === "number") cell.numFmt = c.format || "#,##0";
      cell.font = { size: 11, color: { argb: "FF1E293B" } };
      if (isEven) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRAY } };
      }
      // Per-cell override: { fill?: argb, font?: argb, bold?: bool }
      if (typeof c.cellStyle === "function") {
        const s = c.cellStyle(r);
        if (s?.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: s.fill } };
        if (s?.font || s?.bold) {
          cell.font = { size: 11, color: { argb: s.font || "FF1E293B" }, bold: !!s.bold };
        }
      }
    });
  });

  ws.autoFilter = {
    from: { row: headerRowIdx, column: 1 },
    to:   { row: headerRowIdx, column: columns.length },
  };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName || sheetName}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};
