import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';

const StaticPage = ({ title, content }) => {
  const navigate = useNavigate();

  return (
    <div className="dashboard-layout">
      <div className="cyber-grid-background"></div>
      
      <header className="site-header">
        <div className="logo-badge" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="brand-logo-icon">tk</span>
          <span className="brand-logo-text">tykkit.fr</span>
        </div>
        <nav className="dashboard-nav-tabs hidden-mobile" style={{ display: 'flex', gap: '20px', marginLeft: '40px', flex: 1 }}>
          <button onClick={() => navigate('/')} style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={18} /> BACK TO EXPLORE
          </button>
        </nav>
      </header>

      <main className="main-content" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', color: '#fff', fontFamily: 'monospace' }}>
        <h1 style={{ borderBottom: '2px solid #3B82F6', paddingBottom: '10px', marginBottom: '20px' }}>// {title.toUpperCase()}</h1>
        
        <div style={{ lineHeight: '1.8', fontSize: '16px', color: '#ddd' }}>
          {content.map((paragraph, idx) => (
             <p key={idx} style={{ marginBottom: '20px' }}>{paragraph}</p>
          ))}
        </div>
      </main>
    </div>
  );
};

export default StaticPage;
