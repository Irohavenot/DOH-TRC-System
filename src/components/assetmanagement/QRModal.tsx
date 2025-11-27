import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import QrCreator from "qr-creator";
import { db } from "../../firebase/firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";

type Asset = {
  id: string;
  assetId?: string;
  assetName?: string;
  serialNo?: string;
  qrcode?: string;
  assetUrl?: string;
  propertyNo?: string;
  purchaseDate?: string;
  personnel?: string;
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
  const [custodianName, setCustodianName] = useState<string>("N/A");
  const [loading, setLoading] = useState<boolean>(false);

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

  // Fetch custodian name - improved version matching BulkQRPrint logic
  useEffect(() => {
    const fetchCustodian = async () => {
      if (!asset?.personnel) {
        setCustodianName("N/A");
        return;
      }

      setLoading(true);
      try {
        // Try to get the document directly by ID first (more efficient)
        const userDocRef = doc(db, "IT_Supply_Users", asset.personnel);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const firstName = userData.FirstName || "";
          const middleInitial = userData.MiddleInitial || "";
          const lastName = userData.LastName || "";

          let middlePart = "";
          if (middleInitial) {
            if (middleInitial.length > 1 && !middleInitial.endsWith(".")) {
              middlePart = middleInitial.charAt(0).toUpperCase() + ".";
            } else {
              middlePart = middleInitial.trim();
              if (middlePart.length === 1) middlePart += ".";
            }
          }

          const fullName = [firstName, middlePart, lastName].filter(Boolean).join(" ").trim();
          setCustodianName(fullName || "N/A");
        } else {
          // Fallback: try querying by document name (your original approach)
          const userQuery = await getDocs(
            query(collection(db, "IT_Supply_Users"), where("__name__", "==", asset.personnel))
          );

          if (!userQuery.empty) {
            const userData = userQuery.docs[0].data();
            const firstName = userData.FirstName || "";
            const middleInitial = userData.MiddleInitial || "";
            const lastName = userData.LastName || "";

            let middlePart = "";
            if (middleInitial) {
              if (middleInitial.length > 1 && !middleInitial.endsWith(".")) {
                middlePart = middleInitial.charAt(0).toUpperCase() + ".";
              } else {
                middlePart = middleInitial.trim();
                if (middlePart.length === 1) middlePart += ".";
              }
            }

            const fullName = [firstName, middlePart, lastName].filter(Boolean).join(" ").trim();
            setCustodianName(fullName || "N/A");
          } else {
            setCustodianName("N/A");
          }
        }
      } catch (error) {
        console.error("Error fetching custodian:", error);
        setCustodianName("N/A");
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && asset) {
      fetchCustodian();
    }
  }, [asset, isOpen]);

  // Generate QR code
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
    if (loading) {
      alert("Please wait for custodian information to load...");
      return;
    }

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Print QR - Property Inventory Sticker</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body { 
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
            }
            .print-container {
              width: 50%;
              height: 50vh;
              padding: 10mm;
              box-sizing: border-box;
              font-size: 9pt;
              line-height: 1.3;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8mm;
              margin-bottom: 6px;
              padding-bottom: 4px;
              border-bottom: 1px solid #ddd;
            }
            .logo {
              width: 18mm;
              height: auto;
              flex-shrink: 0;
            }
            .header-text {
              flex: 1;
              text-align: center;
            }
            .dept-name {
              font-size: 8pt;
              font-weight: bold;
              margin: 1px 0;
              text-align: center;
            }
            .dept-small {
              font-size: 6.5pt;
              margin: 0.5px 0;
              text-align: center;
            }
            .title {
              font-size: 10pt;
              font-weight: bold;
              margin: 6px 0;
              text-align: center;
              text-decoration: underline;
            }
            .info-row {
              display: flex;
              margin: 3px 0;
              font-size: 8pt;
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
              margin: 8px 0;
            }
            .qr-container img {
              width: 40mm;
              height: 40mm;
            }
            .validation-section {
              margin-top: 8px;
              border-top: 1px solid #000;
              padding-top: 6px;
            }
            .validation-title {
              font-weight: bold;
              margin-bottom: 4px;
              font-size: 8pt;
            }
            .signature-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 3px;
              font-size: 6.5pt;
              margin-bottom: 6px;
            }
            .signature-item {
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #000;
              margin-top: 12px;
              margin-bottom: 2px;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="header">
              <img src="/dohlogo1.png" alt="DOH Logo" class="logo" />
              <div class="header-text">
                <div class="dept-name">Department of Health</div>
                <div class="dept-small">Treatment and Rehabilitation Center Argao</div>
                <div class="dept-small">Candabong, Binlod, Argao, Cebu</div>
              </div>
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

            <div class="info-row">
              <div class="info-label">Custodian:</div>
              <div class="info-value">${custodianName}</div>
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
              <div class="signature-grid">
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
    if (loading) {
      alert("Please wait for custodian information to load...");
      return;
    }

    // 1/2 of A4 width x 1/2 of A4 height in portrait
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [105, 148.5]
    });

    const pageWidth = 105;
    const margin = 10;
    let yPos = margin;

    // Logo - centered with text
    const logoUrl = '/dohlogo1.png';
    const logoWidth = 18;
    const logoHeight = 18;
    const logoX = margin + 8;
    doc.addImage(logoUrl, 'PNG', logoX, yPos, logoWidth, logoHeight);

    // Header text - centered next to logo
    const textStartX = logoX + logoWidth + 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Department of Health', textStartX + 15, yPos + 5, { align: 'center' });
    
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Treatment and Rehabilitation Center Argao', textStartX + 15, yPos + 9, { align: 'center' });
    doc.text('Candabong, Binlod, Argao, Cebu', textStartX + 15, yPos + 12.5, { align: 'center' });
    
    yPos += logoHeight + 4;

    // Line separator
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    // Title
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPERTY INVENTORY STICKER', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;

    // Property info
    doc.setFontSize(8);
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
    const qrSize = 40;
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
    yPos += 5;

    // Custodian
    doc.setFont('helvetica', 'bold');
    doc.text('Custodian:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(custodianName, margin + 35, yPos);
    yPos += 8;

    // Validation section
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Inventory Committee Validation', margin, yPos);
    yPos += 6;

    // Signature fields
    doc.setFontSize(6.5);
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
    yPos += 6;

    // Second row of signature lines
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
        {loading && (
          <div style={{ textAlign: 'center', fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
            Loading custodian information...
          </div>
        )}
        <div className="button-group">
          <button onClick={handlePrint} className="print-btn" disabled={loading}>
            Print
          </button>
          <button onClick={handleDownload} className="download-btn" disabled={loading}>
            Download
          </button>
          <button onClick={onClose} className="close-btn">Close</button>
        </div>
      </div>
    </div>
  ) : null;
}