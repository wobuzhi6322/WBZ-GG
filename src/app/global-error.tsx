"use client";

import { AlertOctagon } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-black text-white flex items-center justify-center h-screen">
        <div className="text-center p-8 bg-red-900/20 border border-red-500/50 rounded-xl max-w-lg">
          <AlertOctagon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-3xl font-black mb-4">CRITICAL KERNEL PANIC</h2>
          <p className="text-red-300 mb-8 font-mono text-xs text-left p-4 bg-black/50 rounded border border-red-500/20">
             ErrorCode: {error.digest || "UNKNOWN_EXCEPTION"}
             <br/>
             {error.message}
          </p>
          <button 
            onClick={() => reset()}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded transition-colors"
          >
            FORCE RESTART
          </button>
        </div>
      </body>
    </html>
  );
}
