/** Salón fills the dashboard pane; the table grid scrolls inside this subtree. */
export default function FloorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-floor-layout
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      {children}
    </div>
  );
}
