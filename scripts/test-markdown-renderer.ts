import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownRenderer, sanitizeAiMarkdown } from '../src/components/MarkdownRenderer';

function runTests() {
  console.log('--- Starting Markdown Renderer Tests ---');

  // Test 1: User requested exact test input
  const promptInput = `**Protein Base:** Start with Unpolished Toor Dal.

**Energy Source:** Include Aromatic Sona Masoori Rice.

* **Vitamins & Minerals:** Add Farm Fresh Palak.
* **Healthy Fats:** Include Raw Farm A2 Cow Milk.`;

  const renderedHtml = renderToStaticMarkup(
    React.createElement(MarkdownRenderer, { content: promptInput })
  );

  console.log('\n[Test 1] Rendered HTML for User Test Case:');
  console.log(renderedHtml);

  // Assertions for User Test Case
  const hasProteinBaseBold =
    renderedHtml.includes('<strong>Protein Base:</strong>') ||
    renderedHtml.includes('<strong class="font-bold text-white">Protein Base:</strong>');
  const hasEnergySourceBold =
    renderedHtml.includes('<strong>Energy Source:</strong>') ||
    renderedHtml.includes('<strong class="font-bold text-white">Energy Source:</strong>');
  const hasVitaminsBold =
    renderedHtml.includes('<strong>Vitamins &amp; Minerals:</strong>') ||
    renderedHtml.includes('<strong>Vitamins & Minerals:</strong>') ||
    renderedHtml.includes('Vitamins &amp; Minerals:</strong>');
  const hasBulletList =
    renderedHtml.includes('<ul') && renderedHtml.includes('<li');
  const hasNoLiteralDoubleAsterisks = !renderedHtml.includes('**');

  console.log('✓ "Protein Base" appears bold:', hasProteinBaseBold);
  console.log('✓ "Energy Source" appears bold:', hasEnergySourceBold);
  console.log('✓ Bullet points render correctly:', hasBulletList);
  console.log('✓ No literal ** characters appear:', hasNoLiteralDoubleAsterisks);

  if (!hasProteinBaseBold || !hasEnergySourceBold || !hasBulletList || !hasNoLiteralDoubleAsterisks) {
    throw new Error('Test 1 failed assertions!');
  }

  // Test 2: Sanitization of raw JSON responses
  const jsonResponse = JSON.stringify({
    answer: '**Soil Test Recommendation:** Use organic compost.',
    category: 'soil_health',
    confidence: 'high'
  });
  const cleanedJson = sanitizeAiMarkdown(jsonResponse);
  const renderedJsonHtml = renderToStaticMarkup(
    React.createElement(MarkdownRenderer, { content: jsonResponse })
  );
  console.log('\n[Test 2] Raw JSON Response handling:');
  console.log('Sanitized text:', cleanedJson);
  console.log('Rendered HTML:', renderedJsonHtml);

  if (renderedJsonHtml.includes('"category"') || renderedJsonHtml.includes('"confidence"')) {
    throw new Error('Test 2 failed: Raw JSON leaked into rendered HTML!');
  }
  if (!renderedJsonHtml.includes('Soil Test Recommendation:')) {
    throw new Error('Test 2 failed: Answer text missing!');
  }

  // Test 3: Raw SVG sanitization
  const svgInput = 'Recommendation: <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"/></svg> Apply neem oil.';
  const renderedSvgHtml = renderToStaticMarkup(
    React.createElement(MarkdownRenderer, { content: svgInput })
  );
  console.log('\n[Test 3] Raw SVG Response handling:');
  console.log('Rendered HTML:', renderedSvgHtml);

  if (renderedSvgHtml.includes('<svg') || renderedSvgHtml.includes('</svg>')) {
    throw new Error('Test 3 failed: SVG leaked into rendered HTML!');
  }
  if (!renderedSvgHtml.includes('Apply neem oil.')) {
    throw new Error('Test 3 failed: Text missing after SVG stripping!');
  }

  // Test 4: Headings, Italics, Numbered lists, Inline code, Code blocks
  const complexMarkdown = `
# Main Header
## Sub Header
### Section Header
#### Minor Header

This is *italic text* and regular text with \`const test = 123;\` inline code.

1. First step
2. Second step

\`\`\`bash
npm run test
\`\`\`
`;
  const renderedComplexHtml = renderToStaticMarkup(
    React.createElement(MarkdownRenderer, { content: complexMarkdown })
  );
  console.log('\n[Test 4] Complex elements HTML:');
  console.log(renderedComplexHtml);

  const hasH1 = renderedComplexHtml.includes('<h1');
  const hasH2 = renderedComplexHtml.includes('<h2');
  const hasH3 = renderedComplexHtml.includes('<h3');
  const hasItalic = renderedComplexHtml.includes('<em') && renderedComplexHtml.includes('italic text');
  const hasNumberedList = renderedComplexHtml.includes('<ol') && renderedComplexHtml.includes('<li');
  const hasInlineCode = renderedComplexHtml.includes('<code') && renderedComplexHtml.includes('const test = 123;');
  const hasPreBlock = renderedComplexHtml.includes('<pre') && renderedComplexHtml.includes('npm run test');

  console.log('✓ Headings (h1, h2, h3) render correctly:', hasH1 && hasH2 && hasH3);
  console.log('✓ Italic renders correctly:', hasItalic);
  console.log('✓ Numbered list renders correctly:', hasNumberedList);
  console.log('✓ Inline code renders correctly:', hasInlineCode);
  console.log('✓ Code block renders correctly:', hasPreBlock);

  if (!hasH1 || !hasH2 || !hasH3 || !hasItalic || !hasNumberedList || !hasInlineCode || !hasPreBlock) {
    throw new Error('Test 4 failed complex markdown elements verification!');
  }

  console.log('\n🎉 ALL MARKDOWN RENDERER TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests();
