import { useEffect, useRef, useState, useCallback } from "react";
import QrScanner from "qr-scanner";
// Vite returns a URL string for the worker file
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
// CONFIG
// ──────────────────────────────────────────────────────────────────────────────
const ASSETS_COLLECTION = "IT_Assets";

// Use the worker path provided by Vite (reliable in dev & prod)
(QrScanner as any).WORKER_PATH = QrScannerWorkerPath;

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

  if (assetId) {
    const byDoc = await fetchByDocId(assetId);
    if (byDoc) return byDoc;

    const byFieldId = await fetchByField("assetId", assetId);
    if (byFieldId) return byFieldId;
  }

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

// what the user wants to do next when they hit "Scan Another"
  const [nextAction, setNextAction] = useState<'camera' | 'upload' | null>(null);
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

  
  const stopCamera = useCallback(() => {
    try {
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
    } catch { /* ignore */ }
    scannerRef.current = null;
    setCameraActive(false);
  }, []);

  const startCamera = async () => {
    setNextAction('camera');       
    setErrMsg("");
    setScanText("");
    setAsset(null);
    setShowModal(false);
    setImagePreviewUrl(null);

    const isSecure =
      window.isSecureContext ||
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost";
    if (!isSecure) {
      setErrMsg("Camera requires HTTPS (or localhost).");
      return;
    }

    try {
      if (!videoRef.current) {
        console.error("Video element not found!");
        setErrMsg("Video element not ready. Try again.");
        return;
      }

      console.log("Initializing QRScanner with worker:", (QrScanner as any).WORKER_PATH);

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
      console.log("Camera started successfully.");
    } catch (err: any) {
      console.error("Camera start failed:", err);
      let msg =
        err?.name === "NotAllowedError"
          ? "Permission denied for camera. Please allow access in browser settings."
          : err?.message || "Unable to access camera.";
      if (String(msg).toLowerCase().includes("secure")) {
        msg += " Use HTTPS or localhost.";
      }
      setErrMsg(msg);
      setCameraActive(false);
    }
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

    setNextAction('upload');  
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
      } finally {
    // let user re-select the same file next time
    if (fileInputRef.current) fileInputRef.current.value = '';
    // optional: revoke preview URL if you want to be extra tidy
    URL.revokeObjectURL(previewUrl);
  }
};

  const handleCloseModal = () => setShowModal(false);

  // Allow closing modal with Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowModal(false);
    }
    if (showModal) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showModal]);

  return (
    <div className="scanqr-container">
      <header className="scanqr-header">
        <h2 className="scanqr-title">QR Scanner</h2>
        <p className="scanqr-subtitle">Scan a QR code or upload an image to view asset details.</p>
      </header>

      <div className="scanqr-actions" role="group" aria-label="Scanner actions">
        {!cameraActive ? (
          <button className="scanqr-btn scanqr-btn-primary" onClick={startCamera}>
            Open Camera
          </button>
        ) : (
          <button className="scanqr-btn scanqr-btn-danger" onClick={stopCamera}>
            Stop Camera
          </button>
        )}

        <label className="scanqr-upload-btn"
                onClick={() => {
                  setNextAction('upload');             // <-- remember that user prefers upload
                  // allow selecting same file again
                  if (fileInputRef.current) fileInputRef.current.value = '';
          }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="scanqr-file-input"
            aria-label="Upload image to scan"
          />
          Upload Image
        </label>
      </div>

      {errMsg && <div className="scanqr-alert scanqr-alert-error" role="alert">{errMsg}</div>}
      {loading && <div className="scanqr-alert scanqr-alert-info">Resolving asset…</div>}
      {scanText && !loading && (
        <div className="scanqr-alert scanqr-alert-success">
          <strong>Scan Result:</strong> <span className="scanqr-wrap">{scanText}</span>
        </div>
      )}

      <div className={`scanqr-preview ${cameraActive ? '' : 'is-hidden'}`}>
          <div className="scanqr-video-wrap">
            <video ref={videoRef} className="scanqr-video" playsInline />
          </div>
          <p className="scanqr-hint">
            {cameraActive ? 'Point your camera at a QR code.' : 'Camera is off.'}
          </p>
        </div>


      {imagePreviewUrl && (
        <div className="scanqr-preview">
          <div className="scanqr-image-wrap">
            <img src={imagePreviewUrl} className="scanqr-image-preview" alt="Uploaded Preview" />
          </div>
          <p className="scanqr-hint">Scanning image…</p>
        </div>
      )}

      {showModal && asset && (
        <div className="scanqr-modal-backdrop" onClick={handleCloseModal} aria-modal="true" role="dialog">
          <div
            className="scanqr-modal"
            onClick={(e) => e.stopPropagation()}
            aria-label="Asset details"
            tabIndex={-1}
          >
            <div className="scanqr-modal-header">
              <h3 className="scanqr-modal-title">{asset.assetName || "Asset Details"}</h3>
              <button
                className="scanqr-close-x"
                onClick={handleCloseModal}
                aria-label="Close details"
              >
                ×
              </button>
            </div>

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
                    <tr>
                      <td data-label="Attribute"><strong>Asset ID</strong></td>
                      <td data-label="Details">{asset.assetId || ""}</td>
                    </tr>
                    <tr>
                      <td data-label="Attribute"><strong>Asset Name</strong></td>
                      <td data-label="Details">{asset.assetName || ""}</td>
                    </tr>
                    <tr>
                      <td data-label="Attribute"><strong>Category</strong></td>
                      <td data-label="Details">{asset.category || ""}</td>
                    </tr>
                    <tr>
                      <td data-label="Attribute"><strong>Status</strong></td>
                      <td data-label="Details">{asset.status || ""}</td>
                    </tr>
                    <tr>
                      <td data-label="Attribute"><strong>Assigned Personnel</strong></td>
                      <td data-label="Details">{asset.personnel || ""}</td>
                    </tr>
                    <tr>
                      <td data-label="Attribute"><strong>Purchase Date</strong></td>
                      <td data-label="Details">{fmtDate(asset.purchaseDate)}</td>
                    </tr>
                    <tr>
                      <td data-label="Attribute"><strong>Serial Number</strong></td>
                      <td data-label="Details">{asset.serialNo || ""}</td>
                    </tr>
                    <tr>
                      <td data-label="Attribute"><strong>License Type</strong></td>
                      <td data-label="Details">{asset.licenseType || ""}</td>
                    </tr>
                    <tr>
                      <td data-label="Attribute"><strong>Expiration Date</strong></td>
                      <td data-label="Details">{asset.expirationDate || ""}</td>
                    </tr>
                    <tr>
                      <td data-label="Attribute"><strong>Renewal Date</strong></td>
                      <td data-label="Details">{fmtDate(asset.renewdate)}</td>
                    </tr>
                    <tr>
                      <td data-label="Attribute"><strong>Generate QR</strong></td>
                      <td data-label="Details">{yesNo(asset.generateQR)}</td>
                    </tr>
                    <tr>
                      <td data-label="Attribute"><strong>Asset URL</strong></td>
                      <td data-label="Details">
                        {asset.assetUrl ? (
                          <a href={asset.assetUrl} target="_blank" rel="noreferrer" className="scanqr-link">
                            {asset.assetUrl}
                          </a>
                        ) : ("")}
                      </td>
                    </tr>
                    <tr>
                      <td data-label="Attribute"><strong>Created By</strong></td>
                      <td data-label="Details">{asset.createdBy || ""}</td>
                    </tr>
                    <tr>
                      <td data-label="Attribute"><strong>Created At</strong></td>
                      <td data-label="Details">{fmtDate(asset.createdAt)}</td>
                    </tr>
                    <tr>
                      <td data-label="Attribute"><strong>Updated By</strong></td>
                      <td data-label="Details">{asset.updatedBy || ""}</td>
                    </tr>
                    <tr>
                      <td data-label="Attribute"><strong>Updated At</strong></td>
                      <td data-label="Details">{fmtDate(asset.updatedAt)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="scanqr-modal-buttons">
                  <button className="scanqr-btn scanqr-btn-light" onClick={handleCloseModal}>
                    Close
                  </button>
                  <button
                    className="scanqr-btn scanqr-btn-success"
                    onClick={() => {
                      console.log("Edit asset", asset.docId ?? asset.assetId);
                      // navigate(`/assets/${asset.docId ?? asset.assetId}/edit`);
                    }}
                  >
                    Edit
                  </button>
                  <button
                      className="scanqr-btn scanqr-btn-outline"
                      onClick={() => {
                        setShowModal(false);

                        // give the modal a tick to close
                        setTimeout(() => {
                          if (nextAction === 'upload') {
                            // re-arm file input so onChange fires even for the same file
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                              fileInputRef.current.click();  // <-- open the file picker
                            }
                          } else {
                            // default to camera
                            startCamera();
                          }
                        }, 60);
                      }}
                    >
                      Scan Another
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
