"use client";

import ToastContainer from "@/components/Toast";
import LiquidMorphLoader from "@/components/ui/LiquidMorphLoader";

export default function ClientShellOverlays() {
  return (
    <>
      <LiquidMorphLoader />
      <ToastContainer />
    </>
  );
}
