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

const parseContent = (markdown) => {
  const trimmed = markdown.trim();
  const imageMatch =
    trimmed.match(/^image:\s*(\S+)/i) ||
    trimmed.match(/!\[[^\]]*\]\(([^)]+)\)/);
  if (imageMatch) {
    const altMatch = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    return {
      type: "image",
      src: imageMatch[1],
      alt: altMatch ? altMatch[1] : "",
    };
  }
  return { type: "text", html: parseMarkdown(markdown) };
};

// Render a content tile with static content.
const renderSection = (section, markdown, delaySeconds) => {
  const wrapper = document.createElement("section");
  wrapper.className = "section";
  wrapper.id = section.id;
  wrapper.style.setProperty("--tile-delay", `${delaySeconds}s`);

  const content = document.createElement("div");
  content.className = "section-content";
  const parsed = parseContent(markdown);
  if (parsed.type === "image") {
    content.classList.add("section-content--image");
    const image = document.createElement("img");
    image.src = parsed.src;
    image.alt = parsed.alt;
    image.loading = "lazy";
    content.appendChild(image);
  } else {
    content.innerHTML = parsed.html;
  }

  wrapper.appendChild(content);

  return wrapper;
};

const initPhysics = () => {
  const container = SECTION_CONTAINER;
  const tiles = Array.from(container.querySelectorAll(".section"));
  const containerRect = container.getBoundingClientRect();
  const states = tiles.map((tile) => {
    const rect = tile.getBoundingClientRect();
    const x = rect.left - containerRect.left;
    const y = rect.top - containerRect.top;
    const content = tile.querySelector(".section-content");
    const styles = getComputedStyle(tile);
    const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;
    const contentHeight = content ? content.scrollHeight : rect.height;
    const height = Math.max(rect.height, contentHeight + paddingTop + paddingBottom);
    const image = content ? content.querySelector("img") : null;
    const state = {
      tile,
      content,
      image,
      x,
      y,
      width: rect.width,
      height,
      vx: 0,
      vy: 0,
      floatSpeed: 4 + Math.random() * 8,
      dragging: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
      lastMoveX: 0,
      lastMoveY: 0,
      lastMoveTime: 0,
      targetY: y,
      paddingTop,
      paddingBottom,
      stackIndex: 0,
    };
    return state;
  });

  const maxBottom = Math.max(
    ...states.map((state) => state.y + state.height),
    0
  );
  container.style.height = `${maxBottom}px`;
  container.classList.add("is-physics");

  const updateTileHeight = (state) => {
    const contentHeight = state.content
      ? Math.max(state.content.scrollHeight, state.content.getBoundingClientRect().height)
      : state.height;
    const nextHeight = Math.max(
      state.height,
      contentHeight + state.paddingTop + state.paddingBottom
    );
    if (nextHeight !== state.height) {
      state.height = nextHeight;
      state.tile.style.height = `${state.height}px`;
    }
  };

  states.forEach((state) => {
    const { tile, x, y, width, height } = state;
    tile.style.position = "absolute";
    tile.style.left = `${x}px`;
    tile.style.top = `${y}px`;
    tile.style.width = `${width}px`;
    tile.style.height = `${height}px`;
    if (state.image) {
      if (state.image.complete) {
        updateTileHeight(state);
      } else {
        state.image.addEventListener(
          "load",
          () => {
            updateTileHeight(state);
          },
          { once: true }
        );
      }
    }
  });

  let lastTime = performance.now();
  let floatActive = false;
  let floatTimer = null;

  const clampPosition = (state) => {
    const maxX = Math.max(container.clientWidth - state.width, 0);
    const maxY = Math.max(container.clientHeight - state.height, 0);
    state.x = Math.min(Math.max(state.x, 0), maxX);
    state.y = Math.min(Math.max(state.y, 0), maxY);
  };

  const applyPositions = () => {
    states.forEach((state) => {
      state.tile.style.left = `${state.x}px`;
      state.tile.style.top = `${state.y}px`;
    });
  };

  const computeStackTargets = () => {
    states.forEach(updateTileHeight);
    const sorted = [...states].sort((a, b) => a.stackIndex - b.stackIndex);
    let cursorY = 0;
    sorted.forEach((state) => {
      const nextTarget = cursorY;
      state.targetY = Math.min(state.y, nextTarget);
      cursorY = state.targetY + state.height + 8;
    });
    container.style.height = `${Math.max(cursorY, container.clientHeight)}px`;
  };

  const isMobileLayout = () =>
    window.matchMedia("(max-width: 600px)").matches;

  const resolveOverlaps = () => {
    for (let i = 0; i < states.length; i += 1) {
      const a = states[i];
      for (let j = i + 1; j < states.length; j += 1) {
        const b = states[j];
        const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
        const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
        if (!overlapX || !overlapY) {
          continue;
        }
        const push = a.y <= b.y ? b : a;
        const other = push === a ? b : a;
        push.y = other.y + other.height + 4;
        clampPosition(push);
      }
    }
  };

  const step = (time) => {
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    if (floatActive) {
      states.forEach((state) => {
        if (state.dragging) {
          return;
        }
        const dy = state.targetY - state.y;
        const stiffness = 10;
        const damping = Math.pow(0.25, dt * 60);
        state.vy += dy * stiffness * dt;
        state.vy *= damping;
        state.y += state.vy * dt;
        if (Math.abs(dy) < 0.5 && Math.abs(state.vy) < 0.05) {
          state.y = state.targetY;
          state.vy = 0;
        }
      });
    }

    states.forEach((state) => {
      if (state.dragging) {
        return;
      }
      if (!floatActive) {
        state.x += state.vx * dt;
        state.y += state.vy * dt;
        const friction = Math.pow(0.92, dt * 60);
        state.vx *= friction;
        state.vy *= friction;
        if (Math.abs(state.vx) < 0.01) {
          state.vx = 0;
        }
        if (Math.abs(state.vy) < 0.01) {
          state.vy = 0;
        }
      }
      clampPosition(state);
    });

    if (isMobileLayout()) {
      resolveOverlaps();
    }

    applyPositions();
    requestAnimationFrame(step);
  };

  const startFloat = () => {
    states.forEach((state) => {
      state.stackIndex = state.y;
    });
    computeStackTargets();
    floatActive = true;
  };

  const stopFloat = () => {
    floatActive = false;
  };

  const scheduleFloat = () => {
    if (floatTimer) {
      clearTimeout(floatTimer);
    }
    floatTimer = setTimeout(() => {
      startFloat();
    }, 700);
  };

  window.addEventListener(
    "scroll",
    () => {
      stopFloat();
      scheduleFloat();
    },
    { passive: true }
  );

  scheduleFloat();

  states.forEach((state) => {
    const { tile, content } = state;
    if (!content) {
      return;
    }
    content.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      stopFloat();
      state.dragging = true;
      state.tile.classList.add("is-dragging");
      state.dragOffsetX = event.clientX - state.x;
      state.dragOffsetY = event.clientY - state.y;
      state.lastMoveX = event.clientX;
      state.lastMoveY = event.clientY;
      state.lastMoveTime = performance.now();
      content.setPointerCapture(event.pointerId);
    });

    content.addEventListener("pointermove", (event) => {
      if (!state.dragging) {
        return;
      }
      const now = performance.now();
      const dt = Math.max((now - state.lastMoveTime) / 1000, 0.001);
      const dx = event.clientX - state.lastMoveX;
      const dy = event.clientY - state.lastMoveY;
      state.vx = dx / dt;
      state.vy = dy / dt;
      state.lastMoveX = event.clientX;
      state.lastMoveY = event.clientY;
      state.lastMoveTime = now;
      state.x = event.clientX - state.dragOffsetX;
      state.y = event.clientY - state.dragOffsetY;
      clampPosition(state);
      if (isMobileLayout()) {
        resolveOverlaps();
      }
      applyPositions();
    });

    const endDrag = (event) => {
      if (!state.dragging) {
        return;
      }
      state.dragging = false;
      state.tile.classList.remove("is-dragging");
      content.releasePointerCapture(event.pointerId);
      scheduleFloat();
    };

    content.addEventListener("pointerup", endDrag);
    content.addEventListener("pointercancel", endDrag);
  });

  requestAnimationFrame(step);
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

    const files = normalizeFiles(indexData ? indexData.files || [] : []);
    if (!files.length) {
      throw new Error("Sisältöluetteloa ei löytynyt.");
    }

    const morseSlots = buildMorseSlots("suomenambientyhdistys");
    let fileIndex = 0;

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
    requestAnimationFrame(() => {
      markReady();
      initPhysics();
    });
  }
};

loadSections();
