/**
 * Selector Generator Adapter
 *
 * This module provides an abstraction layer for the selector generation library.
 * Uses css-selector-generator with configuration optimized for:
 * - Prioritizing data-testid and other stable test attributes
 * - Ignoring CSS-in-JS generated class names
 * - Producing standard CSS selectors (not jQuery-specific like :eq())
 * - Preferring simpler selectors that may match multiple elements (first match is used)
 */

/**
 * Heuristic to detect CSS-in-JS generated class names.
 * These are typically random-looking alphanumeric strings that are:
 * - 6+ characters of mixed case alphanumeric
 * - Starting with underscore followed by alphanumeric
 * - CamelCase without clear word boundaries
 */
function isCssInJsClass(selector) {
    var classMatch = selector.match(/\.([a-zA-Z0-9_-]+)$/);
    if (!classMatch) return false;

    var className = classMatch[1];

    // Allow semantic class names (BEM-style, multi-dash patterns)
    if (/^[a-z]+(-[a-z]+)*$/.test(className)) return false;
    if (/^[a-z]+-[a-z]+-[a-z]+/.test(className)) return false;
    if (/^[a-z]+__[a-z]+/.test(className)) return false; // BEM element
    if (/^[a-z]+--[a-z]+/.test(className)) return false; // BEM modifier

    // Block hash-like patterns common in CSS-in-JS
    if (/^[a-zA-Z0-9]{6,}$/.test(className)) return true;     // Random alphanumeric 6+ chars
    if (/^_[a-zA-Z0-9]+$/.test(className)) return true;       // Underscore prefix
    if (/[A-Z][a-z]+[A-Z]/.test(className)) return true;      // CamelCase without dashes
    if (/^[a-zA-Z0-9]{6,}-$/.test(className)) return true;    // Trailing dash after 6+ chars (e.g., pMvljqm-)
    if (/^sc-[a-f0-9]+-\d+$/.test(className)) return true;    // Styled-components (e.g., sc-4c5af3d2-4)

    return false;
}

/**
 * Check if a selector looks like it contains dynamic/unstable parts.
 * Dynamic selectors often have numeric IDs or hash-like strings.
 */
function hasDynamicParts(selector) {
    // Contains numeric IDs like 'id-12345' or 'block-88350'
    if (/[-_]\d{4,}/.test(selector)) return true;
    // Contains hash-like attribute values
    if (/\['[^']*[a-f0-9]{8,}[^']*'\]/.test(selector)) return true;
    return false;
}

/**
 * Check if selector contains fragile attribute selectors that should be avoided.
 * - [style=...] - inline styles change with any UI update
 * - [class=...] - full class attribute breaks when any class changes
 * - Any attribute with value >50 chars (too specific, likely dynamic)
 */
