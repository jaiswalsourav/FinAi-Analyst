import { useEffect, useState } from 'react';

export default function ProfilePage({ currentUser, onBack }) {
  const storageKey = `finai-profile-${currentUser.email}`;
  const [profile, setProfile] = useState({ fullName: '', dmat: '', bank: '', phone: '' });

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      try {
        setProfile(JSON.parse(saved));
      } catch {
        setProfile({ fullName: '', dmat: '', bank: '', phone: '' });
      }
    }
  }, [storageKey]);

  const updateField = (field) => (event) => {
    setProfile((current) => ({ ...current, [field]: event.target.value }));
  };

  const save = () => {
    window.localStorage.setItem(storageKey, JSON.stringify(profile));
    alert('Profile saved');
  };

  const clear = () => {
    window.localStorage.removeItem(storageKey);
    setProfile({ fullName: '', dmat: '', bank: '', phone: '' });
  };

  return (
    <div className="dashboard-card">
      <div className="dashboard-header">
        <div><h2 style={{ margin: 0 }}>{currentUser.name || 'Profile'}</h2><p className="subtitle" style={{ marginTop: 6 }}>{currentUser.email}</p></div>
        <button className="small-btn" onClick={onBack}>Back</button>
      </div>
      <div className="result-box">
        <div className="form-field"><label>Full name</label><input value={profile.fullName} onChange={updateField('fullName')} /></div>
        <div className="form-field"><label>DMAT account</label><input value={profile.dmat} onChange={updateField('dmat')} /></div>
        <div className="form-field"><label>Bank details</label><input value={profile.bank} onChange={updateField('bank')} /></div>
        <div className="form-field"><label>Phone</label><input value={profile.phone} onChange={updateField('phone')} /></div>
        <div style={{ display: 'flex', gap: 8 }}><button className="primary-btn" onClick={save}>Save</button><button className="small-btn" onClick={clear}>Clear</button></div>
      </div>
    </div>
  );
}
