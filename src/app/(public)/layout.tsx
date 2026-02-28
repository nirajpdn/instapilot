import Footer from "@/components/footer";
import Topbar from "../../components/top-bar";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen flex flex-col">
      <Topbar />
      <div className="space-y-5 pt-24 flex-1 shrink-0">{children}</div>
      <Footer />
    </div>
  );
}
