/* ============================================
   MD → A4 Converter — Application Logic
   ============================================ */

(function () {
  "use strict";

  // --- DOM References ---
  const editorView = document.getElementById("editor-view");
  const previewView = document.getElementById("preview-view");
  const mdInput = document.getElementById("md-input");
  const charCount = document.getElementById("char-count");
  const btnGenerate = document.getElementById("btn-generate");
  const btnBack = document.getElementById("btn-back");
  const btnPrint = document.getElementById("btn-print");
  const btnSample = document.getElementById("btn-sample");
  const previewContainer = document.getElementById("preview-container");
  const pageSizeSelect = document.getElementById("page-size");
  const pageSizePreview = document.getElementById("page-size-preview");

  // --- Page Size Definitions ---
  const PAGE_SIZES = {
    A4: { width: "210mm", height: "297mm", label: "A4", cssPage: "A4" },
    Letter: {
      width: "216mm",
      height: "279mm",
      label: "Letter",
      cssPage: "letter",
    },
    Legal: {
      width: "216mm",
      height: "356mm",
      label: "Legal",
      cssPage: "legal",
    },
  };

  let currentPageSize = "A4";

  // --- Initialize Mermaid ---
  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
  });

  // --- Configure marked.js with custom renderer for Mermaid ---
  const renderer = new marked.Renderer();
  const originalCodeRenderer = renderer.code.bind(renderer);

  renderer.code = function ({ text, lang }) {
    if (lang && lang.toLowerCase() === "mermaid") {
      return '<div class="mermaid">' + text + "</div>";
    }
    // Default code block rendering
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const langClass = lang ? ' class="language-' + lang + '"' : "";
    return "<pre><code" + langClass + ">" + escaped + "</code></pre>";
  };

  marked.setOptions({
    breaks: true,
    gfm: true,
    renderer: renderer,
  });

  // --- Sample Markdown ---
  const sampleMarkdown = `## Conheça o Laravel

O Laravel é um framework de aplicações web com sintaxe expressiva e elegante. Um framework web fornece uma estrutura e um ponto de partida para criar sua aplicação, permitindo que você se concentre em criar algo incrível enquanto suamos sobre os detalhes complexos.

O Laravel se esforça para oferecer uma experiência fantástica de desenvolvimento, ao mesmo tempo que disponibiliza recursos poderosos como injeção profunda de dependências, uma camada expressiva de abstração de banco de dados, filas e tarefas agendadas, testes unitários e de integração, entre outros.

Seja você um novato em frameworks web PHP ou alguém com anos de experiência, o Laravel é um framework que pode crescer com você. Vamos ajudá-lo a dar seus primeiros passos como desenvolvedor web ou dar aquele empurrão para elevar sua expertise ao próximo nível. Mal podemos esperar para ver o que você construirá.

### Por que o Laravel?

Há uma infinidade de ferramentas e frameworks à sua disposição na hora de construir uma aplicação web. Contudo, acreditamos que o Laravel seja a melhor escolha para a construção de aplicações web modernas do tipo full-stack.

#### Um Framework Progressivo

A gente gosta de chamar o Laravel de um framework "progressivo". Com isso, queremos dizer que ele cresce junto com você. Se está apenas dando os seus primeiros passos no desenvolvimento web, a enorme biblioteca de documentações, os guias em texto e os [tutoriais em vídeo](https://laracasts.com) do Laravel ajudarão a aprender as bases sem que você se sinta esmagado pela complexidade.

Mas se você for um desenvolvedor sênior experiente, o Laravel fornece as ferramentas robustas que precisa, como [injeção de dependências](02%20-%20Container%20de%20Servicos.md), [testes unitários](https://laravel.com/docs/13.x/testing), [filas de serviços](https://laravel.com/docs/13.x/queues), mecanismos de [eventos em tempo real](https://laravel.com/docs/13.x/broadcasting) e mais. É ajustado com excelência, pronto para receber e construir apps corporativos em pesadas jornadas de uso.

#### Um Framework Escalável

O Laravel é extremamente maleável quanto ao crescimento estrutural. Graças às características flexíveis nativas de expansão baseada em PHP, mesclada aos sistemas rápidos via distribuídos, integrados a sistemas ágeis em cache veloz (como Redis), escalar ao sentido de amplitude horizontal com o Laravel no projeto se prova bastante simplificado. Muitas instâncias de sites no controle de centenas de milhões de chamadas operam através desses meios mensais sem problemas nativos ao motor.

  `;

  // --- Event Listeners ---
  mdInput.addEventListener("input", () => {
    charCount.textContent = mdInput.value.length + " caracteres";
  });

  btnSample.addEventListener("click", () => {
    mdInput.value = sampleMarkdown;
    charCount.textContent = mdInput.value.length + " caracteres";
    mdInput.focus();
  });

  btnGenerate.addEventListener("click", () => {
    const md = mdInput.value.trim();
    if (!md) {
      mdInput.focus();
      return;
    }
    currentPageSize = pageSizeSelect.value;
    pageSizePreview.value = currentPageSize;
    generateDocument(md);
  });

  btnBack.addEventListener("click", () => {
    previewView.classList.add("hidden");
    editorView.classList.remove("hidden");
  });

  btnPrint.addEventListener("click", () => {
    // Dynamically inject print @page rule based on selected size
    applyPrintPageSize(currentPageSize);
    window.print();
  });

  // Sync page size selectors
  pageSizeSelect.addEventListener("change", () => {
    currentPageSize = pageSizeSelect.value;
    pageSizePreview.value = currentPageSize;
  });

  pageSizePreview.addEventListener("change", () => {
    currentPageSize = pageSizePreview.value;
    pageSizeSelect.value = currentPageSize;
    applyPageSize(currentPageSize);
    // Re-render if there's content
    const md = mdInput.value.trim();
    if (md) {
      generateDocument(md);
    }
  });

  // --- Page Size Management ---
  function applyPageSize(sizeKey) {
    const size = PAGE_SIZES[sizeKey];
    if (!size) return;
    document.documentElement.style.setProperty("--page-width", size.width);
    document.documentElement.style.setProperty("--page-height", size.height);
  }

  function applyPrintPageSize(sizeKey) {
    // Remove any previous dynamic @page style
    let existing = document.getElementById("dynamic-page-style");
    if (existing) existing.remove();

    const size = PAGE_SIZES[sizeKey];
    if (!size) return;

    const style = document.createElement("style");
    style.id = "dynamic-page-style";
    style.textContent =
      "@page { size: " + size.cssPage + "; margin: 20mm 22mm; }";
    document.head.appendChild(style);
  }

  // --- Main Processing Pipeline ---
  function generateDocument(markdown) {
    // Apply page size
    applyPageSize(currentPageSize);

    // Step 1: Pre-process — handle <!-- pagebreak --> before marked parses it
    const preprocessed = markdown.replace(
      /<!--\s*pagebreak\s*-->/gi,
      '\n<div class="page-break-marker"></div>\n',
    );

    // Step 2: Parse with marked.js
    let html = marked.parse(preprocessed);

    // Step 3: Post-process the HTML
    html = postProcessHTML(html);

    // Step 4: Split into pages
    const pages = splitIntoPages(html);

    // Step 5: Render pages
    renderPages(pages);

    // Step 6: Show preview
    editorView.classList.add("hidden");
    previewView.classList.remove("hidden");
    window.scrollTo(0, 0);

    // Step 7: Render Mermaid diagrams (async, after DOM injection)
    renderMermaidDiagrams();
  }

  // --- Post-Processing ---
  function postProcessHTML(html) {
    const container = document.createElement("div");
    container.innerHTML = html;

    // Process tables — detect total rows
    processTables(container);

    return container.innerHTML;
  }

  function processTables(container) {
    const tables = container.querySelectorAll("table");
    tables.forEach(function (table) {
      const tbody = table.querySelector("tbody");
      if (!tbody) return;
      const rows = tbody.querySelectorAll("tr");
      if (rows.length === 0) return;
      const lastRow = rows[rows.length - 1];
      if (lastRow.querySelector("strong")) {
        lastRow.classList.add("total-row");
      }
    });
  }

  // --- Split into Pages ---
  function splitIntoPages(html) {
    const container = document.createElement("div");
    container.innerHTML = html;

    const children = Array.from(container.childNodes);

    // Find the header section (everything before the first <hr>)
    let headerEnd = -1;
    for (let i = 0; i < children.length; i++) {
      if (
        children[i].nodeType === Node.ELEMENT_NODE &&
        children[i].nodeName === "HR"
      ) {
        headerEnd = i;
        break;
      }
    }

    let headerHTML = "";
    let bodyChildren = [];

    if (headerEnd > 0) {
      const headerNodes = children.slice(0, headerEnd);
      headerHTML = buildDocumentHeader(headerNodes);
      // Skip the HR itself
      bodyChildren = children.slice(headerEnd + 1);
    } else {
      bodyChildren = children.slice();
    }

    // Now split body into pages based on H1 and page-break markers
    const pages = [];
    let currentPageContent = headerHTML;
    let isFirstH1InBody = true;

    for (let i = 0; i < bodyChildren.length; i++) {
      const node = bodyChildren[i];

      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === "")
        continue;
      if (
        node.nodeType !== Node.ELEMENT_NODE &&
        node.nodeType !== Node.TEXT_NODE
      )
        continue;

      // Check for page-break marker div
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        node.classList &&
        node.classList.contains("page-break-marker")
      ) {
        if (currentPageContent.trim()) {
          pages.push(currentPageContent);
          currentPageContent = "";
        }
        continue;
      }

      // Check for H1 — new page (except the very first body H1)
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "H1") {
        if (isFirstH1InBody) {
          isFirstH1InBody = false;
          currentPageContent += node.outerHTML;
        } else {
          // Start a new page
          if (currentPageContent.trim()) {
            pages.push(currentPageContent);
          }
          currentPageContent = node.outerHTML;
        }
        continue;
      }

      // Horizontal rules — section spacing only
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "HR") {
        currentPageContent += "<hr>";
        continue;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        currentPageContent += node.outerHTML;
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        currentPageContent += node.textContent;
      }
    }

    // Push the last page
    if (currentPageContent.trim()) {
      pages.push(currentPageContent);
    }

    return pages.length > 0 ? pages : ["<p>Nenhum conteúdo para exibir.</p>"];
  }

  // --- Build Document Header ---
  function buildDocumentHeader(nodes) {
    let title = "";
    const metaLines = [];
    let subtitle = "";

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      if (node.tagName === "H1") {
        title = node.textContent;
      } else if (node.tagName === "P") {
        const strong = node.querySelector("strong");
        if (strong) {
          const strongText = strong.textContent;
          // Pattern: "Key:" or "Key: " at the beginning
          if (strongText.match(/^.+:\s*$/)) {
            const label = strongText.replace(/:\s*$/, "");
            // Get the rest — everything after the </strong>
            const fullHTML = node.innerHTML;
            const afterStrong = fullHTML
              .replace(/<strong>[\s\S]*?<\/strong>\s*/, "")
              .replace(/<br\s*\/?>/g, "")
              .trim();
            metaLines.push({ label: label, value: afterStrong });
          } else {
            subtitle = node.textContent;
          }
        } else {
          if (node.textContent.trim()) {
            subtitle = node.textContent;
          }
        }
      }
    }

    if (!title && metaLines.length === 0) {
      // No structured header detected — return raw HTML
      let raw = "";
      for (let i = 0; i < nodes.length; i++) {
        raw += nodes[i].outerHTML || nodes[i].textContent;
      }
      return raw;
    }

    let html = '<div class="doc-header">';
    html += '<div class="doc-header-left">';
    html += "<h1>" + escapeHTML(title) + "</h1>";
    if (subtitle) {
      html += '<div class="subtitle">' + escapeHTML(subtitle) + "</div>";
    }
    html += "</div>";

    if (metaLines.length > 0) {
      html += '<div class="doc-header-right">';
      for (let j = 0; j < metaLines.length; j++) {
        html +=
          '<div><span class="meta-label">' +
          escapeHTML(metaLines[j].label) +
          ":</span> " +
          metaLines[j].value +
          "</div>";
      }
      html += "</div>";
    }

    html += "</div>";
    return html;
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Render Pages ---
  function renderPages(pages) {
    previewContainer.innerHTML = "";

    for (let i = 0; i < pages.length; i++) {
      const pageDiv = document.createElement("div");
      pageDiv.className = "page";
      if (i > 0) {
        pageDiv.style.animationDelay = i * 0.08 + "s";
      }
      pageDiv.innerHTML = pages[i];
      previewContainer.appendChild(pageDiv);
    }
  }

  // --- Keyboard Shortcut ---
  document.addEventListener("keydown", function (e) {
    // Ctrl+Enter to generate
    if (
      e.ctrlKey &&
      e.key === "Enter" &&
      !editorView.classList.contains("hidden")
    ) {
      e.preventDefault();
      btnGenerate.click();
    }
  });

  // --- Mermaid Rendering ---
  async function renderMermaidDiagrams() {
    const mermaidDivs = previewContainer.querySelectorAll(".mermaid");
    if (mermaidDivs.length === 0) return;

    // Mermaid needs unique IDs for each diagram
    mermaidDivs.forEach(function (div, index) {
      div.setAttribute("id", "mermaid-diagram-" + index);
    });

    try {
      await mermaid.run({ nodes: mermaidDivs });
    } catch (err) {
      console.warn("Mermaid rendering error:", err);
    }
  }
})();
