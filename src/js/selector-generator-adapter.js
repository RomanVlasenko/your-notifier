/**
 * Selector Generator Adapter
 *
 * This module provides an abstraction layer for the selector generation library.
 * It allows us to swap out the underlying library (currently jQuery Selectorator)
 * without changing the code that uses it.
 *
 * To replace the selector library:
 * 1. Update this file to use the new library
 * 2. Ensure it still returns a string (or array of strings joined by newlines)
 * 3. Run tests to verify all fixtures still work
 */

/**
 * Generates a CSS selector for the given jQuery element
 * @param {jQuery} $element - The jQuery-wrapped DOM element
 * @returns {string} CSS selector string (may contain multiple selectors separated by newlines)
 */
export function generateSelector($element) {
    // Current implementation: jQuery Selectorator
    // Selectorator returns an array of selector strings, we join them with newlines
    return $element.getSelector().join("\n");

    // Future alternatives:
    // - optimal-select: return finder($element[0]);
    // - unique-selector: return unique($element[0]);
    // - css-selector-generator: return new CssSelectorGenerator().getSelector($element[0]);
    // - custom implementation
}
