"use client";

import Image from "next/image";

import { motion } from "framer-motion";
import { ThumbsUp } from "lucide-react";

export default function SkinWorldcupCard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="col-span-1 md:col-span-1 row-span-2 relative bg-wbz-card rounded-2xl border border-white/10 overflow-hidden flex flex-col"
    >
      <div className="p-4 border-b border-white/5 flex justify-between items-center">
        <h3 className="text-wbz-gold font-bold text-sm tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            LIVE VOTE
        </h3>
        <span className="text-xs text-wbz-mute font-mono">ROUND 4/16</span>
      </div>

      <div className="flex-1 relative">
        {/* Split View */}
        <div className="absolute inset-0 flex flex-col">
            {/* Top Candidate */}
            <div className="flex-1 relative group cursor-pointer border-b border-wbz-dark/50">
                <Image 
                    src="https://placehold.co/400x200/1a1a1a/F2A900?text=M416+GLACIER" 
                    fill
                    className="object-cover opacity-50 group-hover:opacity-80 transition-opacity"
                    alt="Skin A"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <button className="bg-wbz-gold text-black px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2">
                        <ThumbsUp className="w-3 h-3" /> VOTE
                    </button>
                </div>
                <div className="absolute bottom-2 left-2">
                    <span className="text-xs font-bold text-white bg-black/50 px-2 py-1 rounded">M416 GLACIER</span>
                </div>
            </div>

            {/* VS Badge */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-black border border-wbz-gold text-wbz-gold font-black italic rounded-full w-10 h-10 flex items-center justify-center text-xs shadow-xl">
                VS
            </div>

            {/* Bottom Candidate */}
            <div className="flex-1 relative group cursor-pointer">
                <Image 
                    src="https://placehold.co/400x200/1a1a1a/888888?text=M416+FOOL" 
                    fill
                    className="object-cover opacity-50 group-hover:opacity-80 transition-opacity"
                    alt="Skin B"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <button className="bg-wbz-gold text-black px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2">
                        <ThumbsUp className="w-3 h-3" /> VOTE
                    </button>
                </div>
                 <div className="absolute bottom-2 left-2">
                    <span className="text-xs font-bold text-white bg-black/50 px-2 py-1 rounded">M416 THE FOOL</span>
                </div>
            </div>
        </div>
      </div>
      
      <div className="p-3 bg-white/5 border-t border-white/5 text-center">
        <p className="text-xs text-wbz-mute">Select your weapon of choice</p>
      </div>
    </motion.div>
  );
}
