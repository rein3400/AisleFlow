import type { ReactNode } from "react";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import "./guest.css";

const guestDisplayFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--guest-font-display",
  weight: ["500", "600", "700"],
});

const guestBodyFont = Manrope({
  subsets: ["latin"],
  variable: "--guest-font-body",
  weight: ["400", "500", "600", "700", "800"],
});

export default function GuestLayout({ children }: { children: ReactNode }) {
  return <div className={`${guestDisplayFont.variable} ${guestBodyFont.variable} guest-theme`}>{children}</div>;
}
