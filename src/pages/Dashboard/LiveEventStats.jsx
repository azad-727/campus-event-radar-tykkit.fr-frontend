import React, { useState, useEffect } from 'react';

// This component independently polls your Redis backend!
export const LiveEventStats = ({ eventId }) => {
  const [seats, setSeats] = useState('Loading...');
  const [timeLeft, setTimeLeft] = useState('Loading...');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch Live Seats
        const seatRes = await fetch(`https://campus-event-radar-tykkit-fr-backend-1.onrender.com/api/v1/events/${eventId}/seats`);
        const seatData = await seatRes.json();
        setSeats(seatData.availableSeats);

        // Fetch Live Countdown
        const timeRes = await fetch(`https://campus-event-radar-tykkit-fr-backend-1.onrender.com/api/v1/events/${eventId}/countdown`);
        const timeData = await timeRes.json();
        
        if (timeData.secondsRemaining > 0) {
          const hours = Math.floor(timeData.secondsRemaining / 3600);
          const mins = Math.floor((timeData.secondsRemaining % 3600) / 60);
          setTimeLeft(`${hours}h ${mins}m`);
        } else {
          setTimeLeft('LIVE NOW');
        }
      } catch (err) {
        console.error("Failed to fetch live stats");
      }
    };

    fetchStats(); // Fetch immediately
    const interval = setInterval(fetchStats, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [eventId]);

  return (
    <div style={{ display: 'flex', gap: '15px', marginTop: '10px', fontSize: '12px', fontFamily: 'monospace' }}>
      <span style={{ color: seats < 5 ? '#ff4444' : '#00E676' }}>
        🔥 {seats} SEATS LEFT
      </span>
      <span style={{ color: '#3B82F6' }}>
        ⏳ STARTS IN: {timeLeft}
      </span>
    </div>
  );
};