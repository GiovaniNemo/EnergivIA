"use client";

import { useEffect } from "react";
import { captureReferralCode } from "@/lib/referral-tracker";

export function ReferralCapture(): null {
  useEffect(() => {
    captureReferralCode();
  }, []);

  return null;
}
