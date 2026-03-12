/**
 * 补全词库缺失数据脚本
 * 1. 首先尝试 Free Dictionary API 重新获取
 * 2. 尝试使用词的基础形式查询
 * 3. 记录无法获取的单词供后续 AI 补全
 *
 * 运行方式: npx tsx scripts/fill-missing-data.ts
 */

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
const DELAY_MS = 150;

async function fetchWordData(word: string): Promise<DictionaryResponse | null> {
  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(word)}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data[0] || null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 尝试获取词的基础形式
function getBaseForm(word: string): string[] {
  const baseForms: string[] = [];

  // 处理 -ing 形式
  if (word.endsWith('ing')) {
    baseForms.push(word.slice(0, -3)); // running -> runn
    baseForms.push(word.slice(0, -3) + 'e'); // making -> make
    if (word.length > 4 && word[word.length - 4] === word[word.length - 5]) {
      baseForms.push(word.slice(0, -4)); // running -> run
    }
  }

  // 处理 -ed 形式
  if (word.endsWith('ed')) {
    baseForms.push(word.slice(0, -2)); // walked -> walk
    baseForms.push(word.slice(0, -1)); // loved -> love (love + d)
    if (word.length > 3 && word[word.length - 3] === word[word.length - 4]) {
      baseForms.push(word.slice(0, -3)); // stopped -> stop
    }
  }

  // 处理 -s/-es 形式
  if (word.endsWith('ies')) {
    baseForms.push(word.slice(0, -3) + 'y'); // studies -> study
  } else if (word.endsWith('es')) {
    baseForms.push(word.slice(0, -2)); // boxes -> box
    baseForms.push(word.slice(0, -1)); // makes -> make
  } else if (word.endsWith('s')) {
    baseForms.push(word.slice(0, -1)); // runs -> run
  }

  // 处理 -ly 形式
  if (word.endsWith('ly')) {
    baseForms.push(word.slice(0, -2)); // quickly -> quick
  }

  // 处理 -er/-est 形式
  if (word.endsWith('er')) {
    baseForms.push(word.slice(0, -2)); // faster -> fast
    baseForms.push(word.slice(0, -1)); // nicer -> nice
  }
  if (word.endsWith('est')) {
    baseForms.push(word.slice(0, -3)); // fastest -> fast
    baseForms.push(word.slice(0, -2)); // nicest -> nice
  }

  return [...new Set(baseForms.filter(f => f.length >= 2))];
}

function extractFromApi(api: DictionaryResponse): Partial<Word> {
  const result: Partial<Word> = {};

  // Extract phonetic
  if (api.phonetic) {
    result.phonetic = api.phonetic;
  } else if (api.phonetics?.length) {
    const phonetic = api.phonetics.find(p => p.text);
    if (phonetic?.text) {
      result.phonetic = phonetic.text;
    }
  }

  // Extract audio URL
  if (api.phonetics) {
    const withAudio = api.phonetics.find(p => p.audio && p.audio.length > 0);
    if (withAudio?.audio) {
      result.audio = withAudio.audio;
    }
  }

  // Extract definition and example - search ALL meanings for an example
  if (api.meanings?.length) {
    // Get definition from first meaning
    const firstMeaning = api.meanings[0];
    if (firstMeaning.definitions?.length) {
      result.definition = firstMeaning.definitions[0].definition;
    }

    // Search all meanings for an example
    for (const meaning of api.meanings) {
      for (const def of meaning.definitions || []) {
        if (def.example) {
          result.example = def.example;
          break;
        }
      }
      if (result.example) break;
    }

    // Get synonyms
    const synonyms = new Set<string>();
    for (const meaning of api.meanings) {
      if (meaning.synonyms) {
        meaning.synonyms.slice(0, 3).forEach(s => synonyms.add(s));
      }
      for (const def of meaning.definitions || []) {
        if (def.synonyms) {
          def.synonyms.slice(0, 3).forEach(s => synonyms.add(s));
        }
      }
      if (synonyms.size >= 5) break;
    }
    if (synonyms.size > 0) {
      result.synonyms = Array.from(synonyms).slice(0, 5);
    }
  }

  return result;
}

