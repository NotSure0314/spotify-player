import React from 'react';

export interface SpotifyIconProps {
  size?: number;
  fill?: string;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
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
