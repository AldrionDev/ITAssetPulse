export const QRScanPage = () => {
  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">QR Scan</h2>

        <p className="mt-2 text-sm text-slate-600">
          Use this page to scan an asset QR code and open the asset detail page.
        </p>

        <div className="mt-6 flex min-h-64 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">
              QR scanner will appear here
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Camera scanning will be added in the next step.
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          After scanning, the app will redirect to the matching asset details
          page.
        </p>
      </section>
    </main>
  );
};
