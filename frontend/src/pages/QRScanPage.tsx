import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";

const getAssetIdFromQrValue = (value: string) => {
  const trimmedValue = value.trim();

  if (trimmedValue.includes("/assets/")) {
    const parts = trimmedValue.split("/assets/");
    return parts[1]?.split("?")[0]?.split("#")[0];
  }

  return trimmedValue;
};

export const QRScanPage = () => {
  const navigate = useNavigate();
  const reactId = useId();
  const scannerElementId = `qr-reader-${reactId.replaceAll(":", "")}`;

  const [errorMessage, setErrorMessage] = useState("");
  const hasScannedRef = useRef(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const startScanner = async () => {
      const scannerElement = document.getElementById(scannerElementId);

      if (!scannerElement || scannerRef.current) {
        return;
      }

      scannerElement.innerHTML = "";

      const scanner = new Html5Qrcode(scannerElementId);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (isCancelled || hasScannedRef.current) {
              return;
            }

            const assetId = getAssetIdFromQrValue(decodedText);

            if (!assetId) {
              setErrorMessage("Invalid QR code. No asset id found.");
              return;
            }

            hasScannedRef.current = true;
            navigate(`/assets/${assetId}`);
          },
          () => {
            // Ignore normal scan errors.
          },
        );
      } catch {
        if (!isCancelled) {
          setErrorMessage(
            "Could not start the camera. Please allow camera access and try again.",
          );
        }
      }
    };

    startScanner();

    return () => {
      isCancelled = true;
      hasScannedRef.current = false;

      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner?.isScanning) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {
            // Ignore cleanup errors.
          });
      }

      const scannerElement = document.getElementById(scannerElementId);

      if (scannerElement) {
        scannerElement.innerHTML = "";
      }
    };
  }, [navigate, scannerElementId]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">QR Scan</h2>

        <p className="mt-2 text-sm text-slate-600">
          Scan an asset QR code to open the asset details page.
        </p>

        {errorMessage && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div id={scannerElementId} />
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Accepted QR values: full asset URL, /assets/id path, or only the asset
          id.
        </p>
      </section>
    </main>
  );
};
