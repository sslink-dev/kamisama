import { ImageResponse } from 'next/og';

// iOS Safari 用の大きめアイコン
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F76FAB',
          color: 'white',
          fontSize: 128,
          fontWeight: 700,
          fontFamily: 'serif',
        }}
      >
        神
      </div>
    ),
    { ...size }
  );
}
