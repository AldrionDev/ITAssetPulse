import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

interface Asset {
  _id: string;
  name: string;
  serialNumber: string;
}

interface QRModalProps {
  asset: Asset;
  onClose: () => void;
}

export const QRModal = ({ asset, onClose }: QRModalProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    const windowUrl = "about:blank";
    const windowName = "Print" + new Date().getTime();
    const printWindow = window.open(
      windowUrl,
      windowName,
      "width=600,height=600",
    );

    if (printWindow && printContent) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR - ${asset.name}</title>
            <style>
              body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; }
              .container { text-align: center; padding: 20px; border: 1px solid #ccc; border-radius: 10px; }
              h1 { margin: 10px 0; font-size: 20px; }
              p { margin: 0; font-family: monospace; }
            </style>
          </head>
          <body>
            <div class="container">
              ${printContent.innerHTML}
              <h1>${asset.name}</h1>
              <p>S/N: ${asset.serialNumber}</p>
            </div>
            <script>
              setTimeout(() => { window.print(); window.close(); }, 500);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-100 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center">
        <h3 className="text-2xl font-bold text-gray-800 mb-1">{asset.name}</h3>
        <p className="text-gray-500 mb-6 font-mono text-sm">
          {asset.serialNumber}
        </p>

        <div
          ref={printRef}
          className="bg-white p-4 inline-block border rounded-2xl mb-8"
        >
          <QRCodeSVG value={`/assets/${asset._id}`} size={200} level="H" />
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handlePrint}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg"
          >
            Print Label
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
