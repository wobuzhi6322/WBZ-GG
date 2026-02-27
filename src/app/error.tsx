"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-12 max-w-md w-full">
        <div className="flex justify-center mb-6">
            <AlertCircle className="w-16 h-16 text-red-500" />
        </div>
        
        <h2 className="text-3xl font-black text-white mb-2">SYSTEM FAILURE</h2>
        <p className="text-red-400 mb-8 font-mono text-sm">
          CRITICAL ERROR: {error.message || "Unknown anomaly detected."}
        </p>

        <button
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 w-full py-3 bg-red-500 text-white font-bold rounded hover:bg-red-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          REBOOT SYSTEM
        </button>
      </div>
    </div>
  );
}
