import React, { useState } from 'react';
import '../../assets/profile.css';

const ProfilePage = () => {
  const [position, setPosition] = useState("Doctor");
  const [department, setDepartment] = useState("General Medicine");
  const [isEditing, setIsEditing] = useState(false);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [verificationAction, setVerificationAction] = useState<null | 'disable' | 'edit'>(null);

  const [formData, setFormData] = useState({
    name: 'Dr. Jane Doe',
    email: 'userdummy@gmail.com',
    contact: '+63 912 345 6789',
    address: '123 Health St, Wellness City',
    department: 'Cardiology',
  });
  const [profileImage, setProfileImage] = useState("/user.png");

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

  const handleEdit = () => setIsEditing(true);

  const handleApplyChanges = () => {
    setIsEditing(false);
    setVerificationAction('edit');
    setShowVerificationPopup(true);
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
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
              <label htmlFor="profile-photo" className="profile-change-photo-btn">
                Change Photo
              </label>
            </>
          )}
        </div>

        <h2>{formData.name}</h2>

        <label className="profile-label">Position</label>
        {isEditing ? (
          <input
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="profile-input"
          />
        ) : (
          <p className="profile-position">{position}</p>
        )}

        <div className="profile-details">
          <label className="profile-label">Email:</label>
          {isEditing ? (
            <input name="email" value={formData.email} onChange={handleChange} className="profile-input" />
          ) : (
            <p>{formData.email}</p>
          )}

          <label className="profile-label">Contact:</label>
          {isEditing ? (
            <input name="contact" value={formData.contact} onChange={handleChange} className="profile-input" />
          ) : (
            <p>{formData.contact}</p>
          )}

          <label className="profile-label">Address:</label>
          {isEditing ? (
            <input name="address" value={formData.address} onChange={handleChange} className="profile-input" />
          ) : (
            <p>{formData.address}</p>
          )}

          <label className="profile-label">Department</label>
          {isEditing ? (
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="profile-input"
            />
          ) : (
            <p>{department}</p>
          )}
        </div>

        <div className="profile-actions">
          {isEditing ? (
            <button className="profile-apply-btn" onClick={handleApplyChanges}>Apply Changes</button>
          ) : (
            <>
              <button className="profile-edit-btn" onClick={handleEdit}>Edit Details</button>
              <button className="profile-disable-btn" onClick={() => setShowDisableConfirm(true)}>Disable Account</button>
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
              <button
                className="profile-confirm-btn"
                onClick={() => {
                  setShowDisableConfirm(false);
                  setVerificationAction('disable');
                  setShowVerificationPopup(true);
                }}
              >
                Yes, Disable
              </button>
              <button className="profile-cancel-btn" onClick={() => setShowDisableConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {showVerificationPopup && (
        <div className="profile-modal-backdrop" onClick={() => setShowVerificationPopup(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <h3>Enter 6-digit Code</h3>
            <p>We sent a code to <strong>{formData.email}</strong></p>
            <input className="profile-verification-input" maxLength={6} placeholder="______" />
            <button className="profile-confirm-btn" onClick={() => setShowVerificationPopup(false)}>Confirm</button>
            <p className="profile-resend-text">Didn’t receive a code?</p>
            <button
              className="profile-resend-btn"
              onClick={() => alert("Code resent")}
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