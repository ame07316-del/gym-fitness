import { describe, expect, it } from "vitest";
import { bookingFollowUpReminder } from "@/app/lib/calendar";

describe("تذكير متابعة الحجز", () => {
  it("يحفظ UTC صحيحة بعد يوم كامل، ولا يختلق موعد تمرين لطلب غير مؤكد", () => {
    const now = Date.parse("2026-10-22T20:30:00.000Z");
    const lines = bookingFollowUpReminder("BK-TEST", now).split("\r\n");
    expect(lines).toContain("DTSTAMP:20261022T203000Z");
    expect(lines).toContain("DTSTART:20261023T203000Z");
    expect(lines).toContain("DTEND:20261023T204500Z");
    expect(lines).toContain("UID:BK-TEST@fitzone.pro");
    expect(lines.join(" ")).toContain("No appointment has been scheduled yet");
    expect(lines.join(" ")).not.toContain("Trial Session");
  });
});
