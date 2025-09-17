import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import QrScannerWorkerPath from "qr-scanner/qr-scanner-worker.min.js?url";
import "../../assets/scanqr.css";

// Firestore
import { db } from "../../firebase/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  DocumentData,
} from "firebase/firestore";

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG: change to your real collection (e.g., "IT_Assets")
// ──────────────────────────────────────────────────────────────────────────────
const ASSETS_COLLECTION = "IT_Assets";

QrScanner.WORKER_PATH = QrScannerWorkerPath;

// ──────────────────────────────────────────────────────────────────────────────
// Types aligned to your payload
// ──────────────────────────────────────────────────────────────────────────────
type TSOrString = any | string | null;

interface AssetDoc {
  docId?: string; // Firestore doc id (for edit routes if needed)
  assetId: string;
  assetName: string;
  assetUrl?: string;
  category?: string;
  createdAt?: TSOrString;
  createdBy?: string;
  expirationDate?: string;
  generateQR?: boolean;
  image?: string;
  licenseType?: string;
  personnel?: string;
  purchaseDate?: string;
  qrcode?: string;
  renewdate?: TSOrString;
  serialNo?: string;
  status?: string;
  updatedAt?: TSOrString;
  updatedBy?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function fmtDate(val?: TSOrString): string {
  if (!val) return "";
  const v: any = val;
  if (v?.toDate) return v.toDate().toISOString().slice(0, 10);
  if (typeof val === "string") return val.slice(0, 10);
  return "";
}

function yesNo(v?: boolean): string {
  return v ? "Yes" : "No";
}

function parseQRPayload(text: string): { assetId?: string; assetUrl?: string; fullText: string } {
  // JSON payload?
  try {
    const o = JSON.parse(text);
    if (o && (o.assetId || o.assetUrl)) {
      return { assetId: o.assetId, assetUrl: o.assetUrl, fullText: text };
    }
  } catch { /* not JSON */ }

  // URL with possible ID at end or ?assetId=
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    try {
      const u = new URL(urlMatch[0]);
      const fromQuery = u.searchParams.get("assetId") || undefined;
      const segs = u.pathname.split("/").filter(Boolean);
      const lastSeg = segs[segs.length - 1];
      const guessId = (fromQuery || lastSeg || "").trim() || undefined;
      return { assetId: guessId, assetUrl: u.href, fullText: text };
    } catch { /* ignore */ }
  }

  // Raw assetId fallback
  const clean = text.trim();
  if (/^[A-Za-z0-9\-_]{5,}$/.test(clean)) {
    return { assetId: clean, fullText: text };
  }

  return { fullText: text };
}

async function fetchByDocId(id: string): Promise<AssetDoc | null> {
  try {
    const dref = doc(collection(db, ASSETS_COLLECTION), id);
    const snap = await getDoc(dref);
    if (snap.exists()) {
      const data = snap.data() as DocumentData;
      return { ...(data as AssetDoc), docId: snap.id };
    }
  } catch (e) {
    console.debug("DocId lookup failed:", e);
  }
  return null;
}

