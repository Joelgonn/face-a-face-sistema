import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ServiceWorkerRegister } from "@/app/components/ServiceWorkerRegister";

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

export const metadata: Metadata = {
  title: "Face a Face - Igreja Batista Apascentar",
  description: "Sistema de controle de medicação e check-in para eventos",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Face a Face",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#ea580c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        
        {/* 🔥 FIX 3: Apenas o ServiceWorkerRegister - sem script manual duplicado */}
        <ServiceWorkerRegister />
        
        {/* 🔥 Script mínimo apenas para logs e PWA detection (não registra SW) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
                const isPWA = window.matchMedia('(display-mode: standalone)').matches;
                
                console.log('[PWA] Modo:', isPWA ? 'instalado' : 'navegador');
                console.log('[PWA] Ambiente:', isLocalDev ? 'desenvolvimento' : 'producao');
                
                window.addEventListener('online', () => console.log('[PWA] Conexão restaurada'));
                window.addEventListener('offline', () => console.log('[PWA] Conexão perdida'));
              }
            `,
          }}
        />
      </body>
    </html>
  );
}