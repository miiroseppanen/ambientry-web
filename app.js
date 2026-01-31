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
  let inList = false;

  const closeList = () => {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  };

  lines.forEach((line) => {
    if (/^#{1,6}\s+/.test(line)) {
      closeList();
      const text = inlineMarkdown(line.replace(/^#{1,6}\s+/, ""));
      html += `<h2>${text}</h2>`;
      return;
    }

    if (/^\s*-\s+/.test(line)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      const text = inlineMarkdown(line.replace(/^\s*-\s+/, ""));
      html += `<li>${text}</li>`;
      return;
    }

    if (line.trim() === "") {
      closeList();
      return;
    }

    closeList();
    html += `<p>${inlineMarkdown(line)}</p>`;
  });

  closeList();
  return html;
};

const renderSection = (section, markdown) => {
  const wrapper = document.createElement("section");
  wrapper.className = "section";
  wrapper.id = section.id;

  const heading = document.createElement("div");
  heading.className = "section-meta";
  heading.innerHTML = `<span>~</span><span>${escapeHtml(section.title)}</span>`;

  const content = document.createElement("div");
  content.className = "section-content";
  content.innerHTML = parseMarkdown(markdown);

  wrapper.appendChild(heading);
  wrapper.appendChild(content);
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

const loadSections = async () => {
  try {
    const response = await fetch("content.json");
    if (!response.ok) {
      throw new Error("Sisältöluetteloa ei löytynyt.");
    }
    const manifest = await response.json();
    SECTION_CONTAINER.innerHTML = "";

    for (const section of manifest.sections) {
      const sectionResponse = await fetch(section.file);
      if (!sectionResponse.ok) {
        SECTION_CONTAINER.appendChild(
          renderError(`Osio "${section.title}" ei lataudu.`)
        );
        continue;
      }
      const markdown = await sectionResponse.text();
      SECTION_CONTAINER.appendChild(renderSection(section, markdown));
    }
  } catch (error) {
    SECTION_CONTAINER.innerHTML = "";
    SECTION_CONTAINER.appendChild(renderError(error.message));
  }
};

loadSections();
