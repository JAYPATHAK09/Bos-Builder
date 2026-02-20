import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BOS Builder — Business Operating System',
  description: 'Build a complete Business Operating System for your clients in hours, not months.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-slate-100 text-slate-900 font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
