import {  useRef, useState } from "react";
import "../../assets/scanqr.css";
import React from "react";
const ScanQr = () => {
  interface Card {
    title: string;
    team: string;
    timeLeft: string;
    progress: number;
    iconClass: string;
  }
  const [result, setResult] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [selectedCard, setSelectedCard] = React.useState<Card | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [openCardOptionsId, setOpenCardOptionsId] = useState<number | null>(null);
  const handleReportClick = (index: number) => {
  const card = cards[index];
  setSelectedCard(card);
  setShowReportModal(true);     
  setOpenCardOptionsId(null);    
};
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
    const [cards, setCards] = useState<Card[]>([
      { title: "Router - Cisco 2901", team: "Medical Components", timeLeft: "No Expiration", progress: 34, iconClass: "icon-blue" },
      { title: "UI Development Server", team: "Core UI", timeLeft: "2 Years Left", progress: 76, iconClass: "icon-green" },
      { title: "MS Office 365 License", team: "Microsoft Office", timeLeft: "2 Days Left", progress: 4, iconClass: "icon-orange" },
      { title: "Norton Security Suite", team: "Anti-Virus", timeLeft: "1 Month Left", progress: 90, iconClass: "icon-orange" },
      { title: "Dell OptiPlex 7090", team: "Computer", timeLeft: "3 Weeks Left", progress: 65, iconClass: "icon-red" },
      { title: "HP LaserJet M404", team: "Printer", timeLeft: "2 Month Left", progress: 96, iconClass: "icon-orange" },
      { title: "Solar Panel Inverter", team: "Solar Electronics", timeLeft: "No Expiration", progress: 24, iconClass: "icon-blue" },
      { title: "Arduino IoT Kit", team: "Electronics", timeLeft: "1 Weeks Left", progress: 70, iconClass: "icon-red" },
    ]);

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
      <div className="scanqr-modal-buttons-container">
                <button className="scanqr-close-btn" onClick={handleCloseModal}><i className="fas fa-xmark"></i>  Close</button>
                <button
  className="scanqr-edit-btn"
  onClick={() => {
    setSelectedCard({
      title: assetDetails.title,
      team: assetDetails.category,
      timeLeft: assetDetails.expirationDate,
      progress: 100, // You can calculate this or keep a placeholder
      iconClass: "icon-blue", // Optional, if used elsewhere
    });
    setShowReportModal(true);
  }}
><i className="fas fa-edit"></i>  Report
</button>
</div>
              </div>
            </div>
          </div>
        </div>
      )}
{showReportModal && selectedCard && (
  <div className="modal-backdrops" onClick={() => setShowReportModal(false)}>
    <div className="scanqr-modals" onClick={(e) => e.stopPropagation()}>
      <div className="scanqr-modal-detailed">
        <h2>Submit Report</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert('Report submitted!');
            setShowReportModal(false);
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <label>Asset Name:</label><br />
            <input
              type="text"
              value={selectedCard.title}
              readOnly
              className="readonly-input"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>Issue Type:</label><br />
            <select required defaultValue="">
              <option value="" disabled>Select an issue</option>
              <option value="Not Working">Not Working</option>
              <option value="Hardware Issue">Hardware Issue</option>
              <option value="Software Issue">Software Issue</option>
            </select>
          </div>

          <div>
            <label>Description:</label><br />
            <textarea
              rows={5}
              cols={70}
              required
              placeholder="Describe the issue in detail..."
            />
          </div>

          <div className="buttons-containers">
            <button
              type="button"
              className="close-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowReportModal(false);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="submit-report-btn">Submit</button>
            
            
          </div>
        </form>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default ScanQr;
