import React from "react";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export function Logo({
  size = "md",
  className = "",
  showText = true,
  ...props
}: LogoProps) {
  const sizeClasses = {
    sm: "h-6 text-base",
    md: "h-8 text-xl",
    lg: "h-10 text-2xl",
  }[size];

  return (
    <div
      className={`flex items-center gap-2.5 font-['Google_Sans_Flex'] select-none ${className}`}
      {...props}
    >
      {/* Yellow and Black Icon Graphic */}
      <div
        className={`relative  ${size === "sm" ? "w-10 h-6" : size === "lg" ? "w-16 h-12" : "w-14 h-8"}`}
      >
        <img src="/store-manager/logo.svg" alt="Logo image" />
      </div>

      {/* Brand Name Text */}
      {showText && (
        <span
          className={`font-bold tracking-tight  text-slate-900 ${sizeClasses}`}
        >
          Way<span className="text-slate-900 font-normal">Point</span>
        </span>
      )}
    </div>
  );
}
