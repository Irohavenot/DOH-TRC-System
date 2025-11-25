import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import QrCreator from "qr-creator";

type Asset = {
  id: string;
  assetId?: string;
  assetName?: string;
  serialNo?: string;
  qrcode?: string;
  assetUrl?: string;
  propertyNo?: string;
  purchaseDate?: string;
  // Add any other fields you need from your asset data
};

export default function QRModal({
  isOpen,
  onClose,
  asset,
}: {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const displayName = asset?.assetName || "Asset";
  const serial = asset?.serialNo || "N/A";
  const propertyNo = asset?.propertyNo || "N/A";
  const purchaseDate = asset?.purchaseDate || "N/A";

  const targetUrl = useMemo(() => {
    if (!asset) return "";
    return (
      asset.assetUrl ||
      (asset.assetId ? `${window.location.origin}/dashboard/${asset.assetId}` : "")
    );
  }, [asset]);

  useEffect(() => {
    let isMounted = true;
    async function ensureQr() {
      if (!asset) return;
      if (asset.qrcode) {
        if (isMounted) setQrDataUrl(asset.qrcode);
        return;
      }
      if (targetUrl) {
        const canvas = document.createElement("canvas");
        QrCreator.render(
          {
            text: targetUrl,
            radius: 0.45,
            ecLevel: "H",
            fill: "#162a37",
            background: null,
            size: 250,
          },
          canvas
        );
        if (isMounted) setQrDataUrl(canvas.toDataURL("image/png"));
      }
    }
    if (isOpen) ensureQr();
    return () => {
      isMounted = false;
      setQrDataUrl("");
    };
  }, [asset, isOpen, targetUrl]);

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Print QR - Property Inventory Sticker</title>
          <style>
            @page {
              size: 105mm 148.5mm; /* 1/4 of bond paper (A4) in portrait */
              margin: 0;
            }
            body { 
              margin: 0;
              padding: 8mm;
              font-family: Arial, sans-serif;
              font-size: 9pt;
              line-height: 1.3;
              width: 105mm;
              height: 148.5mm;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              margin-bottom: 8px;
            }
            .logo {
              width: 35mm;
              height: auto;
              margin-bottom: 4px;
            }
            .dept-name {
              font-size: 8pt;
              font-weight: bold;
              margin: 2px 0;
            }
            .title {
              font-size: 11pt;
              font-weight: bold;
              margin: 8px 0;
              text-decoration: underline;
            }
            .info-row {
              display: flex;
              margin: 4px 0;
              font-size: 9pt;
            }
            .info-label {
              font-weight: bold;
              width: 35%;
              flex-shrink: 0;
            }
            .info-value {
              flex: 1;
              word-break: break-word;
            }
            .qr-container {
              text-align: center;
              margin: 10px 0;
            }
            .qr-container img {
              width: 50mm;
              height: 50mm;
            }
            .validation-section {
              margin-top: 12px;
              border-top: 1px solid #000;
              padding-top: 8px;
            }
            .validation-title {
              font-weight: bold;
              margin-bottom: 6px;
              font-size: 9pt;
            }
            .signature-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 4px;
              font-size: 7pt;
            }
            .signature-item {
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #000;
              margin-top: 15px;
              margin-bottom: 2px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/dohlogo1.png" alt="DOH Logo" class="logo" />
            <div class="dept-name">Dept. of Health</div>
            <div class="dept-name" style="font-size: 7pt;">Treatment and Rehabilitation Center Argao</div>
            <div class="dept-name" style="font-size: 7pt;">Candabong, Binlod, Argao, Cebu</div>
          </div>
          
          <div class="title">PROPERTY INVENTORY STICKER</div>
          
          <div class="info-row">
            <div class="info-label">Property No.:</div>
            <div class="info-value">${propertyNo}</div>
          </div>
          
          <div class="info-row">
            <div class="info-label">Serial No.:</div>
            <div class="info-value">${serial}</div>
          </div>
          
          <div class="qr-container">
            <img src="${qrDataUrl}" alt="QR Code"/>
          </div>
          
          <div class="info-row">
            <div class="info-label">Description:</div>
            <div class="info-value">${displayName}</div>
          </div>
          
          <div class="info-row">
            <div class="info-label">Date Acquired:</div>
            <div class="info-value">${purchaseDate}</div>
          </div>
          
          <div class="validation-section">
            <div class="validation-title">Inventory Committee Validation</div>
            <div class="signature-grid">
              <div class="signature-item">
                <div>Inspected by</div>
                <div class="signature-line"></div>
              </div>
              <div class="signature-item">
                <div>Date of Inspection</div>
                <div class="signature-line"></div>
              </div>
              <div class="signature-item">
                <div>Signature</div>
                <div class="signature-line"></div>
              </div>
            </div>
            <div class="signature-grid" style="margin-top: 8px;">
              <div class="signature-item">
                <div class="signature-line"></div>
              </div>
              <div class="signature-item">
                <div class="signature-line"></div>
              </div>
              <div class="signature-item">
                <div class="signature-line"></div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 200);
  };

  const handleDownload = () => {
    // 1/4 of A4 in portrait: 105mm x 148.5mm
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [105, 148.5]
    });

    const pageWidth = 105;
    const margin = 8;
    let yPos = margin;

    // Logo
    const logoUrl = '/dohlogo1.png';
    const logoWidth = 35;
    const logoHeight = 35;
    doc.addImage(logoUrl, 'PNG', (pageWidth - logoWidth) / 2, yPos, logoWidth, logoHeight);
    yPos += logoHeight + 2;

    // Department name
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Dept. of Health', pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
    
    doc.setFontSize(7);
    doc.text('Treatment and Rehabilitation Center Argao', pageWidth / 2, yPos, { align: 'center' });
    yPos += 3.5;
    doc.text('Candabong, Binlod, Argao, Cebu', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;

    // Title
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPERTY INVENTORY STICKER', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Property info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Property No.:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(propertyNo, margin + 35, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'bold');
    doc.text('Serial No.:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(serial, margin + 35, yPos);
    yPos += 8;

    // QR Code
    const qrSize = 50;
    doc.addImage(qrDataUrl, 'PNG', (pageWidth - qrSize) / 2, yPos, qrSize, qrSize);
    yPos += qrSize + 8;

    // Description
    doc.setFont('helvetica', 'bold');
    doc.text('Description:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    const descText = doc.splitTextToSize(displayName, pageWidth - margin * 2 - 35);
    doc.text(descText, margin + 35, yPos);
    yPos += 5 * descText.length;

    // Date Acquired
    doc.setFont('helvetica', 'bold');
    doc.text('Date Acquired:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(purchaseDate, margin + 35, yPos);
    yPos += 8;

    // Validation section
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Inventory Committee Validation', margin, yPos);
    yPos += 6;

    // Signature fields
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const sigWidth = (pageWidth - margin * 2) / 3;
    
    doc.text('Inspected by', margin + sigWidth * 0.5, yPos, { align: 'center' });
    doc.text('Date of Inspection', margin + sigWidth * 1.5, yPos, { align: 'center' });
    doc.text('Signature', margin + sigWidth * 2.5, yPos, { align: 'center' });
    yPos += 8;

    // Signature lines
    doc.line(margin, yPos, margin + sigWidth - 2, yPos);
    doc.line(margin + sigWidth + 1, yPos, margin + sigWidth * 2 - 1, yPos);
    doc.line(margin + sigWidth * 2 + 2, yPos, pageWidth - margin, yPos);

    doc.save(`${(displayName || "asset").replace(/\s+/g, "_")}-property-sticker.pdf`);
  };

  if (!isOpen || !asset) return null;

  return isOpen && asset ? (
    <div className="modal-overlay" role="presentation">
      <div className="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-title">
        <h3 id="qr-title">{displayName} — QR Code</h3>
        <div className="qr-display">
          {qrDataUrl ? <img src={qrDataUrl} alt="QR code" /> : <p>Generating…</p>}
        </div>
        <div className="button-group">
          <button onClick={handlePrint} className="print-btn">Print</button>
          <button onClick={handleDownload} className="download-btn">Download</button>
          <button onClick={onClose} className="close-btn">Close</button>
        </div>
      </div>
    </div>
  ) : null;
}