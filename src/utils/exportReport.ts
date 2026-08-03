type CellValue = string | number | null | undefined;

export type WorkbookSheet = {
  name: string;
  rows: CellValue[][];
  currencyColumns?: number[];
};

export type PdfScoreItem = {
  label: string;
  score: number;
  status?: string;
  color?: string;
};

export type PdfSection = {
  title: string;
  headers: string[];
  rows: CellValue[][];
};

type PdfReportOptions = {
  filename: string;
  title: string;
  subtitle?: string;
  summary: [string, CellValue][];
  scores?: PdfScoreItem[];
  sections: PdfSection[];
};

function safeSlug(value?: string) {
  const name = (value || "bisnis")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return name || "bisnis";
}

function hexToRgb(hex = "#0ea5e9"): [number, number, number] {
  const clean = hex.replace("#", "");
  const value = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean;
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

export function reportFilename(prefix: string, businessName?: string, extension = "xlsx") {
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}-${safeSlug(businessName)}-${date}.${extension}`;
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumberId(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);
}

export async function downloadWorkbook(filename: string, sheets: WorkbookSheet[]) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");

    for (let row = range.s.r; row <= range.e.r; row += 1) {
      sheet.currencyColumns?.forEach((column) => {
        const address = XLSX.utils.encode_cell({ r: row, c: column });
        const cell = worksheet[address];
        if (cell && typeof cell.v === "number") {
          cell.z = '"Rp" #,##0';
        }
      });
    }

    worksheet["!cols"] = sheet.rows[0]?.map((_, index) => {
      const width = Math.max(
        14,
        ...sheet.rows.map((row) => String(row[index] ?? "").length + 2),
      );
      return { wch: Math.min(width, 42) };
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  });

  XLSX.writeFile(workbook, filename);
}

export async function downloadPdfReport(options: PdfReportOptions) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = 42;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const subtitleLines = options.subtitle ? doc.splitTextToSize(options.subtitle, contentWidth) : [];
  const headerHeight = 70 + subtitleLines.length * 13;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, headerHeight, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(options.title, margin, y);
  y += 24;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  if (subtitleLines.length) doc.text(subtitleLines, margin, y, { align: "justify", maxWidth: contentWidth });

  y = headerHeight + 28;
  autoTable(doc, {
    startY: y,
    theme: "plain",
    body: options.summary.map(([label, value]) => [label, String(value ?? "-")]),
    styles: { fontSize: 10, cellPadding: 6, textColor: [15, 23, 42] },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [71, 85, 105], cellWidth: 150 },
      1: { fontStyle: "bold", halign: "justify" },
    },
    margin: { left: margin, right: margin },
  });

  y = ((doc as any).lastAutoTable?.finalY ?? y) + 18;

  if (options.scores?.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Ringkasan Skor", margin, y);
    y += 18;

    options.scores.forEach((item) => {
      const [r, g, b] = hexToRgb(item.color);
      const width = pageWidth - margin * 2;
      const barWidth = Math.max(0, Math.min(width, width * (item.score / 100)));

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(item.label.toUpperCase(), margin, y + 9);
      doc.setTextColor(r, g, b);
      doc.text(`${formatNumberId(item.score)}${item.status ? ` - ${item.status}` : ""}`, pageWidth - margin, y + 9, { align: "right" });
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(margin, y + 18, width, 8, 4, 4, "F");
      doc.setFillColor(r, g, b);
      doc.roundedRect(margin, y + 18, barWidth, 8, 4, 4, "F");
      y += 42;

      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });
  }

  options.sections.forEach((section) => {
    if (y > 650) {
      doc.addPage();
      y = 50;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(section.title, margin, y);
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [section.headers],
      body: section.rows.map((row) => row.map((value) => String(value ?? "-"))),
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 6, lineColor: [226, 232, 240], lineWidth: 0.5 },
      headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin, right: margin },
    });

    y = ((doc as any).lastAutoTable?.finalY ?? y) + 24;
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`GIMB Business Health Dashboard - Halaman ${page} dari ${pageCount}`, margin, 820);
  }

  doc.save(options.filename);
}
