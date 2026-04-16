export default function XMark({ animate = true }) {
  return (
    <div className="mark-x">
      <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <line
          x1="16" y1="16" x2="48" y2="48"
          style={animate ? {} : { strokeDasharray: '100 0' }}
        />
        <line
          x1="48" y1="16" x2="16" y2="48"
          style={animate ? { animationDelay: '0.15s' } : { strokeDasharray: '100 0' }}
        />
      </svg>
    </div>
  );
}
