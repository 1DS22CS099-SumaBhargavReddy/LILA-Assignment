import { useState, useEffect, useRef } from 'react';

export default function MatchmakingScreen({ onCancel, playerName }) {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="screen screen-enter">
      <div className="glass-card animate-fade-in-up" style={{ textAlign: 'center', padding: '40px', minWidth: '300px' }}>
        <p className="heading-md" style={{ marginBottom: '8px' }}>
          Finding a random player...
        </p>
        <p className="text-sm" style={{ marginBottom: '0' }}>
          It usually takes 26 seconds
        </p>

        {/* Animated Spinner */}
        <div className="matchmaking-spinner" style={{ margin: '32px auto' }}>
          <div className="orbit" />
          <div className="orbit" />
          <div className="orbit" />
        </div>

        {/* Searching as player name */}
        <p className="text-sm" style={{ marginBottom: '16px' }}>
          Searching as <span style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>{playerName}</span>
        </p>

        {/* Elapsed time */}
        <div className="matchmaking-timer">
          {formatTime(elapsed)}
        </div>

        {/* Cancel button */}
        <button
          id="cancel-matchmaking-btn"
          className="btn btn-secondary btn-sm"
          onClick={onCancel}
          style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px', margin: '24px auto 0' }}
        >
          <span>🏠</span> Cancel & Go Home
        </button>
      </div>
    </div>
  );
}
