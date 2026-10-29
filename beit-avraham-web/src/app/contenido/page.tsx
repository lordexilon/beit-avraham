import type { Metadata } from "next";
import ContentAdmin from "../../components/ContentAdmin";

export const metadata: Metadata = {
  title: "Contenido · Beit Avraham",
  robots: { index: false, follow: false }
};

export default function ContenidoPage() {
  return <ContentAdmin />;
}
