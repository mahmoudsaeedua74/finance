export const FEATURE_DESCRIPTION_MAX_LENGTH = 2000;

export type DescriptionList = "bullets" | "numbered";
export type DescriptionChange = {
  from: number;
  to: number;
  replacement: string;
  selectionStart: number;
  selectionEnd: number;
};

export function descriptionListItem(line: string) {
  const marker = /^[ \t]*(?:[-*•]|(\d{1,6})[.)])(?:[ \t]+|$)/.exec(line);
  if (!marker) return null;
  return {
    number: marker[1] === undefined ? null : Number(marker[1]),
    prefixLength: marker[0].length,
    text: line.slice(marker[0].length),
  };
}

export function formatDescriptionList(value: string, start: number, end: number, kind: DescriptionList) {
  const from = descriptionLineStart(value, start);
  const lastLine = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const to = value.indexOf("\n", lastLine);
  const lines = value.slice(from, to < 0 ? undefined : to).split("\n");
  const items = lines.map(descriptionListItem);
  const remove = items.every((item) => item && (item.number === null ? "bullets" : "numbered") === kind);
  const previousLine = value.slice(0, Math.max(0, from - 1)).split("\n").pop() ?? "";
  const firstNumber = (descriptionListItem(previousLine)?.number ?? 0) + 1;
  const replacement = lines.map((line, index) => {
    const body = items[index]?.text ?? line;
    if (remove) return body;
    return `${kind === "bullets" ? "•" : `${firstNumber + index}.`} ${body}`;
  }).join("\n");

  const oldPrefixLength = items[0]?.prefixLength ?? 0;
  const newPrefixLength = remove ? 0 : kind === "bullets" ? 2 : `${firstNumber}. `.length;
  const cursor = from + newPrefixLength + Math.max(0, start - from - oldPrefixLength);
  const change = {
    from,
    to: to < 0 ? value.length : to,
    replacement,
    selectionStart: start === end ? cursor : from,
    selectionEnd: start === end ? cursor : from + replacement.length,
  };
  return !remove && kind === "numbered" ? renumberFollowingItems(value, change, firstNumber + lines.length) : change;
}

export function continueDescriptionList(value: string, cursor: number) {
  const from = descriptionLineStart(value, cursor);
  const nextLine = value.indexOf("\n", cursor);
  const to = nextLine < 0 ? value.length : nextLine;
  const item = descriptionListItem(value.slice(from, to));
  if (!item || cursor < from + item.prefixLength) return null;
  if (!item.text.trim()) {
    return { from, to, replacement: "", selectionStart: from, selectionEnd: from };
  }

  const replacement = item.number === null ? "\n• " : `\n${item.number + 1}. `;
  const selection = cursor + replacement.length;
  const change = { from: cursor, to: cursor, replacement, selectionStart: selection, selectionEnd: selection };
  return item.number === null ? change : renumberFollowingItems(value, change, item.number + 2);
}

function descriptionLineStart(value: string, position: number) {
  return position === 0 ? 0 : value.lastIndexOf("\n", position - 1) + 1;
}

function renumberFollowingItems(value: string, change: DescriptionChange, nextNumber: number) {
  const firstBreak = value.indexOf("\n", change.to);
  if (firstBreak < 0) return change;
  let { to, replacement } = change;
  replacement += value.slice(to, firstBreak);
  to = firstBreak;
  for (const line of value.slice(firstBreak + 1).split("\n")) {
    const item = descriptionListItem(line);
    if (!item || item.number === null) break;
    replacement += `\n${nextNumber++}. ${item.text}`;
    to += line.length + 1;
  }
  return { ...change, replacement, to };
}
