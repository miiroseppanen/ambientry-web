// App: build floating tiles from content files and apply morse rhythm.
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
  if (!SECTION_CONTAINER) {
    return;
  }
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

const isImageFile = (fileName) => /\.(jpe?g|png|webp|gif)$/i.test(fileName);

const buildFilePath = (fileName) =>
  fileName.startsWith("content/") ? fileName : `content/${fileName}`;

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
  if (block.type === "empty") {
    return { type: "empty" };
  }
  if (block.type === "year") {
    return { type: "year", year: block.year };
  }
  if (block.type === "event") {
    return {
      type: "event",
      title: block.title || "",
      displayDate: block.displayDate || "",
    };
  }
  if (block.type === "form") {
    return {
      type: "form",
      src: block.src || "",
      title: block.title || "",
    };
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

const parseContentBlock = (block) => {
  if (block.type === "image") {
    return { type: "image", src: block.src, alt: block.alt || "" };
  }
  if (block.type === "form") {
    return { type: "form", src: block.src, title: block.title || "" };
  }
  if (block.type === "event") {
    return {
      type: "event",
      title: block.title,
      displayDate: block.displayDate,
    };
  }
  if (block.type === "year") {
    return { type: "year", year: block.year };
  }
  if (block.type === "empty") {
    return { type: "empty" };
  }
  return { type: "text", html: parseMarkdown(block.text || "") };
};

const renderSection = (section, contentData, delaySeconds) => {
  if (contentData.type === "empty") {
    return renderEmptySection(section, delaySeconds);
  }

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
  } else if (contentData.type === "form") {
    wrapper.classList.add("section--form");
    const iframe = document.createElement("iframe");
    iframe.className = "form-embed";
    iframe.src = contentData.src;
    iframe.title = contentData.title || "";
    iframe.loading = "lazy";
    content.appendChild(iframe);
  } else if (contentData.type === "event") {
    wrapper.classList.add("section--event");
    if (contentData.displayDate) {
      const date = document.createElement("p");
      date.className = "event-date";
      date.textContent = contentData.displayDate;
      content.appendChild(date);
    }
    const name = document.createElement("p");
    name.className = "event-name";
    name.textContent = contentData.title || "";
    content.appendChild(name);
  } else if (contentData.type === "year") {
    wrapper.classList.add("section--year");
    const year = document.createElement("p");
    year.textContent = String(contentData.year);
    content.appendChild(year);
  } else {
    content.innerHTML = contentData.html || "";
  }

  wrapper.appendChild(content);
  return wrapper;
};

const renderEmptySection = (section, delaySeconds) => {
  const wrapper = document.createElement("section");
  wrapper.className = "section section--empty";
  wrapper.id = section.id;
  wrapper.style.setProperty("--tile-delay", `${delaySeconds}s`);
  wrapper.setAttribute("aria-hidden", "true");
  return wrapper;
};

const renderError = (message, delaySeconds = 0) => {
  const errorBlock = document.createElement("section");
  errorBlock.className = "section";
  errorBlock.style.setProperty("--tile-delay", `${delaySeconds}s`);
  errorBlock.innerHTML = `<div class="section-meta"><span>~</span><span>Virhe</span></div><p>${escapeHtml(
    message
  )}</p>`;
  return errorBlock;
};

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

const loadPageBlocks = async () => {
  const defaultFile = "etusivu.json";
  const sourceFile =
    (SECTION_CONTAINER.dataset.content || "").trim() || defaultFile;

  let raw = null;
  try {
    const response = await fetch(buildFilePath(sourceFile), { cache: "no-store" });
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
    const indexData = getInlineIndex();
    const fallback =
      indexData && Array.isArray(indexData.files) && indexData.files[0]
        ? String(indexData.files[0]).trim()
        : "";
    if (fallback && fallback !== sourceFile) {
      try {
        const response = await fetch(buildFilePath(fallback), { cache: "no-store" });
        if (response.ok) {
          raw = await response.text();
        }
      } catch (error) {
        raw = null;
      }
      if (!raw) {
        raw = getInlineContent(fallback);
      }
    }
  }
  if (!raw) {
    throw new Error("Sisältöä ei löytynyt.");
  }

  const blocks = parseBlocksFromJson(raw);
  if (!blocks || !blocks.length) {
    throw new Error("Sisältöä ei löytynyt.");
  }

  const eventsSource = (SECTION_CONTAINER.dataset.eventsSource || "").trim();
  if (eventsSource && typeof window.buildEventBlocks === "function") {
    const eventBlocks = await window.buildEventBlocks(eventsSource);
    eventBlocks.forEach((block) => {
      const normalized = normalizeBlock(block);
      if (normalized) {
        blocks.push(normalized);
      }
    });
  }

  return blocks;
};

const loadSections = async () => {
  if (!SECTION_CONTAINER) {
    return;
  }
  const markReady = () => {
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
  };

  try {
    SECTION_CONTAINER.innerHTML = "";
    const blocks = await loadPageBlocks();
    const pattern = buildMorseSlots("suomenambientyhdistys");
    let blockIndex = 0;
    let slotIndex = 0;
    const maxSlots = Math.max(pattern.length * 8, blocks.length * 4);

    while (blockIndex < blocks.length && slotIndex < maxSlots) {
      const slot = pattern[slotIndex % pattern.length];
      const delaySeconds =
        0.4 + (slotIndex / Math.max(maxSlots, 1)) * 1 + (slotIndex % 5) * 0.1;
      slotIndex += 1;

      if (slot === "-") {
        SECTION_CONTAINER.appendChild(
          renderEmptySection({ id: `empty-${slotIndex}` }, delaySeconds)
        );
        continue;
      }

      const block = blocks[blockIndex];
      blockIndex += 1;
      if (block.type === "year" && blockIndex > 1) {
        SECTION_CONTAINER.appendChild(
          renderEmptySection({ id: `gap-${slotIndex}` }, delaySeconds)
        );
      }
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
      if (typeof window.initPhysics === "function") {
        window.initPhysics(SECTION_CONTAINER);
      }
    });
  }
};

initTitleAnimation();
initImageOverlay();
loadSections();
