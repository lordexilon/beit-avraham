import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beit Avraham · Tu casa de estudio",
  description: "Un espacio para aprender, preguntar y profundizar en las fuentes del judaísmo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
