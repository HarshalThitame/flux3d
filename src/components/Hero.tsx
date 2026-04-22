'use client'
import {motion} from 'framer-motion'

export default function Hero() {
    return (
        <section className="min-h-screen flex flex-col items-center justify-center bg-[#050810]">
            <motion.div
                initial={{opacity: 0, y: 40}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.7}}
            >
                {/* Your SVG printer animation here */}
            </motion.div>
        </section>
    )
}