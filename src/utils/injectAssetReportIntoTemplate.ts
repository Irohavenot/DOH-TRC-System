import { PDFDocument, rgb } from "pdf-lib";

export interface InjectAssetTemplateOptions {
  templateBytes: Uint8Array;
  assets: {
    assetName: string;
    assetId: string;
    category: string;
    licenseType?: string;
    expirationDate?: string;
    personnel?: string;
    serialNo: string;
    assignedDate?: string;
    purchaseDate?: string;
  }[];
  filters: {
    month: string;
    year: string;
    status: string;
    category: string;
  };
  computeAssetStatus: (licenseType?: string, expirationDate?: string) => string;
  resolveUserName: (uid?: string) => string;
}

export async function injectAssetReportIntoTemplate(
  opts: InjectAssetTemplateOptions
): Promise<Uint8Array> {
  const { templateBytes, assets, filters, computeAssetStatus, resolveUserName } =
    opts;

  const pdfDoc = await PDFDocument.load(templateBytes);
  const pages = pdfDoc.getPages();
  if (pages.length === 0) throw new Error("Template PDF has no pages");

  const firstPage = pages[0];
  const copied = await pdfDoc.copyPages(pdfDoc, [0]);
  const templatePage = copied[0];

  const helvetica = await pdfDoc.embedFont("Helvetica");
  const helveticaBold = await pdfDoc.embedFont("Helvetica-Bold");

  const blue = rgb(0.05, 0.3, 0.65);
  const gray = rgb(0.3, 0.3, 0.3);
  const red = rgb(0.8, 0, 0);
  const black = rgb(0, 0, 0);

  const pageWidth = firstPage.getWidth();
  let currentPage = firstPage;
  let y = pageWidth > 600 ? 720 : 700; // rough safety

  const centerText = (
    page: typeof firstPage,
    text: string,
    yPos: number,
    size: number,
    bold?: boolean,
    colorOverride?: ReturnType<typeof rgb>
  ) => {
    const font = bold ? helveticaBold : helvetica;
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (pageWidth - width) / 2,
      y: yPos,
      size,
      font,
      color: colorOverride || black,
    });
  };

  // ------- HEADER TEXT OVER TEMPLATE -------
  centerText(currentPage, "IT ASSET REPORT", y, 18, true, blue);
  y -= 24;

  const { month, year, status, category } = filters;

  const monthText =
    month &&
    new Date(0, parseInt(month) - 1).toLocaleString("default", {
      month: "long",
    });

  if (month || year) {
    centerText(
      currentPage,
      `Period: ${
        monthText ? monthText + " " : ""
      }${year || ""}`.trim() || "All Time",
      y,
      12,
      false,
      gray
    );
    y -= 18;
  }

  if (status || category) {
    const parts: string[] = [];
    if (status) parts.push(`Status: ${status}`);
    if (category) parts.push(`Category: ${category}`);
    centerText(currentPage, parts.join(" | "), y, 11, false, gray);
    y -= 18;
  }

  const generatedAt = new Date().toLocaleString("en-PH");
  centerText(currentPage, `Generated: ${generatedAt}`, y, 10, false, gray);
  y -= 32;

  // ------- TABLE HEADER -------
  const colX = [40, 140, 230, 330, 430, 510];
  const headers = ["Asset Name", "Asset ID", "Category", "Status", "Assigned To", "Date"];

  const drawTableHeader = () => {
    currentPage.drawRectangle({
      x: 32,
      y: y - 4,
      width: pageWidth - 64,
      height: 22,
      color: blue,
    });

    headers.forEach((h, idx) => {
      currentPage.drawText(h, {
        x: colX[idx],
        y: y + 4,
        size: 9,
        font: helveticaBold,
        color: rgb(1, 1, 1),
      });
    });

    y -= 26;
  };

  drawTableHeader();

  const totalPerStatus: Record<string, number> = {
    Functional: 0,
    Defective: 0,
    Unserviceable: 0,
  };

  const rows = assets.map((a) => {
    const statusLabel = computeAssetStatus(a.licenseType, a.expirationDate);
    totalPerStatus[statusLabel] = (totalPerStatus[statusLabel] || 0) + 1;
    return {
      name: a.assetName,
      id: a.assetId,
      category: a.category,
      status: statusLabel,
      assignedTo: resolveUserName(a.personnel),
      date: a.assignedDate || a.purchaseDate || "N/A",
    };
  });

  for (const row of rows) {
    if (y < 90) {
      currentPage = pdfDoc.addPage(templatePage);
      y = currentPage.getHeight() - 80;
      drawTableHeader();
    }

    const cells = [
      row.name,
      row.id,
      row.category,
      row.status,
      row.assignedTo,
      row.date,
    ];

    cells.forEach((cell, idx) => {
      currentPage.drawText(String(cell || ""), {
        x: colX[idx],
        y: y + 2,
        size: 8.5,
        font: helvetica,
        color: black,
      });
    });

    currentPage.drawLine({
      start: { x: 32, y: y - 2 },
      end: { x: pageWidth - 32, y: y - 2 },
      thickness: 0.3,
      color: rgb(0.8, 0.8, 0.8),
    });

    y -= 18;
  }

  // ------- SUMMARY BOX -------
  y -= 20;
  if (y < 130) {
    currentPage = pdfDoc.addPage(templatePage);
    y = currentPage.getHeight() - 100;
  }

  const total = rows.length;
  const functional = totalPerStatus["Functional"] || 0;
  const defective = totalPerStatus["Defective"] || 0;
  const unserviceable = totalPerStatus["Unserviceable"] || 0;

  const summaryX = 80;
  const summaryWidth = pageWidth - 160;
  const summaryHeight = 110;
  const summaryYTop = y;

  currentPage.drawRectangle({
    x: summaryX,
    y: summaryYTop - summaryHeight,
    width: summaryWidth,
    height: summaryHeight,
    borderColor: blue,
    borderWidth: 1.5,
    color: rgb(1, 1, 1),
  });

  currentPage.drawText("Summary", {
    x: summaryX + 12,
    y: summaryYTop - 18,
    size: 11,
    font: helveticaBold,
    color: blue,
  });

  const labelX = summaryX + 24;
  const valueX = summaryX + summaryWidth - 40;
  let summaryLineY = summaryYTop - 34;

  const summaryLines: [string, number][] = [
    ["Total Assets", total],
    ["Functional", functional],
    ["Defective", defective],
    ["Unserviceable", unserviceable],
  ];

  summaryLines.forEach(([label, value]) => {
    currentPage.drawText(label + ":", {
      x: labelX,
      y: summaryLineY,
      size: 10,
      font: helveticaBold,
      color: black,
    });
    currentPage.drawText(String(value), {
      x: valueX,
      y: summaryLineY,
      size: 13,
      font: helveticaBold,
      color: red,
    });
    summaryLineY -= 20;
  });

  const finalBytes = await pdfDoc.save();
  return new Uint8Array(finalBytes);
}
