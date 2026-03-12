/**
 * 词库数据丰富脚本
 * 使用 Free Dictionary API 获取音标、释义、例句等
 *
 * 运行方式: npx tsx scripts/enrich-words.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RawWord {
  word: string;
  pos: string[];
  level: string;
}

interface EnrichedWord {
  word: string;
  pos: string[];
  level: string;
  phonetic?: string;
  definition?: string;
  example?: string;
  synonyms?: string[];
  audio?: string;
}

interface DictionaryResponse {
  word: string;
  phonetic?: string;
  phonetics?: Array<{
    text?: string;
    audio?: string;
  }>;
  meanings?: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
      synonyms?: string[];
    }>;
    synonyms?: string[];
  }>;
}

const API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const DELAY_MS = 100; // Rate limiting: 100ms between requests
const BATCH_SIZE = 50; // Save progress every 50 words

async function fetchWordData(word: string): Promise<DictionaryResponse | null> {
  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(word)}`);
    if (!response.ok) {
      console.log(`  ⚠ No data for "${word}"`);
      return null;
    }
    const data = await response.json();
    return data[0] || null;
  } catch (error) {
    console.log(`  ✗ Error fetching "${word}":`, error);
    return null;
  }
}

function extractWordInfo(raw: RawWord, api: DictionaryResponse | null): EnrichedWord {
  const enriched: EnrichedWord = {
    word: raw.word,
    pos: raw.pos,
    level: raw.level,
  };

  if (!api) return enriched;

  // Extract phonetic
  if (api.phonetic) {
    enriched.phonetic = api.phonetic;
  } else if (api.phonetics && api.phonetics.length > 0) {
    const phonetic = api.phonetics.find(p => p.text);
    if (phonetic?.text) {
      enriched.phonetic = phonetic.text;
    }
  }

  // Extract audio URL
  if (api.phonetics) {
    const withAudio = api.phonetics.find(p => p.audio && p.audio.length > 0);
    if (withAudio?.audio) {
      enriched.audio = withAudio.audio;
    }
  }

  // Extract definition and example from first meaning
  if (api.meanings && api.meanings.length > 0) {
    const meaning = api.meanings[0];
    if (meaning.definitions && meaning.definitions.length > 0) {
      const def = meaning.definitions[0];
      enriched.definition = def.definition;
      if (def.example) {
        enriched.example = def.example;
      }

      // Get synonyms (combine from definition and meaning level)
      const synonyms = new Set<string>();
      if (def.synonyms) {
        def.synonyms.slice(0, 3).forEach(s => synonyms.add(s));
      }
      if (meaning.synonyms) {
        meaning.synonyms.slice(0, 3).forEach(s => synonyms.add(s));
      }
      if (synonyms.size > 0) {
        enriched.synonyms = Array.from(synonyms).slice(0, 5);
      }
    }
  }

  return enriched;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const inputPath = path.join(__dirname, '../src/data/words.json');
  const outputPath = path.join(__dirname, '../src/data/words-enriched.json');
  const progressPath = path.join(__dirname, '../src/data/enrich-progress.json');

  // Load raw words
  const rawWords: RawWord[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  console.log(`📚 Loaded ${rawWords.length} words from vocabulary`);

  // Load progress if exists
  let enrichedWords: EnrichedWord[] = [];
  let startIndex = 0;

  if (fs.existsSync(progressPath)) {
    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
    enrichedWords = progress.words || [];
    startIndex = progress.lastIndex || 0;
    console.log(`📝 Resuming from index ${startIndex} (${enrichedWords.length} words already processed)`);
  }

  // Process words
  const total = rawWords.length;

  for (let i = startIndex; i < total; i++) {
    const raw = rawWords[i];
    const progress = `[${i + 1}/${total}]`;

    process.stdout.write(`${progress} Processing "${raw.word}"... `);

    const apiData = await fetchWordData(raw.word);
    const enriched = extractWordInfo(raw, apiData);
    enrichedWords.push(enriched);

    if (apiData) {
      console.log(`✓ ${enriched.phonetic || ''}`);
    } else {
      console.log('(basic info only)');
    }

    // Save progress periodically
    if ((i + 1) % BATCH_SIZE === 0 || i === total - 1) {
      fs.writeFileSync(progressPath, JSON.stringify({
        lastIndex: i + 1,
        words: enrichedWords
      }, null, 2));
      console.log(`💾 Progress saved at ${i + 1}/${total}`);
    }

    // Rate limiting
    await sleep(DELAY_MS);
  }

  // Save final result
  fs.writeFileSync(outputPath, JSON.stringify(enrichedWords, null, 2));
  console.log(`\n✅ Done! Enriched data saved to ${outputPath}`);

  // Stats
  const withPhonetic = enrichedWords.filter(w => w.phonetic).length;
  const withDefinition = enrichedWords.filter(w => w.definition).length;
  const withExample = enrichedWords.filter(w => w.example).length;
  const withAudio = enrichedWords.filter(w => w.audio).length;

  console.log(`\n📊 Statistics:`);
  console.log(`   Phonetic: ${withPhonetic}/${total} (${Math.round(withPhonetic/total*100)}%)`);
  console.log(`   Definition: ${withDefinition}/${total} (${Math.round(withDefinition/total*100)}%)`);
  console.log(`   Example: ${withExample}/${total} (${Math.round(withExample/total*100)}%)`);
  console.log(`   Audio URL: ${withAudio}/${total} (${Math.round(withAudio/total*100)}%)`);

  // Cleanup progress file
  if (fs.existsSync(progressPath)) {
    fs.unlinkSync(progressPath);
  }
}

main().catch(console.error);
