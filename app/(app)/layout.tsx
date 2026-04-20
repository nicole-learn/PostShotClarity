import { MobileTopBar, Sidebar } from "@/components/sidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh flex-col md:flex-row">
      <MobileTopBar />
      <Sidebar />
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
