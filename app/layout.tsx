import type { Metadata } from "next";
import { Rethink_Sans } from "next/font/google";
import "./globals.css";

const rethinkSans = Rethink_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-rethink',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Marketing Cloud Meetup Quiz",
  description: "Marketing Cloud Meetup Quiz",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={rethinkSans.variable}>
      <body className="antialiased font-rethink">
        {children}
      </body>
    </html>
  );
}
