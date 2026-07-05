// Custom persona presets for summary generation
export const PERSONAS = {
  default: {
    id: 'default',
    name: 'Standard',
    icon: '&#9998;',
    description: 'Balanced, clear summary',
    systemSuffix: 'Write in a clear, neutral tone. Balance brevity with completeness.'
  },
  eli5: {
    id: 'eli5',
    name: 'ELI5',
    icon: '&#128118;',
    description: 'Explain Like I\'m 5 — simple language, analogies',
    systemSuffix: 'Explain everything using simple language a 10-year-old could understand. Use everyday analogies. Avoid jargon entirely. If a technical term is unavoidable, immediately explain it in plain words.'
  },
  executive: {
    id: 'executive',
    name: 'Executive',
    icon: '&#128188;',
    description: 'Concise business brief with action items',
    systemSuffix: 'Write as a executive briefing. Lead with the bottom line. Use bullet points for decisions and action items. Highlight financial impact, risks, and recommendations. Keep it under 200 words. End with "Next Steps:" section.'
  },
  academic: {
    id: 'academic',
    name: 'Academic',
    icon: '&#127891;',
    description: 'Formal, citation-ready analysis',
    systemSuffix: 'Write in formal academic prose. Use precise terminology. Structure: Thesis, Evidence, Analysis, Implications. Reference specific claims from the text. Maintain objectivity and hedged language ("the evidence suggests..." rather than "this proves...").'
  },
  sales: {
    id: 'sales',
    name: 'Sales',
    icon: '&#128640;',
    description: 'Focus on value propositions and opportunities',
    systemSuffix: 'Frame everything through a sales lens. Identify value propositions, competitive advantages, customer pain points addressed, and market opportunities. Highlight ROI and benefits. Use persuasive but honest language.'
  },
  casual: {
    id: 'casual',
    name: 'Casual',
    icon: '&#128075;',
    description: 'Friendly, conversational tone',
    systemSuffix: 'Write like you\'re explaining something interesting to a friend over coffee. Use contractions, casual phrasing, and occasional humor. Be enthusiastic where appropriate. Keep it fun but informative.'
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    icon: '&#9881;',
    description: 'Your own custom instructions',
    systemSuffix: '' // Filled from user settings
  }
};

export function getPersonaPrompt(personaId, customInstructions = '') {
  const persona = PERSONAS[personaId] || PERSONAS.default;
  if (personaId === 'custom' && customInstructions) {
    return customInstructions;
  }
  return persona.systemSuffix;
}

export function getPersonaList() {
  return Object.values(PERSONAS);
}
