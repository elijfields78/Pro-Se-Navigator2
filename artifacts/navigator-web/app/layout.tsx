import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ProSe Navigator',
  description:
    'From grievance to filed complaint — guided, verified, and honest. Not legal advice; not a law firm.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
