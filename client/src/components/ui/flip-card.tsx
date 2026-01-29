import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FlipCardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  className?: string;
  height?: string;
  isFlipped?: boolean;
  onFlip?: (flipped: boolean) => void;
  delay?: number;
  onClick?: () => void;
}

export default function FlipCard({
  frontContent,
  backContent,
  className,
  height = "h-40",
  isFlipped: externalIsFlipped,
  onFlip,
  delay = 0,
  onClick,
}: FlipCardProps) {
  const [internalIsFlipped, setInternalIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const isFlipped = externalIsFlipped !== undefined ? externalIsFlipped : internalIsFlipped;

  const handleCardClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    
    const newFlipped = !isFlipped;
    if (externalIsFlipped === undefined) {
      setInternalIsFlipped(newFlipped);
    }
    onFlip?.(newFlipped);
  };

  // Smoother transition configuration
  const smoothTransition = {
    duration: 0.8,
    ease: [0.4, 0.0, 0.2, 1], // Custom cubic-bezier for smooth motion
    delay: delay,
  };

  // Subtle hover effects
  const hoverVariants = {
    initial: { 
      scale: 1,
      y: 0,
    },
    hover: { 
      scale: 1.02,
      y: -5,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      }
    }
  };

  // Smooth flip animation
  const cardVariants = {
    front: {
      rotateY: 0,
      transition: smoothTransition,
    },
    back: {
      rotateY: 180,
      transition: smoothTransition,
    }
  };

  // Glow effect during animation
  const glowEffect = isAnimating ? "drop-shadow-lg shadow-blue-500/25" : "";

  useEffect(() => {
    if (delay > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), (delay * 1000) + 600);
      return () => clearTimeout(timer);
    }
  }, [delay, isFlipped]);

  return (
    <motion.div
      className={cn(
        "relative cursor-pointer",
        height,
        className
      )}
      style={{ 
        perspective: "1000px",
        transformStyle: "preserve-3d"
      }}
      variants={hoverVariants}
      initial="initial"
      animate={isHovered ? "hover" : "initial"}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleCardClick}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        variants={cardVariants}
        animate={isFlipped ? "back" : "front"}
      >
        {/* Front Face */}
        <div
          className="absolute inset-0 w-full h-full rounded-xl"
          style={{ backfaceVisibility: "hidden" }}
        >
          {frontContent}
        </div>

        {/* Back Face */}
        <div
          className="absolute inset-0 w-full h-full rounded-xl"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {backContent}
        </div>
      </motion.div>
    </motion.div>
  );
}