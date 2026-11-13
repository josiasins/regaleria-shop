import { afterEach, describe, expect, it, vi } from "vitest";
import { formatCalendarDate, toDateTimeInput } from "./dates";
afterEach(() => vi.restoreAllMocks());
describe("business dates", () => {
  it("preserves the selected calendar day independently of timezone", () => {
    expect(formatCalendarDate("2030-01-01")).toBe("1/1/2030");
    expect(formatCalendarDate("2032-02-29")).toBe("29/2/2032");
  });
  it("rejects invalid dates without silently moving them", () => {
    expect(formatCalendarDate("2030-02-30")).toBe("Fecha inválida");
    expect(formatCalendarDate("bad date")).toBe("Fecha inválida");
  });
  it("displays the local hour when an existing transaction is opened for audit", () => {
    vi.spyOn(Date.prototype,"getTimezoneOffset").mockReturnValue(180);
    expect(toDateTimeInput("2030-01-01T13:45:00Z")).toBe("2030-01-01T10:45");
  });
  it("handles missing or invalid timestamps", () => {
    expect(toDateTimeInput()).toBe(""); expect(toDateTimeInput("invalid")).toBe("");
  });
});
