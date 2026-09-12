import { readFileSync } from 'fs';

// Read the file and extract the functions
const src = readFileSync('./server/conversationManager.mjs', 'utf-8');

// Extract and evaluate the functions
const isCorrectionTextMatch = src.match(/const isCorrectionText = \(text\) => \{[\s\S]*?return.*?;\n\};/);
const isBareNoChangeMatch = src.match(/const isBareNoChangeResponse = \(text\) => \{[\s\S]*?return.*?;\n\};/);

console.log('Testing "Nahi":');
if (isCorrectionTextMatch && isBareNoChangeMatch) {
  // Just show what they are
  console.log('isCorrectionText source:', isCorrectionTextMatch[0].substring(0, 200));
  console.log('isBareNoChangeResponse source:', isBareNoChangeMatch[0].substring(0, 200));
}

// Actually, let's just import and test
import { default as cm } from './server/conversationManager.mjs';
