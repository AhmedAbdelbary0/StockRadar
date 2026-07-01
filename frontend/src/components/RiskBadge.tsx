interface RiskBadgeProps {
  level: 'Low' | 'Medium' | 'High';
}

export default function RiskBadge({ level }: RiskBadgeProps) {
  const cls = level.toLowerCase();
  return (
    <span className={`risk-badge risk-badge-${cls}`} id={`risk-badge-${cls}`}>
      <span className={`risk-dot risk-dot-${cls}`} />
      {level}
    </span>
  );
}
