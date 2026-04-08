import type { ReactNode } from 'react';

export interface NavLogoProps {
  type: 'text' | 'image';
  text?: string;
  src?: string;
  srcLight?: string;
  srcDark?: string;
  alt?: string;
}

export function NavLogo({ type, text, src, srcLight, srcDark, alt }: NavLogoProps): ReactNode {
  if (type === 'text') {
    return text ?? '';
  }

  const imageSrc = src ?? srcLight;
  if (srcLight && srcDark && srcLight !== srcDark) {
    return (
      <>
        <img src={srcLight} alt={alt} style={{ height: 28 }} className="dark:hidden" />
        <img src={srcDark} alt={alt} style={{ height: 28 }} className="hidden dark:block" />
      </>
    );
  }

  return <img src={imageSrc} alt={alt} style={{ height: 28 }} />;
}
