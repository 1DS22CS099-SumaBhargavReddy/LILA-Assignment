export default function PlayerCard({ name, mark, isActive, label }) {
  const markClass = mark === 1 ? 'mark-x-color' : 'mark-o-color';
  const markSymbol = mark === 1 ? 'X' : 'O';

  return (
    <div className={`player-card ${isActive ? 'active' : ''}`}>
      <div className="player-name" title={name}>{name}</div>
      <div className="player-label">{label}</div>
      <div className={`player-mark ${markClass}`}>{markSymbol}</div>
    </div>
  );
}
