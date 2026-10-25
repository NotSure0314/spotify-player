import React from 'react';

export interface SpotifyIconProps {
  size?: number;
  fill?: string;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  filled?: boolean;
  strokeWidth?: number;
}

/**
 * Authentic Spotify Play Icon (sharp, crisp triangle matching Spotify Encore)
 */
export const SpotifyPlayIcon: React.FC<SpotifyIconProps> = ({
  size = 24,
  fill = 'currentColor',
  color,
  style = {},
  className = '',
  onClick
}) => {
  const iconColor = fill || color || 'currentColor';
  return (
    <svg
      role="img"
      height={size}
      width={size}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill={iconColor}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', ...style }}
      className={className}
      onClick={onClick}
    >
      <path d="m7.05 3.606 13.49 7.788a.7.7 0 0 1 0 1.212L7.05 20.394A.7.7 0 0 1 6 19.788V4.212a.7.7 0 0 1 1.05-.606z" />
    </svg>
  );
};

/**
 * Authentic Spotify Pause Icon (sharp dual vertical bars matching Spotify Encore)
 */
export const SpotifyPauseIcon: React.FC<SpotifyIconProps> = ({
  size = 24,
  fill = 'currentColor',
  color,
  style = {},
  className = '',
  onClick
}) => {
  const iconColor = fill || color || 'currentColor';
  return (
    <svg
      role="img"
      height={size}
      width={size}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill={iconColor}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', ...style }}
      className={className}
      onClick={onClick}
    >
      <path d="M5.7 3a.7.7 0 0 0-.7.7v16.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V3.7a.7.7 0 0 0-.7-.7H5.7zm10 0a.7.7 0 0 0-.7.7v16.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V3.7a.7.7 0 0 0-.7-.7h-2.6z" />
    </svg>
  );
};

/**
 * Authentic Spotify Pushpin Icon
 * Matches Spotify's native pushpin silhouette pointing down-left (SW ↙)
 * Supports both solid filled state (pinned) and stroke outline state (unpinned).
 */
export const SpotifyPinIcon: React.FC<SpotifyIconProps> = ({
  size = 24,
  fill,
  color,
  filled,
  strokeWidth = 2,
  style = {},
  className = '',
  onClick
}) => {
  const isFilled = filled !== undefined ? filled : (fill !== 'none');
  const iconColor = fill && fill !== 'none' ? fill : (color || 'currentColor');

  if (isFilled) {
    return (
      <svg
        role="img"
        height={size}
        width={size}
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill={iconColor}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', ...style }}
        className={className}
        onClick={onClick}
      >
        <path d="M1.25 22.75a.75.75 0 0 1 0-1.06l6-6c-.95-1.6-2.1-3.1-3.5-4l1.4-1.4c1.7.5 3.5.3 5.1-.7l3.2-3.2c.8-.8 1.4-1.8 1.8-2.9 1.7.8 3.2 2.3 4 4-1.1.4-2.1 1-2.9 1.8l-3.2 3.2c-1 1.6-1.2 3.4-.7 5.1l-1.4 1.4c-.9-1.4-2.4-2.55-4-3.5l-6 6a.75.75 0 0 1-1.06 0l-.74-.74z" />
      </svg>
    );
  }

  const strokeColor = color || (fill && fill !== 'none' ? fill : 'currentColor');
  return (
    <svg
      role="img"
      height={size}
      width={size}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', ...style }}
      className={className}
      onClick={onClick}
    >
      <path d="M2 22l5.5-5.5" />
      <path d="M7.5 16.5c-1.2-1.8-2.4-3.4-3.8-4.2l1.4-1.4c1.8.5 3.6.3 5.2-.7l3.3-3.3c.8-.8 1.4-1.8 1.8-2.9 1.7.8 3.2 2.3 4 4-1.1.4-2.1 1-2.9 1.8l-3.3 3.3c-1 1.6-1.2 3.4-.7 5.2l-1.4 1.4c-.8-1.4-2.4-2.6-4.2-3.8z" />
    </svg>
  );
};
