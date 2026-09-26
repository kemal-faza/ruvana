import ExcelJS from "exceljs";

import type { AnalyticsExportModel, AnalyticsExportSection } from "@/lib/exports/analytics-export-model";

function addSectionWorksheet(workbook: ExcelJS.Workbook, section: AnalyticsExportSection): void {
  const worksheet = workbook.addWorksheet(section.title);
  const header = worksheet.addRow(section.columns);

  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF173B57" },
  };
  header.alignment = { vertical: "middle", wrapText: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const values of section.rows) {
    const row = worksheet.addRow([]);
    values.forEach((value, index) => {
      const cell = row.getCell(index + 1);
      // User-controlled text stays a primitive string; computed values retain numeric cell types.
      cell.value = value;
      cell.alignment = { vertical: "top", wrapText: true };
    });
  }

  section.columns.forEach((column, index) => {
    const longestValue = Math.max(
      column.length,
      ...section.rows.map((row) => String(row[index] ?? "").length),
    );
    worksheet.getColumn(index + 1).width = Math.min(Math.max(longestValue + 2, 14), 52);
  });

  if (worksheet.rowCount > 1) {
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: worksheet.rowCount, column: section.columns.length },
    };
  }
}

/** Build an XLSX workbook from the canonical dashboard/export model. */
export async function serializeAnalyticsXlsx(model: AnalyticsExportModel): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ruvana";
  workbook.created = new Date(model.metadata.createdAtIso);
  workbook.modified = workbook.created;
  workbook.subject = "Rekap analitik fasilitas";
  workbook.title = `Analitik ${model.metadata.startDate} sampai ${model.metadata.endDate}`;
  workbook.company = "Ruvana";

  for (const section of model.sections) {
    addSectionWorksheet(workbook, section);
  }

  const result = await workbook.xlsx.writeBuffer();
  return Buffer.from(result);
}
