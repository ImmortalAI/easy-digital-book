import { describe, expect, it } from "vitest";
import { insertImageParagraph, validateLanguage } from "@/composables/use-image-import";

describe("image import helpers", () => {
  it("canonicalizes valid BCP 47 language tags", () => {
    expect(validateLanguage("ru-RU")).toEqual({ valid: true, canonical: "ru-RU" });
  });

  it("rejects invalid language tags", () => {
    expect(validateLanguage("not a language")).toEqual({ valid: false });
  });

  it("inserts an image as a separate paragraph and returns cursor placement", () => {
    expect(insertImageParagraph("text", 4, "images/a.png")).toEqual("text\n\n![](images/a.png)\n");
  });
});
