export default function ProjectsLayout({ 
  children, 
  dialog 
}: { 
  children: React.ReactNode;
  dialog: React.ReactNode;
}) {
  return (
    <>
      {children}
      {dialog}
    </>
  );
} 