import React, { useState } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { saveAs } from "file-saver";
import PrintJS from "print-js";

// Mock toast for demo - replace with your actual toast library
const toast = {
  loading: (msg: string, opts?: any) => console.log("Loading:", msg),
  success: (msg: string, opts?: any) => console.log("Success:", msg),
  error: (msg: string, opts?: any) => console.log("Error:", msg),
  dismiss: (id?: string) => console.log("Dismiss toast")
};

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusFilter: string;
  priorityFilter: string;
  departmentFilter: string;
  selectedMonth: number;
  selectedYear: string;
  filteredData: any[];
  getDateColumnHeader: () => string;
  getDateValue: (req: any) => string;
  months: string[];
  getFullName: (email?: string) => string;
}

const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  statusFilter,
  priorityFilter,
  departmentFilter,
  selectedMonth,
  selectedYear,
  filteredData,
  getDateColumnHeader,
  getDateValue,
  months,
  getFullName,
}) => {
  const [includeRemarks, setIncludeRemarks] = useState(false);
  const [includeRequestedBy, setIncludeRequestedBy] = useState(true);
  const [includeType, setIncludeType] = useState(false);
  const [includeNeededBy, setIncludeNeededBy] = useState(false);
  const [includeActionBy, setIncludeActionBy] = useState(false);
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");

  if (!isOpen) return null;

  const getMonthLabel = () => {
    return selectedMonth === -1 ? "All Months" : months[selectedMonth];
  };

  const getYearLabel = () => {
    const trimmed = selectedYear.trim();
    if (trimmed.toLowerCase() === "all" || trimmed === "") return "All Years";
    return trimmed;
  };

  const injectDataIntoTemplate = async (file: File, isPrint: boolean = false) => {
    const toastId = isPrint ? "pdf-print" : "pdf-download";
    toast.loading(isPrint ? "Preparing print template..." : "Generating PDF report...", { id: toastId });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      
      if (pages.length === 0) throw new Error("Empty template");

      const helvetica = await pdfDoc.embedFont("Helvetica");
      const helveticaBold = await pdfDoc.embedFont("Helvetica-Bold");

      const blueHeader = rgb(0.11, 0.42, 0.63);
      const darkBlue = rgb(0.08, 0.31, 0.49);
      const accentGreen = rgb(0.16, 0.64, 0.39);
      const black = rgb(0, 0, 0);
      const gray = rgb(0.4, 0.4, 0.4);

      const periodText = `${getMonthLabel()} ${getYearLabel()}`;
      const generatedAt = new Date().toLocaleString("en-PH", {
        month: "long",
        day: "numeric", 
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      const fontSizeMap = {
        small: { title: 15, subtitle: 11, header: 10, body: 9, label: 8 },
        medium: { title: 17, subtitle: 13, header: 11, body: 10, label: 9 },
        large: { title: 19, subtitle: 15, header: 12, body: 11, label: 10 },
      };

      const sizes = fontSizeMap[fontSize];

      let currentPage = pages[0];
      let y = 690;

      const copiedPages = await pdfDoc.copyPages(pdfDoc, [0]);
      const templatePage = copiedPages[0];

      const drawCentered = (text: string, yPos: number, size = 12, bold = false, color = black) => {
        const font = bold ? helveticaBold : helvetica;
        const width = font.widthOfTextAtSize(text, size);
        currentPage.drawText(text, { 
          x: (595.28 - width) / 2, 
          y: yPos, 
          size, 
          font, 
          color 
        });
      };

      // HEADER
      drawCentered("CONSUMABLE REQUESTS REPORT", y, sizes.title + 3, true, darkBlue);
      y -= 28;

      const statusText = `${statusFilter} Status`;
      drawCentered(statusText, y, sizes.subtitle, true, accentGreen);
      y -= 22;

      currentPage.drawLine({
        start: { x: 150, y: y },
        end: { x: 445, y: y },
        thickness: 1,
        color: rgb(0.85, 0.85, 0.85)
      });
      y -= 20;

      // -----------------------------------------------------
      // REPORT INFO (LEFT SIDE) & SUMMARY STATISTICS (RIGHT SIDE)
      // -----------------------------------------------------
      const infoYStart = y;
      const leftX = 150;
      const rightX = 380;

      // Summary Statistics calculations
      const totalReq = filteredData.length;
      const urgent = filteredData.filter(r => r.priority === "Urgent").length;
      const normal = filteredData.filter(r => r.priority === "Normal").length;

      // Left side - Report Period, Filters, Generated
      currentPage.drawText(`Report Period: ${periodText}`, {
        x: leftX,
        y: infoYStart,
        size: sizes.label + 1,
        font: helvetica,
        color: gray
      });

      currentPage.drawText(`Filters: ${priorityFilter} Priority | ${departmentFilter}`, {
        x: leftX,
        y: infoYStart - 15,
        size: sizes.label,
        font: helvetica,
        color: gray
      });

      currentPage.drawText(`Generated: ${generatedAt}`, {
        x: leftX,
        y: infoYStart - 30,
        size: sizes.label - 1,
        font: helvetica,
        color: gray
      });

      // Right side - Summary Statistics
      currentPage.drawText("Total Requests:", {
        x: rightX,
        y: infoYStart,
        size: sizes.label + 1,
        font: helvetica,
        color: gray
      });
      currentPage.drawText(String(totalReq), {
        x: rightX + 95,
        y: infoYStart,
        size: sizes.label + 1,
        font: helveticaBold,
        color: darkBlue
      });

      currentPage.drawText("Urgent:", {
        x: rightX,
        y: infoYStart - 15,
        size: sizes.label,
        font: helvetica,
        color: gray
      });
      currentPage.drawText(String(urgent), {
        x: rightX + 95,
        y: infoYStart - 15,
        size: sizes.label,
        font: helveticaBold,
        color: accentGreen
      });

      currentPage.drawText("Normal:", {
        x: rightX,
        y: infoYStart - 30,
        size: sizes.label - 1,
        font: helvetica,
        color: gray
      });
      currentPage.drawText(String(normal), {
        x: rightX + 95,
        y: infoYStart - 30,
        size: sizes.label - 1,
        font: helveticaBold,
        color: accentGreen
      });

      y = infoYStart - 70;

      // ---------------------------------
      // TABLE BUILDING (UNCHANGED)
      // ---------------------------------

      const pageWidth = 595.28;
      const footerSafeY = 120;
      const margin = 60;

      const maxRowsPerPage = 20; // ADJUSTED — dynamic page break
      let rowCounter = 0;

      const hasMultipleOptional = [includeType, includeRequestedBy, includeActionBy, includeNeededBy, includeRemarks]
        .filter(Boolean).length > 1;
      
      const baseColumns = hasMultipleOptional ? [
        { header: "ID", width: 65 },
        { header: "Item", width: 80 },
        { header: getDateColumnHeader(), width: 72 },
        { header: "Qty", width: 38 },
        { header: "Dept", width: 60 },
        { header: "Priority", width: 48 }
      ] : [
        { header: "Request ID", width: 80 },
        { header: "Item Name", width: 115 },
        { header: getDateColumnHeader(), width: 90 },
        { header: "Quantity", width: 55 },
        { header: "Department", width: 85 },
        { header: "Priority", width: 60 }
      ];

      const columns = [...baseColumns];

      if (includeType) columns.push({ header: "Type", width: hasMultipleOptional ? 45 : 70 });
      if (includeRequestedBy) columns.push({ header: "Requested By", width: hasMultipleOptional ? 70 : 85 });

      if (includeActionBy) {
        let actionHeader = "Action By";
        if (statusFilter === "Approved") actionHeader = "Approved By";
        if (statusFilter === "Rejected") actionHeader = "Rejected By";
        if (statusFilter === "Released") actionHeader = "Released By";
        if (statusFilter === "Deleted") actionHeader = "Deleted By";
        columns.push({ header: actionHeader, width: hasMultipleOptional ? 72 : 85 });
      }

      if (includeNeededBy) columns.push({ header: "Needed By", width: hasMultipleOptional ? 68 : 80 });
      if (includeRemarks) columns.push({ header: "Remarks", width: hasMultipleOptional ? 60 : 80 });

      const totalColWidth = columns.reduce((sum, c) => sum + c.width, 0);
      const tableStartX = (pageWidth - totalColWidth) / 2;

      let currentX = tableStartX;
      columns.forEach(col => {
        (col as any).x = currentX;
        currentX += col.width;
      });

      const tableWidth = totalColWidth;

      const drawTableHeader = () => {
        currentPage.drawRectangle({ 
          x: tableStartX, 
          y: y - 6, 
          width: tableWidth, 
          height: 22, 
          color: blueHeader 
        });
        
        columns.forEach((col) => {
          const textWidth = helveticaBold.widthOfTextAtSize(col.header, sizes.header);
          const centerX = (col as any).x + (col.width - textWidth) / 2;
          currentPage.drawText(col.header, { 
            x: centerX, 
            y: y + 3, 
            size: sizes.header, 
            font: helveticaBold, 
            color: rgb(1, 1, 1) 
          });
        });
        y -= 28;
        rowCounter = 0;
      };

      drawTableHeader();

      let rowIndex = 0;

      filteredData.forEach(req => {
        if (rowCounter >= maxRowsPerPage || y < footerSafeY) {
          currentPage = pdfDoc.addPage(templatePage);
          y = 720; // reset top for table
          drawTableHeader();
        }

        if (y < 120) {
          currentPage = pdfDoc.addPage(templatePage);
          y = 650;
          drawTableHeader();
          rowIndex = 0;
        }

        if (rowIndex % 2 === 0) {
          currentPage.drawRectangle({
            x: tableStartX,
            y: y - 4,
            width: tableWidth,
            height: 20,
            color: rgb(0.97, 0.97, 0.97)
          });
        }

        let displayId = req.requestId || "N/A";
        if (statusFilter === "Deleted") displayId = req.deleteId || displayId;
        if (statusFilter === "Released") displayId = req.releaseId || displayId;
        if (statusFilter === "Approved") displayId = req.approvedId || displayId;
        if (statusFilter === "Rejected") displayId = req.rejectedId || displayId;

        const cleanDepartment = (req.department || "").replace(/ Department$/i, "");

        const formatDateOnly = (dateString: string) => {
          if (dateString.includes(',')) {
            const parts = dateString.split(',');
            return `${parts[0]}, ${parts[1].trim().split(' ')[0]}`;
          }
          if (dateString.includes(' at ')) return dateString.split(' at ')[0];
          return dateString;
        };

        const cells = [
          displayId,
          req.name || "",
          formatDateOnly(getDateValue(req)),
          `${req.quantity || ""} ${req.unit || ""}`,
          cleanDepartment,
          req.priority || "Normal"
        ];

        if (includeType) cells.push((req.type || "N/A").split(' ')[0]);

        if (includeRequestedBy) cells.push(req.requestedBy || "N/A");

        if (includeActionBy) {
          let actionBy = "N/A";
          if (statusFilter === "Approved") actionBy = getFullName(req.approvedBy);
          if (statusFilter === "Rejected") actionBy = getFullName(req.rejectedBy);
          if (statusFilter === "Released") actionBy = getFullName(req.releasedBy);
          if (statusFilter === "Deleted") actionBy = getFullName(req.deletedBy);
          cells.push(actionBy);
        }

        if (includeNeededBy) cells.push(req.neededBy ? formatDateOnly(getDateValue({ neededBy: req.neededBy })) : "N/A");
        if (includeRemarks) cells.push(req.remarks || "-");

        cells.forEach((cell, i) => {
          const maxWidth = columns[i].width - 8;
          let displayText = cell;

          while (helvetica.widthOfTextAtSize(displayText, sizes.body) > maxWidth && displayText.length > 3) {
            displayText = displayText.slice(0, -1);
          }
          if (displayText.length < cell.length) displayText += "...";

          const textWidth = helvetica.widthOfTextAtSize(displayText, sizes.body);
          const centerX = (columns[i] as any).x + (columns[i].width - textWidth) / 2;

          currentPage.drawText(displayText, { 
            x: centerX, 
            y: y + 4, 
            size: sizes.body, 
            font: helvetica, 
            color: black 
          });
        });

        currentPage.drawLine({ 
          start: { x: tableStartX, y: y - 4 }, 
          end: { x: tableStartX + tableWidth, y: y - 4 }, 
          thickness: 0.3, 
          color: rgb(0.9, 0.9, 0.9) 
        });

        y -= 20;
        rowIndex++;
      });

      const pdfBytes = await pdfDoc.save();
      const uint8 = new Uint8Array(pdfBytes);
      const safeBuffer = uint8.buffer.slice(0);

      if (isPrint) {
        const blob = new Blob([safeBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        PrintJS({ printable: url, type: "pdf", showModal: true });
        toast.success("Print ready! Sending to printer...", { id: toastId });
      } else {
        const filename = `Consumable_Report_${statusFilter}_${getYearLabel()}_${getMonthLabel()}_${new Date().toISOString().slice(0,10)}.pdf`;
        saveAs(new Blob([safeBuffer], { type: "application/pdf" }), filename);
        toast.success("Report downloaded successfully!", { id: toastId });
      }

    } catch (err) {
      console.error(err);
      toast.error("Failed to process template. Try another file.", { id: toastId });
    }
  };

  const handlePrint = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) injectDataIntoTemplate(file, true);
    };
    toast.loading("Select your template PDF for printing...");
    setTimeout(() => toast.dismiss(), 2000);
    input.click();
  };

  const handleDownload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) injectDataIntoTemplate(file, false);
    };
    toast.loading("Select your template PDF for download...");
    setTimeout(() => toast.dismiss(), 2000);
    input.click();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content print-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "700px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "white",
          borderRadius: "20px",
          boxShadow: "0 25px 50px rgba(0,0,0,0.3)"
        }}
      >
        <div className="modal-header" style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "2rem",
          borderBottom: "2px solid #e5e7eb"
        }}>
          <h3 style={{
            fontSize: "1.75rem",
            fontWeight: "700",
            color: "#1f2937",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.75rem"
          }}>
            <i className="fas fa-print" />
            Print Report Options
          </h3>
          <button className="modal-close" onClick={onClose} style={{
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f3f4f6",
            border: "none",
            borderRadius: "10px",
            color: "#6b7280",
            cursor: "pointer",
            fontSize: "1.25rem"
          }}>
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="modal-body" style={{ padding: "2rem" }}>
          <div className="print-options-section" style={{ marginBottom: "2rem" }}>
            <h4 style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              fontSize: "1.125rem",
              fontWeight: "700",
              color: "#1f2937",
              marginBottom: "1.5rem",
              paddingBottom: "0.75rem",
              borderBottom: "2px solid #f3f4f6"
            }}>
              <i className="fas fa-cog" /> Report Settings
            </h4>

            <div className="option-group" style={{ marginBottom: "1.5rem" }}>
              <label style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>Font Size</label>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {(["small", "medium", "large"] as const).map((size) => (
                  <label key={size} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem 1.25rem",
                    background: fontSize === size ? "#eff6ff" : "white",
                    border: `2px solid ${fontSize === size ? "#3b82f6" : "#e5e7eb"}`,
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: "500",
                    color: "#6b7280",
                    flex: "1",
                    justifyContent: "center",
                    minWidth: "120px"
                  }}>
                    <input
                      type="radio"
                      value={size}
                      checked={fontSize === size}
                      onChange={(e) => setFontSize(e.target.value as any)}
                      style={{ accentColor: "#3b82f6" }}
                    />
                    <span>{size.charAt(0).toUpperCase() + size.slice(1)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="option-group">
              <label style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>Include Additional Columns</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.875rem 1rem",
                  background: includeType ? "#eff6ff" : "#f9fafb",
                  border: `2px solid ${includeType ? "#3b82f6" : "#e5e7eb"}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "500",
                  color: "#374151"
                }}>
                  <input
                    type="checkbox"
                    checked={includeType}
                    onChange={(e) => setIncludeType(e.target.checked)}
                    style={{ width: "20px", height: "20px", accentColor: "#3b82f6" }}
                  />
                  <span>Item Type</span>
                </label>

                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.875rem 1rem",
                  background: includeRequestedBy ? "#eff6ff" : "#f9fafb",
                  border: `2px solid ${includeRequestedBy ? "#3b82f6" : "#e5e7eb"}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "500",
                  color: "#374151"
                }}>
                  <input
                    type="checkbox"
                    checked={includeRequestedBy}
                    onChange={(e) => setIncludeRequestedBy(e.target.checked)}
                    style={{ width: "20px", height: "20px", accentColor: "#3b82f6" }}
                  />
                  <span>Requested By</span>
                </label>

                {statusFilter !== "Pending" && (
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.875rem 1rem",
                    background: includeActionBy ? "#eff6ff" : "#f9fafb",
                    border: `2px solid ${includeActionBy ? "#3b82f6" : "#e5e7eb"}`,
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: "500",
                    color: "#374151"
                  }}>
                    <input
                      type="checkbox"
                      checked={includeActionBy}
                      onChange={(e) => setIncludeActionBy(e.target.checked)}
                      style={{ width: "20px", height: "20px", accentColor: "#3b82f6" }}
                    />
                    <span>
                      {statusFilter === "Approved" ? "Approved By"
                        : statusFilter === "Rejected" ? "Rejected By"
                        : statusFilter === "Released" ? "Released By"
                        : statusFilter === "Deleted" ? "Deleted By"
                        : "Action By"}
                    </span>
                  </label>
                )}

                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.875rem 1rem",
                  background: includeNeededBy ? "#eff6ff" : "#f9fafb",
                  border: `2px solid ${includeNeededBy ? "#3b82f6" : "#e5e7eb"}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "500",
                  color: "#374151"
                }}>
                  <input
                    type="checkbox"
                    checked={includeNeededBy}
                    onChange={(e) => setIncludeNeededBy(e.target.checked)}
                    style={{ width: "20px", height: "20px", accentColor: "#3b82f6" }}
                  />
                  <span>Needed By Date</span>
                </label>

                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.875rem 1rem",
                  background: includeRemarks ? "#eff6ff" : "#f9fafb",
                  border: `2px solid ${includeRemarks ? "#3b82f6" : "#e5e7eb"}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "500",
                  color: "#374151"
                }}>
                  <input
                    type="checkbox"
                    checked={includeRemarks}
                    onChange={(e) => setIncludeRemarks(e.target.checked)}
                    style={{ width: "20px", height: "20px", accentColor: "#3b82f6" }}
                  />
                  <span>Remarks</span>
                </label>
              </div>
            </div>
          </div>

          <div style={{
            padding: "1.5rem",
            background: "#f9fafb",
            borderRadius: "12px",
            border: "2px solid #e5e7eb"
          }}>
            <h4 style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              fontSize: "1rem",
              fontWeight: "700",
              color: "#1f2937",
              marginBottom: "1rem"
            }}>
              <i className="fas fa-info-circle" /> Report Summary
            </h4>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem"
            }}>
              <div>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>Status:</span>
                <p style={{
                  fontSize: "0.95rem",
                  color: "#374151",
                  fontWeight: "500",
                  margin: "0.25rem 0 0 0"
                }}>
                  {statusFilter}
                </p>
              </div>

              <div>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>Period:</span>
                <p style={{
                  fontSize: "0.95rem",
                  color: "#374151",
                  fontWeight: "500",
                  margin: "0.25rem 0 0 0"
                }}>
                  {getMonthLabel()} {getYearLabel()}
                </p>
              </div>

              <div>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>Priority Filter:</span>
                <p style={{
                  fontSize: "0.95rem",
                  color: "#374151",
                  fontWeight: "500",
                  margin: "0.25rem 0 0 0"
                }}>
                  {priorityFilter}
                </p>
              </div>

              <div>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>Department Filter:</span>
                <p style={{
                  fontSize: "0.95rem",
                  color: "#374151",
                  fontWeight: "500",
                  margin: "0.25rem 0 0 0"
                }}>
                  {departmentFilter}
                </p>
              </div>

              <div>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>Total Records:</span>
                <p style={{
                  fontSize: "1.125rem",
                  fontWeight: "700",
                  color: "#3b82f6",
                  margin: "0.25rem 0 0 0"
                }}>
                  {filteredData.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.75rem",
          padding: "1.5rem 2rem",
          borderTop: "2px solid #e5e7eb",
          flexWrap: "wrap"
        }}>
          <button
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.875rem 1.5rem",
              background: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontWeight: "600",
              fontSize: "0.95rem",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            <i className="fas fa-times" /> Cancel
          </button>

          <button
            onClick={handleDownload}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.875rem 1.5rem",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontWeight: "600",
              fontSize: "0.95rem",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            <i className="fas fa-download" /> Download PDF
          </button>

          <button
            onClick={handlePrint}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.875rem 1.5rem",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontWeight: "600",
              fontSize: "0.95rem",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            <i className="fas fa-print" /> Print Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintReportModal;