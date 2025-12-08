import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import jQueryFactory from 'jquery';
import { getCssSelector } from 'css-selector-generator';
import { loadFixture, parseTestMetadata, findTargetElement, extractValue } from '../test-utils/dom-helpers.js';
import {
    calculateStabilityScore,
    getSelectorQualityFlags,
    formatQualityReport,
    isCssInJsClass,
    hasFragileAttribute
} from '../test-utils/selector-quality.js';

/**
 * Configuration for css-selector-generator optimized for value tracking.
 */
const selectorConfig = {
    selectors: ["id", "attribute", "class", "tag", "nthchild"],
    whitelist: [
        /\[data-testid/,
        /\[data-qa/,
        /\[data-cy/,
        /\[data-test/,
        /\[aria-label/
    ],
    blacklist: [
        // CSS-in-JS patterns
        /\.[a-z]{6,}$/i,
        /\._[a-zA-Z0-9]{5,}/,
        /\.[A-Z][a-z]+[A-Z][a-z]+[A-Z]/,
        (selector) => isCssInJsClass(selector.match(/\.([a-zA-Z0-9_-]+)$/)?.[1] || ''),
        // Fragile attribute selectors
        /\[style[=~]/,
        /\[class[=~]/,
        hasFragileAttribute
    ],
    includeTag: false,
    combineWithinSelector: true,
    combineBetweenSelectors: true
};

describe('Selector Generator', () => {
    /**
     * Helper function to setup DOM with a fixture
     */
    function setupDOM(html) {
        const dom = new JSDOM(html, {
            url: 'http://localhost',
        });
        const window = dom.window;
        const document = window.document;

        // Set up jQuery to work with this JSDOM window
        const jQueryBound = jQueryFactory(window);

        // Create a $ function that wraps the bound jQuery
        const $ = function(selector) {
            if (typeof selector === 'string') {
                return jQueryBound.constructor(selector, document);
            }
            return jQueryBound.constructor(selector);
        };

        // Copy jQuery methods to our wrapper
        Object.assign($, jQueryBound.constructor);

        // Make jQuery available in window
        window.jQuery = $;
        window.$ = $;

        /**
         * Generate a fallback selector using tag + nth-of-type path
         */
        const generateFallbackSelector = (element) => {
            const path = [];
            let current = element;
            const maxDepth = 5;

            while (current && current.nodeType === 1 && path.length < maxDepth) {
                const tagName = current.tagName.toLowerCase();
                const parent = current.parentElement;

                if (current.id) {
                    path.unshift('#' + current.id);
                    break;
                }

                if (parent) {
                    const siblings = Array.from(parent.children).filter(
                        child => child.tagName === current.tagName
                    );
                    if (siblings.length > 1) {
                        const index = siblings.indexOf(current) + 1;
                        path.unshift(`${tagName}:nth-of-type(${index})`);
                    } else {
                        path.unshift(tagName);
                    }
                } else {
                    path.unshift(tagName);
                }

                current = parent;
            }

            return path.join(' > ');
        };

        /**
         * Generate selector using css-selector-generator with our config
         * Falls back to tag-based selector if fragile attribute is detected
         */
        const generateSelector = ($element) => {
            const element = $element[0];
            if (!element) return "";

            const selector = getCssSelector(element, selectorConfig);

            // If the generated selector has fragile attributes, use fallback
            if (hasFragileAttribute(selector)) {
                console.warn('Generated selector has fragile attribute, using fallback:', selector);
                return generateFallbackSelector(element);
            }

            return selector;
        };

        return { window, document, $, generateSelector };
    }

    /**
     * Test a fixture file
     */
    function testFixture(fixtureName, options = {}) {
        const { skipTest = false, expectedToFail = false } = options;

        let testFn = it;
        if (skipTest) {
            testFn = it.skip;
        } else if (expectedToFail) {
            testFn = it.fails;
        }

        const testName = expectedToFail
            ? `${fixtureName} (expected to fail - documents current limitation)`
            : fixtureName;

        testFn(`should generate working selector for ${testName}`, () => {
            // Load fixture
            const html = loadFixture(fixtureName);
            const metadata = parseTestMetadata(html);

            // Setup DOM and get jQuery instance with selector generator
            const { $, generateSelector } = setupDOM(html);

            // Find target element using selector hint
            const $targetElement = findTargetElement($, metadata.selector_hint);

            // Generate selector using css-selector-generator
            const generatedSelector = generateSelector($targetElement);

            // Debug output
            console.log(`\n  Generated selector: "${generatedSelector}"`);
            console.log(`  Target element text: "${$targetElement.text().trim()}"`);

            // Quality validation
            const stabilityScore = calculateStabilityScore(generatedSelector);
            const qualityFlags = getSelectorQualityFlags(generatedSelector);
            const minScore = parseInt(metadata.min_stability_score) || 40;

            console.log(formatQualityReport(generatedSelector, stabilityScore, qualityFlags));

            // The key test: can the generated selector find elements and extract the correct value?
            const $foundElements = $(generatedSelector);

            // Debug output
            console.log(`  Found elements: ${$foundElements.length}`);
            if ($foundElements.length > 0) {
                console.log(`  Found element text: "${$foundElements.text().trim()}"`);
            }

            // Validate: selector should find at least one element
            expect($foundElements.length).toBeGreaterThan(0);

            // Most important: extracted value should match expected
            const extractedValue = extractValue($foundElements);
            expect(extractedValue).toBe(metadata.expected_value);

            // Quality validation: fail if selector uses fragile attributes
            expect(qualityFlags.hasFragileAttribute).toBe(false);

            // Quality validation: fail if below minimum stability threshold
            expect(stabilityScore).toBeGreaterThanOrEqual(minScore);

            // Log for debugging
            console.log(`\n  ✓ ${metadata.site}: Selector works, extracted value: "${extractedValue}"`);
        });
    }

    describe('Real-world fixtures', () => {
        // Note: Fixtures should be created manually by visiting real websites
        // and saving representative HTML snapshots with TEST_METADATA comments

        // Real-world test fixtures
        testFixture('amazon_nl.html');
        testFixture('github_com.html');
        testFixture('ebay_com.html');
        testFixture('sinoptik_ua.html');
        testFixture('yahoo_finance_com.html');
        testFixture('bbc_com.html');
        testFixture('zalando_nl.html'); // Fixed: CSS-in-JS now handled by blacklist
        testFixture('booking_com.html'); // Fixed: uses :nth-child() instead of jQuery's :eq()
        testFixture('autohero_com.html');

        // Additional fixtures to be added:
        // testFixture('aliexpress-product.html'); - dynamic, completely unsupported
        // testFixture('reddit-upvotes.html'); - dynamic, completely unsupported
        // testFixture('youtube-views.html'); - dynamic, completely unsupported
    });

    describe('Selector validation', () => {
        it('should verify jQuery is working in JSDOM', () => {
            const html = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div id="test">Test</div>
                </body>
                </html>
            `;
            const { $ } = setupDOM(html);

            expect(typeof $).toBe('function');
            expect($('#test').length).toBe(1);
            expect($('#test').text()).toBe('Test');
        });

        it('should generate a unique selector for a simple element with ID', () => {
            const html = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div id="test-element">Test Content</div>
                    <div>Other content</div>
                </body>
                </html>
            `;
            const { $, generateSelector } = setupDOM(html);

            const $target = $('#test-element');
            const selector = generateSelector($target);

            expect(selector).toContain('test-element');
            expect($(selector).length).toBe(1);
            expect($(selector).text()).toBe('Test Content');
        });

        it('should generate a unique selector for an element with class', () => {
            const html = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="unique-class">Test Content</div>
                    <div>Other content</div>
                </body>
                </html>
            `;
            const { $, generateSelector } = setupDOM(html);

            const $target = $('.unique-class');
            const selector = generateSelector($target);

            expect($(selector).length).toBe(1);
            expect($(selector).text()).toBe('Test Content');
        });

        it('should generate a unique selector for nested elements', () => {
            const html = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="container">
                        <div class="row">
                            <span class="price">€29.99</span>
                        </div>
                    </div>
                </body>
                </html>
            `;
            const { $, generateSelector } = setupDOM(html);

            const $target = $('.price');
            const selector = generateSelector($target);

            expect($(selector).length).toBe(1);
            expect($(selector).text()).toBe('€29.99');
        });

        it('should prioritize data-testid over CSS-in-JS classes', () => {
            const html = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="aBcDeF _0xHash vErYlOnG" data-testid="product-price">€19.99</div>
                </body>
                </html>
            `;
            const { $, generateSelector } = setupDOM(html);

            const $target = $('[data-testid="product-price"]');
            const selector = generateSelector($target);

            // Should use data-testid, not the CSS-in-JS classes
            expect(selector).toContain('data-testid');
            expect(selector).not.toContain('aBcDeF');
            expect($(selector).length).toBe(1);
            expect($(selector).text()).toBe('€19.99');
        });
    });
});
