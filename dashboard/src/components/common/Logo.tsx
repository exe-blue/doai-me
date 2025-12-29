'use client';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`font-bold ${sizeClasses[size]}`} style={{ fontFamily: 'var(--font-display)' }}>
        <span className="text-cyan-400">AI</span>
        <span className="text-foreground">Farm</span>
      </span>
    </div>
  );
}

