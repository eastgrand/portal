export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Test layout wrapper */}
      <div className="flex min-h-screen w-full flex-col">
        {children}
      </div>
    </>
  );
}