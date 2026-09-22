import { describe, expect, it } from "vitest";
import { planImage } from "@/services/epub/resources";

const paperwhite = { imagePreset: "kindle-paperwhite" as const, grayscale: false };

describe("planImage", () => {
  it("limits paperwhite images downward to content bounds", () => {
    expect(
      planImage({ mediaType: "image/jpeg", width: 2000, height: 1000 }, paperwhite, false),
    ).toEqual({ width: 1264, height: 632, format: "jpeg", quality: 0.85, grayscale: false });
  });
  it("keeps smaller images unchanged and uses cover bounds", () => {
    expect(
      planImage({ mediaType: "image/png", width: 800, height: 1200 }, paperwhite, true),
    ).toEqual({ width: 800, height: 1200, format: "png", grayscale: false });
  });
  it("converts webp to jpeg unless it has alpha, and GIF to PNG", () => {
    expect(
      planImage({ mediaType: "image/webp", width: 2000, height: 1000 }, paperwhite, false).format,
    ).toBe("jpeg");
    expect(
      planImage(
        { mediaType: "image/webp", width: 2000, height: 1000, hasAlpha: true },
        paperwhite,
        false,
      ).format,
    ).toBe("png");
    expect(
      planImage({ mediaType: "image/gif", width: 10, height: 10 }, paperwhite, false).format,
    ).toBe("png");
  });
  it("does not request JPEG re-encoding for the original preset", () => {
    expect(
      planImage(
        { mediaType: "image/jpeg", width: 800, height: 600 },
        {
          imagePreset: "original",
          grayscale: false,
        },
        false,
      ),
    ).toEqual({ width: 800, height: 600, format: "jpeg", grayscale: false, passthrough: true });
  });
  it("does not mark original JPEG as passthrough when grayscale is enabled", () => {
    expect(
      planImage(
        { mediaType: "image/jpeg", width: 800, height: 600 },
        { imagePreset: "original", grayscale: true },
        false,
      ).passthrough,
    ).toBe(false);
  });
});
