import React from 'react';

interface SpotifyHomeIconProps {
  size?: number;
  color?: string;
  filled?: boolean;
}

export const SpotifyHomeIcon: React.FC<SpotifyHomeIconProps> = ({
  size = 24,
  color = 'currentColor'
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <path d="M12.5 2.5a1 1 0 0 0-1 0L2.5 8.5A1 1 0 0 0 2 9.3V21a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-6.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V21a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V9.3a1 1 0 0 0-.5-.8L12.5 2.5z" />
    </svg>
  );
};
