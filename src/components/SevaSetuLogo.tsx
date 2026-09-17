type SevaSetuLogoProps = {
  compact?: boolean;
  className?: string;
};

export function SevaSetuLogo({ compact = false, className = "" }: SevaSetuLogoProps) {
  return (
    <span className={`sevasetu-logo ${compact ? "sevasetu-logo-compact" : ""} ${className}`.trim()}>
      <span className="reference-logo-crop" aria-hidden="true"><img src="/logo_icon.jpeg" alt="" /></span>
      <span className="sevasetu-logo-copy"><strong>Seva<span>Setu</span></strong><small>Har Seva, Ek Setu.</small></span>
    </span>
  );
}
