import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";

import MobileShell from "@/components/mobile/MobileShell";
import MobileHeader from "@/components/mobile/MobileHeader";
import BottomTabBar from "@/components/mobile/BottomTabBar";
import SegmentTabs from "@/components/mobile/SegmentTabs";
import StepHeader from "@/components/mobile/StepHeader";
import UploadStepper from "@/components/mobile/UploadStepper";
import FileDropArea from "@/components/mobile/FileDropArea";
import UploadedFileRow from "@/components/mobile/UploadedFileRow";
import LocationCard from "@/components/mobile/LocationCard";
import PreferenceRadioCard from "@/components/mobile/PreferenceRadioCard";
import CopiesStepper from "@/components/mobile/CopiesStepper";
import PaymentSheet from "@/components/mobile/PaymentSheet";
import SuccessSheet from "@/components/mobile/SuccessSheet";
import ActiveJobCard from "@/components/mobile/ActiveJobCard";
import NotificationsSheet from "@/components/mobile/NotificationsSheet";
import TokenSlipTicket from "@/components/mobile/TokenSlipTicket";
import MobileLandingView from "@/components/mobile/MobileLandingView";
import ProfileButton from "@/components/mobile/ProfileButton";
import ProfileSheet from "@/components/mobile/ProfileSheet";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: {
        id: "student-1",
        name: "Aarav Nair",
        email: "aarav@campus.edu",
        admissionNumber: "ADM2024CS042",
        department: "Computer Science",
        semester: 5,
      },
    },
    status: "authenticated",
  }),
  signOut: vi.fn(),
}));

vi.mock("@/contexts/NotificationContext", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 1,
    markRead: () => {},
    markAllRead: () => {},
  }),
}));

