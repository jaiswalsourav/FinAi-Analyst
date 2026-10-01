// Splits the <follow_ups> block the AI appends to each answer into suggestion chips.
export function parseAnswer(raw) {
  const text = String(raw || '');
  const match = text.match(/<follow_ups>([\s\S]*?)(<\/follow_ups>|$)/i);
  if (!match) return { text: text.trim(), followUps: [] };

  const followUps = match[1]
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter((line) => line.length > 3)
    .slice(0, 3);

  return { text: text.replace(match[0], '').trim(), followUps };
}
