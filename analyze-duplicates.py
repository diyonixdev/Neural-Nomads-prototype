import re

# Read the file
with open('server/conversationManager.mjs', 'r', encoding='utf-8') as f:
    content = f.read()

# The issue is we have duplicate blocks. Let's identify and mark them
# We have:
# 1. Original CONFIRMING state handler (OLD)
# 2. My new reordered version (GOOD)
# Both are in the file now, causing conflicts

# Count how many times we see these patterns
bare_count = content.count('if (isBareNoChangeResponse(text)) {')
correction_count = content.count('if (isConfirmationNegative(text) || isCorrectionText(text)) {')
aff_count = content.count('if (isConfirmationAffirmative(text)) {')

print(f"isBareNoChangeResponse: {bare_count} times")
print(f"isConfirmationNegative || isCorrectionText: {correction_count} times")
print(f"isConfirmationAffirmative: {aff_count} times")

# Find all occurrences with line numbers
lines = content.split('\n')
for i, line in enumerate(lines, 1):
    if 'if (isBareNoChangeResponse(text)) {' in line or 'if (isConfirmationNegative(text) || isCorrectionText(text)) {' in line or 'if (isConfirmationAffirmative(text)) {' in line:
        print(f"Line {i}: {line.strip()}")
