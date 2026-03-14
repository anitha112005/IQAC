import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

export const buildPdfBuffer = async (title, rows) => {
  const doc = new PDFDocument({ margin: 30 });
  const chunks = [];

  doc.on("data", (chunk) => chunks.push(chunk));

  doc.fontSize(16).text(title, { underline: true });
  doc.moveDown();

  rows.forEach((row, idx) => {
    doc.fontSize(11).text(`${idx + 1}. ${JSON.stringify(row)}`);
    doc.moveDown(0.3);
  });

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
  });
};

export const buildExcelBuffer = async (sheetName, rows) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (!rows.length) {
    worksheet.addRow(["No data found"]);
  } else {
    const headers = Object.keys(rows[0]);
    worksheet.addRow(headers);
    rows.forEach((row) => {
      worksheet.addRow(headers.map((header) => row[header]));
    });
  }

  return workbook.xlsx.writeBuffer();
};
