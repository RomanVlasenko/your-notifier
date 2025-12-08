# Guidelines for AI Agents

## Creating Test Fixtures

### Required: Strip Unnecessary Tags

**Always remove these tags from HTML fixtures:**
- `<style>` - not needed for selector generation
- `<link>` - not needed for selector generation
- `<script>` - not executed in test environment

This reduces file size by 60-90% (e.g., autohero_com.html: 551KB → 170KB).

### Required: TEST_METADATA Format

```html
<!--
TEST_METADATA:
site: Site Name
url: https://example.com/page
target_element: Description (e.g., "Product price")
expected_value: The exact text to extract
selector_hint: .css-selector-to-find-target
min_stability_score: 60 (optional, default: 40)
-->
```

### Run Tests

Quality checks are automated: `npm test -- selector-generator.test.js`
