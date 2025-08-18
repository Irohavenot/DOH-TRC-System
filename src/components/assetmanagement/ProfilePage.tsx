import React, { useEffect, useState } from "react";
import "../../assets/profile.css";
import { auth, db } from "../../firebase/firebase";
import { doc, setDoc, getDocs, getDoc, updateDoc,query, where, collection } from "firebase/firestore";
import { toast } from "react-toastify";

// generate 6-digit code
const generateVerificationCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const ProfilePage = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [verificationAction, setVerificationAction] = useState<null | "disable" | "edit">(null);
  const [enteredCode, setEnteredCode] = useState("");
  const [profileImage, setProfileImage] = useState("/user.png");

  const [formData, setFormData] = useState({
    Username: "",
    FirstName: "",
    LastName: "",
    MiddleInitial: "",
    Email: "",
    Position: "",
    Department: "",
    Contact: "",
    Address: "",
    Status: "",
  });

  // 🔹 Load user profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!auth.currentUser) return;

      try {
        // 🔎 Query Firestore by email instead of UID
        const q = query(
          collection(db, "IT_Supply_Users"),
          where("Email", "==", auth.currentUser.email)
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const data = userDoc.data();

          console.log("✅ Found user by email:", data);

          setFormData((prev: any) => ({ ...prev, ...data }));

          if (data.IDPictureBase64) {
            setProfileImage(data.IDPictureBase64);
          }
        } else {
          console.warn("⚠️ No document found for email:", auth.currentUser.email);
        }
      } catch (err: any) {
        console.error("❌ Error fetching profile:", err.message);
        toast.error("Failed to fetch profile data.");
      }
    };

    fetchUserProfile();
  }, []);

  // 📸 change profile photo
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 📝 Edit mode
  const handleEdit = () => setIsEditing(true);

  // 📩 Send code when applying changes
  const handleApplyChanges = async () => {
    setIsEditing(false);
    await sendVerification("edit");
  };

  // 📩 Send code when disabling
  const handleDisable = async () => {
    setShowDisableConfirm(false);
    await sendVerification("disable");
  };

  // 🔹 Send verification code
  const sendVerification = async (action: "edit" | "disable") => {
    try {
      if (!auth.currentUser) {
        toast.error("User not logged in.");
        return;
      }

      const code = generateVerificationCode();
      await setDoc(doc(db, "VerificationCodes", auth.currentUser.uid), {
        code,
        createdAt: Date.now(),
        email: formData.Email,
      });

      setVerificationAction(action);
      setShowVerificationPopup(true);

      // ⚠️ DEMO ONLY: show code in alert (remove in production!)
      alert(`Verification code for ${formData.Email}: ${code}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to send verification code.");
    }
  };

  // 🔹 Confirm verification
  const handleConfirmCode = async () => {
    if (!auth.currentUser) return;

    const snap = await getDoc(doc(db, "VerificationCodes", auth.currentUser.uid));
    if (!snap.exists()) {
      toast.error("No code found. Please resend.");
      return;
    }

    const { code } = snap.data();
    if (enteredCode !== code) {
      toast.error("Invalid code.");
      return;
    }

    // ✅ Success — do the action
    if (verificationAction === "edit") {
      try {
        await updateDoc(doc(db, "IT_Supply_Users", auth.currentUser.uid), {
          ...formData,
          IDPictureBase64: profileImage,
        });
        toast.success("Profile updated successfully!");
      } catch (err) {
        console.error(err);
        toast.error("Failed to update profile.");
      }
    } else if (verificationAction === "disable") {
      try {
        await updateDoc(doc(db, "IT_Supply_Users", auth.currentUser.uid), {
          Status: "disabled",
        });
        toast.success("Account disabled.");
      } catch (err) {
        console.error(err);
        toast.error("Failed to disable account.");
      }
    }

    setShowVerificationPopup(false);
    setEnteredCode("");
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-img-wrapper">
          <img src={profileImage} alt="Profile" className="profile-img" />
          {isEditing && (
            <>
              <input
                type="file"
                id="profile-photo"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePhotoChange}
              />
              <label htmlFor="profile-photo" className="profile-change-photo-btn">
                Change Photo
              </label>
            </>
          )}
        </div>

        <h2>
          {formData.FirstName} {formData.MiddleInitial} {formData.LastName}
        </h2>
        <p className="profile-username">@{formData.Username}</p>

        <label className="profile-label">Position</label>
        {isEditing ? (
          <input
            type="text"
            name="Position"
            value={formData.Position}
            onChange={handleChange}
            className="profile-input"
          />
        ) : (
          <p className="profile-position">{formData.Position}</p>
        )}

        <div className="profile-details">
          <label className="profile-label">Email:</label>
          <p>{formData.Email}</p>

          <label className="profile-label">Contact:</label>
          {isEditing ? (
            <input
              name="Contact"
              value={formData.Contact}
              onChange={handleChange}
              className="profile-input"
            />
          ) : (
            <p>{formData.Contact}</p>
          )}

          <label className="profile-label">Address:</label>
          {isEditing ? (
            <input
              name="Address"
              value={formData.Address}
              onChange={handleChange}
              className="profile-input"
            />
          ) : (
            <p>{formData.Address}</p>
          )}

          <label className="profile-label">Department</label>
          {isEditing ? (
            <input
              type="text"
              name="Department"
              value={formData.Department}
              onChange={handleChange}
              className="profile-input"
            />
          ) : (
            <p>{formData.Department}</p>
          )}
        </div>

        <div className="profile-actions">
          {isEditing ? (
            <button className="profile-apply-btn" onClick={handleApplyChanges}>
              Apply Changes
            </button>
          ) : (
            <>
              <button className="profile-edit-btn" onClick={handleEdit}>
                Edit Details
              </button>
              <button className="profile-disable-btn" onClick={() => setShowDisableConfirm(true)}>
                Disable Account
              </button>
            </>
          )}
        </div>
      </div>

      {/* Disable Confirmation Modal */}
      {showDisableConfirm && (
        <div className="profile-modal-backdrop" onClick={() => setShowDisableConfirm(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Are you sure?</h3>
            <p>Are you sure you want to disable your account?</p>
            <div className="profile-modal-buttons">
              <button className="profile-confirm-btn" onClick={handleDisable}>
                Yes, Disable
              </button>
              <button className="profile-cancel-btn" onClick={() => setShowDisableConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {showVerificationPopup && (
        <div className="profile-modal-backdrop" onClick={() => setShowVerificationPopup(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Enter 6-digit Code</h3>
            <p>
              We sent a code to <strong>{formData.Email}</strong>
            </p>
            <input
              className="profile-verification-input"
              maxLength={6}
              placeholder="______"
              value={enteredCode}
              onChange={(e) => setEnteredCode(e.target.value)}
            />
            <button className="profile-confirm-btn" onClick={handleConfirmCode}>
              Confirm
            </button>
            <p className="profile-resend-text">Didn’t receive a code?</p>
            <button
              className="profile-resend-btn"
              onClick={() => sendVerification(verificationAction!)}
            >
              Resend Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
