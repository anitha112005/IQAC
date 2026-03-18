import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

// ── CONSTANTS ─────────────────────────────────────────────────
const NAVY = "#1e3a5f";
const PURPLE = "#7c3aed";
const LIGHT_GRAY = "#f0f4f8";
const ALT_ROW = "#f8f9fa";
const TEXT_DARK = "#1a1a1a";
const TEXT_MID = "#444444";
const TEXT_LIGHT = "#777777";
const BORDER = "#d1d5db";
const MARGIN = 50;

// ── SAFE TEXT HELPER ─────────────────────────────────────────
// pdfkit crashes if text is undefined or null
const safe = (val) => {
  if (val === null || val === undefined) return "";
  return String(val);
};

// ── COLUMN WIDTH CALCULATOR ──────────────────────────────────
// Distribute column widths based on content type rather than equal split
const calcColWidths = (columns, usableWidth) => {
  if (!columns?.length) return [];

  // Assign weight per column based on header length and expected content
  const weights = columns.map(col => {
    const h = (col.header || "").length;
    if (h <= 4) return 1;   // short: Rank, Code
    if (h <= 8) return 1.5; // medium: CGPA, Pass %
    if (h <= 14) return 2;   // normal
    return 3;                // long: Department Name, Title
  });

  const totalWeight = weights.reduce((s, w) => s + w, 0);
  return weights.map(w => Math.floor((w / totalWeight) * usableWidth));
};

