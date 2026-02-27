import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AdSlot from "@/components/layout/AdSlot";
import { Providers } from "./providers";

const SHOW_AD_PLACEHOLDERS = false;

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const robotoMono = Roboto_Mono({ subsets: ["latin"], variable: "--font-roboto-mono" });

export const metadata: Metadata = {
  title: "WBZ.GG | Tactical Bunker",
  description: "Advanced tactical interface for battle operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className={`${inter.variable} ${robotoMono.variable}`}>
      <body className="bg-gray-50 text-gray-900 dark:bg-dark-base dark:text-gray-200 font-sans antialiased selection:bg-wbz-gold selection:text-black">
        <Providers>
          <Navbar />
          <main className="min-h-screen pt-24 pb-20 relative">
            {/* Background Grid Pattern Overlay */}
            <div
              className="fixed inset-0 z-[-1] opacity-[0.03] pointer-events-none"
              style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "30px 30px" }}
            />

            <div className="mx-auto w-full max-w-[1760px] px-3 sm:px-4 lg:px-6">
              {SHOW_AD_PLACEHOLDERS ? (
                <section className="mb-4 hidden md:block">
                  <AdSlot type="top" align="center" />
                </section>
              ) : null}

              <div
                className={
                  SHOW_AD_PLACEHOLDERS
                    ? "grid grid-cols-1 2xl:grid-cols-[132px_minmax(0,1fr)_132px] gap-3 items-start"
                    : "mx-auto max-w-[1280px]"
                }
              >
                {SHOW_AD_PLACEHOLDERS ? (
                  <aside className="hidden 2xl:block">
                    <div className="sticky top-28">
                      <AdSlot type="side" align="left" />
                    </div>
                  </aside>
                ) : null}

                <div className="min-w-0">{children}</div>

                {SHOW_AD_PLACEHOLDERS ? (
                  <aside className="hidden 2xl:block">
                    <div className="sticky top-28">
                      <AdSlot type="side" align="right" />
                    </div>
                  </aside>
                ) : null}
              </div>
            </div>
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
