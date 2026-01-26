import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export type ExcelCellValue = string | number | boolean | Date | null | undefined;
export type ExcelAOA = ExcelCellValue[][];

export type ExcelSheetSpec = {
  name: string;
  rows: ExcelAOA;
  /** Optional fixed widths in characters for each column */
  columnWidths?: number[];
};

const sanitizeSheetName = (name: string) => {
  // Excel constraints: <= 31 chars, cannot contain: : \\ / ? * [ ]
  const cleaned = name.replace(/[:\\/\?\*\[\]]/g, " ").trim();
  return cleaned.length > 31 ? cleaned.slice(0, 31) : cleaned;
};

export const objectsToAOA = (items: Record<string, ExcelCellValue>[]) => {
  if (!items.length) return [] as ExcelAOA;
  const headers = Object.keys(items[0]);
  const rows: ExcelAOA = [headers];
  for (const item of items) {
    rows.push(headers.map((h) => item[h]));
  }
  return rows;
};

export async function downloadXlsx(
  filename: string,
  sheets: ExcelSheetSpec[],
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "YouCollect";
  workbook.created = new Date();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sanitizeSheetName(sheet.name));
    worksheet.addRows(sheet.rows);

    if (sheet.columnWidths?.length) {
      worksheet.columns = sheet.columnWidths.map((wch) => ({ width: wch }));
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}
