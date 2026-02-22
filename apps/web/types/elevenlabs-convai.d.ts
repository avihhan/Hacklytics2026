import type { DetailedHTMLProps, HTMLAttributes } from "react";

type ElevenLabsConvaiElement = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  "agent-id": string;
  variant?: "compact" | "expanded";
  dismissible?: "true" | "false";
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "elevenlabs-convai": ElevenLabsConvaiElement;
    }
  }
}
