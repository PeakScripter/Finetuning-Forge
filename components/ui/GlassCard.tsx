import { HTMLMotionProps, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    gradient?: boolean;
}

export function GlassCard({
    children,
    className,
    gradient = false,
    ...props
}: GlassCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={cn(
                "relative overflow-hidden rounded-xl border border-glass-border bg-glass-100 backdrop-blur-md p-6",
                gradient &&
                "before:absolute before:-top-24 before:-right-24 before:h-48 before:w-48 before:rounded-full before:bg-forge-orange/10 before:blur-3xl after:absolute after:-bottom-24 after:-left-24 after:h-48 after:w-48 after:rounded-full after:bg-forge-amber/10 after:blur-3xl",
                className
            )}
            {...props}
        >
            <div className="relative z-10 h-full w-full">{children}</div>
        </motion.div>
    );
}
