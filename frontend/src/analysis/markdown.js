// Minimal markdown parser for AI answers: headings, lists, tables, quotes, rules, paragraphs.

const isTableSeparator = (line) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
const splitRow = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
const isBlockStart = (line) =>
  /^#{1,6}\s/.test(line) || /^\s*[-*•]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line) ||
  /^\s*>/.test(line) || /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line) || line.includes('|');

export function parseBlocks(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].replace(/#+\s*$/, '').trim() });
      i += 1;
      continue;
    }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { i += 1; continue; }

    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitRow(line);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    if (/^\s*[-*•]\s+/.test(line)) {
      const items = [];
      while (i < lines.length) {
        if (/^\s*[-*•]\s+/.test(lines[i])) {
          items.push({ text: lines[i].replace(/^\s*[-*•]\s+/, ''), nested: /^\s{2,}/.test(lines[i]) });
        } else if (lines[i].trim() && !isBlockStart(lines[i])) {
          items[items.length - 1].text += ` ${lines[i].trim()}`; // wrapped continuation of the previous item
        } else {
          break;
        }
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length) {
        if (/^\s*\d+[.)]\s+/.test(lines[i])) {
          items.push({ text: lines[i].replace(/^\s*\d+[.)]\s+/, ''), nested: false });
        } else if (lines[i].trim() && !isBlockStart(lines[i])) {
          items[items.length - 1].text += ` ${lines[i].trim()}`; // wrapped continuation of the previous item
        } else {
          break;
        }
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'quote', text: quote.join(' ') });
      continue;
    }

    const paragraph = [line.trim()];
    i += 1;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: 'p', text: paragraph.join(' ') });
  }

  return blocks;
}

// Group blocks into titled sections (new section at each h1-h3)
export function groupSections(blocks) {
  const sections = [];
  let current = { title: '', level: 2, blocks: [] };

  blocks.forEach((block) => {
    if (block.type === 'heading' && block.level <= 3) {
      if (current.title || current.blocks.length) sections.push(current);
      current = { title: block.text, level: block.level, blocks: [] };
    } else if (block.type === 'heading') {
      current.blocks.push({ type: 'p', text: `**${block.text}**` });
    } else {
      current.blocks.push(block);
    }
  });
  if (current.title || current.blocks.length) sections.push(current);
  return sections;
}

export const stripMarkdown = (text) => String(text || '').replace(/\*\*|__|`/g, '').replace(/(^|\s)\*(\S)/g, '$1$2').replace(/(\S)\*(\s|$)/g, '$1$2').trim();

const NUMERIC_CELL = /^[\s₹$€£+\-−(]*\d[\d,]*\.?\d*\s*(%|x|cr|crore|l cr|lakh cr|b|bn|m|mn|k|t)?\)?\s*$/i;

export function parseNumber(cell) {
  const clean = stripMarkdown(cell);
  if (!NUMERIC_CELL.test(clean)) return null;
  const negative = /^[\s₹$€£]*[-−(]/.test(clean);
  const value = Number.parseFloat(clean.replace(/[^\d.]/g, ''));
  return Number.isFinite(value) ? (negative ? -value : value) : null;
}

// Numeric columns of a table (>= 2 numeric rows, >= 70% of rows numeric); column 0 is the label.
export function numericColumns(table) {
  const columns = [];
  for (let col = 1; col < table.header.length; col += 1) {
    const values = table.rows.map((row) => parseNumber(row[col] ?? ''));
    const count = values.filter((value) => value !== null).length;
    if (count >= 2 && count / Math.max(table.rows.length, 1) >= 0.7) {
      columns.push({ index: col, name: stripMarkdown(table.header[col]) });
    }
  }
  return columns;
}

// "**Label:** value" list items with short numeric values become key-figure cards
export function extractKeyFigures(blocks, limit = 6) {
  const figures = [];
  const add = (label, value) => {
    const cleanValue = stripMarkdown(value).replace(/[.;]$/, '');
    if (label && cleanValue.length <= 28 && /\d/.test(cleanValue) && !figures.some((f) => f.label === label)) {
      figures.push({ label, value: cleanValue });
    }
  };

  blocks.forEach((block) => {
    if (block.type !== 'ul' || figures.length >= limit) return;
    block.items.forEach((item) => {
      const match = item.text.match(/^\*\*(.+?)\*\*\s*:?\s*(.+)$/) || item.text.match(/^([^:*]{2,32}):\s*(.+)$/);
      if (match) add(stripMarkdown(match[1]).replace(/:$/, ''), match[2]);
    });
  });

  if (figures.length < 3) {
    const table = blocks.find((block) => block.type === 'table' && block.header.length === 2 && block.rows.length >= 3);
    if (table) table.rows.forEach((row) => add(stripMarkdown(row[0]), row[1] ?? ''));
  }
  return figures.slice(0, limit);
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Sortable time key from a label like "Jun 2026", "Q2 FY26", "2025"; null when not time-like
function timeKey(label) {
  const text = stripMarkdown(label).toLowerCase();
  const year = text.match(/(20\d\d)/) || text.match(/fy\s?'?(\d\d)/);
  if (!year) return null;
  const yearNumber = year[1].length === 2 ? 2000 + Number(year[1]) : Number(year[1]);
  const month = MONTHS.findIndex((name) => text.includes(name));
  const quarter = text.match(/q([1-4])/);
  return yearNumber * 12 + (month >= 0 ? month : quarter ? Number(quarter[1]) * 3 : 0);
}

// Latest-period highlights of a numeric table, with the change versus the previous period
export function tableHighlights(table, limit = 4) {
  const columns = numericColumns(table);
  if (!columns.length || table.rows.length < 1) return [];

  const keys = table.rows.map((row) => timeKey(row[0] ?? ''));
  const timed = keys.every((key) => key !== null);
  const order = table.rows.map((_, index) => index);
  if (timed) order.sort((a, b) => keys[b] - keys[a]); // newest first
  else order.reverse(); // assume the last row is the newest
  const [latest, previous] = order;

  return columns.slice(0, limit).map((column) => {
    const current = parseNumber(table.rows[latest][column.index] ?? '');
    const before = previous !== undefined ? parseNumber(table.rows[previous][column.index] ?? '') : null;
    const delta = current !== null && before ? ((current - before) / Math.abs(before)) * 100 : null;
    return {
      label: column.name,
      value: stripMarkdown(table.rows[latest][column.index] ?? ''),
      period: stripMarkdown(table.rows[latest][0] ?? ''),
      delta,
      versus: previous !== undefined ? stripMarkdown(table.rows[previous][0] ?? '') : '',
    };
  });
}
