// ProfilePage.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaCamera } from "react-icons/fa";
import { toast } from "react-toastify";

import { auth, db } from "../../firebase/firebase"; // adjust if needed
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  setDoc,
} from "firebase/firestore";
import {
  updateProfile,
  updateEmail,
  reauthenticateWithPopup,
  GoogleAuthProvider,
  User,
} from "firebase/auth";

import "../../assets/profile.css";

interface Province {
  name: string;
  code: string;
}
interface City {
  name: string;
  code: string;
  provinceCode: string;
  zipcode?: string;
}
interface Barangay {
  name: string;
  code: string;
  cityCode: string;
  zipcode?: string;
}

interface FormData {
  username: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  department: string;
  contactNumber: string;
  address: string;

  gender: string;
  birthdate: string;
  age: string;

  houseNo: string;
  street: string;
  province: string;
  provinceCode: string;
  municipality: string;
  municipalityCode: string;
  barangay: string;

  status?: string;
  idPictureBase64?: string | null;
}

const generateVerificationCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const ProfilePage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    username: "",
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    department: "",
    contactNumber: "",
    address: "",

    gender: "",
    birthdate: "",
    age: "0",

    houseNo: "",
    street: "",
    province: "",
    provinceCode: "",
    municipality: "",
    municipalityCode: "",
    barangay: "",

    status: "active",
    idPictureBase64: null,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string>("user.png");
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);

  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [verificationAction, setVerificationAction] = useState<"edit" | "disable" | null>(null);
  const [enteredCode, setEnteredCode] = useState("");

  // simple cache
  const getCached = <T,>(key: string): T | null => {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  };
  const setCached = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {}
  };

  // ---------- load profile ----------
  useEffect(() => {
    let unsub = () => {};
    const fetchProfile = async (user: User) => {
      setLoading(true);
      try {
        const uidDocRef = doc(db, "IT_Supply_Users", user.uid);
        const docSnap = await getDoc(uidDocRef);

        if (docSnap.exists()) {
          mapFirestoreToForm(docSnap.data());
        } else if (user.email) {
          const q = query(collection(db, "IT_Supply_Users"), where("Email", "==", user.email));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            mapFirestoreToForm(qSnap.docs[0].data());
          } else {
            toast.info("No profile document found for this user.");
          }
        } else {
          toast.error("User email not available; cannot find profile.");
        }

        if (user.photoURL && !profileImage) {
          setProfileImage(user.photoURL);
        }
      } catch (err: any) {
        console.error("fetchProfile error:", err);
        toast.error("Failed to fetch profile data.");
      } finally {
        setLoading(false);
      }
    };

    const user = auth.currentUser;
    if (user) fetchProfile(user);
    else {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const u = auth.currentUser;
        if (u || attempts > 20) {
          clearInterval(interval);
          if (u) fetchProfile(u);
        }
      }, 250);
      unsub = () => clearInterval(interval);
    }
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapFirestoreToForm = (data: any) => {
    setFormData((prev) => ({
      ...prev,
      username: data.Username || data.username || prev.username || "",
      firstName: data.FirstName || data.firstName || "",
      middleName: data.MiddleInitial || data.middleName || "",
      lastName: data.LastName || data.lastName || "",
      email: data.Email || data.email || "",
      department: data.Department || data.department || "",
      contactNumber: data.Contact || data.contactNumber || "",
      address: data.Address || "",

      gender: data.gender || "",
      birthdate: data.birthdate || "",
      age: data.age ? String(data.age) : prev.age || "0",

      houseNo: data.houseNo || "",
      street: data.street || "",
      province: data.province || "",
      provinceCode: data.provinceCode || "",
      municipality: data.municipality || "",
      municipalityCode: data.municipalityCode || "",
      barangay: data.barangay || "",

      status: data.status || data.Status || prev.status || "active",
      idPictureBase64: data.IDPictureBase64 || data.idPictureBase64 || prev.idPictureBase64 || null,
    }));

    if (data.IDPictureBase64) {
      setProfileImage(data.IDPictureBase64);
    } else if (data.idPictureBase64) {
      setProfileImage(data.idPictureBase64);
    }
  };

  // ---------- address lists ----------
  useEffect(() => {
    const fetchProvincesAndCities = async () => {
      setLoading(true);
      try {
        let provs = getCached<Province[]>("psgc_provinces") || [];
        let cits = getCached<City[]>("psgc_cities") || [];

        if (provs.length === 0) {
          const resp = await axios.get("https://psgc.gitlab.io/api/provinces");
          if (Array.isArray(resp.data)) {
            provs = resp.data
              .filter((p: any) => p.name && p.code)
              .map((p: any) => ({ name: p.name.trim(), code: String(p.code).trim() }))
              .sort((a: Province, b: Province) => a.name.localeCompare(b.name));
            setCached("psgc_provinces", provs);
          }
        }
        if (cits.length === 0) {
          const resp2 = await axios.get("https://psgc.gitlab.io/api/cities-municipalities");
          if (Array.isArray(resp2.data)) {
            cits = resp2.data
              .filter((c: any) => c.name && c.code && c.provinceCode)
              .map((c: any) => ({
                name: c.name.trim(),
                code: String(c.code).trim(),
                provinceCode: String(c.provinceCode).trim(),
                zipcode: c.zipcode || c.postal_code || undefined,
              }))
              .sort((a: City, b: City) => a.name.localeCompare(b.name));
            setCached("psgc_cities", cits);
          }
        }

        setProvinces(provs);
        setCities(cits);
      } catch (err: any) {
        console.error("Location fetch error", err);
        toast.error("Failed to load provinces/cities.");
      } finally {
        setLoading(false);
      }
    };

    fetchProvincesAndCities();
  }, []);

  // barangays
  useEffect(() => {
    const fetchBarangays = async (municipalityCode?: string) => {
      if (!municipalityCode) {
        setBarangays([]);
        return;
      }
      setLoading(true);
      try {
        const cacheKey = `psgc_barangays_${municipalityCode}`;
        let brgys = getCached<Barangay[]>(cacheKey) || [];
        if (brgys.length === 0) {
          const res = await axios.get(
            `https://psgc.gitlab.io/api/cities-municipalities/${municipalityCode}/barangays`
          );
          if (Array.isArray(res.data)) {
            brgys = res.data
              .filter((b: any) => b.name && b.code)
              .map((b: any) => ({
                name: b.name.trim(),
                code: String(b.code).trim(),
                cityCode: municipalityCode,
                zipcode: b.zipcode || b.postal_code || undefined,
              }))
              .sort((a: Barangay, b: Barangay) => a.name.localeCompare(b.name));
            setCached(cacheKey, brgys);
          }
        }
        setBarangays(brgys);
      } catch (err: any) {
        console.error("Barangay fetch error", err);
        toast.error("Failed to load barangays for selected municipality.");
        setBarangays([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBarangays(formData.municipalityCode);
  }, [formData.municipalityCode]);

  // ---------- auto-age ----------
  useEffect(() => {
    if (!formData.birthdate) return;
    const bd = new Date(formData.birthdate);
    if (isNaN(bd.getTime())) {
      setFormData((p) => ({ ...p, age: "0" }));
      return;
    }
    const today = new Date();
    let age = today.getFullYear() - bd.getFullYear();
    const hadBirthdayThisYear =
      today.getMonth() > bd.getMonth() || (today.getMonth() === bd.getMonth() && today.getDate() >= bd.getDate());
    if (!hadBirthdayThisYear) age--;
    setFormData((p) => ({ ...p, age: age > 0 ? String(age) : "0" }));
  }, [formData.birthdate]);

  // ---------- input handlers ----------
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "provinceCode") {
      const prov = provinces.find((p) => p.code === value);
      setFormData((p) => ({
        ...p,
        provinceCode: value,
        province: prov?.name || "",
        municipality: "",
        municipalityCode: "",
        barangay: "",
      }));
      return;
    }

    if (name === "municipalityCode") {
      const city = cities.find((c) => c.code === value);
      setFormData((p) => ({
        ...p,
        municipalityCode: value,
        municipality: city?.name || "",
        barangay: "",
      }));
      return;
    }

    setFormData((p) => ({ ...p, [name]: value }));
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size must be under 2MB.");
        return;
      }
      if (!file.type.match(/image\/(jpeg|png|jpg)/)) {
        toast.error("Only JPEG/PNG allowed.");
        return;
      }
      try {
        const base64 = await fileToBase64(file);
        setAvatarBase64(base64);
        setProfileImage(base64);
        setFormData((p) => ({ ...p, idPictureBase64: base64 }));
      } catch (err: any) {
        console.error("Image processing error", err);
        toast.error("Failed to process image.");
      }
    }
  };

  // ---------- validation (updated: no zipcode) ----------
  const validateForm = (): boolean => {
    const errs: string[] = [];
    if (!formData.lastName) errs.push("Last name is required.");
    if (!formData.firstName) errs.push("First name is required.");
    if (!formData.email) errs.push("Email is required.");
    else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) errs.push("Invalid email format.");
    }
    if (!formData.birthdate) errs.push("Birthdate is required.");
    if (!formData.gender) errs.push("Gender is required.");
    if (!formData.provinceCode) errs.push("Province is required.");
    if (!formData.municipalityCode) errs.push("Municipality / City is required.");
    if (!formData.barangay) errs.push("Barangay is required.");
    if (!formData.contactNumber) errs.push("Contact number is required.");
    else {
      const contactRegex = /^\d{7,15}$/;
      if (!contactRegex.test(formData.contactNumber)) errs.push("Invalid contact number (7-15 digits).");
    }

    if (errs.length) {
      errs.forEach((m) => toast.error(m));
      return false;
    }
    return true;
  };

  // re-auth helper
  const reAuthenticateWithGoogle = async (): Promise<boolean> => {
    try {
      if (!auth.currentUser) throw new Error("No user signed in");
      const provider = new GoogleAuthProvider();
      await reauthenticateWithPopup(auth.currentUser, provider);
      toast.success("Re-authentication successful.");
      return true;
    } catch (err: any) {
      console.error("reauth error:", err);
      if (err.code === "auth/popup-closed-by-user") toast.error("Re-auth popup closed. Try again.");
      else toast.error("Re-authentication failed.");
      return false;
    }
  };

  // ---------- verification & save (no zipcode) ----------
  const sendVerification = async (action: "edit" | "disable") => {
    if (!auth.currentUser) {
      toast.error("Not signed in.");
      return;
    }
    try {
      const code = generateVerificationCode();
      await setDoc(doc(db, "VerificationCodes", auth.currentUser.uid), {
        code,
        createdAt: Date.now(),
        email: formData.email,
      });
      setVerificationAction(action);
      setShowVerificationPopup(true);
      alert(`Verification code: ${code}`);
    } catch (err: any) {
      console.error("sendVerification error:", err);
      toast.error("Failed to send verification.");
    }
  };

  const confirmVerificationAndApply = async () => {
    if (!auth.currentUser) return;
    try {
      const snap = await getDoc(doc(db, "VerificationCodes", auth.currentUser.uid));
      if (!snap.exists()) {
        toast.error("No verification code found. Try resending.");
        return;
      }
      const data: any = snap.data();
      if (enteredCode !== data.code) {
        toast.error("Invalid verification code.");
        return;
      }

      if (verificationAction === "edit") {
        await applyProfileChanges();
      } else if (verificationAction === "disable") {
        await updateDoc(doc(db, "IT_Supply_Users", auth.currentUser.uid), { status: "disabled" });
        toast.success("Account disabled.");
        setIsEditing(false);
      }
      setShowVerificationPopup(false);
      setEnteredCode("");
      setVerificationAction(null);
    } catch (err: any) {
      console.error("confirmVerification error:", err);
      toast.error("Verification failed.");
    }
  };

  const applyProfileChanges = async () => {
    if (!validateForm()) return;
    if (!auth.currentUser) {
      toast.error("No user signed in.");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      const isGoogleUser = user.providerData.some((p) => p.providerId === "google.com");

      if (formData.email && formData.email !== user.email) {
        try {
          if (isGoogleUser) {
            const ok = await reAuthenticateWithGoogle();
            if (!ok) {
              setLoading(false);
              return;
            }
          }
          await updateEmail(user, formData.email);
        } catch (emailErr: any) {
          if (emailErr.code === "auth/requires-recent-login") {
            const ok = await reAuthenticateWithGoogle();
            if (ok) await updateEmail(user, formData.email);
            else throw new Error("Re-auth required for email update.");
          } else {
            throw emailErr;
          }
        }
      }

      if (avatarBase64) {
        try {
          if (isGoogleUser) {
            const ok = await reAuthenticateWithGoogle();
            if (!ok) {
              setLoading(false);
              return;
            }
          }
          await updateProfile(user, { photoURL: avatarBase64 });
        } catch (profileErr: any) {
          if (profileErr.code === "auth/requires-recent-login") {
            const ok = await reAuthenticateWithGoogle();
            if (ok) await updateProfile(user, { photoURL: avatarBase64 });
            else throw new Error("Re-auth required for profile update.");
          } else {
            console.warn("updateProfile failed, continuing to Firestore update");
          }
        }
      }

      // Save to Firestore — IMPORTANT: do NOT overwrite Position here
      const userRef = doc(db, "IT_Supply_Users", user.uid);
      const payload: any = {
        Username: formData.username,
        FirstName: formData.firstName,
        MiddleInitial: formData.middleName,
        LastName: formData.lastName,
        Email: formData.email,
        Department: formData.department,
        Contact: formData.contactNumber,
        Address: formData.address,

        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        email: formData.email,
        gender: formData.gender,
        birthdate: formData.birthdate,
        age: formData.age,
        contactNumber: formData.contactNumber,

        houseNo: formData.houseNo,
        street: formData.street,
        province: formData.province,
        provinceCode: formData.provinceCode,
        municipality: formData.municipality,
        municipalityCode: formData.municipalityCode,
        barangay: formData.barangay,

        Status: formData.status || "active",
        IDPictureBase64: avatarBase64 || formData.idPictureBase64 || null,
      };

      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) await updateDoc(userRef, payload);
      else await setDoc(userRef, payload);

      toast.success("Profile saved.");
      setIsEditing(false);
    } catch (err: any) {
      console.error("applyProfileChanges error:", err);
      if (err.code === "auth/email-already-in-use") toast.error("Email already in use.");
      else if (err.code === "auth/invalid-email") toast.error("Invalid email.");
      else if (err.code === "firestore/permission-denied") toast.error("Insufficient permissions to update profile.");
      else toast.error("Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  // UI actions
  const handleEditClick = () => setIsEditing(true);
  const handleCancel = () => setIsEditing(false);
  const handleApplyClick = async () => {
    await applyProfileChanges();
  };
  const handleDisableRequest = async () => {
    await sendVerification("disable");
  };

  const filteredCities = cities.filter(
    (c) => c.provinceCode && formData.provinceCode && c.provinceCode.trim() === formData.provinceCode.trim()
  );

  // Combine address into a single string for view mode (no zipcode)
  const fullAddress = [
    formData.houseNo && formData.houseNo.trim(),
    formData.street && formData.street.trim(),
    formData.barangay && `Brgy. ${formData.barangay.trim()}`,
    formData.municipality && formData.municipality.trim(),
    formData.province && formData.province.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  // Single-line full name for view mode
  const fullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(" ");

  return (
    <div className="profile-page-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-img-wrapper">
            <img src={profileImage} alt="Profile" className="profile-img" />
            {isEditing && (
              <>
                <input id="profile-photo" type="file" accept="image/png, image/jpeg" style={{ display: "none" }} onChange={handlePhotoChange} disabled={loading} />
                <label htmlFor="profile-photo" className="profile-change-photo-btn">
                  <FaCamera /> Change Photo
                </label>
              </>
            )}
          </div>

                    <div className="profile-titleblock">
            <h2>{isEditing ? fullName || "No name" : fullName || "No name"}</h2>
            <p className="profile-username">{formData.username}</p>
            {!!formData.status && (
              <span
                className={
                  "profile-status-badge " +
                  (formData.status.toLowerCase() === "approved"
                    ? "active"
                    : formData.status.toLowerCase())
                }
              >
                {formData.status.toLowerCase() === "approved"
                  ? "Active"
                  : formData.status}
              </span>
            )}
          </div>
</div>

        <div className="profile-details">
        {/* Full name display (view) / separate inputs (edit) */}
            <label className="profile-label">Name</label>
            {isEditing ? (
              <div className="field-group">
                <label className="profile-label small">First Name</label>
                <input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="profile-input"
                  placeholder="First name"
                />

                <label className="profile-label small">Middle Name / Initial</label>
                <input
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  className="profile-input"
                  placeholder="Middle name / initial"
                />

                <label className="profile-label small">Last Name</label>
                <input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="profile-input"
                  placeholder="Last name"
                />
              </div>
            ) : (
              <p>{fullName || "Not Provided"}</p>
            )}


          {/* Username */}
          <label className="profile-label">Username</label>
          {isEditing ? <input name="username" value={formData.username} onChange={handleChange} className="profile-input" /> : <p>{formData.username}</p>}

          {/* Email */}
          <label className="profile-label">Email</label>
          {isEditing ? <input name="email" type="email" value={formData.email} onChange={handleChange} className="profile-input" /> : <p>{formData.email}</p>}

          {/* Gender */}
          <label className="profile-label">Gender</label>
          {isEditing ? (
            <select name="gender" value={formData.gender} onChange={handleChange} className="profile-input">
              <option value="">Select gender</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          ) : (
            <p>{formData.gender}</p>
          )}

          {/* Birthdate & Age */}
          <label className="profile-label">Birthdate</label>
          {isEditing ? <input name="birthdate" type="date" value={formData.birthdate} onChange={handleChange} className="profile-input" /> : <p>{formData.birthdate}</p>}

          <label className="profile-label">Age</label>
            {isEditing ? (
              <input name="age" type="number" value={formData.age} className="profile-input" disabled />
            ) : (
              <p>{formData.age}</p>
            )}

          {/* Contact */}
          <label className="profile-label">Contact Number</label>
          {isEditing ? <input name="contactNumber" value={formData.contactNumber} onChange={handleChange} className="profile-input" /> : <p>{formData.contactNumber || "Not Provided"}</p>}

          {/* Department */}
          <label className="profile-label">Department</label>
          {isEditing ? <input name="department" value={formData.department} onChange={handleChange} className="profile-input" /> : <p>{formData.department}</p>}

          {/* Address */}
          <label className="profile-label">Address</label>
                {isEditing ? (
                  <div className="field-group">
                    <label className="profile-label small">House No.</label>
                    <input name="houseNo" value={formData.houseNo} onChange={handleChange} className="profile-input" />

                    <label className="profile-label small">Street</label>
                    <input name="street" value={formData.street} onChange={handleChange} className="profile-input" />

                    <label className="profile-label small">Province</label>
                    <select name="provinceCode" value={formData.provinceCode} onChange={handleChange} className="profile-input">
                      <option value="">Select Province</option>
                      {provinces.map((p) => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>

                    <label className="profile-label small">Municipality / City</label>
                    <select
                      name="municipalityCode"
                      value={formData.municipalityCode}
                      onChange={handleChange}
                      disabled={!formData.provinceCode}
                      className="profile-input"
                    >
                      <option value="">Select Municipality / City</option>
                      {filteredCities.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>

                    <label className="profile-label small">Barangay</label>
                    <select
                      name="barangay"
                      value={formData.barangay}
                      onChange={handleChange}
                      disabled={!formData.municipalityCode}
                      className="profile-input"
                    >
                      <option value="">Select Barangay</option>
                      {barangays.map((b) => <option key={b.code} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <p>{fullAddress || "Not Provided"}</p>
                )}

        </div>

        <div className="profile-actions">
          {isEditing ? (
            <>
              <button className="profile-apply-btn" onClick={handleApplyClick} disabled={loading}>
                {loading ? "Saving..." : "Apply Changes"}
              </button>
              <button onClick={handleCancel} disabled={loading}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className="profile-edit-btn" onClick={handleEditClick} disabled={loading}>
                Edit Details
              </button>
              <button className="profile-disable-btn" onClick={handleDisableRequest} disabled={loading}>
                Disable Account
              </button>
            </>
          )}
        </div>
      </div>

      {/* Verification popup */}
      {showVerificationPopup && (
        <div className="verification-popup">
          <h3>Enter Verification Code</h3>
          <input value={enteredCode} onChange={(e) => setEnteredCode(e.target.value)} maxLength={6} />
          <button onClick={confirmVerificationAndApply}>Confirm</button>
          <button
            onClick={() => {
              setShowVerificationPopup(false);
              setEnteredCode("");
              setVerificationAction(null);
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {loading && <div className="loading-overlay">Loading...</div>}
    </div>
  );
};

export default ProfilePage;
