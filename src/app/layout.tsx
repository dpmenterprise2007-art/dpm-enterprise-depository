import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DPM Enterprise | Business Platform',
  description: 'DPM Enterprise Private Limited unified business workspace.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
