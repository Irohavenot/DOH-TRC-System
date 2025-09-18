import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../assets/profile.css';

interface Province {
  name: string;
  code: string;
  regionCode: string;
  islandGroupCode: string;
}

interface City {
  name: string;
  code: string;
  provinceCode: string;
}

interface Barangay {
  name: string;
  code: string;
  cityCode: string;
}

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
    // Enhanced address fields
    street: '123 Health St',
    barangay: 'Barangay Health',
    city: 'Wellness City',
    province: 'Metro Manila',
    zipCode: '1000',
    department: 'Cardiology',
    // Additional informative fields
    licenseNumber: 'MD123456',
    specialization: 'Internal Medicine',
    yearsOfExperience: '5',
    hospitalAffiliation: 'Wellness General Hospital',
  });
  
  const [profileImage, setProfileImage] = useState("/user.png");
  
  // Location data states
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache helper functions
  const cacheData = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not cache data:', e);
    }
  };

  const getCachedData = (key: string) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Could not retrieve cached data:', e);
      return null;
    }
  };

  // Fetch with retry logic
  const fetchWithRetry = async (url: string, retries = 3): Promise<any> => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url);
        return response.data;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  };

  // Fetch provinces and cities on component mount
  useEffect(() => {
    const fetchLocations = async () => {
      setLoading(true);
      setError(null);
      try {
        let provinceList: Province[] = getCachedData("provinces") || [];
        if (provinceList.length === 0) {
          const provincesData = await fetchWithRetry("https://psgc.gitlab.io/api/provinces/");
          provinceList = Array.isArray(provincesData)
            ? provincesData
                .filter((prov: any) => prov.name && prov.code)
                .map((prov: any) => ({ 
                  name: prov.name.trim(), 
                  code: prov.code.trim(),
                  regionCode: prov.regionCode,
                  islandGroupCode: prov.islandGroupCode
                }))
                .sort((a, b) => a.name.localeCompare(b.name))
            : [];
          if (provinceList.length === 0) {
            throw new Error("No valid province data received");
          }
          cacheData("provinces", provinceList);
        }
        setProvinces(provinceList);

        let cityList: City[] = getCachedData("cities") || [];
        if (cityList.length === 0) {
          const citiesData = await fetchWithRetry("https://psgc.gitlab.io/api/cities-municipalities/");
          cityList = Array.isArray(citiesData)
            ? citiesData
                .filter((city: any) => city.name && city.code && city.provinceCode)
                .map((city: any) => ({
                  name: city.name.trim(),
                  code: city.code.trim(),
                  provinceCode: city.provinceCode.trim(),
                }))
                .sort((a, b) => a.name.localeCompare(b.name))
            : [];
          if (cityList.length === 0) {
            throw new Error("No valid city/municipality data received");
          }
          cacheData("cities", cityList);
        }
        setCities(cityList);
      } catch (err: any) {
        console.error("Error fetching location data:", err.message);
        setError("Failed to load provinces or cities. Please try again later.");
        setProvinces([]);
        setCities([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLocations();
  }, []);

  // Fetch barangays when city changes
  const fetchBarangays = async (cityCode: string) => {
    if (!cityCode) {
      setBarangays([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const cachedBarangays = getCachedData(`barangays_${cityCode}`);
      if (cachedBarangays) {
        setBarangays(cachedBarangays);
        setLoading(false);
        return;
      }

      const barangaysData = await fetchWithRetry(
        `https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`
      );
      
      const barangayList = Array.isArray(barangaysData)
        ? barangaysData
            .filter((brgy: any) => brgy.name && brgy.code)
            .map((brgy: any) => ({
              name: brgy.name.trim(),
              code: brgy.code.trim(),
              cityCode: cityCode.trim(),
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
        : [];
      
      if (barangayList.length === 0) {
        setError(`No barangays found for ${formData.city}. Please select another city.`);
      } else {
        cacheData(`barangays_${cityCode}`, barangayList);
      }
      
      setBarangays(barangayList);
      
      // Reset barangay if current selection is not in the new list
      if (formData.barangay && !barangayList.find((b) => b.name === formData.barangay)) {
        setFormData((prev) => ({ ...prev, barangay: "" }));
      }
    } catch (err: any) {
      console.error("Error fetching barangays:", err.message);
      setError("Failed to load barangays. Please try another city or check your connection.");
      setBarangays([]);
    } finally {
      setLoading(false);
    }
  };

  // Update cities when province changes
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedProvince = e.target.value;
    setFormData({ ...formData, province: selectedProvince, city: "", barangay: "" });
    setBarangays([]);
    
    // Filter cities for the selected province
    if (selectedProvince) {
      const province = provinces.find(p => p.name === selectedProvince);
      if (province) {
        const filteredCities = cities.filter(city => city.provinceCode === province.code);
        setCities(filteredCities);
      }
    }
  };

  // Update barangays when city changes
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCity = e.target.value;
    setFormData({ ...formData, city: selectedCity, barangay: "" });
    
    // Find the city code and fetch barangays
    const city = cities.find(c => c.name === selectedCity);
    if (city) {
      fetchBarangays(city.code);
    } else {
      setBarangays([]);
    }
  };

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = () => setIsEditing(true);

  const handleApplyChanges = () => {
    setIsEditing(false);
    setVerificationAction('edit');
    setShowVerificationPopup(true);
  };

  // Format address for display
  const formatAddress = () => {
    const parts = [];
    if (formData.street) parts.push(formData.street);
    if (formData.barangay) parts.push(formData.barangay);
    if (formData.city) parts.push(formData.city);
    if (formData.province) parts.push(formData.province);
    if (formData.zipCode) parts.push(formData.zipCode);
    return parts.join(", ");
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
            <input name="contact" value={formData.contact} onChange={handleChange} className="profile-input" placeholder="+63 9XX XXX XXXX" />
          ) : (
            <p>{formData.contact}</p>
          )}

          <label className="profile-label">Address:</label>
          {isEditing ? (
            <div className="address-form">
              <input 
                name="street" 
                value={formData.street} 
                onChange={handleChange} 
                className="profile-input" 
                placeholder="Street Address"
              />
              <select 
                name="province" 
                value={formData.province} 
                onChange={handleProvinceChange} 
                className="profile-input"
                disabled={loading}
              >
                <option value="">Select Province</option>
                {provinces.map((province) => (
                  <option key={province.code} value={province.name}>
                    {province.name}
                  </option>
                ))}
              </select>
              <select 
                name="city" 
                value={formData.city} 
                onChange={handleCityChange} 
                className="profile-input"
                disabled={loading || !formData.province}
              >
                <option value="">Select City/Municipality</option>
                {cities.map((city) => (
                  <option key={city.code} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
              <select 
                name="barangay" 
                value={formData.barangay} 
                onChange={handleChange} 
                className="profile-input"
                disabled={loading || !formData.city}
              >
                <option value="">Select Barangay</option>
                {barangays.map((barangay) => (
                  <option key={barangay.code} value={barangay.name}>
                    {barangay.name}
                  </option>
                ))}
              </select>
              <input 
                name="zipCode" 
                value={formData.zipCode} 
                onChange={handleChange} 
                className="profile-input" 
                placeholder="ZIP Code"
              />
            </div>
          ) : (
            <p>{formatAddress()}</p>
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

          {/* Additional informative fields */}
          <div className="professional-info">
            <h4>Professional Information</h4>
            
            <label className="profile-label">License Number:</label>
            {isEditing ? (
              <input 
                name="licenseNumber" 
                value={formData.licenseNumber} 
                onChange={handleChange} 
                className="profile-input" 
                placeholder="Medical License Number"
              />
            ) : (
              <p>{formData.licenseNumber}</p>
            )}

            <label className="profile-label">Specialization:</label>
            {isEditing ? (
              <input 
                name="specialization" 
                value={formData.specialization} 
                onChange={handleChange} 
                className="profile-input" 
                placeholder="Medical Specialization"
              />
            ) : (
              <p>{formData.specialization}</p>
            )}

            <label className="profile-label">Years of Experience:</label>
            {isEditing ? (
              <input 
                name="yearsOfExperience" 
                value={formData.yearsOfExperience} 
                onChange={handleChange} 
                className="profile-input" 
                placeholder="Years of Experience"
                type="number"
                min="0"
              />
            ) : (
              <p>{formData.yearsOfExperience} years</p>
            )}

            <label className="profile-label">Hospital Affiliation:</label>
            {isEditing ? (
              <input 
                name="hospitalAffiliation" 
                value={formData.hospitalAffiliation} 
                onChange={handleChange} 
                className="profile-input" 
                placeholder="Hospital Affiliation"
              />
            ) : (
              <p>{formData.hospitalAffiliation}</p>
            )}
          </div>
        </div>

        {error && (
          <div className="profile-error-message">
            {error}
          </div>
        )}

        {loading && (
          <div className="profile-loading">
            Loading location data...
          </div>
        )}

        <div className="profile-actions">
          {isEditing ? (
            <button className="profile-apply-btn" onClick={handleApplyChanges} disabled={loading}>
              {loading ? 'Saving...' : 'Apply Changes'}
            </button>
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
            <p className="profile-resend-text">Didn't receive a code?</p>
            <button
              className="profile-resend-btn"
              onClick={() => alert("Code resent to " + formData.email)}
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