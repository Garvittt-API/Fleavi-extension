// Translation utilities
const LANGUAGES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
  hi: 'Hindi',
  ru: 'Russian',
  pl: 'Polish',
  tr: 'Turkish',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
  sv: 'Swedish',
  no: 'Norwegian',
  da: 'Danish',
  fi: 'Finnish'
};

export function getLanguageList() {
  return Object.entries(LANGUAGES).map(([code, name]) => ({ code, name }));
}

export function getLanguageName(code) {
  return LANGUAGES[code] || code;
}

export function buildTranslationPrompt(content, targetLang) {
  const langName = LANGUAGES[targetLang] || targetLang;
  return `Translate and summarize the following content into ${langName}.

Rules:
- Produce a natural, fluent translation — not word-for-word
- Maintain the original meaning and nuance
- Summarize while translating (keep it concise)
- Preserve any proper nouns, brand names, and technical terms
- If the content is already in ${langName}, just summarize it

Content to translate and summarize:
${content.slice(0, 12000)}`;
}
