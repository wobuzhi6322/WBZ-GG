export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-wbz-dark text-white">
      <div className="relative w-16 h-16 mb-4">
        {/* Spinner Ring */}
        <div className="absolute inset-0 border-4 border-white/10 border-t-wbz-gold rounded-full animate-spin"></div>
        {/* Inner Pulse */}
        <div className="absolute inset-4 bg-wbz-gold/20 rounded-full animate-pulse"></div>
      </div>
      <div className="font-mono text-sm text-wbz-gold tracking-widest animate-pulse">
        ESTABLISHING UPLINK...
      </div>
    </div>
  );
}
