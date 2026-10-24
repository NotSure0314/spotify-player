import React from 'react';

interface SpotifyLogoProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const SpotifyLogo: React.FC<SpotifyLogoProps> = ({
  size = 32,
  color = '#ffffff',
  className = '',
  style = {}
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
      aria-label="Spotify"
    >
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.498 17.306c-.215.353-.674.464-1.027.249-2.812-1.718-6.353-2.107-10.522-1.155-.404.092-.81-.161-.902-.565-.092-.403.161-.81.565-.902 4.567-1.043 8.49-.605 11.637 1.346.353.215.464.674.249 1.027zm1.468-3.262c-.27.44-.848.58-1.288.31-3.218-1.978-8.125-2.55-11.932-1.393-.497.151-1.026-.135-1.177-.633-.152-.498.134-1.027.632-1.178 4.356-1.322 9.776-.682 13.455 1.58.44.27.58.847.31 1.288zm.126-3.41c-3.858-2.29-10.222-2.502-13.896-1.387-.59.18-1.22-.16-1.399-.75-.18-.59.16-1.22.75-1.4 4.225-1.283 11.26-1.037 15.717 1.61.53.315.705 1.004.39 1.535-.314.53-1.003.705-1.535.39z" />
    </svg>
  );
};
