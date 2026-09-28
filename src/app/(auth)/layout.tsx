export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-muted/40 p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.97_0_0),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.25_0_0),transparent_50%)]" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
