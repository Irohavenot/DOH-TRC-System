import { useEffect, useRef, useState } from 'react';
import QrCreator from 'qr-creator';
import jsPDF from 'jspdf';
import "../../assets/qrcodegenerator.css";
import { useLocation } from "react-router-dom";
import { db, auth } from '../../firebase/firebase';
import { addDoc, collection, getDocs, serverTimestamp, query, where } from 'firebase/firestore';

const QRCodeGenerator = () => {
  const location = useLocation();
  const categoryFromState = location.state?.category || "";
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [itUsers, setItUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<string[]>([]); // 🔹 category state

  const [assetDetails, setAssetDetails] = useState({
    assetId: '',
    assetName: '',
    category: categoryFromState,
    status: '',
    personnel: '',
    purchaseDate: '',
    serialNo: '',
    licenseType: '',
    expirationDate: '',
    generateQR: true,
  });

  interface User {
    id: string;
    FirstName: string;
    MiddleInitial?: string;
    LastName: string;
    Department?: string;
    fullName?: string;
  }

  // 🔹 Generate QR function
  const generateQR = (value: string, container: HTMLElement) => {
    container.innerHTML = '';
    QrCreator.render(
      {
        text: value,
        radius: 0.45,
        ecLevel: 'H',
        fill: '#162a37',
        background: null,
        size: 250,
      },
      container
    );
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setAssetDetails((prev) => ({ ...prev, [name]: value }));
  };

  // 🔹 Fetch IT Supply Users
  useEffect(() => {
    const fetchITUsers = async () => {
      try {
        const q = query(
          collection(db, "IT_Supply_Users"),
          where("Department", "==", "Supply Unit")
        );
        const snapshot = await getDocs(q);

        const users = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
            fullName: `${data.FirstName} ${data.MiddleInitial ? data.MiddleInitial + "." : ""} ${data.LastName}`,
          };
        });

        setItUsers(users);
      } catch (error) {
        console.error("Error fetching IT Supply users:", error);
      }
    };

    fetchITUsers();
  }, []);

  // 🔹 Fetch Asset Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snapshot = await getDocs(collection(db, "Asset_Categories"));
        const categoryList: string[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.Category_Name) {
            categoryList.push(data.Category_Name);
          }
        });
        setCategories(categoryList);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // 🔹 Generate Asset ID
  const generateAssetId = () => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `ASSET-${timestamp}-${randomStr}`;
  };

  // 🔹 Add Asset
const handleAddAsset = async () => {
  try {
    const assetId = generateAssetId();
    let qrDataUrl: string | null = null;

    // ✅ Create a URL instead of JSON
    const assetUrl = `http://localhost:5173/dashboard/${assetId}`;

    if (assetDetails.generateQR) {
      qrDataUrl = await generateQRDataUrl(assetUrl); // QR encodes the URL
      setQrValue(assetUrl);
      setShowModal(true);

      setTimeout(() => {
        if (qrRef.current) generateQR(assetUrl, qrRef.current);
      }, 100);
    }

    // Save to Firestore
    await addDoc(collection(db, "IT_Assets"), {
      ...assetDetails,
      assetId,
      createdBy: auth.currentUser?.email || null,
      createdAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email || null,
      updatedAt: serverTimestamp(),
      image: imagePreview || null,
      qrCode: qrDataUrl, // ✅ stores QR image for reference
      assetUrl,          // ✅ store URL for direct linking
    });

    console.log("✅ Asset added successfully");
  } catch (err: any) {
    console.error("❌ Error adding asset:", err.message);
  }
};

