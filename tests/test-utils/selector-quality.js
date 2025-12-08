/**
 * Selector Quality Validation Utilities
 *
 * These functions assess the stability and quality of generated CSS selectors
 * without hardcoding expected values. They detect patterns that indicate
 * fragile or unstable selectors.
 */

/**
 * Check if a class name looks like CSS-in-JS generated
 * These are typically random-looking alphanumeric strings
 */
export function isCssInJsClass(className) {
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
 * Check if selector contains a CSS-in-JS class pattern
 */
export function containsCssInJsClass(selector) {
    const classMatches = selector.match(/\.([a-zA-Z0-9_-]+)/g);
    if (!classMatches) return false;

    for (const match of classMatches) {
        const className = match.substring(1); // Remove the leading dot
        if (isCssInJsClass(className)) return true;
    }
    return false;
}

/**
 * Check if selector has fragile attribute selectors
 * - [style=...] - inline styles change with any UI update
 * - [class=...] - full class list breaks when any class changes
 * - Any attribute with value >50 chars (too specific)
 */
export function hasFragileAttribute(selector) {
    if (/\[style=/.test(selector)) return true;
    if (/\[class=/.test(selector)) return true;
    // Check for long attribute values (handles both single and double quotes)
    const attrMatches = selector.match(/\[[^\]]+=['"][^'"]{50,}['"]\]/g);
    if (attrMatches && attrMatches.length > 0) return true;
    return false;
}

/**
 * Check if selector contains dynamic ID patterns
 * These change on page reload or between users
 */
export function hasDynamicId(selector) {
    // Numeric suffixes like id-12345 or block-88350
    if (/[-_]\d{4,}/.test(selector)) return true;
    return false;
}

/**
 * Check if selector contains hash-like attribute values
 */
export function hasHashAttribute(selector) {
    // Hash-like patterns in attribute values
    return /\[[^\]]*[a-f0-9]{8,}[^\]]*\]/i.test(selector);
}

/**
 * Count deep nth-child chains that are fragile to DOM changes
 */
export function getNthChildCount(selector) {
    const matches = selector.match(/:nth-child/g);
    return matches ? matches.length : 0;
}

/**
 * Check if selector uses stable data-test attributes
 */
export function usesDataTestAttribute(selector) {
    return /\[data-(testid|qa|test|cy|qa-selector)/.test(selector);
}

/**
 * Calculate a stability score for the selector (0-100)
 * Higher is better
 */
export function calculateStabilityScore(selector) {
    let score = 100;

    // Deductions for unstable patterns
    if (hasFragileAttribute(selector)) score -= 40;
    if (hasDynamicId(selector)) score -= 30;
    if (containsCssInJsClass(selector)) score -= 20;
    if (getNthChildCount(selector) > 3) score -= 15;
    if (hasHashAttribute(selector)) score -= 10;

    // Bonuses for stable patterns
    if (usesDataTestAttribute(selector)) score += 10;

    return Math.min(100, Math.max(0, score));
}

/**
 * Get all quality flags for a selector
 */
export function getSelectorQualityFlags(selector) {
    return {
        hasFragileAttribute: hasFragileAttribute(selector),
        hasDynamicId: hasDynamicId(selector),
        hasCssInJsClass: containsCssInJsClass(selector),
        hasDeepNthChild: getNthChildCount(selector) > 3,
        usesDataTestAttribute: usesDataTestAttribute(selector)
    };
}

/**
 * Format quality report for console output
 */
export function formatQualityReport(selector, stabilityScore, flags) {
    const lines = [];
    lines.push(`  Stability score: ${stabilityScore}/100`);

    const issues = [];
    if (flags.hasFragileAttribute) issues.push('fragile attribute');
    if (flags.hasDynamicId) issues.push('dynamic ID');
    if (flags.hasCssInJsClass) issues.push('CSS-in-JS class');
    if (flags.hasDeepNthChild) issues.push('deep :nth-child');

    if (issues.length > 0) {
        lines.push(`  ⚠ Issues: ${issues.join(', ')}`);
    }

    if (flags.usesDataTestAttribute) {
        lines.push(`  ✓ Uses stable data-test attribute`);
    }

    return lines.join('\n');
}