describe("Student Mobile Redesign (10 Screens) Unit Tests", () => {
  it("Screen 1: MobileLandingView renders heading, tilted phone preview, action buttons and pager dots", () => {
    const html = renderToString(
      <MobileLandingView onStartPrinting={() => {}} onSeeHowItWorks={() => {}} />
    );
    expect(html).toContain("Print on campus.");
    expect(html).toContain("Skip the line.");
    expect(html).toContain("Upload, configure and pay for your documents online.");
    expect(html).toContain("Start printing");
    expect(html).toContain("See how it works");
    expect(html).toContain("RP1042");
  });

  it("Screen 2: LocationCard renders center details, open/closed pill, queue wait, and radio check", () => {
    const html = renderToString(
      <LocationCard
        location={{
          id: "loc-1",
          name: "Main Print",
          openTime: "8:00 AM",
          closeTime: "6:00 PM",
          isOpen: true,
          queueAhead: 3,
          estWaitMinutes: 4,
          printersCount: 5,
        }}
        isSelected={true}
        onSelect={() => {}}
      />
    );
    expect(html).toContain("Main Print");
    expect(html).toContain("Open");
    expect(html).toContain("3 ahead • ~4 min");
    expect(html).toContain("5 printers");
    expect(html).toContain("border-indigo-600");
  });

  it("Screen 7: UploadStepper, FileDropArea, and UploadedFileRow render upload step", () => {
    const stepperHtml = renderToString(<UploadStepper currentStep={1} />);
    expect(stepperHtml).toContain("Upload");
    expect(stepperHtml).toContain("Edit");
    expect(stepperHtml).toContain("Confirm");
    expect(stepperHtml).toContain("Pay");

    const dropHtml = renderToString(<FileDropArea onFilesSelected={() => {}} />);
    expect(dropHtml).toContain("Drag &amp; drop your files here");
    expect(dropHtml).toContain("Choose Files");

    const rowHtml = renderToString(
      <UploadedFileRow
        file={{
          id: "f-1",
          name: "Operating_Systems_Notes.pdf",
          sizeBytes: 2.8 * 1024 * 1024,
          pageCount: 24,
        }}
        onRemove={() => {}}
      />
    );
    expect(rowHtml).toContain("Operating_Systems_Notes.pdf");
    expect(rowHtml).toContain("24 pages");
  });

  it("Screen 4: Print Preferences excludes Page Range and renders radios and stepper", () => {
    const radio1 = renderToString(
      <PreferenceRadioCard
        label="Black & White"
        priceTag="₹2 / sheet"
        isSelected={false}
        onSelect={() => {}}
      />
    );
    const radio2 = renderToString(
      <PreferenceRadioCard
        label="Color"
        priceTag="₹5 / sheet"
        isSelected={true}
        onSelect={() => {}}
      />
    );
    const stepper = renderToString(<CopiesStepper value={2} onChange={() => {}} />);

    expect(radio1).toContain("Black");
    expect(radio1).toContain("White");
    expect(radio1).toContain("₹2 / sheet");
    expect(radio2).toContain("Color");
    expect(radio2).toContain("₹5 / sheet");
    expect(stepper).toContain("2");

    // Strictly ensure no page range
    expect(radio1).not.toContain("Page Range");
    expect(radio2).not.toContain("Page Range");
  });

  it("Screen 5: PaymentSheet renders complete payment, breakdown, and secured badges", () => {
    const html = renderToString(
      <PaymentSheet
        isOpen={true}
        onClose={() => {}}
        subtotal={72}
        tokenCharge={1}
        total={68}
        onPay={() => {}}
      />
    );
    expect(html).toContain("Complete payment");
    expect(html).toContain("Subtotal");
    expect(html).toContain("Token charge");
    expect(html).toContain("68.00");
    expect(html).toContain("Pay securely");
    expect(html).toContain("Secured by Razorpay");
    expect(html).toContain("UPI");
    expect(html).toContain("VISA");
    expect(html).toContain("RuPay");
  });

  it("Screen 6: SuccessSheet renders payment successful with burst animation and token box", () => {
    const html = renderToString(
      <SuccessSheet
        isOpen={true}
        onClose={() => {}}
        tokenNumber="RP1042"
        queueAheadCount={2}
        estimatedWaitMinutes={3}
      />
    );
    expect(html).toContain("Payment successful!");
    expect(html).toContain("RP1042");
    expect(html).toContain("ahead • ~");
    expect(html).toContain("View token slip");
    expect(html).toContain("Back to home");
  });

  it("Screen 8: ActiveJobCard renders printing status, token, tracker, stat boxes, and QR", () => {
    const html = renderToString(
      <ActiveJobCard
        job={{
          id: "job-rp1042",
          tokenNumber: "RP1042",
          fileName: "Operating_Systems_Notes.pdf",
          status: "PRINTING",
          amount: 68.0,
          totalPages: 24,
          copies: 2,
          colorMode: "COLOR",
          printType: "double-sided",
          createdAt: new Date().toISOString(),
        }}
        queuePosition={2}
        estWaitMinutes={3}
      />
    );
    expect(html).toContain("Printing");
    expect(html).toContain("RP1042");
    expect(html).toContain("Operating_Systems_Notes.pdf");
    expect(html).toContain("Waiting");
    expect(html).toContain("Ready");
    expect(html).toContain("Queue Position");
    expect(html).toContain("in line");
    expect(html).toContain("Est. Wait");
    expect(html).toContain("min");
    expect(html).toContain("Open token slip");
  });

  it("Screen 9: NotificationsSheet renders notification items and mark all read", () => {
    const html = renderToString(
      <NotificationsSheet isOpen={true} onClose={() => {}} />
    );
    expect(html).toContain("Notifications");
    expect(html).toContain("Mark all read");
    expect(html).toContain("Your job RP1042 is now Printing");
    expect(html).toContain("Payment confirmed ₹68.00");
    expect(html).toContain("Welcome to QDoc!");
    expect(html).toContain("Maintenance on 31 Oct from 10 AM to 12 PM");
    expect(html).toContain("No new notifications");
  });

  it("Screen 10: TokenSlipTicket renders ticket with token, PAID badge, and action buttons", () => {
    const html = renderToString(
      <TokenSlipTicket
        job={{
          id: "job-rp1042",
          tokenNumber: "RP1042",
          fileName: "Operating_Systems_Notes.pdf",
          amount: 68.0,
          totalPages: 24,
          copies: 2,
          colorMode: "COLOR",
          printType: "double-sided",
          status: "PRINTING",
        }}
        locationName="Main Print Room"
        createdAtText="Oct 28, 10:24 AM"
      />
    );
    expect(html).toContain("RP1042");
    expect(html).toContain("Operating_Systems_Notes.pdf");
    expect(html).toContain("PAID");
    expect(html).toContain("68.00");
    expect(html).toContain("Main Print Room");
    expect(html).toContain("Oct 28, 10:24 AM");
    expect(html).toContain("Print");
    expect(html).toContain("Share");
    expect(html).toContain("Back");
  });

  it("Mobile Header: renders bell and profile button with initial from session and 44px targets", () => {
    const html = renderToString(
      <MobileHeader onOpenNotifications={() => {}} onOpenProfile={() => {}} showBell={true} />
    );
    expect(html).toContain("Open notifications");
    expect(html).toContain("Open profile");
    expect(html).toContain("min-w-[44px]");
    expect(html).toContain("min-h-[44px]");
    // Initial from Aarav Nair
    expect(html).toContain("A");
    expect(html).toContain("bg-indigo-600");
  });

  it("Profile Sheet: renders user profile details from session, navigation rows, and sign out", () => {
    const html = renderToString(
      <ProfileSheet
        isOpen={true}
        onClose={() => {}}
        onOpenNotifications={() => {}}
        onNavigateHistory={() => {}}
      />
    );
    expect(html).toContain("My Profile");
    expect(html).toContain("Aarav Nair");
    expect(html).toContain("ADM2024CS042");
    expect(html).toContain("Computer Science");
    expect(html).toContain("Sem 5");
    expect(html).toContain("Notifications");
    expect(html).toContain("Print history");
    expect(html).toContain("Dark mode");
    expect(html).toContain("Sign out");
  });

  it("PaymentSheet: renders loading state when script is loading and retry when script fails", () => {
    const loadingHtml = renderToString(
      <PaymentSheet
        isOpen={true}
        onClose={() => {}}
        subtotal={50}
        total={51}
        isReady={false}
        onPay={() => {}}
      />
    );
    expect(loadingHtml).toContain("Loading payment…");

    const failedHtml = renderToString(
      <PaymentSheet
        isOpen={true}
        onClose={() => {}}
        subtotal={50}
        total={51}
        isReady={false}
        errorMessage="Could not load payment gateway. Check your connection and retry."
        onRetryScript={() => {}}
        onPay={() => {}}
      />
    );
    expect(failedHtml).toContain("Could not load payment gateway");
    expect(failedHtml).toContain("Retry");
  });
});