// ─────────────────────────────────────────────────────────────
// PROFESSIONAL PDF BUILDER
// ─────────────────────────────────────────────────────────────
export const buildPdfBuffer = async (title, rows, reportMeta = {}) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: 50, left: MARGIN, right: MARGIN },
      bufferPages: true,
      autoFirstPage: true,
    });

    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (e) => reject(e));

    const PAGE_W = doc.page.width;
    const USABLE_W = PAGE_W - MARGIN * 2;

    const { subtitle, columns, summaryRows, aiAnalysis } = reportMeta;

    // ── DRAW HEADER ───────────────────────────────────────────
    const drawHeader = () => {
      // Navy background
      doc.rect(0, 0, PAGE_W, 72).fill(NAVY);

      // Institution name — top line
      doc.fillColor("white")
        .fontSize(13)
        .font("Helvetica-Bold")
        .text("IQAC Academic Intelligence System", MARGIN, 14, {
          width: USABLE_W,
          align: "center",
        });

      // Report title — second line
      doc.fillColor("white")
        .fontSize(10)
        .font("Helvetica")
        .text(safe(title), MARGIN, 34, {
          width: USABLE_W,
          align: "center",
        });

      // Generated date — bottom right inside header
      const dateStr = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
      doc.fillColor("rgba(255,255,255,0.75)")
        .fontSize(8)
        .text(`Generated: ${dateStr}`, MARGIN, 56, {
          width: USABLE_W,
          align: "right",
        });

      // Accent line below header
      doc.rect(0, 72, PAGE_W, 3).fill("#2563eb");

      // Reset cursor below header
      doc.y = 90;
    };

    drawHeader();

    // ── SUBTITLE ──────────────────────────────────────────────
    if (subtitle) {
      doc.fillColor(TEXT_MID)
        .fontSize(9)
        .font("Helvetica")
        .text(safe(subtitle), MARGIN, doc.y, { width: USABLE_W });
      doc.moveDown(1.2);
    }

    // ── SUMMARY SECTION ───────────────────────────────────────
    if (summaryRows?.length > 0) {
      const ROW_H = 18;
      const BLOCK_H = 24 + summaryRows.length * ROW_H + 12;
      const startY = doc.y;

      // Section background
      doc.rect(MARGIN, startY, USABLE_W, BLOCK_H).fill(LIGHT_GRAY);

      // Section heading
      doc.fillColor(NAVY)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Report Summary", MARGIN + 10, startY + 8);

      let rowY = startY + 26;

      summaryRows.forEach((item, idx) => {
        // Alternate row fill
        const rowFill = idx % 2 === 0 ? "white" : "#e8eef6";
        doc.rect(MARGIN + 4, rowY, USABLE_W - 8, ROW_H).fill(rowFill);

        // Label
        doc.fillColor(TEXT_DARK)
          .fontSize(9)
          .font("Helvetica-Bold")
          .text(safe(item.label), MARGIN + 12, rowY + 5, { width: 180 });

        // Value
        doc.fillColor(TEXT_MID)
          .font("Helvetica")
          .text(safe(item.value), MARGIN + 200, rowY + 5, {
            width: USABLE_W - 210,
          });

        rowY += ROW_H;
      });

      doc.y = startY + BLOCK_H + 14;
    }

    // ── AI ANALYSIS SECTION ───────────────────────────────────
    if (aiAnalysis?.trim()) {
      const analysis = safe(aiAnalysis).trim();
      const textW = USABLE_W - 24;
      const textH = doc.heightOfString(analysis, {
        width: textW,
        align: "justify",
        lineGap: 4,
      });
      const blockH = textH + 40;

      // Check for page break before drawing
      if (doc.y + blockH > doc.page.height - 70) {
        doc.addPage();
        doc.y = 40;
      }

      const startY = doc.y;

      // Light purple background
      doc.rect(MARGIN, startY, USABLE_W, blockH).fill("#f5f0ff");

      // Left purple accent border
      doc.rect(MARGIN, startY, 4, blockH).fill(PURPLE);

      // Section label
      doc.fillColor(PURPLE)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("AI Generated Analysis", MARGIN + 14, startY + 10);

      // Analysis text
      doc.fillColor(TEXT_MID)
        .fontSize(9)
        .font("Helvetica")
        .text(analysis, MARGIN + 14, startY + 28, {
          width: textW,
          align: "justify",
          lineGap: 4,
        });

      doc.y = startY + blockH + 16;
    }

    // ── DATA TABLE ────────────────────────────────────────────
    if (columns?.length > 0 && rows?.length > 0) {
      const COL_W = calcColWidths(columns, USABLE_W);
      const COL_H_HD = 20; // header row height
      const COL_H_DT = 16; // data row height

      const drawTableHeader = (y) => {
        doc.rect(MARGIN, y, USABLE_W, COL_H_HD).fill(NAVY);
        doc.fillColor("white").fontSize(8).font("Helvetica-Bold");
        let cx = MARGIN + 4;
        columns.forEach((col, i) => {
          doc.text(safe(col.header), cx, y + 6, {
            width: COL_W[i] - 6,
            ellipsis: true,
          });
          cx += COL_W[i];
        });
        return y + COL_H_HD;
      };

      // Page break check before table starts
      if (doc.y + COL_H_HD + COL_H_DT > doc.page.height - 70) {
        doc.addPage();
        doc.y = 40;
      }

      let curY = drawTableHeader(doc.y);

      rows.forEach((row, rowIdx) => {
        // Page break mid-table
        if (curY + COL_H_DT > doc.page.height - 60) {
          doc.addPage();

          // Continuation header
          doc.fillColor(TEXT_LIGHT)
            .fontSize(8)
            .font("Helvetica")
            .text(`${safe(title)} — continued`, MARGIN, 30, { width: USABLE_W });

          curY = 48;
          curY = drawTableHeader(curY);
        }

        // Alternating row background
        const rowFill = rowIdx % 2 === 0 ? "white" : ALT_ROW;
        doc.rect(MARGIN, curY, USABLE_W, COL_H_DT).fill(rowFill);

        // Cell values
        doc.fillColor(TEXT_DARK).fontSize(8).font("Helvetica");
        let cx = MARGIN + 4;
        columns.forEach((col, i) => {
          const raw = row[col.key];
          const val = (raw === 0) ? "0" : safe(raw);
          doc.text(val, cx, curY + 4, {
            width: COL_W[i] - 6,
            ellipsis: true,
          });
          cx += COL_W[i];
        });

        curY += COL_H_DT;
      });

      // Bottom border of table
      doc.moveTo(MARGIN, curY)
        .lineTo(MARGIN + USABLE_W, curY)
        .lineWidth(0.5)
        .strokeColor(BORDER)
        .stroke();

      doc.y = curY + 10;
    }

    // ── FOOTER ON EVERY PAGE ──────────────────────────────────
    // Runs AFTER doc.end() flushes all buffered pages
    const addFooters = () => {
      const pageRange = doc.bufferedPageRange();
      const pageCount = pageRange.count;

      // Detect report type from title for footer center label
      const t = safe(title).toUpperCase();
      let reportLabel = "IQAC REPORT";
      if (t.includes("STUDENT")) reportLabel = "STUDENT PROGRESS";
      if (t.includes("DEPARTMENT")) reportLabel = "DEPARTMENT PERFORMANCE";
      if (t.includes("CGPA")) reportLabel = "CGPA DISTRIBUTION";
      if (t.includes("BACKLOG")) reportLabel = "BACKLOG ANALYSIS";
      if (t.includes("PLACEMENT")) reportLabel = "PLACEMENT REPORT";
      if (t.includes("FACULTY")) reportLabel = "FACULTY CONTRIBUTION";

      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(pageRange.start + i);

        const footerY = doc.page.height - 32;

        // Footer divider line
        doc.moveTo(MARGIN, footerY)
          .lineTo(PAGE_W - MARGIN, footerY)
          .lineWidth(0.5)
          .strokeColor(BORDER)
          .stroke();

        // Left: Confidential tag
        doc.fillColor(TEXT_LIGHT)
          .fontSize(7.5)
          .font("Helvetica")
          .text("CONFIDENTIAL — IQAC Internal Document", MARGIN, footerY + 8, {
            width: 220,
          });

        // Center: Report type
        doc.fillColor(TEXT_LIGHT)
          .fontSize(7.5)
          .text(reportLabel, 0, footerY + 8, {
            width: PAGE_W,
            align: "center",
          });

        // Right: Page number
        doc.fillColor(TEXT_LIGHT)
          .fontSize(7.5)
          .text(`Page ${i + 1} of ${pageCount}`, MARGIN, footerY + 8, {
            width: USABLE_W,
            align: "right",
          });
      }
    };

    // pdfkit emits "end" after doc.end() — add footers just before that
    doc.on("end", addFooters);

    // Flush all buffered pages and close
    doc.flushPages();
    doc.end();
  });
};

