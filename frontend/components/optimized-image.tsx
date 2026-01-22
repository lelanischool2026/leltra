"use client";

import Image from "next/image";
import { useState } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = "",
  priority = false,
  fill = false,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={`relative overflow-hidden ${fill ? "w-full h-full" : ""}`}>
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        quality={85}
        className={`
          ${className}
          duration-300 ease-in-out
          ${isLoading ? "scale-105 blur-sm" : "scale-100 blur-0"}
        `}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}

// Simple logo component with built-in optimization
export function Logo({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: { width: 32, height: 32, className: "h-8 w-8" },
    md: { width: 48, height: 48, className: "h-12 w-12" },
    lg: { width: 80, height: 80, className: "h-20 w-20" },
    xl: { width: 128, height: 128, className: "h-32 w-32" },
  };

  const { width, height, className: sizeClass } = sizes[size];

  return (
    <Image
      src="/lslogo.webp"
      alt="Lelani School Logo"
      width={width}
      height={height}
      className={`${sizeClass} ${className}`}
      priority={size === "xl" || size === "lg"}
    />
  );
}
