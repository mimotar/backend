import { softNameMatch, normalizePersonName } from "../services/withdrawal/name-match.js";

describe("softNameMatch", () => {
  it("matches ignoring titles and case", () => {
    expect(softNameMatch("Mr John Doe", "JOHN DOE")).toBe(true);
  });

  it("allows missing middle name", () => {
    expect(softNameMatch("Adaobi Chioma Okeke", "Adaobi Okeke")).toBe(true);
  });

  it("rejects unrelated names", () => {
    expect(softNameMatch("John Doe", "Jane Smith")).toBe(false);
  });

  it("normalizes punctuation", () => {
    expect(normalizePersonName("Dr. A.B. Musa")).toBe("a b musa");
  });
});
