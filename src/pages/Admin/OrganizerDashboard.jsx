import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Activity, Users, Ticket, MapPin, Star, LayoutDashboard, LogOut, ChevronRight, CheckCircle, LockKeyhole, Info, Search, ScanLine } from 'lucide-react';
// --- LEAFLET IMPORTS ---
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';

// --- MAP COMPONENTS ---
const LocationPickerMarker = ({ coords, setCoords }) => {
  useMapEvents({
    click(e) {
      setCoords([e.latlng.lat, e.latlng.lng]);
    },
  });
  return coords ? <Marker position={coords} /> : null;
};

// Smoothly flies the map to the new coordinates when searched
const MapCameraController = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, 17, { duration: 1.5, easeLinearity: 0.25 });
    }
  }, [coords, map]);
  return null;
};

const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('insights');
  
  // --- STATE ---
  const [insights, setInsights] = useState({ totalUsers: 0, totalEvents: 0, totalTicketsIssued: 0, liveVisitors: 0 });
  const [userList, setUserList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  
  // SCANNER STATE
  const [scanQuery, setScanQuery] = useState('');
  const [scanResult, setScanResult] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // MAP SEARCH STATE
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  
  const [eventData, setEventData] = useState({
    title: '', type: 'EVENT', date: '', time: '', locationName: '', venueId: 'all', 
    price: '', image: '', maxSeats: 100, isFeatured: false,
    coords: [13.3525, 74.7928] // Default center: MIT Manipal
  });

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('tykkit_jwt');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [insightsRes, usersRes] = await Promise.all([
        fetch('https://campus-event-radar-tykkit-fr-backend-1.onrender.com/api/v1/admin/insights', { headers }),
        fetch('https://campus-event-radar-tykkit-fr-backend-1.onrender.com/api/v1/admin/users', { headers })
      ]);
      if (insightsRes.ok) setInsights(await insightsRes.json());
      if (usersRes.ok) {
         const users = await usersRes.json();
         setUserList(users);
      }
    } catch (error) { console.error("Failed to fetch admin data", error); }
  };

  const handleScanTicket = async (e) => {
    e.preventDefault();
    if (!scanQuery.trim()) return;

    try {
      const token = localStorage.getItem('tykkit_jwt');
      const res = await fetch(`https://campus-event-radar-tykkit-fr-backend-1.onrender.com/api/v1/admin/scan`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`,
                   'Content-Type': 'application/json'
                 },
                 body: JSON.stringify({ ticketHash: scanQuery })
      });
      
      const data = await res.json();
      setScanResult({ status: data.status, msg: data.message });
      setScanQuery(''); // Clear input for the next scan
      
      // Clear the message after 3 seconds
      setTimeout(() => setScanResult(null), 3000);
      fetchAdminData(); // Refresh overall stats
    } catch (error) {
      setScanResult({ status: 'DENIED', msg: 'SYSTEM ERROR' });
    }
  };

  const loadUserHistory = async (user) => {
    setSelectedUser(user);
    try {
      const token = localStorage.getItem('tykkit_jwt');
      const res = await fetch(`https://campus-event-radar-tykkit-fr-backend-1.onrender.com/api/v1/admin/users/${user.academicRollNo}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setUserHistory(await res.json());
    } catch (error) { console.error("Failed to load user history", error); }
  };

  const handleLogout = () => {
    localStorage.removeItem('tykkit_jwt');
    navigate('/login');
  };

  const handleInputChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setEventData(prev => ({ ...prev, [e.target.name]: value }));
  };

  // --- HANDLE MAP SEARCH (OpenStreetMap Geocoding) ---
  const handleMapSearch = async (e) => {
    e.preventDefault();
    if (!mapSearchQuery.trim()) return;
    
    setIsSearchingMap(true);
    try {
      const searchQuery = encodeURIComponent(`${mapSearchQuery} Manipal`);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        setEventData(prev => ({ ...prev, coords: [newLat, newLng] }));
      } else {
        alert("Building not found. Try a broader search term.");
      }
    } catch (error) {
      console.error("Geocoding failed:", error);
    } finally {
      setIsSearchingMap(false);
    }
  };

  const handlePublishEvent = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('tykkit_jwt');
      const payload = {
        title: eventData.title, 
        type: eventData.type, 
        featured: eventData.isFeatured, 
        maxSeats: parseInt(eventData.maxSeats),
        latitude: eventData.coords[0],
        longitude: eventData.coords[1],
        registeredCount: 0, 
        attributes: [
          { k: 'date', v: eventData.date }, 
          { k: 'time', v: eventData.time },
          { k: 'locationName', v: eventData.locationName }, 
          { k: 'venueId', v: eventData.venueId },
          { k: 'price', v: eventData.price }, 
          { k: 'image', v: eventData.image }
        ]
      };
      const response = await fetch('https://campus-event-radar-tykkit-fr-backend-1.onrender.com/api/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSuccessMsg('Event Successfully Initialized.');
        fetchAdminData();
        setEventData({ title: '', type: 'EVENT', date: '', time: '', locationName: '', venueId: 'all', price: '', image: '', maxSeats: 100, isFeatured: false, coords: [13.3525, 74.7928] });
        setMapSearchQuery('');
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (error) {
      console.error(error);
      alert("Error publishing event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- MINIMAL THEME DICTIONARY ---
  const theme = {
    bg: '#000000', surface: '#0a0a0a', surfaceHover: '#141414',
    border: 'rgba(255, 255, 255, 0.08)', primary: '#3B82F6', 
    primaryGlow: 'rgba(59, 130, 246, 0.15)', text: '#ffffff', textMuted: '#888888'
  };

  const formatPrice = (priceStr) => {
    if (!priceStr) return "FREE";
    const cleanStr = priceStr.toString().trim().toUpperCase();
    if (cleanStr === 'FREE' || cleanStr === '0') return "FREE";
    return cleanStr.includes('₹') ? cleanStr : `₹${cleanStr}`;
  };

  return (
    <div className="admin-wrapper" style={{ background: theme.bg, color: theme.text, minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      <style>{`
        * { box-sizing: border-box; }
        .admin-layout { display: flex; flex-direction: row; height: 100vh; overflow: hidden; }
        
        .admin-sidebar { width: 280px; border-right: 1px solid ${theme.border}; display: flex; flex-direction: column; flex-shrink: 0; background: ${theme.bg}; z-index: 20; }
        .admin-main { flex: 1; overflow-y: auto; padding: 60px; scroll-behavior: smooth; }
        
        .split-layout { display: flex; gap: 40px; align-items: flex-start; }
        .split-main { flex: 2; min-width: 0; }
        .split-side { flex: 1; min-width: 320px; position: sticky; top: 0; }
        
        .form-row { display: flex; gap: 24px; }
        .form-col { flex: 1; display: flex; flex-direction: column; gap: 8px; }

        .minimal-input { width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid ${theme.border}; background: ${theme.surface}; color: ${theme.text}; font-size: 14px; outline: none; transition: all 0.2s ease; color-scheme: dark; }
        .minimal-input:focus { border-color: ${theme.primary}; box-shadow: 0 0 0 1px ${theme.primary}; }
        
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .admin-map-container { height: 220px; width: 100%; border-radius: 12px; border: 1px solid ${theme.border}; z-index: 1; margin-top: 5px; }

        @media (max-width: 1024px) {
          .admin-main { padding: 40px 30px; }
          .split-layout { flex-direction: column; }
          .split-side { width: 100%; position: static; }
        }

        @media (max-width: 768px) {
          .admin-layout { flex-direction: column; overflow: auto; }
          .admin-sidebar { width: 100%; height: auto; flex-direction: column; border-right: none; border-bottom: 1px solid ${theme.border}; position: sticky; top: 0; }
          .sidebar-nav-container { flex-direction: row; overflow-x: auto; padding: 0 20px 20px 20px; gap: 10px; }
          .sidebar-btn { width: auto !important; padding: 10px 16px !important; white-space: nowrap; }
          .sidebar-footer { display: none; } 
          .admin-main { padding: 30px 20px; overflow-y: visible; }
          .form-row { flex-direction: column; gap: 16px; }
        }
      `}</style>

      <div className="admin-layout">
        
        {/* === SIDEBAR === */}
        <aside className="admin-sidebar">
          <div style={{ padding: '40px 30px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{ background: theme.primary, color: '#fff', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px' }}>tk</div>
            <span style={{ fontSize: '18px', fontWeight: '600', letterSpacing: '-0.5px' }}>tykkit.admin</span>
          </div>
          
          <nav className="sidebar-nav-container hide-scrollbar" style={{ flex: 1, padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { id: 'insights', icon: LayoutDashboard, label: 'Analytics Overview' },
              { id: 'users', icon: Users, label: 'Student Network' },
              { id: 'events', icon: PlusCircle, label: 'Event Publisher' },
              { id: 'scanner', icon: ScanLine, label: 'Access Scanner' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="sidebar-btn" style={{
                display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '14px 20px',
                background: activeTab === tab.id ? theme.primaryGlow : 'transparent',
                color: activeTab === tab.id ? theme.primary : theme.textMuted,
                border: 'none', borderRadius: '16px', cursor: 'pointer', textAlign: 'left', fontSize: '14px', fontWeight: activeTab === tab.id ? '600' : '500', transition: 'all 0.2s ease'
              }}>
                <tab.icon size={18} /> {tab.label}
              </button>
            ))}
          </nav>
          
          <div className="sidebar-footer" style={{ padding: '30px 20px' }}>
            <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px', background: theme.surface, color: theme.textMuted, border: `1px solid ${theme.border}`, borderRadius: '16px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
            >
              <LogOut size={16}/> Terminate Session
            </button>
          </div>
        </aside>

        {/* === MAIN CONTENT === */}
        <main className="admin-main hide-scrollbar">
          
          <div style={{ marginBottom: '40px', maxWidth: '1000px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '600', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Command Center</h1>
            <p style={{ color: theme.textMuted, fontSize: '14px', margin: 0, fontWeight: '400' }}>Manage telemetry, infrastructure, and event deployment.</p>
          </div>

          {/* VIEW 1: INSIGHTS */}
          {activeTab === 'insights' && (
            <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '1200px' }}>
              {[
                { title: 'Live Connections', val: insights.liveVisitors, icon: Activity },
                { title: 'Passes Secured', val: insights.totalTicketsIssued, icon: Ticket },
                { title: 'Registered Users', val: insights.totalUsers, icon: Users }
              ].map((stat, i) => (
                <div key={i} style={{ background: theme.surface, padding: '32px', borderRadius: '24px', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: theme.textMuted, fontWeight: '500', fontSize: '14px' }}>{stat.title}</span>
                    <stat.icon size={18} color={theme.textMuted} />
                  </div>
                  <h3 style={{ fontSize: '42px', margin: 0, fontWeight: '500', letterSpacing: '-1px' }}>{stat.val}</h3>
                </div>
              ))}
            </div>
          )}

          {/* VIEW 2: CRM */}
          {activeTab === 'users' && (
            <div className="fade-in split-layout" style={{ maxWidth: '1200px' }}>
              <div className="split-main" style={{ background: theme.surface, borderRadius: '24px', border: `1px solid ${theme.border}` }}>
                <div style={{ padding: '24px 30px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Student Index</h3>
                  <span style={{ fontSize: '12px', color: theme.textMuted, background: theme.bg, padding: '6px 12px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>{userList.length} Records</span>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
                    <thead>
                      <tr style={{ color: theme.textMuted, fontSize: '12px', fontWeight: '500' }}>
                        <th style={{ padding: '20px 30px', borderBottom: `1px solid ${theme.border}` }}>Roll Number</th>
                        <th style={{ padding: '20px 30px', borderBottom: `1px solid ${theme.border}` }}>Identity</th>
                        <th style={{ padding: '20px 30px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userList.map((u, index) => (
                        <tr key={u.id} style={{ transition: 'background 0.2s', ':hover': { background: theme.surfaceHover } }}>
                          <td style={{ padding: '20px 30px', color: theme.primary, fontWeight: '500', borderBottom: index !== userList.length -1 ? `1px solid ${theme.border}` : 'none' }}>{u.academicRollNo}</td>
                          <td style={{ padding: '20px 30px', fontWeight: '400', borderBottom: index !== userList.length -1 ? `1px solid ${theme.border}` : 'none' }}>{u.fullName}</td>
                          <td style={{ padding: '20px 30px', textAlign: 'right', borderBottom: index !== userList.length -1 ? `1px solid ${theme.border}` : 'none' }}>
                            <button onClick={() => loadUserHistory(u)} style={{ background: 'transparent', color: theme.textMuted, border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              onMouseOver={(e) => { e.currentTarget.style.background = theme.bg; e.currentTarget.style.color = theme.text; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textMuted; }}
                            >
                              <ChevronRight size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="split-side">
                <div style={{ padding: '32px', background: theme.surface, borderRadius: '24px', border: `1px solid ${theme.border}` }}>
                  <h3 style={{ margin: '0 0 24px 0', fontSize: '16px', fontWeight: '500', borderBottom: `1px solid ${theme.border}`, paddingBottom: '20px' }}>
                    {selectedUser ? `${selectedUser.name}'s Vault` : 'Vault Inspector'}
                  </h3>
                  
                  {!selectedUser ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      <LockKeyhole size={28} style={{ opacity: 0.4 }}/>
                      <p style={{ fontSize: '13px', margin: 0 }}>Select a record to decrypt passes.</p>
                    </div>
                  ) : userHistory.length === 0 ? (
                    <p style={{ color: theme.textMuted, fontSize: '13px', margin: 0 }}>No passes secured.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {userHistory.map((reg, i) => (
                        <div key={i} style={{ background: theme.bg, padding: '16px 20px', borderRadius: '16px', border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ margin: '0 0 4px 0', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hash</p>
                            <p style={{ margin: 0, fontWeight: '500', fontSize: '14px', fontFamily: 'monospace' }}>{reg.eventId.substring(0, 8).toUpperCase()}</p>
                          </div>
                          <CheckCircle size={18} color={theme.primary} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: PUBLISH */}
          {activeTab === 'events' && (
            <div className="fade-in split-layout" style={{ maxWidth: '1200px' }}>
              
              <div className="split-main" style={{ background: theme.surface, padding: '40px', borderRadius: '24px', border: `1px solid ${theme.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '500' }}>Event Details</h2>
                  {successMsg && <span style={{ background: theme.primaryGlow, color: theme.primary, padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={14}/> {successMsg}</span>}
                </div>
                
                <form onSubmit={handlePublishEvent} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  <div className="form-col">
                    <label style={{ color: theme.textMuted, fontSize: '13px', fontWeight: '500' }}>Event Title</label>
                    <input type="text" name="title" required value={eventData.title} onChange={handleInputChange} className="minimal-input" placeholder="e.g. Quantum AI Summit" />
                  </div>

                  <div className="form-row">
                    <div className="form-col">
                      <label style={{ color: theme.textMuted, fontSize: '13px', fontWeight: '500' }}>Date</label>
                      <input type="date" name="date" required value={eventData.date} onChange={handleInputChange} className="minimal-input" />
                    </div>
                    <div className="form-col">
                      <label style={{ color: theme.textMuted, fontSize: '13px', fontWeight: '500' }}>Time</label>
                      <input type="time" name="time" required value={eventData.time} onChange={handleInputChange} className="minimal-input" />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-col">
                      <label style={{ color: theme.textMuted, fontSize: '13px', fontWeight: '500' }}>Ticket Price</label>
                      <input type="text" name="price" value={eventData.price} onChange={handleInputChange} className="minimal-input" placeholder="₹199 or FREE" />
                    </div>
                    <div className="form-col">
                      <label style={{ color: theme.textMuted, fontSize: '13px', fontWeight: '500' }}>Total Redis Capacity</label>
                      <input type="number" name="maxSeats" required value={eventData.maxSeats} onChange={handleInputChange} className="minimal-input" min="1" placeholder="100" />
                    </div>
                  </div>

                  <div className="form-col" style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '20px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ color: theme.textMuted, fontSize: '13px', fontWeight: '500' }}>Tactical Location Picker</label>
                      <span style={{ fontSize: '11px', color: theme.textMuted }}>Search or click map to drop pin</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                      <input type="text" value={mapSearchQuery} onChange={(e) => setMapSearchQuery(e.target.value)} placeholder="Search building (e.g. AB4)" className="minimal-input" style={{ padding: '10px 14px', borderRadius: '8px' }} onKeyDown={(e) => { if (e.key === 'Enter') handleMapSearch(e); }} />
                      <button type="button" onClick={handleMapSearch} disabled={isSearchingMap} style={{ background: theme.primary, color: '#fff', border: 'none', borderRadius: '8px', padding: '0 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Search size={16} /> {isSearchingMap ? '...' : 'Find'}
                      </button>
                    </div>
                    
                    <MapContainer center={eventData.coords} zoom={16} className="admin-map-container" scrollWheelZoom={false}>
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                      <LocationPickerMarker coords={eventData.coords} setCoords={(newCoords) => setEventData({...eventData, coords: newCoords})} />
                      <MapCameraController coords={eventData.coords} />
                    </MapContainer>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                      <div style={{ flex: 2 }}>
                        <input type="text" name="locationName" required value={eventData.locationName} onChange={handleInputChange} className="minimal-input" placeholder="Building Name (e.g. Academic Block 4)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <input type="text" readOnly value={`${eventData.coords[0].toFixed(4)}, ${eventData.coords[1].toFixed(4)}`} className="minimal-input" style={{ opacity: 0.6, fontFamily: 'monospace' }} title="GeoJSON Coordinates" />
                      </div>
                    </div>
                  </div>

                  <div className="form-col">
                    <label style={{ color: theme.textMuted, fontSize: '13px', fontWeight: '500', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Cover Asset URL</span>
                      <span style={{ fontSize: '11px', opacity: 0.6 }}>Use Dropbox/Imgur</span>
                    </label>
                    <input type="url" name="image" required value={eventData.image} onChange={handleInputChange} className="minimal-input" placeholder="https://..." />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0' }}>
                    <input type="checkbox" name="isFeatured" id="feat" checked={eventData.isFeatured} onChange={handleInputChange} style={{ width: '18px', height: '18px', accentColor: theme.primary, cursor: 'pointer' }}/>
                    <label htmlFor="feat" style={{ color: theme.text, fontSize: '14px', cursor: 'pointer', fontWeight: '400' }}>Promote to Hero Banner</label>
                  </div>

                  <button type="submit" disabled={isSubmitting} style={{ background: isSubmitting ? theme.bg : theme.primary, color: '#fff', padding: '16px', borderRadius: '16px', border: isSubmitting ? `1px solid ${theme.border}` : 'none', fontWeight: '500', fontSize: '14px', cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: '8px', transition: 'all 0.3s' }}>
                    {isSubmitting ? 'Processing...' : 'Publish Event'}
                  </button>
                </form>
              </div>
              
              <div className="split-side">
                 <div style={{ background: theme.bg, borderRadius: '24px', padding: '24px', border: `1px solid ${theme.border}` }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: theme.textMuted }}>
                     <Info size={14}/> <span style={{ fontSize: '12px', fontWeight: '500' }}>Live Feed Simulation</span>
                   </div>
                   
                   <div style={{ background: theme.surface, borderRadius: '20px', overflow: 'hidden', border: eventData.isFeatured ? `1px solid ${theme.primary}` : `1px solid ${theme.border}` }}>
                     <div style={{ backgroundImage: `url(${eventData.image || 'https://images.unsplash.com/photo-1540505330364-77f6ddf7a1f5?auto=format&fit=crop&w=800&q=80'})`, height: '180px', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                       {eventData.isFeatured && (
                         <span style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: '#fff', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', border: `1px solid rgba(255,255,255,0.1)` }}>
                           <Star size={12} color={theme.primary} fill={theme.primary} /> Featured
                         </span>
                       )}
                     </div>
                     <div style={{ padding: '20px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                         <h2 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '500' }}>{eventData.title || "Waiting for input..."}</h2>
                         <span style={{ fontSize: '13px', fontWeight: '600', color: theme.primary }}>
                           {formatPrice(eventData.price)}
                         </span>
                       </div>
                       <p style={{ color: theme.textMuted, fontSize: '13px', margin: '0 0 20px 0' }}>{eventData.date || "Date"} • {eventData.time || "Time"}</p>
                       
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <p style={{ color: theme.text, fontSize: '13px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '400' }}><MapPin size={14} color={theme.textMuted}/> {eventData.locationName || "Venue"}</p>
                         <span style={{ color: theme.textMuted, fontSize: '12px' }}>{eventData.maxSeats} CAP</span>
                       </div>
                     </div>
                   </div>
                 </div>
              </div>
            </div>
          )}

          {/* VIEW 4: TACTICAL SCANNER */}
          {activeTab === 'scanner' && (
            <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingTop: '40px' }}>
              <div style={{ background: theme.surface, padding: '60px', borderRadius: '32px', border: `1px solid ${theme.border}`, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                <ScanLine size={48} color={theme.primary} style={{ marginBottom: '24px' }} />
                <h2 style={{ fontSize: '28px', margin: '0 0 10px 0', fontWeight: '600' }}>Venue Access Scanner</h2>
                <p style={{ color: theme.textMuted, fontSize: '15px', marginBottom: '40px' }}>Scan a QR code or manually enter a Ticket Hash to verify access.</p>
                
                <form onSubmit={handleScanTicket} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                  <input 
                    type="text" 
                    value={scanQuery}
                    onChange={(e) => setScanQuery(e.target.value)}
                    placeholder="AWAITING INPUT..."
                    autoFocus
                    style={{ 
                      width: '100%', maxWidth: '400px', padding: '20px', borderRadius: '16px', 
                      border: `2px solid ${theme.primary}`, background: theme.bg, color: theme.primary, 
                      fontSize: '24px', textAlign: 'center', fontWeight: '700', fontFamily: 'monospace',
                      outline: 'none', boxShadow: `0 0 20px ${theme.primaryGlow}`
                    }}
                  />
                  <button type="submit" style={{ opacity: 0, position: 'absolute' }}>Scan</button>
                </form>

                {scanResult && (
                  <div style={{ 
                    marginTop: '40px', padding: '24px', borderRadius: '16px',
                    background: scanResult.status === 'GRANTED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${scanResult.status === 'GRANTED' ? '#10b981' : '#ef4444'}`
                  }}>
                    <h3 style={{ 
                      margin: 0, fontSize: '24px', fontWeight: '700', letterSpacing: '2px', fontFamily: 'monospace',
                      color: scanResult.status === 'GRANTED' ? '#10b981' : '#ef4444'
                    }}>
                      {scanResult.status}: {scanResult.msg}
                    </h3>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default OrganizerDashboard;