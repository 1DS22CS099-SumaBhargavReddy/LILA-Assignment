import { useEffect, useRef, useState } from 'react';

const MODES = [
  {
    id: 'local',
    icon: '👥',
    title: 'Local 2 Player',
    desc: 'Same device, take turns',
    color: '#a855f7',
    colorB: '#ec4899',
    angle: '135deg',
    glow: 'rgba(168,85,247,0.35)',
    emoji: '🎮',
  },
  {
    id: 'room',
    icon: '🔑',
    title: 'Private Room',
    desc: 'Create or join a room code',
    color: '#f59e0b',
    colorB: '#ef4444',
    angle: '135deg',
    glow: 'rgba(245,158,11,0.35)',
    emoji: '🏠',
  },
  {
    id: 'classic',
    icon: '🌐',
    title: 'Online Match',
    desc: 'Auto-pair with a stranger',
    color: '#10b981',
    colorB: '#06d6a0',
    angle: '135deg',
    glow: 'rgba(16,185,129,0.35)',
    emoji: '⚔️',
  },
  {
    id: 'ai',
    icon: '🤖',
    title: 'Vs Computer',
    desc: 'Challenge the AI opponent',
    color: '#3b82f6',
    colorB: '#8b5cf6',
    angle: '135deg',
    glow: 'rgba(59,130,246,0.35)',
    emoji: '🧠',
  },
];

function ModeCard({ mode, onSelect, index }) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = cardRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: dy * -12, y: dx * 12 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setHovered(false);
  };

  return (
    <div
      ref={cardRef}
      className="mode-card-3d"
      style={{
        '--card-color': mode.color,
        '--card-color-b': mode.colorB,
        '--card-glow': mode.glow,
        '--card-angle': mode.angle,
        transform: hovered
          ? `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-8px) scale(1.04)`
          : `perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)`,
        animationDelay: `${index * 0.08}s`,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={() => onSelect(mode.id)}
    >
      <div className="mode-card-glow" />
      <div className="mode-card-content">
        <div className="mode-card-emoji">{mode.emoji}</div>
        <div className="mode-card-icon">{mode.icon}</div>
        <h3 className="mode-card-title">{mode.title}</h3>
        <p className="mode-card-desc">{mode.desc}</p>
        <div className="mode-card-arrow">Play →</div>
      </div>
      <div className="mode-card-shine" />
    </div>
  );
}

export default function ModeSelectScreen({ playerName, onModeSelect }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div className={`screen mode-select-screen ${visible ? 'ms-visible' : ''}`}>
      {/* Header */}
      <div className="ms-header">
        <div className="ms-greeting">
          <span className="ms-wave">👋</span>
          <span className="ms-name">{playerName}</span>
        </div>
        <h1 className="ms-title">
          <span className="ms-title-main">Choose Your</span>
          <span className="ms-title-accent"> Battle Mode</span>
        </h1>
        <p className="ms-subtitle">72 active games right now · 1,240 players online</p>
      </div>

      {/* Mode Cards Grid */}
      <div className="ms-grid">
        {MODES.map((mode, i) => (
          <ModeCard key={mode.id} mode={mode} onSelect={onModeSelect} index={i} />
        ))}
      </div>

      {/* Footer */}
      <div className="ms-footer">
        <span className="status-dot connected" />
        <span className="text-sm">Connected to LILA Game Server</span>
      </div>
    </div>
  );
}
