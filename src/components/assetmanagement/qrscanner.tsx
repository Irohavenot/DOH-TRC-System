import { useEffect, useRef, useState, useCallback } from "react";
import QrScanner from "qr-scanner";
import QrScannerWorkerPath from "qr-scanner/qr-scanner-worker.min.js?url";
import "../../assets/scanqr.css";
import AssetDetailsModal from "../assetmanagement/AssetDetailsModal";
import EditAssetModal from "../assetmanagement/EditAssetModal";
import ReportAssetModal from "../assetmanagement/ReportAssetModal";
import QRModal from "../assetmanagement/QRModal";
import { db } from "../../firebase/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

const ASSETS_COLLECTION = "IT_Assets";
const USERS_COLLECTION = "IT_Supply_Users";
(QrScanner as any).WORKER_PATH = QrScannerWorkerPath;

type TSOrString = any | string | null;

interface AssetDoc {
  docId?: string;
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
  assetHistory?: any[];
  iconClass?: string;
  timeLeft?: string;
}

function fmtDate(val?: TSOrString): string {
  if (!val) return "";
  const v: any = val;
  if (v?.toDate) return v.toDate().toISOString().slice(0, 10);
  if (typeof val === "string") return val.slice(0, 10);
  return "";
}

function parseQRPayload(text: string): { assetId?: string; assetUrl?: string; fullText: string } {
  try {
    const o = JSON.parse(text);
    if (o && (o.assetId || o.assetUrl)) {
      return { assetId: o.assetId, assetUrl: o.assetUrl, fullText: text };
    }
  } catch {}
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    try {
      const u = new URL(urlMatch[0]);
      const fromQuery = u.searchParams.get("assetId") || undefined;
      const segs = u.pathname.split("/").filter(Boolean);
      const lastSeg = segs[segs.length - 1];
      const guessId = (fromQuery || lastSeg || "").trim() || undefined;
      return { assetId: guessId, assetUrl: u.href, fullText: text };
    } catch {}
  }
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
    if (snap.exists()) return { ...(snap.data() as AssetDoc), docId: snap.id };
  } catch {}
  return null;
}

