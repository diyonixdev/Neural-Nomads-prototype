# Voice Add Flow Fix - Implementation Plan

## Root Causes Identified

1. **State Management**: The conversation state is properly persisting in `session.listing`, but the `buildAskMessage` function wasn't comprehensively checking all fields before asking questions.

2. **Name-as-Product Conflict**: The extraction logic in `extractTurnData` already has name extraction BEFORE product extraction and clears product when it matches name, BUT the issue is that `extractListingFallback` in `extractListingParser.mjs` ALSO has duplicate logic that runs AFTER.

3. **Missing Field Calculation**: The `getPriorityNextField` function correctly prioritizes `farmer_name` first, but when a field already exists, the message generator was only checking specific fields (name, phone) rather than ALL fields.

## Fix Strategy

### 1. Enhanced Field Validation in buildAskMessage
- Check if ANY field being asked for already has a value
- Recursively find the next truly missing field
- Never re-ask for any field that exists in state

### 2. Strengthen Name/Product Separation
- Ensure name extraction happens FIRST
- Prevent product extraction from overriding detected names
- Add explicit logging when conflicts are detected

### 3. Comprehensive Debug Logging
- Log state before and after each turn
- Show exactly what was extracted vs what was merged
- Display missing fields clearly

### 4. Test Scenarios
1. "Mera naam Raghav hai" → farmer_name = "Raghav", product = null
2. "500 kilo Grade A tamatar" → product = "Tomato", quantity = 500
3. Verify assistant DOES NOT ask "Aapka naam kya hai?" after name is given

## Implementation Status
- [x] Identified root causes in conversationManager.mjs
- [x] Enhanced buildAskMessage to check all fields
- [ ] Add comprehensive state logging
- [ ] Test with actual scenarios
- [ ] Verify fix works end-to-end