async function fetchByField(field: "assetId" | "assetUrl", value: string): Promise<AssetDoc | null> {
  const q = query(
    collection(db, ASSETS_COLLECTION),
    where(field, "==", value),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { ...(d.data() as AssetDoc), docId: d.id };
}

async function resolveAsset(text: string): Promise<AssetDoc | null> {
  const { assetId, assetUrl } = parseQRPayload(text);
  console.debug("Parsed QR →", { assetId, assetUrl });

  // 1) If we have an assetId, try docId first (common pattern)
  if (assetId) {
    const byDoc = await fetchByDocId(assetId);
    if (byDoc) return byDoc;

    // 2) Otherwise, try field query by assetId
    const byFieldId = await fetchByField("assetId", assetId);
    if (byFieldId) return byFieldId;
  }

  // 3) Try by assetUrl if available
  if (assetUrl) {
    const byUrl = await fetchByField("assetUrl", assetUrl);
    if (byUrl) return byUrl;
  }

  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────
const WebQRScanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [scanText, setScanText] = useState<string>("");
  const [asset, setAsset] = useState<AssetDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string>("");

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    setErrMsg("");
    setScanText("");
    setAsset(null);
    setShowModal(false);
    setImagePreviewUrl(null);

    // Secure origin check for friendlier error
    const isSecure =
      window.isSecureContext ||
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost";
    if (!isSecure) {
      setErrMsg(
        "Camera requires HTTPS (or localhost). Please run the dev server over HTTPS (see notes)."
      );
      return;
    }

    try {
      if (!videoRef.current) return;

      scannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          const text = typeof result === "string" ? result : (result as any).data;
          onScan(text || "");
        },
        {
          preferredCamera: "environment",
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 8,
        }
      );

      await scannerRef.current.start();
      setCameraActive(true);
    } catch (err: any) {
      console.error("Camera start failed:", err);
      let msg =
        err?.name === "NotAllowedError"
          ? "Permission denied for camera."
          : err?.message || "Unable to access camera.";
      // Add hint for insecure origins
      if (msg.toLowerCase().includes("secure")) {
        msg += " Use HTTPS or localhost.";
      }
      setErrMsg(msg);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    try {
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
    } catch { /* ignore */ }
    scannerRef.current = null;
    setCameraActive(false);
  };

  const onScan = async (text: string) => {
    if (!text) return;
    setScanText(text);
    setLoading(true);
    setErrMsg("");

    // Prevent further scans while resolving
    stopCamera();

    try {
      const found = await resolveAsset(text);
      if (!found) {
        setErrMsg(
          "No matching asset found. Ensure the QR maps to a valid assetId/assetUrl and the collection name is correct."
        );
        setShowModal(false);
        setLoading(false);
        return;
      }
      setAsset(found);
      setShowModal(true);
    } catch (e: any) {
      console.error(e);
      setErrMsg(e?.message || "Failed to resolve scanned asset.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    setErrMsg("");
    setScanText("");
    setAsset(null);
    setShowModal(false);

    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
    setCameraActive(false);
    stopCamera();

    try {
      await new Promise((r) => setTimeout(r, 300));
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      const text = typeof result === "string" ? result : (result as any).data;
      setImagePreviewUrl(null);
      onScan(text || "");
    } catch (err: any) {
      console.error("Image scan failed:", err);
      setErrMsg(err?.message || "Could not read a QR from the image.");
      setImagePreviewUrl(null);
    }
  };

  const handleCloseModal = () => setShowModal(false);

  return (
    <div className="scanqr-container">
      <h2 className="scanqr-title">QR Scanner</h2>
      <p className="scanqr-instructions">Click the button below to open the camera or upload an image.</p>

      <div className="scanqr-buttons">
        {!cameraActive ? (
          <button className="scanqr-scan-btn" onClick={startCamera}>
            Open Camera
          </button>
        ) : (
          <button className="scanqr-close-btn" onClick={stopCamera}>
            Stop Camera
          </button>
        )}

        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="scanqr-file-input"
        />
      </div>

      {cameraActive && (
        <div className="scanqr-preview-container">
          <p className="scanqr-info">Camera Active... Scanning</p>
          <p className="scanqr-info">Please point the camera at a QR code.</p>
          <video ref={videoRef} className="scanqr-video" />
        </div>
      )}

      {imagePreviewUrl && (
        <div className="scanqr-preview-container">
          <p className="scanqr-info">Image Preview... Scanning</p>
          <img src={imagePreviewUrl} className="scanqr-image-preview" alt="Uploaded Preview" />
        </div>
      )}

      {loading && <p className="scanqr-info">Resolving asset…</p>}
      {scanText && <p className="scanqr-result">Scan Result: {scanText}</p>}
      {errMsg && <p className="scanqr-error">{errMsg}</p>}

      {showModal && asset && (
        <div className="scanqr-modal-backdrop" onClick={handleCloseModal}>
          <div className="scanqr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="scanqr-modal-content">
              <div className="scanqr-modal-image">
                {asset.image ? (
                  <img src={asset.image} alt="Asset" />
                ) : asset.qrcode ? (
                  <img src={asset.qrcode} alt="Asset QR" />
                ) : (
                  <div className="scanqr-image-fallback">No Image</div>
                )}
              </div>

              <div className="scanqr-modal-details">
                <table className="qr-modal-table">
                  <thead>
                    <tr>
                      <th>Attribute</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td><strong>Asset ID:</strong></td><td>{asset.assetId || ""}</td></tr>
                    <tr><td><strong>Asset Name:</strong></td><td>{asset.assetName || ""}</td></tr>
                    <tr><td><strong>Category:</strong></td><td>{asset.category || ""}</td></tr>
                    <tr><td><strong>Status:</strong></td><td>{asset.status || ""}</td></tr>
                    <tr><td><strong>Assigned Personnel:</strong></td><td>{asset.personnel || ""}</td></tr>
                    <tr><td><strong>Purchase Date:</strong></td><td>{fmtDate(asset.purchaseDate)}</td></tr>
                    <tr><td><strong>Serial Number:</strong></td><td>{asset.serialNo || ""}</td></tr>
                    <tr><td><strong>License Type:</strong></td><td>{asset.licenseType || ""}</td></tr>
                    <tr><td><strong>Expiration Date:</strong></td><td>{asset.expirationDate || ""}</td></tr>
                    <tr><td><strong>Renewal Date:</strong></td><td>{fmtDate(asset.renewdate)}</td></tr>
                    <tr><td><strong>Generate QR:</strong></td><td>{yesNo(asset.generateQR)}</td></tr>
                    <tr>
                      <td><strong>Asset URL:</strong></td>
                      <td>
                        {asset.assetUrl ? (
                          <a href={asset.assetUrl} target="_blank" rel="noreferrer">{asset.assetUrl}</a>
                        ) : ("")}
                      </td>
                    </tr>
                    <tr><td><strong>Created By:</strong></td><td>{asset.createdBy || ""}</td></tr>
                    <tr><td><strong>Created At:</strong></td><td>{fmtDate(asset.createdAt)}</td></tr>
                    <tr><td><strong>Updated By:</strong></td><td>{asset.updatedBy || ""}</td></tr>
                    <tr><td><strong>Updated At:</strong></td><td>{fmtDate(asset.updatedAt)}</td></tr>
                  </tbody>
                </table>

                <div className="scanqr-modal-buttons-container">
                  <button className="scanqr-close-btn" onClick={handleCloseModal}>
                    <i className="fas fa-xmark"></i> Close
                  </button>
                  <button
                    className="scanqr-edit-btn"
                    onClick={() => {
                      console.log("Edit asset", asset.docId ?? asset.assetId);
                      // navigate(`/assets/${asset.docId ?? asset.assetId}/edit`);
                    }}
                  >
                    <i className="fas fa-edit"></i> Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebQRScanner;
