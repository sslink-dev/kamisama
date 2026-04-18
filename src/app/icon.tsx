import { ImageResponse } from 'next/og';

// Next.js App Router のアイコン規約: このファイルからファビコンを動的生成
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
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
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: -1,
          fontFamily: 'serif',
        }}
      >
        神
      </div>
    ),
    { ...size }
  );
}
