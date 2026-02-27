"use client";

import Image from "next/image";

import { motion } from "framer-motion";


export default function FeaturedCard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="col-span-1 md:col-span-2 row-span-2 relative group overflow-hidden rounded-2xl bg-wbz-dark border border-white/10 hover:border-wbz-gold/50 transition-all duration-300"
    >
      {/* Background Image */}
         <div className="absolute inset-0 z-0">
         <Image 
            src="https://placehold.co/800x600/1a1a1a/333333?text=WANTED:+TOP+PLAYER" 
            alt="Featured Player" 
            fill
            className="object-cover opacity-60 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700 filter grayscale group-hover:grayscale-0"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-wbz-dark via-transparent to-transparent opacity-90" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-8 h-full flex flex-col justify-end">
        <div className="flex items-center gap-2 mb-2">
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                MOST WANTED
            </span>
            <span className="text-wbz-gold text-xs font-mono tracking-widest">
                PREDATOR RANK #1
            </span>
        </div>
        
        <h2 className="text-4xl font-black text-white mb-1 uppercase tracking-tighter">
            KILLER_BUNNY_99
        </h2>
        
        <div className="flex gap-8 mt-4 border-t border-white/10 pt-4">
            <div>
                <p className="text-wbz-mute text-xs font-mono mb-1">K/D RATIO</p>
                <p className="text-2xl font-bold text-wbz-gold font-mono">8.42</p>
            </div>
            <div>
                <p className="text-wbz-mute text-xs font-mono mb-1">HEADSHOT %</p>
                <p className="text-2xl font-bold text-white font-mono">42.1%</p>
            </div>
            <div>
                 <p className="text-wbz-mute text-xs font-mono mb-1">WIN RATE</p>
                 <p className="text-2xl font-bold text-white font-mono">33.5%</p>
            </div>
        </div>

        {/* Action Button */}
        <button className="mt-6 w-full py-3 bg-white/5 hover:bg-wbz-gold hover:text-black border border-white/10 rounded-lg text-sm font-bold tracking-widest transition-all duration-300">
            VIEW FULL DOSSIER
        </button>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-4 right-4 text-white/20 font-mono text-xs border border-white/10 px-2 py-1">
        CASE FILE: #X99-21
      </div>
    </motion.div>
  );
}
