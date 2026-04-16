export default function OMark({ animate = true }) {
  return (
    <div className="mark-o">
      <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <circle
          cx="32" cy="32" r="20"
          style={animate ? {} : { strokeDashoffset: 0 }}
        />
      </svg>
    </div>
  );
}
