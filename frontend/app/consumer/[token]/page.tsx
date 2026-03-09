export default function ConsumerPage({ params }: { params: { token: string } }) {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="card">
        <h1 className="text-2xl font-bold">Product Traceability (Consumer View)</h1>
        <p className="text-sm text-slate-500">QR Token: {params.token}</p>

        <div className="mt-4 space-y-3 text-sm">
          <p><b>Farm Information:</b> Green Valley Farm, Dak Lak</p>
          <p><b>Harvest Date:</b> 2026-03-01</p>
          <p><b>Production Process:</b> Sorted, packed, cold-chain dispatched</p>
          <p><b>Certifications:</b> VietGAP, Local Safety Inspection</p>
          <p><b>Supply Chain History:</b> Farm → Processor → Warehouse → Retailer</p>
        </div>
      </div>
    </div>
  );
}
