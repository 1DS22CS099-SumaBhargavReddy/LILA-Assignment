import { useState } from 'react';

export default function LoginScreen({ onLogin }) {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) { setError('Enter your name to continue'); return; }
    if (trimmed.length < 2) { setError('At least 2 characters please'); return; }
    if (trimmed.length > 16) { setError('Max 16 characters'); return; }

    setLoading(true);
    setError('');
    try {
      await onLogin(trimmed);
    } catch {
      setError('Connection failed. Is the server running?');
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-new">
      {/* Animated background orbs */}
      <div className="login-orb orb-1" />
      <div className="login-orb orb-2" />
      <div className="login-orb orb-3" />

      <div className="login-container animate-fade-in-up">
        {/* Logo area */}
        <div className="login-logo">
          <div className="login-logo-mark">
            <span className="logo-x">✕</span>
            <div className="logo-center-dot" />
            <span className="logo-o">○</span>
          </div>
          <h1 className="login-game-title">NEXUS<span>TTT</span></h1>
          <p className="login-game-subtitle">Next-Gen Tic-Tac-Toe · Powered by LILA</p>
        </div>

        {/* Card */}
        <div className="login-card-new glass-card">
          <h2 className="login-card-heading">Who are you?</h2>
          <p className="login-card-sub">Your name will be shown to opponents</p>

          <form onSubmit={handleSubmit} className="login-form-new">
            <div className={`login-input-wrap ${focused ? 'focused' : ''} ${error ? 'has-error' : ''}`}>
              <span className="login-input-icon">👤</span>
              <input
                id="nickname-input"
                type="text"
                className="login-input-new"
                placeholder="Your nickname…"
                value={nickname}
                onChange={e => { setNickname(e.target.value); setError(''); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                maxLength={16}
                autoFocus
                autoComplete="off"
                disabled={loading}
              />
              {nickname && (
                <span className="login-char-count">{nickname.length}/16</span>
              )}
            </div>

            {error && (
              <p className="login-error animate-fade-in">{error}</p>
            )}

            <button
              id="login-btn"
              type="submit"
              className="btn btn-primary btn-lg login-submit-btn"
              disabled={loading || !nickname.trim()}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="matchmaking-spinner" style={{ width: 22, height: 22, margin: 0 }}>
                    <div className="orbit" />
                  </span>
                  Connecting…
                </span>
              ) : (
                <>Enter the Arena →</>
              )}
            </button>
          </form>
        </div>

        <div className="login-footer">
          <span className="status-dot connected" />
          <span className="text-sm">LILA Game Server · v2.0</span>
        </div>
      </div>
    </div>
  );
}
