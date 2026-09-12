import { readFileSync } from 'fs';

const fileContent = readFileSync('./server/conversationManager.mjs', 'utf-8');

// Extract the isCorrectionText function
const match = fileContent.match(/const isCorrectionText = \(text\) => \{[\s\S]*?\};/);
if (match) {
  console.log('isCorrectionText function:');
  console.log(match[0]);
}

// Extract the isBareNoChangeResponse function  
const match2 = fileContent.match(/const isBareNoChangeResponse = \(text\) => \{[\s\S]*?\};/);
if (match2) {
  console.log('\n\nisBareNoChangeResponse function:');
  console.log(match2[0]);
}
