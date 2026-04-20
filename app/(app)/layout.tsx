import { MobileTopBar, Sidebar } from "@/components/sidebar"
import { PageTransition } from "@/components/page-transition"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh flex-col md:flex-row">
      <MobileTopBar />
      <Sidebar />
      <main className="relative min-h-0 flex-1 overflow-hidden">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  )
}
