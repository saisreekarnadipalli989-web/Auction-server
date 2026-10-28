import React, { useState, useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';

interface CountdownTimerProps {
  endTime: string;
  isExtended?: boolean;
  onExpire?: () => void;
  className?: string;
  showIcon?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  endTime,
  isExtended,
  onExpire,
  className = '',
  showIcon = true,
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    isOver: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isOver: false });

  useEffect(() => {
    const calculateTime = () => {
      const target = new Date(endTime).getTime();
      const now = Date.now();
      const diff = Math.max(0, target - now);
      const totalSeconds = Math.floor(diff / 1000);

      if (totalSeconds <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isOver: true });
        if (onExpire) onExpire();
        return;
      }

      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({ days, hours, minutes, seconds, totalSeconds, isOver: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  if (timeLeft.isOver) {
    return (
      <span className={`inline-flex items-center text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full ${className}`}>
        {showIcon && <Clock className="w-3.5 h-3.5 mr-1" />}
        Auction Ended
      </span>
    );
  }

  const isCritical = timeLeft.totalSeconds <= 300; // Less than 5 mins
  const isAntiSnipeWindow = timeLeft.totalSeconds <= 30; // Within soft-close trigger

  return (
    <div
      className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
        isAntiSnipeWindow
          ? 'bg-red-100 text-red-700 animate-pulse border border-red-300'
          : isCritical
          ? 'bg-amber-100 text-amber-800'
          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      } ${className}`}
    >
      {showIcon && (
        isExtended ? (
          <Zap className="w-3.5 h-3.5 mr-1 text-amber-600 animate-bounce" />
        ) : (
          <Clock className="w-3.5 h-3.5 mr-1" />
        )
      )}
      <span>
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
      {isExtended && (
        <span className="ml-1 text-[10px] uppercase font-bold text-amber-600">
          (+2m Ext)
        </span>
      )}
    </div>
  );
};
