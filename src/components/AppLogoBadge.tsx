import React from 'react';

interface AppLogoBadgeProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AppLogoBadge: React.FC<AppLogoBadgeProps> = ({
  className = 'w-9 h-9',
  showText = false,
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 sm:w-10 sm:h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  return (
    <div className="inline-flex items-center gap-2.5 shrink-0">
      <div
        className={`relative rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20 border border-indigo-400/30 bg-slate-900 group-hover:border-indigo-400/60 transition-all flex items-center justify-center ${className || sizeMap[size]}`}
      >
        <img
          src="/logo-ujianku.png"
          alt="Logo UJIANKU CBT"
          className="w-full h-full object-cover rounded-xl"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Fallback if image fails
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
      {showText && (
        <div className="flex flex-col text-left">
          <span className="font-extrabold tracking-tight text-white leading-tight">
            UJIANKU
          </span>
          <span className="text-[10px] text-indigo-300 font-medium leading-tight">
            CBT & Asesmen Ujian
          </span>
        </div>
      )}
    </div>
  );
};
