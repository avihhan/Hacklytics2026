import React from "react";

type Props = {
  className?: string;
  title?: string;
};

export default function TaxPilotIcon({
  className,
  title = "TaxPilot",
}: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id="taxpilotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399">
            <animate
              attributeName="stop-color"
              values="#34D399; #22D3EE; #34D399"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>

      <path
        d="M20 100 L160 30 L160 60 L120 80 L120 105 L80 125 L80 145 L20 175 Z 
           M160 60 L160 130 
           M120 105 L120 155 
           M80 145 L80 180"
        stroke="url(#taxpilotGradient)"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}