import { useEffect, useState } from 'react';

export default function ProfilePage({ currentUser, onBack }) {
  const storageKey = `finai-profile-${currentUser.email}`;
  const [profile, setProfile] = useState({
    fullName: '',
    dmat: '',
    bank: '',
    phone: '',
  });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setProfile(JSON.parse(saved));
    } catch {}
  }, [storageKey]);

  const save = () => {
    window.localStorage.setItem(storageKey, JSON.stringify(profile));
    alert('Profile saved');
  };

  return (
    <div className="dashboard-card">
      <div className="dashboard-header">
        <div>
          <h2 style={{ margin: 0 }}>Profile</h2>
          <p className="subtitle" style={{ marginTop: 6 }}>{currentUser.email}</p>
        </div>

        <button className="small-btn" onClick={onBack}>Back</button>
      </div>

      <div className="result-box">
        <div className="form-field">
          <label>Full name</label>
          <input value={profile.fullName} onChange={(e) => setProfile(p => ({ ...p, fullName: e.target.value }))} />
        </div>

        <div className="form-field">
          <label>DMAT account</label>
          <input value={profile.dmat} onChange={(e) => setProfile(p => ({ ...p, dmat: e.target.value }))} />
        </div>

        <div className="form-field">
          <label>Bank details</label>
          <input value={profile.bank} onChange={(e) => setProfile(p => ({ ...p, bank: e.target.value }))} />
        </div>

        <div className="form-field">
          <label>Phone</label>
          <input value={profile.phone} onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="primary-btn" onClick={save}>Save</button>
          <button className="small-btn" onClick={() => { window.localStorage.removeItem(storageKey); setProfile({ fullName: '', dmat: '', bank: '', phone: '' }); }}>Clear</button>
        </div>
      </div>
    </div>
  );
}
