import React from 'react';

export interface ParsDevstateLogoProps {
  size?: number;
  showSubtitle?: boolean;
  subtitle?: string;
}

export const ParsDevstateLogo: React.FC<ParsDevstateLogoProps> = ({
  size = 14,
  showSubtitle = true,
  subtitle = 'ile korunuyor',
}) => {
  const barWidth = Math.max(2, Math.round(size * 0.12));
  const heights = [0.42, 0.82, 0.56, 1];

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div className="flex items-center gap-1.5" aria-label="Pars DevState Güvenlik Kalkanı">
        <span
          style={{ fontSize: size }}
          className="font-extrabold tracking-wider text-[#B91C1C]"
        >
          PARS
        </span>

        {/* Dynamic Telemetry Soundwave Bars */}
        <div className="flex items-center gap-1 mx-1 h-4">
          {heights.map((h, idx) => (
            <span
              key={idx}
              style={{
                width: barWidth,
                height: Math.round(size * h),
              }}
              className={`rounded-full ${idx % 2 === 0 ? 'bg-[#B91C1C]' : 'bg-[#25364E]'}`}
            />
          ))}
        </div>

        <span
          style={{ fontSize: size }}
          className="font-extrabold tracking-wide text-[#25364E]"
        >
          DEVSTATE
        </span>
      </div>

      {showSubtitle && (
        <span className="mt-0.5 text-[10px] font-medium tracking-wide text-[#8292A8]">
          {subtitle}
        </span>
      )}
    </div>
  );
};
