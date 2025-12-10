# Guidelines for AI Agents

## Project Overview

Chrome extension for tracking value changes on web pages. Users select an element, extension generates a CSS selector, and monitors for changes.

## Key Architecture

- `src/` - Extension source (Manifest V3)
- `src/js/selector-generator-adapter.js` - CSS selector generation logic
- `src/js/background.js` - Service worker for alarms/notifications
- `src/js/dialog/contentScript.js` - Content script for element selection
- `tests/` - Vitest tests with real-world HTML fixtures

## Development Commands

```bash
npm test                    # Run all tests
npm test -- selector-generator.test.js  # Run selector tests only
```

## Critical Constraints

1. **No ES6 in src/js/** - Browser extension uses vanilla JS (no build step)
2. **Selector stability** - Avoid CSS-in-JS classes, inline styles, dynamic IDs
3. **Performance limits** - Use `maxCombinations: 50` in selector config to prevent hangs
4. **Version in manifest.json** - Bump version for releases (triggers GitHub Actions)

## Testing

Tests use real HTML fixtures from websites. See `tests/agents.md` for fixture creation guidelines.