async function main() {
  const inputPath = path.join(__dirname, '../src/data/words.json');
  const outputPath = path.join(__dirname, '../src/data/words.json');
  const failedPath = path.join(__dirname, '../src/data/words-need-ai.json');
  const progressPath = path.join(__dirname, '../src/data/fill-progress.json');

  // Load words
  const words: Word[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  console.log(`📚 Loaded ${words.length} words`);

  // Find words that need data
  const needsWork = words.filter(w =>
    !w.phonetic || !w.definition || !w.example || !w.audio
  );

  console.log(`🔍 Found ${needsWork.length} words needing data:`);
  console.log(`   - Missing phonetic: ${words.filter(w => !w.phonetic).length}`);
  console.log(`   - Missing definition: ${words.filter(w => !w.definition).length}`);
  console.log(`   - Missing example: ${words.filter(w => !w.example).length}`);
  console.log(`   - Missing audio: ${words.filter(w => !w.audio).length}`);

  // Load progress
  let startIndex = 0;
  let updatedCount = 0;
  let workingWords = [...words];

  if (fs.existsSync(progressPath)) {
    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
    startIndex = progress.lastIndex || 0;
    workingWords = progress.words || words;
    updatedCount = progress.updatedCount || 0;
    console.log(`📝 Resuming from index ${startIndex}`);
  }

  const failedWords: string[] = [];

  for (let i = startIndex; i < needsWork.length; i++) {
    const targetWord = needsWork[i];
    const wordIndex = workingWords.findIndex(w => w.word === targetWord.word);
    const currentWord = workingWords[wordIndex];

    const needsPhonetic = !currentWord.phonetic;
    const needsDefinition = !currentWord.definition;
    const needsExample = !currentWord.example;
    const needsAudio = !currentWord.audio;

    const progress = `[${i + 1}/${needsWork.length}]`;
    process.stdout.write(`${progress} "${targetWord.word}" `);

    // Try main word first
    let apiData = await fetchWordData(targetWord.word);
    let extracted: Partial<Word> = {};

    if (apiData) {
      extracted = extractFromApi(apiData);
    }

    // If still missing data, try base forms
    if ((!extracted.example && needsExample) || (!extracted.phonetic && needsPhonetic)) {
      const baseForms = getBaseForm(targetWord.word);
      for (const base of baseForms) {
        await sleep(DELAY_MS / 2);
        const baseData = await fetchWordData(base);
        if (baseData) {
          const baseExtracted = extractFromApi(baseData);
          // Only use base form data if we're still missing it
          if (!extracted.phonetic && baseExtracted.phonetic && needsPhonetic) {
            // Convert phonetic for inflected form
            extracted.phonetic = baseExtracted.phonetic;
          }
          if (!extracted.example && baseExtracted.example && needsExample) {
            extracted.example = baseExtracted.example;
          }
          if (!extracted.audio && baseExtracted.audio && needsAudio) {
            extracted.audio = baseExtracted.audio;
          }
          if (extracted.example || (extracted.phonetic && extracted.audio)) break;
        }
      }
    }

    // Update word if we got new data
    let updates: string[] = [];
    if (extracted.phonetic && needsPhonetic) {
      currentWord.phonetic = extracted.phonetic;
      updates.push('phonetic');
    }
    if (extracted.definition && needsDefinition) {
      currentWord.definition = extracted.definition;
      updates.push('definition');
    }
    if (extracted.example && needsExample) {
      currentWord.example = extracted.example;
      updates.push('example');
    }
    if (extracted.audio && needsAudio) {
      currentWord.audio = extracted.audio;
      updates.push('audio');
    }
    if (extracted.synonyms && (!currentWord.synonyms || currentWord.synonyms.length === 0)) {
      currentWord.synonyms = extracted.synonyms;
      updates.push('synonyms');
    }

    if (updates.length > 0) {
      workingWords[wordIndex] = currentWord;
      updatedCount++;
      console.log(`✓ +${updates.join(', ')}`);
    } else {
      // Still missing example
      if (needsExample && !extracted.example) {
        failedWords.push(targetWord.word);
      }
      console.log('(no new data)');
    }

    // Save progress
    if ((i + 1) % 50 === 0 || i === needsWork.length - 1) {
      fs.writeFileSync(progressPath, JSON.stringify({
        lastIndex: i + 1,
        words: workingWords,
        updatedCount,
      }));
      console.log(`💾 Progress saved (${updatedCount} updates)`);
    }

    await sleep(DELAY_MS);
  }

  // Save final result
  fs.writeFileSync(outputPath, JSON.stringify(workingWords, null, 2));
  console.log(`\n✅ Done! Updated ${updatedCount} words`);

  // Save words that need AI
  if (failedWords.length > 0) {
    fs.writeFileSync(failedPath, JSON.stringify(failedWords, null, 2));
    console.log(`📝 ${failedWords.length} words saved for AI enrichment: ${failedPath}`);
  }

  // Final stats
  const finalWords: Word[] = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  const total = finalWords.length;

  console.log(`\n📊 Final Statistics:`);
  console.log(`   Phonetic: ${finalWords.filter(w => w.phonetic).length}/${total}`);
  console.log(`   Definition: ${finalWords.filter(w => w.definition).length}/${total}`);
  console.log(`   Example: ${finalWords.filter(w => w.example).length}/${total}`);
  console.log(`   Audio: ${finalWords.filter(w => w.audio).length}/${total}`);

  // Cleanup
  if (fs.existsSync(progressPath)) {
    fs.unlinkSync(progressPath);
  }
}

main().catch(console.error);
