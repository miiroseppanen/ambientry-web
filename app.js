// App: build the grid from content files and apply morse rhythm.
const SECTION_CONTAINER = document.getElementById("sections");

// Minimal inline markdown parsing for safe, tiny content blocks.
const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const inlineMarkdown = (value) => {
  let text = escapeHtml(value);
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  return text;
};

const parseMarkdown = (markdown) => {
  const lines = markdown.split(/\r?\n/);
  let html = "";

  lines.forEach((line) => {
    if (line.trim() === "") {
      return;
    }
    const text = inlineMarkdown(line.replace(/^#{1,6}\s+/, ""));
    html += `<p>${text}</p>`;
  });

  return html;
};

// Render a content tile with a slow looping scroll.
const renderSection = (section, markdown, delaySeconds) => {
  const wrapper = document.createElement("section");
  wrapper.className = "section";
  wrapper.id = section.id;
  wrapper.style.setProperty("--tile-delay", `${delaySeconds}s`);

  const scroller = document.createElement("div");
  scroller.className = "section-scroller";

  const content = document.createElement("div");
  content.className = "section-content";
  content.innerHTML = parseMarkdown(markdown);

  const clone = content.cloneNode(true);
  clone.classList.add("section-content--clone");

  scroller.appendChild(content);
  scroller.appendChild(clone);
  wrapper.appendChild(scroller);
  return wrapper;
};

// Empty tiles create visual "dashes" in the rhythm.
const renderEmptySection = (section, delaySeconds) => {
  const wrapper = document.createElement("section");
  wrapper.className = "section section--empty";
  wrapper.id = section.id;
  wrapper.style.setProperty("--tile-delay", `${delaySeconds}s`);
  wrapper.setAttribute("aria-hidden", "true");
  return wrapper;
};

// Errors render as tiles to keep layout consistent.
const renderError = (message, delaySeconds = 0) => {
  const errorBlock = document.createElement("section");
  errorBlock.className = "section";
  errorBlock.style.setProperty("--tile-delay", `${delaySeconds}s`);
  errorBlock.innerHTML = `<div class="section-meta"><span>~</span><span>Virhe</span></div><p>${escapeHtml(
    message
  )}</p>`;
  return errorBlock;
};

// Inline fallback for file:// or missing fetch.
const getInlineIndex = () => {
  const indexTag = document.getElementById("content-index");
  if (!indexTag) {
    return null;
  }
  try {
    return JSON.parse(indexTag.textContent);
  } catch (error) {
    return null;
  }
};

const getInlineMarkdown = (fileName) => {
  const block = document.querySelector(`[data-file="${fileName}"]`);
  if (!block) {
    return null;
  }
  return block.textContent.trim();
};

// Morse rhythm builder for "suomenambientyhdistys".
const MORSE_MAP = {
  a: ".-",
  b: "-...",
  c: "-.-.",
  d: "-..",
  e: ".",
  f: "..-.",
  g: "--.",
  h: "....",
  i: "..",
  j: ".---",
  k: "-.-",
  l: ".-..",
  m: "--",
  n: "-.",
  o: "---",
  p: ".--.",
  q: "--.-",
  r: ".-.",
  s: "...",
  t: "-",
  u: "..-",
  v: "...-",
  w: ".--",
  x: "-..-",
  y: "-.--",
  z: "--..",
};

const buildMorseSlots = (word) => {
  const slots = [];
  for (const char of word.toLowerCase()) {
    const code = MORSE_MAP[char];
    if (!code) {
      continue;
    }
    for (const symbol of code) {
      if (symbol === "." || symbol === "-") {
        slots.push(symbol);
      }
    }
  }
  return slots;
};

// Sort by three-digit prefix, then alphabetically.
const normalizeFiles = (files) =>
  files
    .filter((file) => typeof file === "string" && file.endsWith(".md"))
    .map((file) => file.trim())
    .filter(Boolean)
    .sort((first, second) => {
      const firstMatch = first.match(/^(\d{3})-/);
      const secondMatch = second.match(/^(\d{3})-/);
      const firstIndex = firstMatch ? Number(firstMatch[1]) : Number.MAX_SAFE_INTEGER;
      const secondIndex = secondMatch
        ? Number(secondMatch[1])
        : Number.MAX_SAFE_INTEGER;
      if (firstIndex !== secondIndex) {
        return firstIndex - secondIndex;
      }
      return first.localeCompare(second);
    });

// Allow short names in the index file.
const buildFilePath = (fileName) =>
  fileName.startsWith("content/") ? fileName : `content/${fileName}`;

// Main loader: fetch index, map content to rhythm, render tiles.
const loadSections = async () => {
  const markReady = () => {
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
  };

  try {
    let indexData = null;
    try {
      const response = await fetch("content/index.json");
      if (response.ok) {
        indexData = await response.json();
      }
    } catch (error) {
      indexData = null;
    }
    if (!indexData) {
      indexData = getInlineIndex();
    }
    SECTION_CONTAINER.innerHTML = "";

    const files = normalizeFiles(indexData ? indexData.files || [] : []);
    if (!files.length) {
      throw new Error("Sisältöluetteloa ei löytynyt.");
    }

    const morseSlots = buildMorseSlots("suomenambientyhdistys");
    let fileIndex = 0;

    const totalSlots = Math.max(morseSlots.length - 1, 1);
    for (const [slotIndex, slot] of morseSlots.entries()) {
      const spreadSeconds = 7;
      const delaySeconds =
        3 + (slotIndex / totalSlots) * spreadSeconds + (slotIndex % 5) * 0.4;
      if (slot === "-") {
        SECTION_CONTAINER.appendChild(
          renderEmptySection({ id: `empty-${slotIndex}` }, delaySeconds)
        );
        continue;
      }
      if (fileIndex >= files.length) {
        break;
      }
      const fileName = files[fileIndex];
      fileIndex += 1;

      let markdown = null;
      try {
        const sectionResponse = await fetch(buildFilePath(fileName));
        if (sectionResponse.ok) {
          markdown = await sectionResponse.text();
        }
      } catch (error) {
        markdown = null;
      }
      if (!markdown) {
        markdown = getInlineMarkdown(fileName);
      }
      if (!markdown) {
        const label = fileName || "";
        const message = label
          ? `Osio "${label}" ei lataudu.`
          : "Osio ei lataudu.";
        SECTION_CONTAINER.appendChild(renderError(message, delaySeconds));
        continue;
      }
      SECTION_CONTAINER.appendChild(
        renderSection({ id: `section-${fileIndex}` }, markdown, delaySeconds)
      );
    }
  } catch (error) {
    SECTION_CONTAINER.innerHTML = "";
    SECTION_CONTAINER.appendChild(renderError(error.message));
  } finally {
    requestAnimationFrame(markReady);
  }
};

loadSections();
