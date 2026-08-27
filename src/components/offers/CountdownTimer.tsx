"use client";

import { useEffect, useState } from "react";

type CountdownProps = {
  targetDate: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  light?: boolean;
  variant?: "default" | "light" | "luxury" | "luxury-dark";
};

function getTimeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function CountdownTimer({
  targetDate,
  className = "",
  size = "md",
  light = false,
  variant,
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;

  const effectiveVariant = variant ?? (light ? "light" : "default");

  const sizeClasses =
    size === "sm"
      ? "text-xs gap-1"
      : size === "lg"
        ? "text-lg gap-3"
        : "text-sm gap-2";
  const numClasses =
    size === "sm" ? "text-sm" : size === "lg" ? "text-3xl" : "text-xl";
  const labelClasses =
    size === "sm" ? "text-[8px]" : size === "lg" ? "text-xs" : "text-[10px]";

  const colorStyles = {
    default: {
      num: { color: "#6d28d9" },
      label: { color: "#6F7192" },
      sep: { color: "#6d28d9" },
    },
    light: {
      num: { color: "#ffffff" },
      label: { color: "rgba(255,255,255,0.7)" },
      sep: { color: "#ffffff" },
    },
    luxury: {
      num: { color: "#C9A962" },
      label: { color: "rgba(201, 169, 98, 0.6)" },
      sep: { color: "rgba(201, 169, 98, 0.7)" },
    },
    "luxury-dark": {
      num: { color: "#8A6D2F" },
      label: { color: "rgba(28, 25, 23, 0.55)" },
      sep: { color: "#8A6D2F" },
    },
  };

  const colors = colorStyles[effectiveVariant];

  return (
    <div className={`inline-flex items-center ${sizeClasses} ${className}`}>
      {[
        { value: timeLeft.days, label: "Days" },
        { value: timeLeft.hours, label: "Hrs" },
        { value: timeLeft.minutes, label: "Min" },
        { value: timeLeft.seconds, label: "Sec" },
      ].map((unit, i) => (
        <div key={unit.label} className="flex items-center">
          <div className="flex flex-col items-center">
            <span
              className={`font-bold ${numClasses} tabular-nums`}
              style={colors.num}
            >
              {String(unit.value).padStart(2, "0")}
            </span>
            <span
              className={`uppercase tracking-wider ${labelClasses}`}
              style={colors.label}
            >
              {unit.label}
            </span>
          </div>
          {i < 3 && (
            <span
              className={`font-bold ${numClasses} mx-1 sm:mx-1.5`}
              style={colors.sep}
            >
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
