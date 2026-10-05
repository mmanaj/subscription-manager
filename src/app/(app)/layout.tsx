import { BottomNav, TopNav } from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 pb-32 pt-6 sm:px-8 sm:pt-10 md:pb-16">{children}</main>
      <BottomNav />
    </>
  );
}
