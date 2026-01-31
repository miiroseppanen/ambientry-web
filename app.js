const SECTION_CONTAINER = document.getElementById("sections");

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

const renderSection = (section, markdown) => {
  const wrapper = document.createElement("section");
  wrapper.className = "section";
  wrapper.id = section.id;

  const content = document.createElement("div");
  content.className = "section-content";
  content.innerHTML = parseMarkdown(markdown);

  wrapper.appendChild(content);
  return wrapper;
};

const renderEmptySection = (section) => {
  const wrapper = document.createElement("section");
  wrapper.className = "section section--empty";
  wrapper.id = section.id;
  wrapper.setAttribute("aria-hidden", "true");
  return wrapper;
};

const renderError = (message) => {
  const errorBlock = document.createElement("section");
  errorBlock.className = "section";
  errorBlock.innerHTML = `<div class="section-meta"><span>~</span><span>Virhe</span></div><p>${escapeHtml(
    message
  )}</p>`;
  return errorBlock;
};

const getInlineManifest = () => {
  const manifestTag = document.getElementById("content-manifest");
  if (!manifestTag) {
    return null;
  }
  try {
    return JSON.parse(manifestTag.textContent);
  } catch (error) {
    return null;
  }
};

const getInlineMarkdown = (id) => {
  const block = document.querySelector(`[data-section="${id}"]`);
  if (!block) {
    return null;
  }
  return block.textContent.trim();
};

const loadSections = async () => {
  try {
    let manifest = null;
    try {
      const response = await fetch("content.json");
      if (response.ok) {
        manifest = await response.json();
      }
    } catch (error) {
      manifest = null;
    }
    if (!manifest) {
      manifest = getInlineManifest();
    }
    if (!manifest) {
      throw new Error("Sisältöluetteloa ei löytynyt.");
    }
    SECTION_CONTAINER.innerHTML = "";

    for (const section of manifest.sections) {
      if (section.type === "empty") {
        SECTION_CONTAINER.appendChild(renderEmptySection(section));
        continue;
      }
      let markdown = null;
      if (section.file) {
        try {
          const sectionResponse = await fetch(section.file);
          if (sectionResponse.ok) {
            markdown = await sectionResponse.text();
          }
        } catch (error) {
          markdown = null;
        }
      }
      if (!markdown) {
        markdown = getInlineMarkdown(section.id);
      }
      if (!markdown) {
        const label = section.title || section.file || section.id || "";
        const message = label
          ? `Osio "${label}" ei lataudu.`
          : "Osio ei lataudu.";
        SECTION_CONTAINER.appendChild(renderError(message));
        continue;
      }
      SECTION_CONTAINER.appendChild(renderSection(section, markdown));
    }
  } catch (error) {
    SECTION_CONTAINER.innerHTML = "";
    SECTION_CONTAINER.appendChild(renderError(error.message));
  }
};

loadSections();
