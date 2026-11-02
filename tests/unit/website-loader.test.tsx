import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import WebsiteLoader from "@/components/ui/WebsiteLoader";

describe("WebsiteLoader Component", () => {
  it("renders animated image sequence instead of loading.mp4", () => {
    const html = renderToString(<WebsiteLoader />);
    expect(html).not.toContain('src="/loading.mp4"');
    expect(html).toContain('srcSet="/loading.webp"');
    expect(html).toContain('src="/loading.gif"');
  });

  it("renders with accessibility status attributes in fullScreen mode", () => {
    const html = renderToString(<WebsiteLoader message="Preparing your document..." />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-label="Preparing your document..."');
    expect(html).toContain("Preparing your document...");
  });

  it("renders in embedded/container mode when fullScreen is false", () => {
    const html = renderToString(<WebsiteLoader fullScreen={false} message="Loading queue..." />);
    expect(html).not.toContain("fixed inset-0");
    expect(html).toContain('srcSet="/loading.webp"');
    expect(html).toContain("Loading queue...");
  });

  it("supports dark mode tokens for container card and backdrop", () => {
    const html = renderToString(<WebsiteLoader />);
    expect(html).toContain("dark:bg-[#0B0F19]");
    expect(html).toContain("dark:border-slate-800");
  });
});
