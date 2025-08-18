import { useEffect, useRef, useState } from 'react';
import QrCreator from 'qr-creator';
import jsPDF from 'jspdf';
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
  });
  interface User {
  id: string;
  FirstName: string;
  MiddleInitial?: string;
  LastName: string;
  Department?: string;
  fullName?: string; // optional, since we build it
}
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


 useEffect(() => {
  const fetchITUsers = async () => {
    try {
      const q = query(collection(db, "IT_Supply_Users"), where("Department", "==", "Supply Unit"));
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

  const generateAssetId = () => {
    const timestamp = Date.now().toString(36); // base36 for shorter length
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `ASSET-${timestamp}-${randomStr}`;
  };
const handleAddAsset = async () => {
  try {
    const assetId = generateAssetId(); // 🔑 auto-generate
    const compiledDetails = JSON.stringify({ ...assetDetails, assetId }, null, 2);
    setQrValue(compiledDetails);
    setShowModal(true);

    setTimeout(() => {
      if (qrRef.current) generateQR(compiledDetails, qrRef.current);
    }, 100);

    // 🔹 Save to Firestore
    await addDoc(collection(db, 'IT_Assets'), {
      ...assetDetails,
      assetId, // <-- unique ID
      createdBy: auth.currentUser?.email || null, // better than UID
      createdAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email || null,
      updatedAt: serverTimestamp(),
      image: imagePreview || null,
    });

    console.log('✅ Asset added successfully');
  } catch (err: any) {
    console.error('❌ Error adding asset:', err.message);
  }
};


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
          <input
            type="text"
            name="assetId"
            placeholder="Asset ID (Auto Generated)"
            value={assetDetails.assetId || ""}
            readOnly
            className="cursor-not-allowed bg-gray-100"
          />
          <input type="text" name="assetName" placeholder="Asset Name" onChange={handleInputChange} />
          <input
                type="text"
                name="category"
                placeholder="Category"
                value={assetDetails.category} // ✅ prefilled
                onChange={handleInputChange}
              />
          <select name="status" onChange={handleInputChange} defaultValue="">
            <option value="" disabled hidden>Status</option>
            <option value="Optimal">Optimal</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Damaged">Damaged</option>
          </select>


          <div>
                <label htmlFor="personnel">Assigned Personnel:</label>
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
          <input type="date" name="purchaseDate" placeholder="Purchase Date" onChange={handleInputChange} />
          <input type="text" name="serialNo" placeholder="Serial No." onChange={handleInputChange} />
          <input type="text" name="licenseType" placeholder="License Type" onChange={handleInputChange} />
          <input type="date" name="expirationDate" placeholder="Expiration Date" onChange={handleInputChange} />
          <input
                type="file"
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
        <button className="add-btn" onClick={handleAddAsset}>Add Asset</button>
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

      <style>{`
        .qr-generator-container {
          border: 1px solid #ccc;
          border-radius: 12px;
          padding: 2rem;
          margin-top: 2rem;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
          background: #f9f9f9;
          align-items: center;
        }

        .asset-form {
          margin-top: 1rem;
        }

        .asset-form h3 {
          display: flex;
          justify-content: center;
          margin-bottom: 1rem;
          text-align: center;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1rem;
        }
        .image-preview {
            display: flex;
            margin-bottom: 1rem;
            justify-content: center;
            max-width: 75vh;
            align-content: center;
            flex-wrap: nowrap;
          }

          .image-preview img {
            max-width: 100%;
            max-height: 150px;
            border-radius: 8px;
            object-fit: contain;
            margin-left: 200px;
          }

        .form-grid input {
          padding: 0.6rem;
          border: 1px solid #ccc;
          border-radius: 6px;
        }
        .form-grid select {
          border: 1px solid #ccc;
          border-radius: 6px;
          background-color: #fff;
          max-height: 5vh;
          box-shadow: black;
        }

        .add-btn {
          display: block;
          margin: 2rem auto 0;
          padding: 0.6rem 2rem;
          background-color:#004d40;
          color: white;
          font-weight: bold;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .add-btn:hover {
          background-color: #01332b;
        }

      /* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* Modal Box */
.modal {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  width: 350px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* QR Code Display Area */
.qr-display {
  margin: 1.5rem auto;
}

.button-group {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center; /* center buttons horizontally */
  gap: 1rem;
  
  /* Optional: center the whole button-group container horizontally */
  margin-left: auto;
  margin-right: auto;
  width: fit-content; /* para mo-fit siya sa buttons */
}



/* Common Button Styles */
.print-btn,
.close-btn,
.download-btn {
  width: 250px; /* fixed equal width */
  padding: 0.75rem 0;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  font-size: 15px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  box-sizing: border-box;
  text-align: center;
}

/* Print Button */
.print-btn {
  background-color: #043150;
  color: white;
}
.print-btn:hover {
  background-color: #021727;
}

/* Close Button */
.close-btn {
  background-color: #a80404;
  color: white;
}
.close-btn:hover {
  background-color: #6b0202;
}

/* Download Button */
.download-btn {
  background-color: #004d40;
  color: white;
}
.download-btn:hover {
  background-color: #00241e;
}


      `}</style>
    </div>
  );
};

export default QRCodeGenerator;
