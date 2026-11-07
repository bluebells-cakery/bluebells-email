import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = { title: "Bluebells EDM", description: "Bluebells Cakery email marketing", icons: { icon: "/icon.png", apple: "/apple-icon.png" }, manifest: "/manifest.webmanifest" };

const nav = [
  ["/dashboard", "Dashboard"],
  ["/campaigns", "Campaigns"],
  ["/flows", "Flows"],
  ["/templates", "Templates"],
  ["/contacts", "Contacts"],
  ["/forms", "Forms"],
  ["/reviews", "Reviews"],
  ["/media", "Media"],
  ["/brand", "Brand"],
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 bg-white">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-8 px-6">
            <Link href="/" className="font-semibold tracking-tight">Bluebells <span className="text-brand">EDM</span></Link>
            <nav className="flex gap-6 text-sm text-black/70">
              {nav.map(([href, label]) => (
                <Link key={href} href={href} className="hover:text-black">{label}</Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
