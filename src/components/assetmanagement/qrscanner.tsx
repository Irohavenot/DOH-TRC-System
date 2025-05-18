import {  useRef, useState } from "react";
import "../../assets/scanqr.css";

const WebQRScanner = () => {
  const [result, setResult] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const assetDetails = {
    assetId: "12345",
    title: "Printer",
    category: "Electronics",
    status: "Active",
    assignedTo: "John Doe",
    purchaseDate: "2023-04-21",
    serialNumber: "SN123456",
    licenseType: "OEM",
    expirationDate: "2025-04-21",
    imageUrl: "/printer.jpg",
  };

  const simulateCameraScan = async () => {
    setResult("");
    setCameraActive(true);
    setImagePreviewUrl(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      streamRef.current = stream;

      setTimeout(() => {
        setResult("Simulated QR Code from Camera");
        setShowModal(true);
        stopCamera();
      }, 2000);
    } catch (err) {
      console.error("Camera access failed:", err);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);
      setCameraActive(false); // Ensure camera is off

      // Simulate scan after 2 seconds
      setTimeout(() => {
        setResult("Simulated QR Code from Uploaded Image");
        setShowModal(true);
        setImagePreviewUrl(null); // Remove preview after modal opens
      }, 2000);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <div className="scanqr-container">
      <h2 className="scanqr-title">QR Scanner</h2>
      <p className="scanqr-instructions">Click the button below to open the camera or upload an image.</p>
      <div className="scanqr-buttons">
        <button className="scanqr-scan-btn" onClick={simulateCameraScan}>
          Open Camera (Simulated)
        </button>

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

      {result && <p className="scanqr-result">Scan Result: {result}</p>}

      {showModal && (
        <div className="scanqr-modal-backdrop" onClick={handleCloseModal}>
          <div className="scanqr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="scanqr-modal-content">
              <div className="scanqr-modal-image">
                <img src={assetDetails.imageUrl} alt="Asset" />
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
          <tr><td><strong>Asset ID:</strong></td><td>12345</td></tr>
          <tr><td><strong>Asset Name:</strong></td><td>Printer</td></tr>
          <tr><td><strong>Category:</strong></td><td>Laptop</td></tr>
          <tr><td><strong>Status:</strong></td><td>Active</td></tr>
          <tr><td><strong>Assigned Personnel:</strong></td><td>John Doe</td></tr>
          <tr><td><strong>Purchase Date:</strong></td><td>2023-04-21</td></tr>
          <tr><td><strong>Serial Number:</strong></td><td>SN123456</td></tr>
          <tr><td><strong>License Type:</strong></td><td>OEM</td></tr>
          <tr><td><strong>Expiration Date:</strong></td><td>2025-04-21</td></tr>
        </tbody>
      </table>
                <button className="scanqr-close-btn" onClick={handleCloseModal}>Close</button>
                <button className="scanqr-edit-btn">Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebQRScanner;
