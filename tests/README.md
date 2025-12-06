# Selector Generator Tests

## Running Tests

```bash
# Install dependencies first (one time only)
npm install

# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Adding New Fixtures

### 1. Find the selector_hint

On the live website with the extension loaded:

1. Open DevTools Console (F12)
2. Right-click the element you want to monitor (e.g., product price)
3. Select "Watch this item" from the context menu
4. Check the console for the debug output:
   ```
   Element passed to selectorator: {
     tagName: 'SPAN',
     className: 'a-price-whole',
     id: '',
     textContent: '599.',
     ...
   }
   ```
5. Create a `selector_hint` that uniquely identifies this element:
   - **If the className is unique**: use `.a-price-whole`
   - **If the className appears multiple times**: inspect the parent elements and create a more specific selector
     - Example: If the parent has class `.x-price-primary`, use `.x-price-primary .ux-textspans`
   - **If there's an id**: use `#element-id`

   **Important**: The `selector_hint` must uniquely identify the element in the fixture HTML. Test this by running `document.querySelector(selector_hint)` in DevTools to ensure it selects the correct element.

### 2. Capture Real HTML

Save a representative HTML snapshot:

1. In DevTools Elements tab, find the element you right-clicked
2. Right-click the **parent container** that includes the element, its siblings, and ancestors
3. Copy > Copy element
4. Clean up: Remove unrelated page sections (header/footer/scripts not needed for the target element)
5. Keep class names, IDs, and structure intact - don't oversimplify

### 3. Create Fixture File

Create a new file in `tests/fixtures/` (e.g., `amazon-product.html`) with this structure:

```html
<!--
TEST_METADATA:
site: Amazon NL
url: https://www.amazon.nl/product/B08X123456
target_element: Product price
expected_value: €29,99
selector_hint: .a-price-whole
-->
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Product Title</title>
</head>
<body>
    <!-- Paste cleaned HTML here -->
    <div class="product-price">
        <span class="a-price-whole">€29,99</span>
    </div>
</body>
</html>
```

**Metadata fields:**
- `site`: Website name (for documentation)
- `url`: Original URL (for reference)
- `target_element`: Description of what you're monitoring
- `expected_value`: The exact text/value to extract
- `selector_hint`: CSS selector to find the target element (from step 1)

### 4. Add Test Case

In `tests/selector-generator/selector-generator.test.js`, add:

```javascript
testFixture('amazon-product.html');
```

Or if you expect it to fail with current selectorator:

```javascript
testFixture('zalando-product.html', { expectedToFail: true });
```
