"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <div className="bg-wbz-card border border-wbz-gold/30 rounded-2xl p-12 max-w-md w-full relative overflow-hidden">
        {/* Background Glitch Effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-wbz-gold to-transparent opacity-50 animate-pulse"></div>
        
        <div className="flex justify-center mb-6">
            <AlertTriangle className="w-16 h-16 text-wbz-gold animate-bounce" />
        </div>
        
        <h2 className="text-6xl font-black text-white mb-2">404</h2>
        <h3 className="text-xl font-bold text-wbz-gold mb-4 uppercase tracking-widest">Signal Lost</h3>
        <p className="text-wbz-mute mb-8">
          The requested tactical frequency could not be established. 
          The page you are looking for may have been compromised or moved.
        </p>

        <Link 
            href="/"
            className="inline-block w-full py-3 bg-white/10 text-white font-bold rounded hover:bg-wbz-gold hover:text-black transition-colors"
        >
            RETURN TO BASE
        </Link>
      </div>
    </div>
  );
}
