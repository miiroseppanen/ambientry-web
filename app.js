// App: build the grid from content files and apply morse rhythm.
const SECTION_CONTAINER = document.getElementById("sections");
const BASE_TITLE = "Suomen Ambientyhdistys ry";
const TITLE_WITH_TILDE = `${BASE_TITLE} ~`;

const initTitleAnimation = () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.title = TITLE_WITH_TILDE;
    return;
  }
  let showTilde = true;
  const tick = () => {
    document.title = showTilde ? TITLE_WITH_TILDE : BASE_TITLE;
    showTilde = !showTilde;
  };
  tick();
  window.setInterval(tick, 1200);
};

const initImageOverlay = () => {
  let overlay = null;
  const closeOverlay = () => {
    if (!overlay) {
      return;
    }
    const current = overlay;
    current.classList.remove("is-open");
    const finish = () => {
      if (overlay !== current) {
        return;
      }
      current.remove();
      overlay = null;
      document.body.classList.remove("image-overlay-open");
    };
    current.addEventListener("transitionend", finish, { once: true });
    window.setTimeout(finish, 260);
  };

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeOverlay();
    }
  });

  SECTION_CONTAINER.addEventListener("click", (event) => {
    const image = event.target.closest(".section-content--image img");
    if (!image) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    if (overlay) {
      closeOverlay();
      return;
    }

    overlay = document.createElement("div");
    overlay.className = "image-overlay";
    const overlayImage = document.createElement("img");
    overlayImage.src = image.src;
    overlayImage.alt = image.alt || "";
    overlay.appendChild(overlayImage);
    overlay.addEventListener("click", closeOverlay);
    document.body.appendChild(overlay);
    document.body.classList.add("image-overlay-open");
    requestAnimationFrame(() => {
      if (overlay) {
        overlay.classList.add("is-open");
      }
    });
  });
};

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

const normalizeBlock = (block) => {
  if (typeof block === "string") {
    const trimmed = block.trim();
    if (!trimmed) {
      return null;
    }
    if (isImageFile(trimmed)) {
      return {
        type: "image",
        src: buildFilePath(trimmed),
        alt: "",
      };
    }
    return { type: "text", text: trimmed };
  }
  if (!block || typeof block !== "object") {
    return null;
  }
  if (block.type === "image" || block.image) {
    const source = block.src || block.image;
    if (!source || typeof source !== "string") {
      return null;
    }
    return {
      type: "image",
      src: source.includes("/") ? source : buildFilePath(source),
      alt: typeof block.alt === "string" ? block.alt : "",
    };
  }
  if (block.type === "text" || block.text) {
    const text = typeof block.text === "string" ? block.text.trim() : "";
    if (!text) {
      return null;
    }
    return { type: "text", text };
  }
  if (typeof block.src === "string" && isImageFile(block.src)) {
    return {
      type: "image",
      src: block.src.includes("/") ? block.src : buildFilePath(block.src),
      alt: typeof block.alt === "string" ? block.alt : "",
    };
  }
  return null;
};

// Content format: { blocks: [ "text", "image.jpg", { type: "image", src, alt } ] }
const parseBlocksFromJson = (raw) => {
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    return null;
  }
  const blocks = Array.isArray(data)
    ? data
    : data && Array.isArray(data.blocks)
      ? data.blocks
      : null;
  if (!blocks) {
    return null;
  }
  return blocks.map(normalizeBlock).filter(Boolean);
};

// Convert normalized block data into renderable html/image data.
const parseContentBlock = (block) => {
  if (block.type === "image") {
    return { type: "image", src: block.src, alt: block.alt || "" };
  }
  return { type: "text", html: parseMarkdown(block.text || "") };
};

// Render a content tile with static content.
const renderSection = (section, contentData, delaySeconds) => {
  const wrapper = document.createElement("section");
  wrapper.className = "section";
  wrapper.id = section.id;
  wrapper.style.setProperty("--tile-delay", `${delaySeconds}s`);

  const content = document.createElement("div");
  content.className = "section-content";
  if (contentData.type === "image") {
    wrapper.classList.add("section--image");
    content.classList.add("section-content--image");
    const image = document.createElement("img");
    image.src = contentData.src;
    image.alt = contentData.alt || "";
    image.loading = "lazy";
    content.appendChild(image);
  } else {
    content.innerHTML = contentData.html || "";
  }

  wrapper.appendChild(content);

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

const getInlineContent = (fileName) => {
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

const isImageFile = (fileName) => /\.(jpe?g|png|webp|gif)$/i.test(fileName);

// Allow short names in the index file.
const buildFilePath = (fileName) =>
  fileName.startsWith("content/") ? fileName : `content/${fileName}`;

// Main loader: fetch index, map content to rhythm, render tiles.
const loadSections = async () => {
  const markReady = () => {
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
  };
  const isMobileLayout = () =>
    window.matchMedia("(max-width: 600px)").matches;

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

    // Single JSON file source for all content blocks.
    const defaultFile = "etusivu.json";
    const sourceFile =
      indexData && Array.isArray(indexData.files) && indexData.files.length
        ? String(indexData.files[0] || "").trim()
        : defaultFile;
    if (!sourceFile) {
      throw new Error("Sisältöluetteloa ei löytynyt.");
    }

    let raw = null;
    try {
      const response = await fetch(buildFilePath(sourceFile));
      if (response.ok) {
        raw = await response.text();
      }
    } catch (error) {
      raw = null;
    }
    if (!raw) {
      raw = getInlineContent(sourceFile);
    }
    if (!raw) {
      throw new Error("Sisältöä ei löytynyt.");
    }

    const blocks = parseBlocksFromJson(raw);
    if (!blocks || !blocks.length) {
      throw new Error("Sisältöä ei löytynyt.");
    }

    const morseSlots = buildMorseSlots("suomenambientyhdistys");
    let blockIndex = 0;

    const totalSlots = Math.max(morseSlots.length - 1, 1);
    for (const [slotIndex, slot] of morseSlots.entries()) {
      const spreadSeconds = 1;
      const delaySeconds =
        0.4 + (slotIndex / totalSlots) * spreadSeconds + (slotIndex % 5) * 0.1;
      if (slot === "-") {
        SECTION_CONTAINER.appendChild(
          renderEmptySection({ id: `empty-${slotIndex}` }, delaySeconds)
        );
        continue;
      }
      if (blockIndex >= blocks.length) {
        break;
      }
      const block = blocks[blockIndex];
      blockIndex += 1;
      SECTION_CONTAINER.appendChild(
        renderSection(
          { id: `section-${blockIndex}` },
          parseContentBlock(block),
          delaySeconds
        )
      );
    }
  } catch (error) {
    SECTION_CONTAINER.innerHTML = "";
    SECTION_CONTAINER.appendChild(renderError(error.message));
  } finally {
    requestAnimationFrame(() => {
      markReady();
      // Physics/drag behavior is loaded separately in physics.js.
      if (typeof window.initPhysics === "function") {
        window.initPhysics(SECTION_CONTAINER);
      }
    });
  }
};

initTitleAnimation();
initImageOverlay();
loadSections();
