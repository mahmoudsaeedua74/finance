import { describe, expect, it } from "vitest";
import { continueDescriptionList, formatDescriptionList, type DescriptionChange } from "./feature-description";

function apply(value: string, change: DescriptionChange | null) {
  if (!change) throw new Error("Expected a description edit");
  return value.slice(0, change.from) + change.replacement + value.slice(change.to);
}

describe("feature description lists", () => {
  it("formats the selected lines without including the next line", () => {
    const value = "تحديث الطلبات\nإضافة فلتر\nوصف عادي";
    const end = value.lastIndexOf("\n") + 1;
    const change = formatDescriptionList(value, 0, end, "bullets");
    expect(apply(value, change)).toBe("• تحديث الطلبات\n• إضافة فلتر\nوصف عادي");
  });

  it("converts between list types and removes the selected format when toggled again", () => {
    const value = "- تحديث الطلبات\n• إضافة فلتر";
    const numbered = apply(value, formatDescriptionList(value, 0, value.length, "numbered"));
    expect(numbered).toBe("1. تحديث الطلبات\n2. إضافة فلتر");
    expect(apply(numbered, formatDescriptionList(numbered, 0, numbered.length, "numbered")))
      .toBe("تحديث الطلبات\nإضافة فلتر");
  });

  it("continues and renumbers a list when inserting an item in the middle", () => {
    const value = "1. First\n2. Second\nUnformatted notes";
    const cursor = value.indexOf("\n");
    const change = continueDescriptionList(value, cursor);
    const result = apply(value, change);
    expect(result).toBe("1. First\n2. \n3. Second\nUnformatted notes");
    expect(result.slice(0, change?.selectionStart)).toBe("1. First\n2. ");
  });

  it("exits a list on an empty item and leaves normal text editing to the browser", () => {
    expect(apply("• First\n• ", continueDescriptionList("• First\n• ", 10))).toBe("• First\n");
    expect(continueDescriptionList("Notes", 5)).toBeNull();
  });
});
