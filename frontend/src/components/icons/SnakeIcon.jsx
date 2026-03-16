export default function SnakeIcon({ size = 24, color = "currentColor", ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 8c2-3 5-3 7 0s5 3 7 0" />
      <path d="M4 14c2-3 5-3 7 0s5 3 7 0" />
      <circle cx="19" cy="8" r="1.5" fill={color} stroke="none" />
    </svg>
  );
}
