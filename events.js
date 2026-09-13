// Event archive: Markdown files with frontmatter → floating date + name tiles.
const pad2 = (value) => String(value).padStart(2, "0");

const parseFrontmatter = (raw) => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: raw.trim() };
  }
  const meta = {};
  match[1].split(/\r?\n/).forEach((line) => {
    const separator = line.indexOf(":");
    if (separator === -1) {
      return;
    }
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (!key) {
      return;
    }
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value === "") {
      return;
    }
    meta[key] = /^-?\d+$/.test(value) ? Number(value) : value;
  });
  return { meta, body: match[2].trim() };
};

const parseIsoDate = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
};

const formatArchiveDate = (event) => {
  const start = parseIsoDate(event.date);
  const end = parseIsoDate(event.date_end);
  if (start && end) {
    if (start.year === end.year && start.month === end.month) {
      return `${pad2(start.day)}.–${pad2(end.day)}.${pad2(start.month)}.${start.year}`;
    }
    return `${pad2(start.day)}.${pad2(start.month)}.${start.year}–${pad2(end.day)}.${pad2(end.month)}.${end.year}`;
  }
  if (start) {
    return `${pad2(start.day)}.${pad2(start.month)}.${start.year}`;
  }
  if (event.month) {
    return `${pad2(event.month)}.${event.year}`;
  }
  return String(event.year || "");
};

window.buildEventBlocks = async (source) => {
  const blocks = [];
  try {
    const response = await fetch(`${source}/index.json`, { cache: "no-store" });
    if (!response.ok) {
      return blocks;
    }
    const data = await response.json();
    const files = Array.isArray(data.files) ? data.files : [];
    const events = [];
    for (const [index, file] of files.entries()) {
      const fileName = String(file || "").trim();
      if (!fileName) {
        continue;
      }
      const path = fileName.includes("/") ? fileName : `${source}/${fileName}`;
      const fileResponse = await fetch(path, { cache: "no-store" });
      if (!fileResponse.ok) {
        continue;
      }
      const { meta } = parseFrontmatter(await fileResponse.text());
      const year = Number(meta.year);
      if (!year || !meta.title) {
        continue;
      }
      events.push({
        ...meta,
        year,
        sourceIndex: index,
      });
    }

    const years = [...new Set(events.map((event) => event.year))].sort(
      (a, b) => b - a
    );
    years.forEach((year, yearIndex) => {
      if (yearIndex > 0) {
        blocks.push({ type: "empty" });
      }
      blocks.push({ type: "year", year });
      events
        .filter((event) => event.year === year)
        .sort((a, b) => a.sourceIndex - b.sourceIndex)
        .forEach((event) => {
          blocks.push({
            type: "event",
            title: event.title,
            displayDate: formatArchiveDate(event),
            series: event.series || "",
          });
        });
    });
  } catch (error) {
    return blocks;
  }
  return blocks;
};
