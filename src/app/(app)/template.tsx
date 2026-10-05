// Re-mounts on every navigation, so each screen gets a short fade instead of popping in.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="fade-in">{children}</div>;
}
