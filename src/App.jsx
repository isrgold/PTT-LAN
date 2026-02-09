import React, { useState } from 'react';
import { useAudio } from './hooks/useAudio';
import { PTTButton } from './components/PTTButton';
import { Radio, Wifi, WifiOff, Users, AlertTriangle } from 'lucide-react';

function App() {
  const { startTalking, stopTalking, isTalking, isPlaying, connectionStatus, activeUsers, errorMessage, volume, socket } = useAudio();

  // Simple "Edit Name" feature state
  const [myCustomName, setMyCustomName] = useState(localStorage.getItem('ptt-name') || '');

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setMyCustomName(newName);
    localStorage.setItem('ptt-name', newName);
    // Optional: Emit name change to server if we want to sync custom names
    // socket.emit('update-name', newName);
  };

  return (
    <div className="app-container">

      {/* Header */}
      <header className="status-header">
        <div className="status-badge">
          <Radio size={20} className={connectionStatus === 'connected' ? 'text-green' : 'text-red'} />
          <span className="status-text">LAN PTT</span>
        </div>

        <div className="status-details">
          {connectionStatus === 'connected' ? (
            <span className="text-green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Wifi size={14} /> ONLINE
            </span>
          ) : (
            <span className="text-red" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <WifiOff size={14} /> OFFLINE
            </span>
          )}
          <span className="dot"></span>
          <span className="text-indigo" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={14} /> {activeUsers.length} ONLINE
          </span>
        </div>
      </header>

      {/* Error Message */}
      {errorMessage && (
        <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '0.5rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1px', fontWeight: 'bold' }}>
          <AlertTriangle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Control */}
      <main className="main-control">
        <div className={isPlaying ? 'ptt-wrapper playing' : 'ptt-wrapper'} style={{ position: 'relative' }}>
          {isPlaying && (
            <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '14px', whiteSpace: 'nowrap' }}>
              Receiving...
            </div>
          )}

          {/* Volume Meter Bar */}
          <div style={{ position: 'absolute', bottom: '-40px', left: '20px', right: '20px', height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${volume}%`, height: '100%', background: isTalking ? '#ef4444' : '#10b981', transition: 'width 0.05s linear' }}></div>
          </div>

          <PTTButton
            isTalking={isTalking}
            startTalking={startTalking}
            stopTalking={stopTalking}
          />
        </div>

        {/* User List & Status */}
        <div className="user-list-container">
          <h3 className="section-title">Connected Devices ({activeUsers.length})</h3>
          <div className="user-grid">
            {activeUsers.map(user => {
              const isMe = user.id === socket?.id;
              return (
                <div key={user.id} className={`user-card ${user.isTalking ? 'talking' : ''} ${isMe ? 'is-me' : ''}`} style={isMe ? { borderColor: '#6366f1' } : {}}>
                  <div className="user-icon">
                    {user.isTalking ? <Radio size={16} /> : <Users size={16} />}
                  </div>
                  <span className="user-name">
                    {isMe ? (myCustomName || 'You (Me)') : user.name}
                  </span>
                  {user.isTalking && <span className="talking-indicator">TALK</span>}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>Ensure devices are on same WiFi.</p>
        <p style={{ marginTop: '0.25rem' }}>v1.2.0</p>
      </footer>
    </div>
  );
}

export default App;
