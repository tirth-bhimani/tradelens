"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  // once: false ensures it re-triggers every time user scrolls it into view
  const isInView = useInView(ref, { once: false, margin: "-30px" });
  const [displayValue, setDisplayValue] = useState("0");

  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 24,
    stiffness: 75,
    mass: 0.8,
  });

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    } else {
      motionValue.set(0);
    }
  }, [isInView, motionValue, value]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      const num = Number(latest.toFixed(decimals));
      let formatted: string;

      if (prefix === "₹" || prefix === "-₹" || prefix === "+₹") {
        formatted = num.toLocaleString("en-IN", {
          maximumFractionDigits: decimals,
          minimumFractionDigits: decimals,
        });
      } else {
        formatted = num.toLocaleString(undefined, {
          maximumFractionDigits: decimals,
          minimumFractionDigits: decimals,
        });
      }

      setDisplayValue(formatted);
    });

    return () => unsubscribe();
  }, [springValue, decimals, prefix]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}
