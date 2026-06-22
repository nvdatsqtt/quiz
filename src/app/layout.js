import localFont from "next/font/local";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next"
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PointsProvider } from "@/context/PointsContext";
import { AuthProvider } from "@/context/AuthContext";


const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "Website trắc nghiệm",
  description: "Hệ thống ôn luyện trắc nghiệm nội bộ",
  icons: {
    icon: "/images/vietnam-flag.svg",
    apple: "/images/vietnam-flag.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <PointsProvider>
            <Header />
            <main className="min-h-screen">{children}</main>
            <SpeedInsights />
            <Footer />
          </PointsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
