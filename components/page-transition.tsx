export function PageTransition({ children }: { children: React.ReactNode }) {
  return <div className="h-full animate-page-in">{children}</div>
}
