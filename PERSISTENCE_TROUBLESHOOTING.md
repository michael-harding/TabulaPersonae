# D&D Character Sheet - Persistence Troubleshooting Guide

## Issues Identified and Fixed

### 1. **Redundant Storage Calls** ✅ FIXED
**Problem**: `ability-scores.tsx` was calling `saveCharacter()` directly in addition to the `onUpdate()` callback, causing double-saving.

**Solution**: Removed the redundant `saveCharacter()` call from the component. All persistence now flows through the main `updateCharacter()` function in `page.tsx`.

### 2. **Missing Error Handling** ✅ FIXED
**Problem**: Storage functions didn't handle localStorage failures (quota exceeded, disabled storage, etc.).

**Solution**: 
- Added try-catch blocks to all storage functions
- Functions now return `boolean` success indicators
- Added user-facing error messages when saves fail

### 3. **Test Environment Issues** ✅ FIXED
**Problem**: Tests were failing due to missing `crypto.randomUUID` mock.

**Solution**: Added proper crypto mock in test setup.

### 4. **Form State Not Updating Between Characters** ✅ FIXED
**Problem**: When switching between characters, form fields retained data from the previous character instead of showing the new character's data.

**Solution**: Added `useEffect` hooks in all form components to update local state when `character.id` changes.

## Current Storage Architecture

### Storage Functions (lib/character-storage.ts)
- `saveCharacter(character)` → `boolean` - Saves/updates a character
- `getCharacters()` → `Character[]` - Retrieves all characters
- `deleteCharacter(id)` → `boolean` - Deletes a character
- `setActiveCharacter(id)` → `boolean` - Sets active character
- `getActiveCharacter()` → `string | null` - Gets active character ID

### Data Flow
1. User makes changes in components
2. Component calls `onUpdate(updatedCharacter)`
3. `page.tsx` receives update and calls `saveCharacter()`
4. Success/failure is handled with user feedback

## Common Persistence Issues to Watch For

### 1. **LocalStorage Quota Exceeded**
**Symptoms**: Data stops saving, no error messages
**Cause**: Browser storage limit reached (~5-10MB)
**Solution**: Implement data cleanup or compression

### 2. **Disabled LocalStorage**
**Symptoms**: Silent save failures
**Cause**: Private browsing or browser settings
**Solution**: Error handling now shows user alerts

### 3. **Race Conditions**
**Symptoms**: Inconsistent data states
**Cause**: Multiple simultaneous save operations
**Solution**: Centralized save logic prevents this

### 4. **Server-Side Rendering Issues**
**Symptoms**: Hydration mismatches
**Cause**: localStorage not available during SSR
**Solution**: Proper `typeof window` checks in place

### 5. **Form State Leakage**
**Symptoms**: Previous character data appears in forms when editing new characters
**Cause**: Component state not updating when character prop changes
**Solution**: Use `useEffect` to sync local state with character prop changes

## Testing Storage Issues

Run the storage tests:
```bash
npm test -- --testPathPattern=character-storage.test.ts
```

All tests should pass. If they fail, check:
- localStorage mock setup
- crypto.randomUUID mock
- Return type expectations

## Debugging Tips

### Check Browser Storage
1. Open DevTools → Application → Local Storage
2. Look for keys: `dnd-characters`, `dnd-active-character`
3. Verify JSON structure is valid

### Monitor Console
Storage errors are logged to console with prefix "Failed to save/delete character:"

### Test Storage Limits
```javascript
// In browser console
try {
  localStorage.setItem('test', 'x'.repeat(10000000));
} catch(e) {
  console.log('Storage limit reached:', e);
}
```

## Best Practices Implemented

1. **Single Source of Truth**: All saves go through main `updateCharacter()` function
2. **Error Handling**: All storage operations wrapped in try-catch
3. **User Feedback**: Failed saves show alert messages
4. **Type Safety**: Functions return boolean success indicators
5. **SSR Compatibility**: Proper window checks for server-side rendering

## Future Improvements

Consider implementing:
- **Debounced Saves**: Reduce save frequency for better performance
- **Data Compression**: Use compression for large character data
- **Cloud Backup**: Optional cloud storage integration
- **Offline Support**: Service worker for offline functionality
- **Data Validation**: Validate character data before saving
