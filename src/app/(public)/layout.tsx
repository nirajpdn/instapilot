import Footer from "@/components/footer";
import Topbar from "../../components/top-bar";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <Topbar />
      <div className="space-y-5">{children}</div>
      <Footer />
    </div>
  );
}
