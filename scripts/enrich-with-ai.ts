/**
 * 使用 AI (Claude) 补全词库缺失数据
 *
 * 运行方式:
 * ANTHROPIC_API_KEY=your_key npx tsx scripts/enrich-with-ai.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Word {
  word: string;
  pos: string[];
  level: string;
  phonetic?: string;
  definition?: string;
  example?: string;
  synonyms?: string[];
  audio?: string;
  memoryTip?: string; // AI 生成的记忆技巧
}

const client = new Anthropic();

async function enrichWord(word: Word): Promise<Partial<Word>> {
  const needsDefinition = !word.definition;
  const needsExample = !word.example;

  if (!needsDefinition && !needsExample) {
    return {};
  }

  const prompt = `For the English word "${word.word}" (${word.pos.join(', ')}):

${needsDefinition ? '1. Provide a clear, concise definition in English (1-2 sentences)' : ''}
${needsExample ? '2. Provide a natural example sentence using this word' : ''}
3. Provide a memory tip in Chinese (记忆技巧) - could be etymology, word roots, association, or mnemonic

Respond in this exact JSON format:
{
  ${needsDefinition ? '"definition": "...",' : ''}
  ${needsExample ? '"example": "...",' : ''}
  "memoryTip": "..."
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error(`Error enriching "${word.word}":`, error);
  }

  return {};
}

async function main() {
  const inputPath = path.join(__dirname, '../src/data/words.json');
  const outputPath = path.join(__dirname, '../src/data/words-ai-enriched.json');
  const progressPath = path.join(__dirname, '../src/data/ai-enrich-progress.json');

  // Load words
  const words: Word[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  // Find words that need enrichment
  const needsEnrichment = words.filter(w => !w.definition || !w.example);
  console.log(`📚 Found ${needsEnrichment.length} words needing AI enrichment`);

  // Load progress
  let enrichedWords: Word[] = [...words];
  let startIndex = 0;

  if (fs.existsSync(progressPath)) {
    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
    enrichedWords = progress.words;
    startIndex = progress.lastIndex;
    console.log(`📝 Resuming from index ${startIndex}`);
  }

  const BATCH_SIZE = 10;
  const DELAY_MS = 500; // Rate limiting

  for (let i = startIndex; i < needsEnrichment.length; i++) {
    const word = needsEnrichment[i];
    const wordIndex = words.findIndex(w => w.word === word.word);

    process.stdout.write(`[${i + 1}/${needsEnrichment.length}] Enriching "${word.word}"... `);

    const enrichment = await enrichWord(word);

    if (Object.keys(enrichment).length > 0) {
      enrichedWords[wordIndex] = { ...enrichedWords[wordIndex], ...enrichment };
      console.log('✓');
    } else {
      console.log('(no changes)');
    }

    // Save progress
    if ((i + 1) % BATCH_SIZE === 0) {
      fs.writeFileSync(progressPath, JSON.stringify({
        lastIndex: i + 1,
        words: enrichedWords
      }, null, 2));
      console.log(`💾 Progress saved at ${i + 1}/${needsEnrichment.length}`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }

  // Save final result
  fs.writeFileSync(outputPath, JSON.stringify(enrichedWords, null, 2));
  console.log(`\n✅ Done! Enriched data saved to ${outputPath}`);

  // Cleanup
  if (fs.existsSync(progressPath)) {
    fs.unlinkSync(progressPath);
  }

  // Stats
  const withDefinition = enrichedWords.filter(w => w.definition).length;
  const withExample = enrichedWords.filter(w => w.example).length;
  const withMemoryTip = enrichedWords.filter(w => w.memoryTip).length;

  console.log(`\n📊 Final Statistics:`);
  console.log(`   Definition: ${withDefinition}/${words.length}`);
  console.log(`   Example: ${withExample}/${words.length}`);
  console.log(`   Memory Tips: ${withMemoryTip}/${words.length}`);
}

main().catch(console.error);