function hasFragileAttribute(selector) {
    // Inline style selectors are extremely fragile
    if (/\[style[=~]/.test(selector)) return true;
    // Full class attribute selectors (not .class but [class=...])
    if (/\[class[=~]/.test(selector)) return true;
    // Long attribute values (handles both single and double quotes)
    var longAttrMatch = selector.match(/\[[^\]]+=['"][^'"]{50,}['"]\]/);
    if (longAttrMatch) return true;
    return false;
}

/**
 * Try to find a simpler, more stable selector for the element.
 * Prefers class-based selectors over dynamic attribute selectors.
 * Returns null if no good simple selector is found.
 */
function findSimpleSelector(element) {
    // Get stable classes (filter out CSS-in-JS)
    var classes = (element.className || '').split(/\s+/).filter(function(cls) {
        if (!cls) return false;
        // Use the same isCssInJsClass check (but it expects selector format, so add the dot)
        if (isCssInJsClass('.' + cls)) return false;
        return true;
    });

    // Try each class as a selector
    for (var i = 0; i < classes.length; i++) {
        var classSelector = '.' + CSS.escape(classes[i]);
        var matches = document.querySelectorAll(classSelector);
        // Accept if it matches and the element is the first match
        if (matches.length > 0 && matches[0] === element) {
            return classSelector;
        }
    }

    // Try tag + class combinations
    var tagName = element.tagName.toLowerCase();
    for (var i = 0; i < classes.length; i++) {
        var tagClassSelector = tagName + '.' + CSS.escape(classes[i]);
        var matches = document.querySelectorAll(tagClassSelector);
        if (matches.length > 0 && matches[0] === element) {
            return tagClassSelector;
        }
    }

    return null;
}

/**
 * Configuration for css-selector-generator optimized for value tracking.
 * Prioritizes stable attributes over potentially unstable classes.
 */
var selectorConfig = {
    // Prioritize: id > attribute > class > tag > nth-child
    // Including 'class' but relying on blacklist to filter CSS-in-JS
    selectors: ["id", "attribute", "class", "tag", "nthchild"],

    // Prioritize data attributes used for testing (these are typically stable)
    whitelist: [
        /\[data-testid/,
        /\[data-qa/,
        /\[data-cy/,
        /\[data-test/,
        /\[aria-label/
    ],

    // Block unstable patterns
    blacklist: [
        // CSS-in-JS patterns that are unstable across deployments
        /\.[a-z]{6,}$/i,                    // Long lowercase class names (e.g., .voFjEy)
        /\._[a-zA-Z0-9]{5,}/,               // Underscore-prefixed hashes (e.g., ._0xLoFW)
        /\.[A-Z][a-z]+[A-Z][a-z]+[A-Z]/,    // Multi-CamelCase (e.g., .SbJZ75Ab)
        isCssInJsClass,                      // Custom heuristic function
        // Fragile attribute selectors
        /\[style[=~]/,                       // Inline style selectors
        /\[class[=~]/,                       // Full class attribute selectors
        hasFragileAttribute                  // Custom function for long attribute values
    ],

    includeTag: false,
    combineWithinSelector: true,
    combineBetweenSelectors: true,

    // Performance limits to prevent hanging on complex pages like Reddit
    maxCombinations: 50,     // Limit selector combinations to try
    maxCandidates: 50        // Limit total candidates per element
};

/**
 * Generate a simple fallback selector using ID or tag + nth-child.
 * Used when the main generator times out or fails.
 */
function generateFallbackSelector(element) {
    // Try ID first
    if (element.id) {
        return '#' + CSS.escape(element.id);
    }

    // Try data-testid
    var testId = element.getAttribute('data-testid');
    if (testId) {
        return '[data-testid="' + testId + '"]';
    }

    // Fallback to tag + nth-child path
    var path = [];
    var current = element;
    var maxDepth = 5; // Limit depth to avoid overly long selectors

    while (current && current.nodeType === Node.ELEMENT_NODE && path.length < maxDepth) {
        var tagName = current.tagName.toLowerCase();
        var parent = current.parentElement;

        if (current.id) {
            path.unshift('#' + CSS.escape(current.id));
            break;
        }

        if (parent) {
            var siblings = Array.prototype.filter.call(parent.children, function(child) {
                return child.tagName === current.tagName;
            });
            if (siblings.length > 1) {
                var index = siblings.indexOf(current) + 1;
                path.unshift(tagName + ':nth-of-type(' + index + ')');
            } else {
                path.unshift(tagName);
            }
        } else {
            path.unshift(tagName);
        }

        current = parent;
    }

    return path.join(' > ');
}

/**
 * Generates a CSS selector for the given element.
 * Works with both jQuery-wrapped elements and raw DOM elements.
 *
 * @param {jQuery|Element} element - jQuery-wrapped or raw DOM element
 * @returns {string} CSS selector string
 */
function generateSelector(element) {
    // Handle both jQuery objects and raw DOM elements
    var domElement = element && element.jquery ? element[0] : element;

    if (!domElement) {
        return "";
    }

    // Quick path: if element has a unique ID that looks stable, use it directly
    if (domElement.id && !hasDynamicParts(domElement.id)) {
        var idSelector = '#' + CSS.escape(domElement.id);
        if (document.querySelectorAll(idSelector).length === 1) {
            return idSelector;
        }
    }

    // Quick path: if element has data-testid, prefer that
    var testId = domElement.getAttribute('data-testid');
    if (testId && !hasDynamicParts(testId)) {
        var testIdSelector = '[data-testid="' + testId + '"]';
        if (document.querySelectorAll(testIdSelector).length === 1) {
            return testIdSelector;
        }
    }

    // Try to find a simple class-based selector first
    // This is more stable than selectors with dynamic IDs
    var simpleSelector = findSimpleSelector(domElement);
    if (simpleSelector) {
        return simpleSelector;
    }

    // Use the global CssSelectorGenerator (loaded via content script in browser)
    if (typeof CssSelectorGenerator !== 'undefined') {
        try {
            var generatedSelector = CssSelectorGenerator.getCssSelector(domElement, selectorConfig);

            // If the generated selector has dynamic parts or fragile attributes, try to simplify it
            if (hasDynamicParts(generatedSelector) || hasFragileAttribute(generatedSelector)) {
                // Try to extract just the class part if present
                var classMatch = generatedSelector.match(/(\.[a-zA-Z][a-zA-Z0-9_-]*)/g);
                if (classMatch) {
                    for (var i = 0; i < classMatch.length; i++) {
                        var cls = classMatch[i];
                        // Skip CSS-in-JS classes
                        if (isCssInJsClass(cls)) continue;

                        var matches = document.querySelectorAll(cls);
                        if (matches.length > 0 && matches[0] === domElement) {
                            return cls;
                        }
                    }
                }

                // If still fragile, use the fallback selector
                if (hasFragileAttribute(generatedSelector)) {
                    console.warn('Generated selector has fragile attribute, using fallback:', generatedSelector);
                    return generateFallbackSelector(domElement);
                }
            }

            return generatedSelector;
        } catch (e) {
            console.warn('css-selector-generator failed, using fallback:', e.message);
            return generateFallbackSelector(domElement);
        }
    }

    // Fallback for ES module environment (e.g., tests with direct import)
    throw new Error('CssSelectorGenerator not loaded. Ensure css-selector-generator.min.js is loaded before this adapter.');
}
