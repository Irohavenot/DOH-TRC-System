import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import QrCreator from "qr-creator";

type Asset = {
  id: string;
  assetId?: string;
  assetName?: string;
  serialNo?: string;
  qrcode?: string;      // base64 PNG (data URL)
  assetUrl?: string;    // url encoded into the QR
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

  // Fallback URL if older docs don't have assetUrl
  const targetUrl = useMemo(() => {
    if (!asset) return "";
    return (
      asset.assetUrl ||
      (asset.assetId ? `${window.location.origin}/dashboard/${asset.assetId}` : "")
    );
  }, [asset]);

  // Ensure we have a data URL to show (use saved qrcode or generate on the fly)
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
          <title>Print QR</title>
          <style>
            body { text-align:center; font-family: sans-serif; padding: 24px; }
            .wrap { display:inline-block; border:1px solid #ddd; padding:16px; border-radius:10px; }
            .meta { display:flex; justify-content:space-between; gap:16px; margin-top:12px; font-weight:600; width:260px; }
            .meta p { margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:50%; }
            img { width:250px; height:250px; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <img src="${qrDataUrl}" alt="QR Code"/>
            <div class="meta">
              <p>Asset: ${displayName}</p>
              <p>Serial: ${serial}</p>
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
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const qrW = 40;
    const qrH = 40;
    const qrX = (pageWidth - qrW) / 2;

    // Optional header/logo (comment/remove if not needed)
    // const dohLogoUrl = '/dohlogo1.png';
    // doc.addImage(dohLogoUrl, 'PNG', 90, 10, 30, 30);
    // doc.setFontSize(10);
    // doc.text('Department of Health', 105, 45, { align: 'center' });

    doc.addImage(qrDataUrl, "PNG", qrX, 50, qrW, qrH);

    const y = 50 + qrH + 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const assetText = `Asset: ${displayName}`;
    const serialText = `Serial: ${serial}`;
    const assetTextW = doc.getTextWidth(assetText);
    const serialTextW = doc.getTextWidth(serialText);
    const totalW = assetTextW + serialTextW + 10;
    const startX = (pageWidth - totalW) / 2;
    doc.text(assetText, startX, y);
    doc.text(serialText, startX + assetTextW + 10, y);

    doc.save(`${(displayName || "asset").replace(/\s+/g, "_")}-qr.pdf`);
  };

  if (!isOpen || !asset) return null;

  // ...
return isOpen && asset ? (
  <div className="modal-overlay" role="presentation">
    {/* add qr-modal class alongside modal to override shared styles */}
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
