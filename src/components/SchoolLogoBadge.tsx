import React from 'react';

interface SchoolLogoBadgeProps {
  className?: string;
  logoUrl?: string;
  alt?: string;
  showTextLabel?: boolean;
}

export const SchoolLogoBadge: React.FC<SchoolLogoBadgeProps> = ({
  className = 'w-10 h-10',
  logoUrl,
  alt = 'Logo SMAN 19 Bandung',
  showTextLabel = false,
}) => {
  if (logoUrl) {
    return (
      <div className="inline-flex items-center gap-2">
        <img
          src={logoUrl}
          alt={alt}
          className={`${className} object-contain`}
          referrerPolicy="no-referrer"
        />
        {showTextLabel && (
          <span className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-800 dark:text-white whitespace-nowrap">
            SMAN 19 Bandung
          </span>
        )}
      </div>
    );
  }

  // Official SMAN 19 Bandung Crest / Shield Emblem Vector
  return (
    <div className="inline-flex items-center gap-2 shrink-0">
      <svg
        className={className}
        viewBox="0 0 400 440"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={alt}
      >
        <defs>
          {/* Background Gradient for the Shield */}
          <linearGradient id="shieldBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e8f4fc" />
            <stop offset="50%" stopColor="#d9ecf8" />
            <stop offset="100%" stopColor="#cbe3f5" />
          </linearGradient>

          {/* Flame / Obor Gradient */}
          <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="30%" stopColor="#f97316" />
            <stop offset="70%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="flameInner" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="60%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          {/* Wing Gradient */}
          <linearGradient id="wingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* Ribbon Gradient */}
          <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>

          {/* Path for curved text SMA NEGERI */}
          <path id="textArcSmaBadge" d="M 105 82 Q 200 50 295 82" fill="none" />
          {/* Path for curved text AJI AJEN ANORAGA */}
          <path id="textArcMottoBadge" d="M 125 388 Q 200 422 275 388" fill="none" />
        </defs>

        {/* Main Shield Outer Outer Frame */}
        <path
          d="M 200 24 C 290 24 336 48 340 160 C 344 265 305 348 200 395 C 95 348 56 265 60 160 C 64 48 110 24 200 24 Z"
          fill="#1e293b"
        />

        {/* Shield Outer White Rim */}
        <path
          d="M 200 28 C 285 28 330 50 334 160 C 338 260 300 342 200 388 C 100 342 62 260 66 160 C 70 50 115 28 200 28 Z"
          fill="#ffffff"
        />

        {/* Shield Inner Body */}
        <path
          d="M 200 36 C 280 36 322 56 326 160 C 330 254 294 334 200 378 C 106 334 70 254 74 160 C 78 56 120 36 200 36 Z"
          fill="url(#shieldBg)"
          stroke="#334155"
          strokeWidth="2.5"
        />

        {/* Inner Fine Outline */}
        <path
          d="M 200 44 C 274 44 314 62 318 160 C 322 248 288 325 200 368 C 112 325 78 248 82 160 C 86 62 126 44 200 44 Z"
          fill="none"
          stroke="#64748b"
          strokeWidth="1.2"
          strokeDasharray="4,2"
        />

        {/* Globe / Longitude-Latitude Grid at Bottom Base */}
        <g stroke="#64748b" strokeWidth="1.8" fill="none" opacity="0.85">
          <path d="M 120 335 C 160 355 240 355 280 335" />
          <path d="M 106 305 C 150 330 250 330 294 305" />
          <line x1="200" y1="290" x2="200" y2="376" strokeWidth="2" />
          <line x1="172" y1="295" x2="160" y2="370" />
          <line x1="228" y1="295" x2="240" y2="370" />
          <line x1="145" y1="300" x2="126" y2="355" />
          <line x1="255" y1="300" x2="274" y2="355" />
          <line x1="120" y1="310" x2="98" y2="338" />
          <line x1="280" y1="310" x2="302" y2="338" />
        </g>

        {/* Top Text: SMA NEGERI */}
        <text
          fontFamily="'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          fontWeight="900"
          fontSize="20"
          fill="#1e293b"
          letterSpacing="4.5"
        >
          <textPath href="#textArcSmaBadge" startOffset="50%" textAnchor="middle">
            SMA NEGERI
          </textPath>
        </text>

        {/* Sunburst Rays behind Flame & Wings */}
        <g stroke="#facc15" strokeWidth="2.5" opacity="0.9">
          <line x1="200" y1="130" x2="200" y2="70" />
          <line x1="200" y1="130" x2="175" y2="75" />
          <line x1="200" y1="130" x2="225" y2="75" />
          <line x1="200" y1="130" x2="152" y2="88" />
          <line x1="200" y1="130" x2="248" y2="88" />
          <line x1="200" y1="130" x2="135" y2="108" />
          <line x1="200" y1="130" x2="265" y2="108" />
          <line x1="200" y1="130" x2="125" y2="132" />
          <line x1="200" y1="130" x2="275" y2="132" />
        </g>

        {/* Wings Left */}
        <g fill="url(#wingGrad)" stroke="#1e293b" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M 185 140 C 160 115 130 90 105 105 C 120 120 145 135 175 148 Z" />
          <path d="M 182 148 C 150 128 115 112 98 128 C 115 140 140 152 170 160 Z" />
          <path d="M 178 158 C 145 142 105 135 95 152 C 115 160 140 168 168 172 Z" />
          <path d="M 172 168 C 140 158 102 160 98 178 C 118 180 142 182 165 184 Z" />
          <path d="M 166 178 C 140 175 110 185 108 200 C 125 198 145 195 165 192 Z" />
        </g>

        {/* Wings Right */}
        <g fill="url(#wingGrad)" stroke="#1e293b" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M 215 140 C 240 115 270 90 295 105 C 280 120 255 135 225 148 Z" />
          <path d="M 218 148 C 250 128 285 112 302 128 C 285 140 260 152 230 160 Z" />
          <path d="M 222 158 C 255 142 295 135 305 152 C 285 160 260 168 232 172 Z" />
          <path d="M 228 168 C 260 158 298 160 302 178 C 282 180 258 182 235 184 Z" />
          <path d="M 234 178 C 260 175 290 185 292 200 C 275 198 255 195 235 192 Z" />
        </g>

        {/* Flame of Knowledge / Obor Api */}
        <path
          d="M 200 68 C 208 85 218 95 226 108 C 236 122 232 140 220 152 C 214 142 216 130 210 122 C 206 130 204 140 196 148 C 188 138 186 126 182 118 C 176 130 170 142 180 152 C 168 140 164 122 174 108 C 182 95 192 85 200 68 Z"
          fill="url(#flameGrad)"
          stroke="#991b1b"
          strokeWidth="1.5"
        />
        <path
          d="M 200 85 C 205 98 212 108 215 118 C 218 128 212 138 205 145 C 202 138 203 130 200 125 C 197 130 198 138 195 145 C 188 138 182 128 185 118 C 188 108 195 98 200 85 Z"
          fill="url(#flameInner)"
        />

        {/* Central Silhouette Head / Torch Base */}
        <path
          d="M 188 145 C 188 132 212 132 212 145 C 212 162 218 178 222 195 L 178 195 C 182 178 188 162 188 145 Z"
          fill="#475569"
          stroke="#1e293b"
          strokeWidth="1.5"
        />

        {/* Open Book Base (Buku Terbuka) */}
        <g stroke="#1e293b" strokeWidth="2.5" strokeLinejoin="round">
          <path
            d="M 200 200 C 175 190 145 192 120 205 L 122 250 C 147 238 177 236 200 246 Z"
            fill="#ffffff"
          />
          <path
            d="M 200 200 C 225 190 255 192 280 205 L 278 250 C 253 238 223 236 200 246 Z"
            fill="#ffffff"
          />
          <line x1="200" y1="200" x2="200" y2="246" stroke="#1e293b" strokeWidth="3" />
        </g>

        {/* Number 19 Center Box & Text */}
        <g>
          <path
            d="M 152 214 L 248 214 L 242 248 L 158 248 Z"
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth="3"
          />
          <line x1="146" y1="214" x2="254" y2="214" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
          <line x1="152" y1="248" x2="248" y2="248" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
          <text
            x="200"
            y="242"
            textAnchor="middle"
            fontFamily="'Impact', 'Arial Black', sans-serif"
            fontSize="28"
            fontWeight="900"
            fill="#0f172a"
            letterSpacing="2"
          >
            19
          </text>
        </g>

        {/* BANDUNG Text */}
        <text
          x="200"
          y="278"
          textAnchor="middle"
          fontFamily="'Segoe UI', Roboto, 'Arial Black', sans-serif"
          fontSize="18"
          fontWeight="900"
          fill="#1e293b"
          letterSpacing="3.5"
        >
          BANDUNG
        </text>

        {/* Motto Ribbon Banner: AJI AJEN ANORAGA */}
        <g>
          <path d="M 98 348 L 125 340 L 128 375 L 102 380 Z" fill="#94a3b8" stroke="#1e293b" strokeWidth="1.8" />
          <path d="M 302 348 L 275 340 L 272 375 L 298 380 Z" fill="#94a3b8" stroke="#1e293b" strokeWidth="1.8" />
          <path
            d="M 106 348 C 150 328 250 328 294 348 L 282 392 C 240 372 160 372 118 392 Z"
            fill="url(#ribbonGrad)"
            stroke="#1e293b"
            strokeWidth="2.2"
          />
          <text
            fontFamily="'Segoe UI', Roboto, Arial, sans-serif"
            fontWeight="900"
            fontSize="13"
            fill="#0f172a"
            letterSpacing="2"
          >
            <textPath href="#textArcMottoBadge" startOffset="50%" textAnchor="middle">
              AJI AJEN ANORAGA
            </textPath>
          </text>
        </g>
      </svg>
    </div>
  );
};
