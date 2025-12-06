import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load an HTML fixture file
 * @param {string} fixtureName - Name of the fixture file (e.g., 'amazon-product.html')
 * @returns {string} HTML content
 */
export function loadFixture(fixtureName) {
    const fixturePath = join(__dirname, '../fixtures', fixtureName);
    return readFileSync(fixturePath, 'utf-8');
}

/**
 * Parse test metadata from HTML comments
 * Expected format:
 * <!--
 * TEST_METADATA:
 * site: Amazon NL
 * url: https://www.amazon.nl/product/example
 * target_element: Product price
 * expected_value: €29,99
 * selector_hint: .priceToPay .a-price-whole
 * -->
 *
 * @param {string} html - HTML content
 * @returns {Object} Metadata object
 */
export function parseTestMetadata(html) {
    const metadataRegex = /<!--\s*TEST_METADATA:([\s\S]*?)-->/;
    const match = html.match(metadataRegex);

    if (!match) {
        throw new Error('No TEST_METADATA found in fixture');
    }

    const metadataText = match[1];
    const metadata = {};

    // Parse each line as key: value
    const lines = metadataText.split('\n').filter(line => line.trim());
    for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
            const cleanKey = key.trim();
            const cleanValue = valueParts.join(':').trim();
            metadata[cleanKey] = cleanValue;
        }
    }

    return metadata;
}

/**
 * Find the target element in the DOM using the selector hint
 * @param {jQuery} $ - jQuery instance
 * @param {string} selectorHint - CSS selector to find the target element
 * @returns {jQuery} Target element
 */
export function findTargetElement($, selectorHint) {
    const $element = $(selectorHint);

    if ($element.length === 0) {
        throw new Error(`Target element not found using selector: ${selectorHint}`);
    }

    if ($element.length > 1) {
        console.warn(`Multiple elements found with selector: ${selectorHint}, using first one`);
    }

    return $element.first();
}

/**
 * Extract text value from an element, trimming whitespace
 * @param {jQuery} $element - jQuery element
 * @returns {string} Trimmed text content
 */
export function extractValue($element) {
    return $element.text().trim();
}
