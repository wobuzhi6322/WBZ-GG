"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const AGENTS = [
    { name: "ASSAULT", role: "Attacker", desc: "Frontline combat specialist.", img: "https://images.unsplash.com/photo-1542261777-4badfa41ed47?auto=format&fit=crop&q=80&w=400" },
    { name: "RECON", role: "Scout", desc: "Gathering intel and enemy positions.", img: "https://images.unsplash.com/photo-1595433707802-6b2626ef1c91?auto=format&fit=crop&q=80&w=400" },
    { name: "SUPPORT", role: "Medic", desc: "Keeping the squad alive.", img: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&q=80&w=400" },
    { name: "SNIPER", role: "Specialist", desc: "Long-range engagement.", img: "https://images.unsplash.com/photo-1569012871812-f38ee64cd54c?auto=format&fit=crop&q=80&w=400" },
];

export default function AgentsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-4xl font-black text-white mb-2">AGENTS</h1>
        <p className="text-wbz-mute mb-8">SELECT YOUR OPERATOR</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {AGENTS.map((agent, i) => (
                <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="group relative bg-wbz-card border border-white/5 rounded-2xl overflow-hidden hover:border-wbz-gold/50 transition-colors"
                >
                    <div className="h-64 relative">
                        <Image 
                            src={agent.img}
                            fill
                            alt={agent.name}
                            className="object-cover group-hover:scale-110 transition-transform duration-500 filter grayscale group-hover:grayscale-0"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                        <div className="absolute bottom-4 left-4">
                            <span className="text-xs text-wbz-gold font-bold uppercase tracking-widest">{agent.role}</span>
                            <h2 className="text-2xl font-black text-white italic">{agent.name}</h2>
                        </div>
                    </div>
                    <div className="p-4">
                        <p className="text-sm text-wbz-mute">{agent.desc}</p>
                        <Link
                          href={`/profile/${encodeURIComponent(agent.name)}`}
                          className="block w-full mt-4 py-2 border border-white/10 rounded text-xs font-bold hover:bg-wbz-gold hover:text-black transition-colors text-center"
                        >
                          VIEW DETAILS
                        </Link>
                    </div>
                </motion.div>
            ))}
        </div>
    </div>
  );
}
