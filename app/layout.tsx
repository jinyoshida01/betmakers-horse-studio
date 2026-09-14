import type { Metadata } from 'next';
import { Figtree, Anton_SC } from 'next/font/google';
import './globals.css';

const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
  display: 'swap',
});

const antonSC = Anton_SC({
  variable: '--font-anton-sc',
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Betmakers Horse Studio',
  icons: { icon: '/favicon.svg' },
  description: 'Explore the Blender chestnut horse in idle or running animation. Rotate the view and download your perfect frame.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${figtree.variable} ${antonSC.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
