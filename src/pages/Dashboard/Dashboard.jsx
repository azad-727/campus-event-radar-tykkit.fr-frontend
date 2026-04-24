import React, { useState, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { MapContainer, TileLayer, Marker, Popup ,useMap} from 'react-leaflet';
// NOTICE: I added the 'X' icon here for the modal close button!
import { Bell, User, Search, MapPin, Calendar, ArrowRight, Camera, MessageCircle, Mail, Building, BookOpen, Coffee, Flame, Heart, X,Ticket, Settings, Compass } from 'lucide-react';
import 'leaflet/dist/leaflet.css'; 
import './Dashboard.css';

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// --- STATIC DATA --- 
const MIT_COORDS = [13.3525, 74.7928]; 
const MAP_BOUNDS = [[13.3400, 74.7800], [13.3650, 74.8050]];

const VENUES = [
  { id: 'all', label: 'All Venues', icon: <MapPin size={16} /> },
  { id: 'plaza', label: 'Student Plaza', icon: <Coffee size={16} /> },
  { id: 'ab1', label: 'AB-1', icon: <Building size={16} /> },
  { id: 'ab4', label: 'AB-4', icon: <Building size={16} /> },
  { id: 'library', label: 'Library Hall', icon: <BookOpen size={16} /> },
];

//-- Redis Polling
//-- Redis Polling
const LiveEventStats = ({ eventId }) => {
  const [seats, setSeats] = useState('...');
  const [timeLeft, setTimeLeft] = useState('...');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('tykkit_jwt');
        
        // THE FIX: Dynamically build headers. 
        // Only attach 'Authorization' if the token is NOT null!
        const fetchOptions = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }) 
          }
        };

        // 1. Pass the fetchOptions into the seat request
        const seatRes = await fetch(`https://campus-event-radar-tykkit-fr-backend-1.onrender.com/api/v1/events/${eventId}/seats`, fetchOptions);
        if (seatRes.ok) {
          const seatData = await seatRes.json();
          const finalSeats = (seatData.availableSeats !== null && seatData.availableSeats !== undefined) 
            ? seatData.availableSeats 
            : (event.maxSeats - event.registeredCount);
            
          setSeats(finalSeats);
        }
        

        // 2. Pass the fetchOptions into the countdown request
        const timeRes = await fetch(`https://campus-event-radar-tykkit-fr-backend-1.onrender.com/api/v1/events/${eventId}/countdown`, fetchOptions);
        if (timeRes.ok) {
          const timeData = await timeRes.json();
          if (timeData.secondsRemaining > 0) {
            const hours = Math.floor(timeData.secondsRemaining / 3600);
            const mins = Math.floor((timeData.secondsRemaining % 3600) / 60);
            setTimeLeft(`${hours}h ${mins}m`);
          } else {
            setTimeLeft('LIVE NOW');
          }
        }
      } catch (err) {
        // Silently handle errors so it doesn't spam your console if the network drops
      }
    };

    fetchStats(); 
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [eventId]);

  return (
    <div className="live-stats-container" style={{ display: 'flex', gap: '15px', marginTop: '10px', fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold' }}>
      <span style={{ color: seats < 5 ? '#ff4444' : '#00E676' }}>🔥 {seats} SEATS LEFT</span>
      <span style={{ color: '#3B82F6' }}>⏳ STARTS IN: {timeLeft}</span>
    </div>
  );
};
 const createTacticalMarker = (isHot) => {
  return L.divIcon({
    className: `tactical-marker ${isHot ? 'hot-zone' : ''}`,
    html: `<div class="radar-ring"></div><div class="radar-dot"></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};
const MapCameraController = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      // flyTo(coordinates, zoomLevel, options)
      map.flyTo(coords, 18, {
        duration: 1.5, // 1.5 seconds smooth flight
        easeLinearity: 0.25
      });
    }
  }, [coords, map]);
  return null;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Student");
  const [activeVenue, setActiveVenue] = useState('all');
  const [dbEvents, setDbEvents] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [timeLeft, setTimeLeft] = useState({ days: '00', hours: '00', mins: '00' });
  const [vibes, setVibes] = useState([]);
  const [bookedTicket, setBookedTicket] = useState(null);
  const [activeTab, setActiveTab] = useState('feed'); 
  const [myPasses, setMyPasses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapFocusCoords, setMapFocusCoords] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Welcome to tykkit.fr! Secure your first pass.", read: false },
    { id: 2, text: "System connection established.", read: true }
  ]);

const [user,setUser] = useState({ name: '', email: '', studentId: '',academicRollNo: '' }); 
  const logout = () => { localStorage.clear(); navigate('/login'); };

  // --- NEW: CHECKOUT MODAL STATE ---
  const [selectedEvent, setSelectedEvent] = useState(null); 
  const [bookingStatus, setBookingStatus] = useState('idle'); // idle, loading, success
  const [formData, setFormData] = useState({
    attendeeName: '',
    studentIdNumber: '',
    userEmail: '',
    ticketType: 'General Admission'
  });

  const formatVotes = (votes) => {
    return votes >= 1000 ? (votes / 1000).toFixed(1) + 'k' : votes;
  };
 
  useEffect(() => {
    if (activeTab === 'vault') {
      const fetchVault = async () => {
        try {
          const token=localStorage.getItem('tykkit_jwt');
          const response = await fetch(`https://campus-event-radar-tykkit-fr-backend-1.onrender.com/api/v1/events/my-passes/${user.studentId}`,{
            method:'GET',
            headers:{
              'Content-Type':'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            }
          });

          if (response.ok) {
            console.log(user.academicRollNo);
            const data = await response.json();
            setMyPasses(data);
          }
        } catch (error) { console.error("Failed to fetch vault", error); }
      };
      fetchVault();
    }
  }, [activeTab, user.studentId]);




  useEffect(() => {
    const token = localStorage.getItem('tykkit_jwt');
    if (!token) { navigate('/login'); return; }
    
    const currentName = localStorage.getItem('tykkit_user') || "Student";
    const currentEmail = localStorage.getItem('tykkit_email') || "unknown@learner.manipal.edu";
    const currentId = localStorage.getItem('tykkit_studentId') || "UNKNOWN";
    setUserName(currentName.split(' ')[0]);
    setUser({
      name: currentName,
      email: currentEmail,
      studentId: currentId
    });
    setFormData(prev => ({
      ...prev,
      attendeeName: currentName,
      userEmail: currentEmail,
      studentIdNumber: currentId
    }));
    const fetchEvents = async () => {
      try {
        const response = await fetch('https://campus-event-radar-tykkit-fr-backend-1.onrender.com/api/v1/events', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to fetch events");
        const data = await response.json();

        const formattedEvents = data.map(event => {
          const attrs = {};
          if (event.attributes) {
            event.attributes.forEach(attr => { attrs[attr.k] = attr.v; });
          }
          return {
            id: event.id || event.eventId || Math.random().toString(),
            title: event.title,
            category: event.type || "EVENT",
            date: attrs.date || "TBD",
            time: attrs.time || "TBD",
            location: attrs.locationName || "TBD",
            venueId: attrs.venueId || "all",
            price: attrs.price || "FREE",
            image: attrs.image || "https://images.unsplash.com/photo-1540505330364-77f6ddf7a1f5?auto=format&fit=crop&w=800&q=80",
            coords: event.location ? [event.location.y, event.location.x] : [13.3525, 74.7928]
          };
        });
        setDbEvents(formattedEvents);
      } catch (error) {
        console.error("Error connecting to backend:", error);
      }
    };

    const fetchVibes = async () => {
      try {
        const response = await fetch('https://campus-event-radar-tykkit-fr-backend-1.onrender.com/api/v1/vibes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const sortedVibes = data.sort((a, b) => b.votes - a.votes);
          setVibes(sortedVibes);
        }
      } catch (error) {
        console.error("Failed to fetch vibes:", error);
      }
    };

    fetchEvents();
    fetchVibes(); 
  }, [navigate]);

  const handleVibeClick = async (id, emoji) => {
    if (navigator.vibrate) {
      navigator.vibrate(40); 
    }
    const newBursts = Array.from({ length: 15 }).map(() => ({
      id: Math.random().toString(),
      emoji: emoji,
      left: Math.random() * 90 + 5 + 'vw', 
      top: Math.random() * 90 + 5 + 'vh',  
      duration: Math.random() * 1 + 1 + 's' 
    }));
    setBursts(newBursts);
    setTimeout(() => setBursts([]), 2000);

    setVibes(prevVibes => 
      prevVibes.map(v => 
        v.id === id ? { ...v, votes: v.votes + 1 } : v
      )
    );
  
    


    try {
      const token = localStorage.getItem('tykkit_jwt');
      await fetch(`https://campus-event-radar-tykkit-fr-backend-1.onrender.com/api/v1/vibes/${id}/increment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Failed to save vibe to database:", error);
    }
  };

  useEffect(() => {
    const targetDate = new Date().getTime() + (3 * 24 * 60 * 60 * 1000) + (14 * 60 * 60 * 1000); 
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;
      if (distance < 0) {
        clearInterval(timer);
        return;
      }
      setTimeLeft({
        days: String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0'),
        hours: String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0'),
        mins: String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0')
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ---  WEBSOCKET LISTENER ---
  // --- ENTERPRISE WEBSOCKET LISTENER (STOMP PROTOCOL) ---
  useEffect(() => {
    if (bookingStatus !== 'queued' || !selectedEvent) return;

    let isResolved = false;

    const triggerTicketReveal = () => {
      if (isResolved) return;
      isResolved = true;
      
      setBookedTicket({
        id: "TKT-" + Math.floor(Math.random() * 100000000),
        attendeeName: formData.attendeeName,
        eventTitle: selectedEvent.title,
        eventDate: selectedEvent.date,
        ticketType: formData.ticketType,
        eventLocation: selectedEvent.location,
        eventImage: selectedEvent.image
      });
      
      setBookingStatus('revealing_ticket');
      setSelectedEvent(null);
    };

    // 1. Initialize the STOMP Client
    const stompClient = new Client({
      // NOTE: Update this URL if your Spring Boot WebSocketConfig uses a different endpoint!
      brokerURL: 'wss://campus-event-radar-tykkit-fr-backend-1.onrender.com/ws', 
      reconnectDelay: 5000,
      
      onConnect: () => {
        console.log("🟢 Connected to Spring Boot STOMP Broker!");
        
        // 2. Subscribe to the exact channel your backend worker is broadcasting to
        stompClient.subscribe('/topic/events', (message) => {
          
          // 3. The worker sends "UPDATE_EVENT:EVT-123". We check if it's OUR event!
          if (message.body === `UPDATE_EVENT:${selectedEvent.id}`) {
             console.log("🎫 Ticket confirmed by backend!");
             triggerTicketReveal();
          }
        });
      },
      onWebSocketError: (error) => {
        console.error("🔴 WebSocket Error:", error);
      }
    });

    // Activate the connection
    stompClient.activate();

    // FAILSAFE: Even with WebSockets, networks drop. We still keep a 5-second 
    // auto-resolve so the user's UI never freezes if their campus Wi-Fi blips.
    const fallbackTimeout = setTimeout(() => {
      console.warn("⚠️ WebSocket took too long. Auto-resolving UI.");
      triggerTicketReveal();
    }, 5000);

    // Cleanup: Disconnect the socket when the user leaves the queue screen
    return () => {
      stompClient.deactivate();
      clearTimeout(fallbackTimeout);
    };
  }, [bookingStatus, formData, selectedEvent]);

  // --- STREAM-SAFE UNIVERSAL BOOKING SUBMISSION ---
  // --- RUBRIC-COMPLIANT BOOKING SUBMISSION ---
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingStatus('loading'); 
    
    try {
      const token = localStorage.getItem('tykkit_jwt');
      
      // We only need to send the studentId in the body now
      // The eventId is in the URL!
      const payload = {
        studentId: formData.studentIdNumber 
      };

      // RUBRIC 3a: POST /events/:id/register
      const response = await fetch(`https://campus-event-radar-tykkit-fr-backend-1.onrender.com/api/v1/events/${selectedEvent.id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // If you have auth setup, otherwise remove
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 202) {
        // ACCEPTED_IN_QUEUE (Redis took it!)
        setBookingStatus('queued'); 
      } 
      else if (response.status === 409) {
        // SOLD OUT / EVENT_FULL (Redis DECR hit 0)
        setBookingStatus('sold_out');
      } 
      else if (response.status === 404) {
         // Event not found in Redis
         setBookingStatus('idle');
         alert("Error: This event hasn't been initialized in the system yet.");
      }
      else {
        const responseText = await response.text();
        throw new Error(responseText || "Unknown server error");
      }

    } catch (error) {
      console.error("Booking Error:", error);
      setBookingStatus('idle');
      alert("Failed to process request: " + error.message);
    }
  };
  const handleCancelPass = async (eventId) => {
    
    if (!window.confirm("Are you sure you want to cancel this pass? This will free up your seat for someone else.")) return;

    try {
      const token = localStorage.getItem('tykkit_jwt');
      
      const response = await fetch(`https://campus-event-radar-tykkit-fr-backend-1.onrender.com/api/v1/events/${eventId}/register?studentId=${user.studentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
       setMyPasses(prev => prev.filter(pass => pass.eventId !== eventId));
        
        if (navigator.vibrate) navigator.vibrate(50);
      } else {
        alert("Failed to cancel the pass. Please try again.");
      }
    } catch (error) {
      console.error("Cancellation error:", error);
    }
  };
  const filteredEvents = dbEvents.filter(event => {
    const matchesVenue = activeVenue === 'all' || event.venueId === activeVenue;
    const matchesSearch = 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      event.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesVenue && matchesSearch;
  });
  const featuredEvent = dbEvents.length > 0 ? dbEvents[0] : null;

  return (
    <div className="dashboard-layout">
      
      {bursts.map(burst => (
        <div key={burst.id} className="emoji-particle" style={{ left: burst.left, top: burst.top, animationDuration: burst.duration }}>
          {burst.emoji}
        </div>
      ))}

      <div className="cyber-grid-background"></div>
      
      <header className="site-header">
          
        <div className="logo-badge">
          <span className="brand-logo-icon">tk</span>
          <span className="brand-logo-text">tykkit.fr</span>
        </div>
        <nav className="dashboard-nav-tabs hidden-mobile" style={{ display: 'flex', gap: '20px', marginLeft: '40px',flex: 1 }}>
          <button onClick={() => setActiveTab('feed')} style={{ background: 'transparent', color: activeTab === 'feed' ? '#3B82F6' : '#fff', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={18} /> EXPLORE
          </button>
          <button onClick={() => setActiveTab('vault')} style={{ background: 'transparent', color: activeTab === 'vault' ? '#3B82F6' : '#fff', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ticket size={18} /> VAULT
          </button>
          <button onClick={() => setActiveTab('profile')} style={{ background: 'transparent', color: activeTab === 'profile' ? '#3B82F6' : '#fff', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} /> PROFILE
          </button>
        </nav>
        
        <div className="header-actions">
          <div className="search-bar hidden-mobile">
            <Search size={18} color="rgba(255,255,255,0.5)" />
            <input 
              type="text" 
              placeholder="Search events..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveTab('feed'); // Force switch to feed when searching!
              }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <button 
              className="icon-btn" 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ position: 'relative' }}
            >
              <Bell size={20} />
              {/* Show a red dot if there are unread notifications */}
              {notifications.some(n => !n.read) && (
                <span className="notification-dot"></span>
              )}
            </button>

            {/* The Dropdown Panel */}
            {showNotifications && (
              <div className="notification-dropdown">
                <div style={{ padding: '10px 15px', borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: '12px', color: '#888' }}>
                  SYSTEM ALERTS
                </div>
                {notifications.map(n => (
                  <div key={n.id} className="notify-item" style={{ opacity: n.read ? 0.6 : 1 }}>
                    <div style={{ width: '8px', height: '8px', background: n.read ? 'transparent' : '#ff4444', borderRadius: '50%', flexShrink: 0 }}></div>
                    <p>{n.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div 
             className="user-profile-btn" 
             onClick={() => setActiveTab('profile')} 
             style={{ cursor: 'pointer', transition: 'background 0.2s ease' }}
             onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
             onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            <User size={18} />
            <span className="hidden-mobile">{userName}</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'feed' && (
          <>
        <aside className="side-column left-column hidden-mobile">
          <div className="side-panel">
            <h3 className="panel-title">Campus Vibes</h3>
            <p className="panel-subtitle">Trending at MIT right now</p>
            <div className="vibes-list">
              {vibes.map(vibe => (
                <div key={vibe.id} className="vibe-item" onClick={() => handleVibeClick(vibe.id, vibe.emoji)}>
                  <div className="vibe-emoji-box">{vibe.emoji}</div>
                  <div className="vibe-info">
                    <span className="vibe-label">{vibe.label}</span>
                    <span className="vibe-votes"><Flame size={12}/> {formatVotes(vibe.votes)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </aside>

        <div className="center-column">
          <section className="map-section">
            <div className="map-glass-border">
              <MapContainer center={MIT_COORDS} zoom={16} minZoom={15} maxBounds={MAP_BOUNDS} className="leaflet-map-container" scrollWheelZoom={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                
                {/* INJECT THE CAMERA CONTROLLER */}
                <MapCameraController coords={mapFocusCoords} />

                {filteredEvents.map(event => (
                  <Marker 
                    key={event.id} 
                    position={event.coords}
                    // Make it glow red if it's the featured event or almost sold out!
                    icon={createTacticalMarker(event.id === featuredEvent?.id)}
                    // Clicking the marker instantly opens the Secure Pass checkout!
                    eventHandlers={{ click: () => setSelectedEvent(event) }}
                  >
                    {/* You can optionally keep the popup, or remove it since clicking now opens the modal! */}
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </section>

          {featuredEvent && (
            <section className="hero-banner" style={{ backgroundImage: `url(${featuredEvent.image})` }}>
              <div className="hero-overlay"></div>
              <div className="hero-content">
                <span className="hero-tag">FEATURED EVENT</span>
                <h1 className="hero-title">{featuredEvent.title}</h1>
                <p className="hero-subtitle"><Calendar size={16}/> {featuredEvent.date} • <MapPin size={16}/> {featuredEvent.location}</p>
                {/* WIRING UP THE BANNER BUTTON */}
                <button className="hero-cta" onClick={() => setSelectedEvent(featuredEvent)}>
                  Get Passes <ArrowRight size={18} />
                </button>
              </div>
            </section>
          )}

          <div className="venue-filters">
            {VENUES.map(venue => (
              <div key={venue.id} className={`venue-pill ${activeVenue === venue.id ? 'active' : ''}`} onClick={() => setActiveVenue(venue.id)}>
                {venue.icon} {venue.label}
              </div>
            ))}
          </div>

          <section className="event-feed">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => (
                <div key={event.id} className="event-card"
                  onMouseEnter={() => setMapFocusCoords(event.coords)}
                  onMouseLeave={()=> setMapFocusCoords(null)}
                >
                  <div className="event-card-banner" style={{ backgroundImage: `url(${event.image})` }}>
                    <span className="event-tag">{event.category}</span>
                  </div>
                  <div className="event-card-content">
                    <h2 className="event-title">{event.title}</h2>
                    <p className="event-datetime">{event.date} • {event.time}</p>
                    <p className="event-location"><MapPin size={12}/> {event.location}</p>
                    <div className="event-footer">
                      <div className="price-box">
                        <span className="price-label">Price</span>
                        <span className="event-price">{event.price}</span>
                      </div>
                      <LiveEventStats eventId={event.id} />
                      {/* WIRING UP THE EVENT CARD BUTTON */}
                      
                      <button className="book-btn" onClick={() => setSelectedEvent(event)}>
                        Secure Pass
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No events currently scheduled here.</div>
            )}
          </section>
        </div>

        <aside className="side-column right-column hidden-mobile">
          <div className="side-panel billboard-panel">
            <span className="billboard-tag">UP NEXT</span>
            <h3 className="billboard-title">{featuredEvent ? featuredEvent.title : "Loading..."}</h3>
            <div className="countdown-grid">
              <div className="time-box"><span className="time-num">{timeLeft.days}</span><span className="time-label">DAYS</span></div>
              <div className="time-box"><span className="time-num">{timeLeft.hours}</span><span className="time-label">HRS</span></div>
              <div className="time-box"><span className="time-num">{timeLeft.mins}</span><span className="time-label">MIN</span></div>
            </div>
            <button className="billboard-btn">View Lineup</button>
          </div>
        </aside>
        </>
        )}

        {/* ==========================================
            VIEW 2: THE VAULT (MY PASSES)
        ========================================== */}
        {activeTab === 'vault' && (
          <div className="vault-view" style={{ padding: '0px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            <h2 style={{ color: '#fff', fontFamily: 'monospace', borderBottom: '2px solid #3B82F6', paddingBottom: '10px' }}>
              // MY SECURED PASSES
            </h2>
            
           <div className="ticket-grid" style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', gap: '40px', marginTop: '40px', paddingBottom: '100px' }}>
              {myPasses.length === 0 && (
                 <div className="empty-state" style={{ color: '#888', fontFamily: 'monospace' }}>No passes secured yet. Go explore!</div>
              )}

              {myPasses.map((pass, index) => {
                // Find the full event details using the ID on the pass!
                const linkedEvent = dbEvents.find(e => e.id === pass.eventId || e.eventId === pass.eventId);

                return (
                  <div key={index} className="id-badge" style={{ transform: 'scale(0.9)', animation: 'none', margin: '0 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="lanyard-hole"></div>
                    
                    <div className="badge-header">
                      <span className="badge-logo">tykkit.fr</span>
                      <span className="badge-tier-icon">TKT</span>
                    </div>

                    {/* Darkened Photo Area with the Event Image */}
                    <div className="badge-photo-area" style={{ 
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${linkedEvent?.image})`, 
                        backgroundSize: 'cover', 
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                      <div className="badge-event-title" style={{ fontSize: '20px', textAlign: 'center', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                        {linkedEvent?.title || "ENCRYPTED EVENT"}
                      </div>
                    </div>

                    <div className="badge-data-section" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                       
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                         {/* LEFT COLUMN: Text Data */}
                         <div>
                           <p style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#888', fontSize: '10px', marginBottom: '2px' }}>ATTENDEE // ROLE</p>
                           <p style={{ fontFamily: 'monospace', fontWeight: 'bold', marginBottom: '15px', color: '#fff' }}>{user.name.toUpperCase()} // STUDENT</p>
                           
                           <p style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#888', fontSize: '10px', marginBottom: '2px' }}>DATE & VENUE</p>
                           <p style={{ fontFamily: 'monospace', fontWeight: 'bold', marginBottom: '10px', color: '#fff', maxWidth: '150px' }}>
                             {linkedEvent?.date || "TBD"} <br/> @ {linkedEvent?.location || "TBD"}
                           </p>
                         </div>

                         {/* RIGHT COLUMN: The Dynamic QR Code */}
                         <div style={{ background: '#fff', padding: '5px', borderRadius: '4px', border: '2px solid #333' }}>
                           <QRCodeSVG 
                             // This is the data the scanner will read!
                             value={`tykkit-auth://event/${pass.eventId}/user/${user.studentId}`} 
                             size={70} 
                             bgColor={"#ffffff"} 
                             fgColor={"#000000"} 
                             level={"M"} 
                           />
                         </div>
                       </div>
                       
                       {/* BOTTOM ROW: Hash and Status */}
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '10px' }}>
                         <div>
                           <p style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#888', fontSize: '10px', marginBottom: '2px' }}>TICKET HASH</p>
                           <p style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#fff' }}>{pass.eventId.substring(pass.eventId.length - 8).toUpperCase()}</p>
                         </div>
                         <p style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#00E676' }}>STATUS: {pass.status || 'CONFIRMED'}</p>
                       </div>
                    </div>

                    {/* Integrated Cancel Button */}
                    <button 
                       onClick={() => handleCancelPass(pass.eventId)}
                       style={{ 
                         background: 'transparent', 
                         color: '#ff4444', 
                         border: 'none', 
                         borderTop: '1px dashed #333',
                         padding: '15px', 
                         fontFamily: 'monospace', 
                         fontWeight: 'bold', 
                         cursor: 'pointer',
                         transition: 'background 0.2s ease, color 0.2s ease',
                         width: '100%',
                         letterSpacing: '1px'
                       }}
                       onMouseOver={(e) => { e.target.style.background = '#ff4444'; e.target.style.color = '#000'; }}
                       onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#ff4444'; }}
                    >
                      [ TERMINATE PASS ]
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
            VIEW 3: USER PROFILE & SETTINGS
        ========================================== */}
        {activeTab === 'profile' && (
          <div className="profile-view">
            <h2 style={{ color: '#fff', fontFamily: 'monospace', borderBottom: '2px solid #EC4899', paddingBottom: '10px' }}>
              // IDENTITY VERIFICATION
            </h2>
            
            <div className="profile-form" >
              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#888', fontFamily: 'monospace', fontSize: '12px', display: 'block', marginBottom: '5px'  }}>ATTENDEE NAME</label>
                <input type="text" defaultValue={user.name} style={{ width: '90%', padding: '15px', background: '#000', border: '1px solid #333', color: '#fff', fontSize: '16px', fontFamily: 'monospace'}} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#888', fontFamily: 'monospace', fontSize: '12px', display: 'block', marginBottom: '5px' }}>LEARNER EMAIL</label>
                <input type="email" defaultValue={user.email} disabled style={{ width: '90%', padding: '15px', background: '#0a0a0a', border: '1px solid #222', color: '#555', fontSize: '16px', fontFamily: 'monospace', cursor: 'not-allowed' }} />
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ color: '#888', fontFamily: 'monospace', fontSize: '12px', display: 'block', marginBottom: '5px' }}>STUDENT ID</label>
                <input type="text" defaultValue={user.studentId} style={{ width: '90%', padding: '15px', background: '#000', border: '1px solid #333', color: '#fff', fontSize: '16px', fontFamily: 'monospace' }} />
              </div>

              <button style={{ width: '100%', background: '#fff', color: '#000', padding: '15px', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginBottom: '15px' }}>
                Submit Edits
              </button>

              <button onClick={logout} style={{ width: '100%', background: 'transparent', color: '#ff4444', padding: '15px', fontSize: '14px', fontWeight: 'bold', border: '1px solid #ff4444', cursor: 'pointer' }}>
                Log Out
              </button>
            </div>
          </div>
        )}

      </main>

      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-slogan"><h2>Experience access.</h2></div>
          <div className="footer-links-grid">
            <div className="link-column">
              <span>Browse Events</span><span>Host an Event</span><span>Campus Map</span>
              <span>Organizer App</span><span>Ticketing API</span><span>Pricing</span>
            </div>
            <div className="link-column">
              <span>Support</span><span>Blog</span><span>Case Studies</span>
            </div>
          </div>
        </div>
        <div className="footer-massive-text">tykkit.fr</div>
        <div className="footer-bottom">
          <div className="footer-logo"><span className="brand-logo-icon">tk</span></div>
          <div className="footer-legal">
            <span>About Tykkit</span><span>Products</span><span>Privacy</span><span>Terms</span>
          </div>
        </div>
      </footer>
{bookingStatus === 'revealing_ticket' && bookedTicket && (
        <div className="ticket-reveal-overlay">
          <div className="pixel-frame-chunky"></div>
          
          {/* Floating Campus Icons (Desktop Only) */}
          <div className="hidden-mobile">
            <span className="floating-element float-1" style={{ top: '20%', left: '20%' }}>🏢</span>
            <span className="floating-element float-2" style={{ top: '60%', left: '15%' }}>☕</span>
            <span className="floating-element float-3" style={{ top: '30%', right: '20%' }}>📚</span>
            <span className="floating-element float-1" style={{ top: '70%', right: '15%' }}>👾</span>
          </div>
{/* THE NEW 3D REVEAL BADGE */}
          <div className="id-badge" style={{ transform: 'scale(1)', animation: 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="lanyard-hole"></div>
            
            <div className="badge-header">
              <span className="badge-logo">tykkit.fr</span>
              <span className="badge-tier-icon">TKT</span>
            </div>

            <div className="badge-photo-area" style={{ 
                backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${bookedTicket.eventImage})`, 
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
              <div className="badge-event-title" style={{ fontSize: '20px', textAlign: 'center', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                {bookedTicket.eventTitle}
              </div>
            </div>

            <div className="badge-data-section" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <div>
                   <p style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#888', fontSize: '10px', marginBottom: '2px' }}>ATTENDEE // ROLE</p>
                   <p style={{ fontFamily: 'monospace', fontWeight: 'bold', marginBottom: '15px', color: '#fff' }}>{bookedTicket.attendeeName.toUpperCase()} // STUDENT</p>
                   
                   <p style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#888', fontSize: '10px', marginBottom: '2px' }}>DATE & VENUE</p>
                   <p style={{ fontFamily: 'monospace', fontWeight: 'bold', marginBottom: '10px', color: '#fff', maxWidth: '150px' }}>
                     {bookedTicket.eventDate} <br/> @ {bookedTicket.eventLocation}
                   </p>
                 </div>

                 {/* The QR Code Generator */}
                 <div style={{ background: '#fff', padding: '5px', borderRadius: '4px', border: '2px solid #333' }}>
                   <QRCodeSVG 
                     value={`tykkit-auth://event/${bookedTicket.id}/user/${user.studentId}`} 
                     size={70} 
                     bgColor={"#ffffff"} 
                     fgColor={"#000000"} 
                     level={"M"} 
                   />
                 </div>
               </div>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '10px' }}>
                 <div>
                   <p style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#888', fontSize: '10px', marginBottom: '2px' }}>TICKET HASH</p>
                   <p style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#fff' }}>{bookedTicket.id.substring(bookedTicket.id.length - 8).toUpperCase()}</p>
                 </div>
                 <p style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#00E676' }}>STATUS: SECURED</p>
               </div>
            </div>
          </div>

          <button 
            className="acknowledge-btn" 
            onClick={() => setBookingStatus('booked_success_celebration')}
          >
            Acknowledge →
          </button>
        </div>
      )}

      {/* --- EPIC 2: THE SUCCESS CELEBRATION SCREEN --- */}
      {bookingStatus === 'booked_success_celebration' && (
        <div className="celebration-overlay">
          
          {/* Flood of Emojis */}
          <span className="floating-element float-1" style={{ top: '10%', left: '10%', fontSize: '60px' }}>🎫</span>
          <span className="floating-element float-2" style={{ top: '80%', left: '20%', fontSize: '50px' }}>✨</span>
          <span className="floating-element float-3" style={{ top: '15%', right: '15%', fontSize: '70px' }}>🎉</span>
          <span className="floating-element float-1" style={{ top: '70%', right: '10%', fontSize: '60px' }}>🔥</span>
          <span className="floating-element float-2" style={{ top: '40%', left: '5%', fontSize: '40px' }}>👾</span>
          <span className="floating-element float-3" style={{ top: '50%', right: '5%', fontSize: '50px' }}>⚡</span>

          {/* Graphical Text with Custom O's */}
          <div className="thank-you-container">
            <span>TH</span>
            <div className="custom-o blue-face">
              <div className="face-eyes"><span>⭐</span><span>⭐</span></div>
              <div className="face-mouth" style={{ borderRadius: '50% 50% 0 0', height: '0.1em' }}></div>
            </div>
            <span>NK Y</span>
            <div className="custom-o pink-face">
              <div className="face-eyes"><span>🕶️</span></div>
              <div className="face-mouth"></div>
              <span className="bubble-gum">💭</span>
            </div>
            <span>U!</span>
          </div>

          <button 
            className="acknowledge-btn" 
            style={{ bottom: '40px' }}
            onClick={() => {
              setBookingStatus('idle');
              setBookedTicket(null);
            }}
          >
            [ CLOSE ]
          </button>
        </div>
      )}

      {/* --- NEW: THE CHECKOUT MODAL OVERLAY --- */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setSelectedEvent(null); }}>
          <div className="checkout-modal">
            <button className="close-modal-btn" onClick={() => setSelectedEvent(null)}><X size={24} /></button>
            
            {bookingStatus === 'success' ? (
              <div className="success-state">
                <div className="success-icon">🎫✨</div>
                <h2>Pass Secured!</h2>
                <p>Your digital ticket has been generated.</p>
              </div>
            ) : bookingStatus === 'queued' ? (
              <div className="success-state">
                <div className="success-icon" style={{ animationDuration: '2s' }}>⏳</div>
                <h2>You're in the queue!</h2>
                <p>Please don't close this window. Securing your pass...</p>
              </div>
            ) : bookingStatus === 'sold_out' ? (
              <div className="success-state">
                <div className="success-icon" style={{ filter: 'grayscale(1)' }}>❌</div>
                <h2>Sold Out</h2>
                <p>We're sorry, all passes have been claimed.</p>
                <button className="confirm-btn" onClick={() => setSelectedEvent(null)}>CLOSE</button>
              </div>
            ) :(
              <>
                <div className="checkout-header">
                  <h2>Secure Your Pass</h2>
                  <p>{selectedEvent.title} • {selectedEvent.price}</p>
                </div>

                <form className="checkout-form" onSubmit={handleBookingSubmit}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" required value={formData.attendeeName} onChange={(e) => setFormData({...formData, attendeeName: e.target.value})} placeholder="e.g. Rahul Sharma" />
                  </div>
                  
                  <div className="form-group">
                    <label>Student ID / Reg No</label>
                    <input type="text" required value={formData.studentIdNumber} onChange={(e) => setFormData({...formData, studentIdNumber: e.target.value})} placeholder="e.g. 230911xyz" />
                  </div>

                  <div className="form-group">
                    <label>College Email</label>
                    <input type="email" required value={formData.userEmail} onChange={(e) => setFormData({...formData, userEmail: e.target.value})} placeholder="student@learner.manipal.edu" />
                  </div>

                  <div className="form-group">
                    <label>Ticket Tier</label>
                    <select value={formData.ticketType} onChange={(e) => setFormData({...formData, ticketType: e.target.value})}>
                      <option>General Admission</option>
                      <option>VIP Backstage</option>
                      <option>Organizer Team</option>
                    </select>
                  </div>

                  <button type="submit" className="confirm-btn" disabled={bookingStatus === 'loading'}>
                    {bookingStatus === 'loading' ? 'Generating Ticket...' : `Confirm • ${selectedEvent.price}`}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;