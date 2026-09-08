import { ObraNav } from "@/components/obra-nav";

export default async function ObraLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ obraId: string }>;
}) {
  const { obraId } = await params;

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <div className="no-print">
        <ObraNav obraId={obraId} />
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
