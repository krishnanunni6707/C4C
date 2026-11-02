"use client";

import React from "react";
import PaymentSuccessView from "@/components/payment/PaymentSuccessView";

export interface SuccessSheetProps {
  isOpen: boolean;
  onClose: () => void;
  tokenNumber: string;
  jobId?: string;
  queueAheadCount?: number;
  estimatedWaitMinutes?: number;
  onViewTokenSlip?: () => void;
  onBackToHome?: () => void;
}

export default function SuccessSheet({
  isOpen,
  onClose,
  tokenNumber,
  jobId,
  queueAheadCount = 2,
  estimatedWaitMinutes = 3,
  onViewTokenSlip,
  onBackToHome,
}: SuccessSheetProps) {
  if (!isOpen) return null;

  return (
    <PaymentSuccessView
      tokenNumber={tokenNumber}
      jobId={jobId}
      queueAheadCount={queueAheadCount}
      estimatedWaitMinutes={estimatedWaitMinutes}
      onClose={onClose}
      onBackToHome={onBackToHome}
      showSubtitle={false}
      containerClassName="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-200"
    />
  );
}
