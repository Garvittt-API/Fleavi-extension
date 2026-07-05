// Content script — extracts page content, handles text selection, and source citation highlighting
(() => {
  let selectionHighlight = null;
  let sourceHighlights = [];

  // Listen for messages from background/popup/side panel
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXTRACT_CONTENT') {
      const content = extractPageContent(message.selectedText);
      sendResponse({
        content: content.text,
        url: window.location.href,
        title: document.title,
        selectedText: message.selectedText || null
      });
    }

    if (message.type === 'SUMMARIZE_SELECTION') {
      highlightSelection();
      chrome.runtime.sendMessage({
        type: 'SUMMARIZE_PAGE',
        selectedText: message.selectedText
      });
    }

    if (message.type === 'HIGHLIGHT_PARAGRAPH') {
      highlightParagraph(message.index);
    }

    if (message.type === 'HIGHLIGHT_SOURCE') {
      highlightSource(message.index);
    }

    if (message.type === 'REMOVE_HIGHLIGHTS') {
      removeAllHighlights();
    }

    if (message.type === 'DETECT_PAGE_TYPE') {
      sendResponse(detectPageType());
    }
  });

  function extractPageContent(selectedText) {
    if (selectedText) {
      return { text: selectedText };
    }

    // Detect PDF embeds
    const pdfEmbed = document.querySelector('embed[type="application/pdf"], iframe[src*=".pdf"]');
    if (pdfEmbed) {
      return { text: '[PDF detected — content may be in an embedded viewer. Try selecting text manually.]' };
    }

    // Extract clean text using Readability-style heuristics
    const article = document.querySelector('article') || document.querySelector('main') || document.body;

    const paragraphs = [];
    const elements = article.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, td, th');

    elements.forEach((el, index) => {
      const text = el.innerText?.trim();
      if (text && text.length > 20) {
        paragraphs.push({ index, text, tag: el.tagName.toLowerCase() });
      }
    });

    return {
      text: paragraphs.map(p => `[${p.index}] ${p.text}`).join('\n\n'),
      paragraphs
    };
  }

  function detectPageType() {
    const url = window.location.href;
    const isPDF = url.endsWith('.pdf') || document.querySelector('embed[type="application/pdf"]') !== null;
    const isVideo = document.querySelector('video') !== null || url.includes('youtube.com/watch') || url.includes('vimeo.com');
    const isAcademic = url.includes('arxiv.org') || url.includes('scholar.google') || url.includes('pubmed') || url.includes('doi.org');

    return { isPDF, isVideo, isAcademic, url, title: document.title };
  }

  function highlightParagraph(index) {
    removeAllHighlights();
    const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre');
    const target = elements[index];
    if (target) {
      selectionHighlight = target;
      target.style.outline = '2px solid #6C5CE7';
      target.style.outlineOffset = '4px';
      target.style.borderRadius = '4px';
      target.style.transition = 'outline 0.2s ease';
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function highlightSource(index) {
    // Remove previous source highlights
    sourceHighlights.forEach(el => {
      el.style.backgroundColor = '';
      el.style.boxShadow = '';
      el.style.transition = '';
    });
    sourceHighlights = [];

    const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, td, th');
    const target = elements[index];
    if (target) {
      target.style.backgroundColor = 'rgba(108, 92, 231, 0.15)';
      target.style.boxShadow = '0 0 0 2px rgba(108, 92, 231, 0.4)';
      target.style.transition = 'background-color 0.3s ease, box-shadow 0.3s ease';
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      sourceHighlights.push(target);

      // Auto-remove after 3 seconds
      setTimeout(() => {
        target.style.backgroundColor = '';
        target.style.boxShadow = '';
      }, 3000);
    }
  }

  function highlightSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.id = 'fleavi-highlight';
      span.style.backgroundColor = 'rgba(108, 92, 231, 0.2)';
      span.style.borderRadius = '2px';
      try {
        range.surroundContents(span);
      } catch (e) {
        // Cross-element selection — skip highlighting
      }
    }
  }

  function removeAllHighlights() {
    if (selectionHighlight) {
      selectionHighlight.style.outline = '';
      selectionHighlight.style.outlineOffset = '';
      selectionHighlight.style.borderRadius = '';
      selectionHighlight.style.transition = '';
      selectionHighlight = null;
    }
    sourceHighlights.forEach(el => {
      el.style.backgroundColor = '';
      el.style.boxShadow = '';
      el.style.transition = '';
    });
    sourceHighlights = [];
    const existing = document.getElementById('fleavi-highlight');
    if (existing) {
      existing.outerHTML = existing.innerHTML;
    }
  }
})();
