import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const EventMap = () => {
  // Center over MIT Manipal
  const mapCenter = [13.3525, 74.7937]; 
  
  // State to hold our live seat count and connection status
  const [seatsAvailable, setSeatsAvailable] = useState(50);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to your Spring Boot WebSocket Server
    const stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
      
      onConnect: () => {
        console.log("Connected to the Spring Boot Radio Tower!");
        setIsConnected(true);

        // Subscribe to the broadcast channel
        stompClient.subscribe('/topic/events', (message) => {
          console.log("Received raw broadcast: ", message.body);
          
          if (message.body === "UPDATE_EVENT:EVT-101") {
            // Drop the seat count by 1 instantly!
            setSeatsAvailable((prevSeats) => prevSeats - 1);
          }
        });
      },
      onWebSocketError: () => setIsConnected(false),
      onDisconnect: () => setIsConnected(false)
    });

    stompClient.activate();

    return () => {
      stompClient.deactivate();
    };
  }, []); 

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ color: '#333' }}>Campus Event Radar</h2>
        <span style={{ 
          padding: '5px 12px', 
          backgroundColor: isConnected ? '#d4edda' : '#f8d7da', 
          color: isConnected ? '#155724' : '#721c24',
          borderRadius: '20px',
          fontWeight: 'bold',
          fontSize: '12px'
        }}>
          {isConnected ? '🟢 LIVE' : '🔴 OFFLINE'}
        </span>
      </div>
      
      <MapContainer 
        center={mapCenter} 
        zoom={16} 
        scrollWheelZoom={true} 
        style={{ height: '500px', width: '100%', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <Marker position={mapCenter}>
          <Popup>
            <div style={{ textAlign: 'center', minWidth: '120px' }}>
              <strong style={{ fontSize: '14px' }}>Tech Symposium (EVT-101)</strong><br />
              <span style={{ color: '#666' }}>MIT Manipal Library</span><br />
              <hr style={{ margin: '8px 0' }}/>
              <span style={{ fontSize: '20px', color: seatsAvailable > 0 ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
                {seatsAvailable} Seats Left
              </span>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default EventMap;