const generateQRDataUrl = (value: string): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");

    QrCreator.render(
      {
        text: value,
        radius: 0.45,
        ecLevel: "H",
        fill: "#162a37",
        background: null,
        size: 250,
      },
      canvas
    );

    resolve(canvas.toDataURL("image/png"));
  });
};
  // 🔹 Print QR
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && qrRef.current) {
      const canvas = qrRef.current.querySelector('canvas');
      const qrDataUrl = canvas?.toDataURL() || '';

      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR</title>
            <style>
              body {
                text-align: center;
                font-family: sans-serif;
                padding: 2rem;
              }
              .qr-wrapper {
                text-align: center;
                border: 1px solid #ddd;
                padding: 1rem;
                border-radius: 8px;
              }
              .qr-container {
                margin: 1rem auto;
              }
              .details-container {
                display: flex;
                justify-content: space-between;
                width: 250px;
                margin: 1rem auto 0;
                font-size: 14px;
                font-weight: bold;
              }
              .details-container p {
                margin: 0;
                width: 49%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            </style>
          </head>
          <body>
            <div class="qr-wrapper">
              <div class="qr-container">
                <img src="${qrDataUrl}" alt="QR Code" />
              </div>
              <div class="details-container">
                <p><strong>Asset:</strong> ${assetDetails.assetName || 'Printer'}</p>
                <p><strong>Serial:</strong> ${assetDetails.serialNo || '7778810SXL'}</p>
              </div>
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  // 🔹 Download PDF
  const handleDownload = () => {
    const doc = new jsPDF();
    const canvas = qrRef.current?.querySelector('canvas');
    const qrDataUrl = canvas?.toDataURL() || '';

    const dohLogoUrl = '/dohlogo1.png';
    doc.addImage(dohLogoUrl, 'PNG', 90, 10, 30, 30);
    doc.setFontSize(10);
    doc.text('Department of Health', 105, 45, { align: 'center' });

    const qrWidth = 40;
    const qrHeight = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const qrX = (pageWidth - qrWidth) / 2;
    doc.addImage(qrDataUrl, 'PNG', qrX, 50, qrWidth, qrHeight);

    const detailsY = 50 + qrHeight + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const assetText = `Asset: ${assetDetails.assetName || 'Printer'}`;
    const serialText = `Serial: ${assetDetails.serialNo || '7778810SXL'}`;
    const assetTextWidth = doc.getTextWidth(assetText);
    const serialTextWidth = doc.getTextWidth(serialText);
    const totalWidth = assetTextWidth + serialTextWidth + 10;
    const startX = (pageWidth - totalWidth) / 2;

    doc.text(assetText, startX, detailsY);
    doc.text(serialText, startX + assetTextWidth + 10, detailsY);

    doc.save('asset-qr-code.pdf');
  };

  return (
    <div className="qr-generator-container">
      <div className="asset-form">
        <h3>
          Asset Details <br /> ({assetDetails.category || "Select Category"})
        </h3>

        {imagePreview && (
          <div className="image-preview">
            <img src={imagePreview} alt="Uploaded" />
          </div>
        )}

        <div className="form-grid">
          {/* Asset ID */}
          <div className="form-field">
            <label htmlFor="assetId">Asset ID</label>
            <input
              type="text"
              id="assetId"
              name="assetId"
              placeholder="(Auto Generated)"
              value={assetDetails.assetId || ""}
              readOnly
              className="cursor-not-allowed bg-gray-100"
            />
          </div>

          {/* Asset Name */}
          <div className="form-field">
            <label htmlFor="assetName">Asset Name</label>
            <input
              type="text"
              id="assetName"
              name="assetName"
              placeholder="Enter asset name"
              onChange={handleInputChange}
            />
          </div>

          {/* Category Dropdown */}
          <div className="form-field">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={assetDetails.category}
              onChange={handleInputChange}
            >
              <option value="">-- Select a Category --</option>
              {categories.map((category, index) => (
                <option key={index} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="form-field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              onChange={handleInputChange}
              defaultValue=""
            >
              <option value="" disabled hidden>
                Select Status
              </option>
              <option value="Functional">Functional</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Defective">Defective</option>
              <option value="Unserviceable">Unserviceable</option>
            </select>
          </div>

          {/* Assigned Personnel */}
          <div className="form-field">
            <label htmlFor="personnel">Assigned Personnel</label>
            <select
              id="personnel"
              name="personnel"
              value={assetDetails.personnel}
              onChange={handleInputChange}
            >
              <option value="">-- Select IT Supply User --</option>
              {itUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Purchase Date */}
          <div className="form-field">
            <label htmlFor="purchaseDate">Purchase Date</label>
            <input
              type="date"
              id="purchaseDate"
              name="purchaseDate"
              onChange={handleInputChange}
            />
          </div>

          {/* Serial Number */}
          <div className="form-field">
            <label htmlFor="serialNo">Serial No.</label>
            <input
              type="text"
              id="serialNo"
              name="serialNo"
              placeholder="Enter serial number"
              onChange={handleInputChange}
            />
          </div>

          {/* License Type */}
          <div className="form-field">
            <label htmlFor="licenseType">License Type</label>
            <select
              id="licenseType"
              name="licenseType"
              value={assetDetails.licenseType || ""}
              onChange={handleInputChange}
            >
              <option value="" disabled>
                -- Select License Type --
              </option>
              <option value="Perpetual">Perpetual</option>
              <option value="Subscription">Subscription</option>
              <option value="Trial">Trial</option>
              <option value="OEM">OEM</option>
              <option value="Open Source">Open Source</option>
            </select>
          </div>

          {/* Expiration Date */}
          <div className="form-field">
            <label htmlFor="expirationDate">Expiration Date</label>
            <input
              type="date"
              id="expirationDate"
              name="expirationDate"
              onChange={handleInputChange}
            />
          </div>

          {/* Upload Image */}
          <div className="form-field">
            <label htmlFor="assetImage">Upload Image</label>
            <input
              type="file"
              id="assetImage"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setImagePreview(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </div>
        {/* Questio to whether generate a QR or not */}
          <div className="form-field">
              <label htmlFor="generateQR">Generate QR Code?</label>
              <input
                type="checkbox"
                id="generateQR"
                name="generateQR"
                checked={assetDetails.generateQR || false}
                onChange={(e) =>
                  setAssetDetails((prev) => ({ ...prev, generateQR: e.target.checked }))
                }
              />
            </div>
        </div>

        <button className="add-btn" onClick={handleAddAsset}>
          Add Asset
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Generated QR Code</h3>
            <div ref={qrRef} className="qr-display" />

            <div className="button-group">
              <button onClick={handlePrint} className="print-btn">Print</button>
              <button onClick={handleDownload} className="download-btn">Download</button>
              <button onClick={() => setShowModal(false)} className="close-btn">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRCodeGenerator;