// ─────────────────────────────────────────────────────────────
// PROFESSIONAL EXCEL BUILDER
// ─────────────────────────────────────────────────────────────
export const buildExcelBuffer = async (sheetName, rows, columns = []) => {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "IQAC Academic Intelligence System";
  workbook.created = new Date();
  workbook.lastModifiedBy = "IQAC System";
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet("Report", {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
    },
  });

  const NAVY_ARGB = "FF1E3A5F";
  const WHITE_ARGB = "FFFFFFFF";
  const ALT_ARGB = "FFE8F0FE";
  const BORDER_ARGB = "FFD1D5DB";

  // Determine column keys and headers
  const colKeys = columns.length > 0
    ? columns.map(c => c.key)
    : (rows.length > 0 ? Object.keys(rows[0]) : []);
  const colHeaders = columns.length > 0
    ? columns.map(c => c.header)
    : colKeys;

  const totalCols = Math.max(colHeaders.length, 1);

  // ── ROW 1: Title ─────────────────────────────────────────
  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = safe(sheetName).toUpperCase();
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: NAVY_ARGB } };
  titleCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4F8" } };
  sheet.getRow(1).height = 32;

  // ── ROW 2: Subtitle / date ────────────────────────────────
  sheet.mergeCells(2, 1, 2, totalCols);
  const subCell = sheet.getCell(2, 1);
  subCell.value = `Generated: ${new Date().toLocaleString("en-IN")} — IQAC Academic Intelligence System`;
  subCell.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF888888" } };
  subCell.alignment = { horizontal: "center" };
  sheet.getRow(2).height = 18;

  // ── ROW 3: Empty spacer ───────────────────────────────────
  sheet.getRow(3).height = 8;

  // ── ROW 4: Column headers ─────────────────────────────────
  const headerRow = sheet.getRow(4);
  headerRow.height = 24;

  colHeaders.forEach((hdr, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = safe(hdr);
    cell.font = { name: "Calibri", bold: true, size: 10, color: { argb: WHITE_ARGB } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_ARGB } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
    cell.border = {
      top: { style: "thin", color: { argb: WHITE_ARGB } },
      bottom: { style: "thin", color: { argb: WHITE_ARGB } },
      left: { style: "thin", color: { argb: WHITE_ARGB } },
      right: { style: "thin", color: { argb: WHITE_ARGB } },
    };
  });

  // ── DATA ROWS start at row 5 ──────────────────────────────
  // Track max content width for auto-column sizing
  const maxWidths = colHeaders.map(h => Math.min(String(h).length + 4, 50));

  rows.forEach((rowData, idx) => {
    const excelRow = sheet.getRow(5 + idx);
    excelRow.height = 18;

    const isAlt = idx % 2 !== 0;
    const rowBg = isAlt ? ALT_ARGB : WHITE_ARGB;

    colKeys.forEach((key, colIdx) => {
      const rawVal = rowData[key];
      const cell = excelRow.getCell(colIdx + 1);

      // Preserve numeric type — do not stringify numbers
      if (typeof rawVal === "number") {
        cell.value = rawVal;
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.numFmt = rawVal % 1 !== 0 ? "0.00" : "0"; // 2dp for decimals
      } else {
        cell.value = rawVal === null || rawVal === undefined ? "" : String(rawVal);
        cell.alignment = { horizontal: "left", vertical: "middle", wrapText: false };
      }

      cell.font = { name: "Calibri", size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      cell.border = {
        top: { style: "thin", color: { argb: BORDER_ARGB } },
        bottom: { style: "thin", color: { argb: BORDER_ARGB } },
        left: { style: "thin", color: { argb: BORDER_ARGB } },
        right: { style: "thin", color: { argb: BORDER_ARGB } },
      };

      // Update max width tracker
      const contentLen = String(rawVal ?? "").length + 2;
      if (contentLen > maxWidths[colIdx]) {
        maxWidths[colIdx] = Math.min(contentLen, 50);
      }
    });
  });

  // ── APPLY COLUMN WIDTHS ───────────────────────────────────
  colHeaders.forEach((_, idx) => {
    sheet.getColumn(idx + 1).width = Math.max(maxWidths[idx], 12);
  });

  // ── FOOTER ROW ────────────────────────────────────────────
  const footerRowNum = 5 + rows.length + 1;
  sheet.mergeCells(footerRowNum, 1, footerRowNum, totalCols);
  const footCell = sheet.getCell(footerRowNum, 1);
  footCell.value = "CONFIDENTIAL — IQAC Internal Document";
  footCell.font = { name: "Calibri", size: 8, italic: true, color: { argb: "FF888888" } };
  footCell.alignment = { horizontal: "center" };
  sheet.getRow(footerRowNum).height = 16;

  // ── FREEZE HEADER ROW ─────────────────────────────────────
  sheet.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];

  return await workbook.xlsx.writeBuffer();
};