async function fetchByField(field: "assetId" | "assetUrl", value: string): Promise<AssetDoc | null> {
  const q = query(collection(db, ASSETS_COLLECTION), where(field, "==", value), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { ...(d.data() as AssetDoc), docId: d.id };
}

async function resolveAsset(text: string): Promise<AssetDoc | null> {
  const { assetId, assetUrl } = parseQRPayload(text);
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

// Compute expiration display
const NON_EXPIRING = new Set(["Perpetual", "OEM", "Open Source"]);
function computeBadge(licenseType?: string, expirationDate?: string) {
  if (licenseType && NON_EXPIRING.has(licenseType))
    return { iconClass: "icon-blue", timeLeft: "No Expiration" };
  if (!expirationDate) return { iconClass: "icon-orange", timeLeft: "No Expiration Date" };
  const today = new Date();
  const exp = new Date(expirationDate).getTime();
  const days = Math.ceil((exp - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { iconClass: "icon-red", timeLeft: `Expired ${Math.abs(days)} day(s) ago` };
  if (days === 0) return { iconClass: "icon-orange", timeLeft: "Expires today" };
  if (days <= 30) return { iconClass: "icon-orange", timeLeft: `${days} day(s) left` };
  if (days <= 90) return { iconClass: "icon-green", timeLeft: `${Math.ceil(days / 7)} week(s) left` };
  return { iconClass: "icon-green", timeLeft: `${Math.ceil(days / 30)} month(s) left` };
}

const WebQRScanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scanProcessedRef = useRef<boolean>(false);

  const [nextAction, setNextAction] = useState<"camera" | "upload" | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [showVideoElement, setShowVideoElement] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string>("");
  const [scanText, setScanText] = useState<string>("");

  const [asset, setAsset] = useState<AssetDoc | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [uidToNameMap, setUidToNameMap] = useState<Record<string, string>>({});

  // Fetch user name map
  useEffect(() => {
    const unsub = onSnapshot(collection(db, USERS_COLLECTION), (snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as any;
        const name = [data.FirstName, data.MiddleInitial, data.LastName]
          .filter(Boolean)
          .join(" ");
        map[d.id] = name;
      });
      setUidToNameMap(map);
    });
    return () => unsub();
  }, []);

  const stopCamera = useCallback(() => {
    try {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    } catch (err) {
      console.error("Error stopping camera:", err);
    }
    setCameraActive(false);
    setShowVideoElement(false);
    scanProcessedRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const onScan = useCallback(async (text: string) => {
    // Prevent duplicate scans
    if (!text || scanProcessedRef.current) return;
    
    scanProcessedRef.current = true;
    setScanText(text);
    setLoading(true);
    stopCamera();

    try {
      const found = await resolveAsset(text);
      if (!found) {
        setErrMsg("No matching asset found.");
        setShowModal(false);
        setLoading(false);
        scanProcessedRef.current = false;
        return;
      }
      const { iconClass, timeLeft } = computeBadge(found.licenseType, found.expirationDate);
      setAsset({ ...found, iconClass, timeLeft });
      setShowModal(true);
      setErrMsg("");
    } catch (e: any) {
      setErrMsg(e?.message || "Failed to resolve scanned asset.");
    } finally {
      setLoading(false);
    }
  }, [stopCamera]);

  // Initialize camera when video element is ready
  useEffect(() => {
    if (!showVideoElement || !videoRef.current || scannerRef.current) return;

    const initCamera = async () => {
      try {
        const scanner = new QrScanner(
          videoRef.current!,
          (result) => {
            const text = typeof result === "string" ? result : (result as any).data;
            onScan(text || "");
          },
          {
            preferredCamera: "environment",
            highlightScanRegion: true,
            maxScansPerSecond: 5,
            highlightCodeOutline: true,
          }
        );

        await scanner.start();
        scannerRef.current = scanner;
        setCameraActive(true);
        setErrMsg("");
      } catch (err: any) {
        console.error("Camera initialization error:", err);
        setErrMsg(err?.message || "Unable to access camera. Please check permissions.");
        setCameraActive(false);
        setShowVideoElement(false);
      }
    };

    initCamera();
  }, [showVideoElement, onScan]);

  const startCamera = () => {
    setNextAction("camera");
    setErrMsg("");
    setScanText("");
    setAsset(null);
    setShowModal(false);
    setImagePreviewUrl(null);
    scanProcessedRef.current = false;

    // Check for secure context
    if (!window.isSecureContext && window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      setErrMsg("Camera requires HTTPS or localhost.");
      return;
    }

    // Check for camera permissions
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrMsg("Camera access is not supported in this browser.");
      return;
    }

    // Show video element which will trigger the useEffect to initialize camera
    setShowVideoElement(true);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setNextAction("upload");
    setErrMsg("");
    setAsset(null);
    setShowModal(false);
    setScanText("");
    scanProcessedRef.current = false;
    
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
    stopCamera();
    setLoading(true);

    try {
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      const text = typeof result === "string" ? result : (result as any).data;
      setImagePreviewUrl(null);
      await onScan(text || "");
    } catch (err: any) {
      setErrMsg(err?.message || "Could not read QR code from image. Please try another image.");
      setImagePreviewUrl(null);
      setLoading(false);
      scanProcessedRef.current = false;
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    scanProcessedRef.current = false;
  };

  const handleScanAnother = () => {
    setShowModal(false);
    setErrMsg("");
    setScanText("");
    setAsset(null);
    scanProcessedRef.current = false;
    
    setTimeout(() => {
      if (nextAction === "upload") {
        fileInputRef.current?.click();
      } else {
        startCamera();
      }
    }, 150);
  };

  const mapAssetToModal = (a: AssetDoc) => ({
    id: a.docId || "",
    title: a.assetName || "",
    team: a.category || "",
    timeLeft: a.timeLeft || "",
    serial: a.serialNo || "",
    image: a.image,
    assetId: a.assetId,
    assetUrl: a.assetUrl,
    qrcode: a.qrcode,
    personnel: a.personnel ? uidToNameMap[a.personnel] || a.personnel : "Unassigned",
    purchaseDate: fmtDate(a.purchaseDate),
    status: a.status,
    licenseType: a.licenseType,
    createdAt: fmtDate(a.createdAt),
    createdBy: a.createdBy,
    updatedAt: fmtDate(a.updatedAt),
    updatedBy: a.updatedBy,
    renewdate: fmtDate(a.renewdate),
    assetHistory: a.assetHistory || [],
    iconClass: a.iconClass,
  });

  return (
    <div className="scanqr-container">
      <header className="scanqr-header">
        <h2>QR Scanner</h2>
        <p>Scan a QR code or upload an image to view asset details.</p>
      </header>

      <div className="scanqr-actions">
        {!cameraActive ? (
          <button className="scanqr-btn scanqr-btn-primary" onClick={startCamera}>
            <i className="fas fa-camera"></i> Open Camera
          </button>
        ) : (
          <button className="scanqr-btn scanqr-btn-danger" onClick={stopCamera}>
            <i className="fas fa-stop"></i> Stop Camera
          </button>
        )}

        <label className="scanqr-upload-btn">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="scanqr-file-input"
          />
          <i className="fas fa-upload"></i> Upload Image
        </label>
      </div>

      {errMsg && (
        <div className="scanqr-alert scanqr-alert-error">
          <i className="fas fa-exclamation-circle"></i> {errMsg}
        </div>
      )}
      
      {loading && (
        <div className="scanqr-alert scanqr-alert-info">
          <i className="fas fa-spinner fa-spin"></i> Resolving asset…
        </div>
      )}
      
      {scanText && !loading && !showModal && (
        <div className="scanqr-alert scanqr-alert-success">
          <i className="fas fa-check-circle"></i> <strong>Scan Result:</strong> {scanText}
        </div>
      )}

      {showVideoElement && (
        <div className="scanqr-preview">
          <video 
            ref={videoRef} 
            className="scanqr-video" 
            playsInline 
            muted
            autoPlay
          />
          <p className="scanqr-hint">
            <i className="fas fa-qrcode"></i> Point your camera at a QR code
          </p>
        </div>
      )}

      {imagePreviewUrl && (
        <div className="scanqr-preview">
          <img src={imagePreviewUrl} alt="Uploaded Preview" className="scanqr-image-preview" />
          <p className="scanqr-hint">
            <i className="fas fa-spinner fa-spin"></i> Scanning image…
          </p>
        </div>
      )}

      {/* Asset Details Modal */}
      {showModal && asset && (
        <AssetDetailsModal
          isOpen={showModal}
          onClose={handleCloseModal}
          asset={mapAssetToModal(asset)}
          onEdit={() => setEditOpen(true)}
          onViewQR={() => console.log("View QR clicked")}
          onReport={() => setReportOpen(true)}
          onViewHistory={() => console.log("View history clicked")}
          extraButton={
            <button
              className="scanqr-btn scanqr-btn-outline"
              onClick={handleScanAnother}
            >
              <i className="fas fa-qrcode"></i> Scan Another
            </button>
          }
        />
      )}

      {/* Edit Modal */}
      <EditAssetModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        asset={asset ? { ...asset, docId: asset.docId } : null}
        categories={[]}
        itUsers={[]}
        onSaved={() => {
          setEditOpen(false);
          setShowModal(false);
          scanProcessedRef.current = false;
        }}
        onDeleted={() => {
          setEditOpen(false);
          setShowModal(false);
          scanProcessedRef.current = false;
        }}
      />

      {/* Report Modal */}
      {asset && (
        <ReportAssetModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          assetId={asset.assetId}
          assetDocId={asset.docId || ""}
          assetName={asset.assetName}
        />
      )}
    </div>
  );
};

export default WebQRScanner;