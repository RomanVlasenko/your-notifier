import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import jQueryFactory from 'jquery';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';
import { loadFixture, parseTestMetadata, findTargetElement, extractValue } from '../test-utils/dom-helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load selectorator library (minified)
const selectoratorPath = join(__dirname, '../../src/lib/selectorator.min.js');
const selectoratorCode = readFileSync(selectoratorPath, 'utf-8');

describe('Selector Generator', () => {
    /**
     * Helper function to setup DOM with a fixture
     */
    function setupDOM(html, options = {}) {
        const { loadSelectorator: shouldLoadSelectorator = false } = options;

        const dom = new JSDOM(html, {
            url: 'http://localhost',
        });
        const window = dom.window;
        const document = window.document;

        // Set up jQuery to work with this JSDOM window
        // jQueryFactory(window) creates a jQuery instance bound to that window
        const jQueryBound = jQueryFactory(window);

        // Create a $ function that wraps the bound jQuery
        // This ensures queries run against the correct document
        const $ = function(selector) {
            // If it's a string selector, use the bound jQuery's find
            if (typeof selector === 'string') {
                return jQueryBound.constructor(selector, document);
            }
            // Otherwise, wrap it normally
            return jQueryBound.constructor(selector);
        };

        // Copy jQuery methods to our wrapper
        Object.assign($, jQueryBound.constructor);

        // Make jQuery and related globals available in window
        window.jQuery = $;
        window.$ = $;

        // Optionally load selectorator (currently has JSDOM compatibility issues)
        if (shouldLoadSelectorator) {
            // The selectorator code is an IIFE that expects jQuery to be available
            // Create a function that has jQuery in its closure
            const loadSelectoratorFunc = new Function('jQuery', `
                ${selectoratorCode}
                return jQuery;
            `);

            // Execute it with our jQuery instance
            try {
                loadSelectoratorFunc.call(window, $);
            } catch (e) {
                console.error('Error loading selectorator:', e);
                throw e;
            }
        }

        return { window, document, $ };
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

            // Setup DOM and get jQuery instance, with selectorator loaded
            const { $ } = setupDOM(html, { loadSelectorator: true });

            // Find target element using selector hint
            const $targetElement = findTargetElement($, metadata.selector_hint);

            // Generate selector using selectorator (via adapter pattern)
            const generatedSelector = $targetElement.getSelector().join("\n");

            // Debug output
            console.log(`\n  Generated selector: "${generatedSelector}"`);
            console.log(`  Target element text: "${$targetElement.text().trim()}"`);

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
        testFixture('zalando_nl.html', { expectedToFail: true }); // CSS-in-JS limitation
        testFixture('booking_com.html', { expectedToFail: true }); // jQuery :eq() selector limitation

        // Additional fixtures to be added:
        // testFixture('aliexpress-product.html'); - dynamic, completely
        // testFixture('reddit-upvotes.html'); - dynamic, completely
        // testFixture('youtube-views.html'); - dynamic, completely
        // testFixture('news-article.html');
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

        it.skip('should generate a unique selector for a simple element with ID', () => {
            const html = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div id="test-element">Test Content</div>
                    <div>Other content</div>
                </body>
                </html>
            `;
            const { $ } = setupDOM(html);

            const $target = $('#test-element');
            const selector = $target.getSelector().join("\n");

            expect(selector).toContain('test-element');
            expect($(selector).length).toBe(1);
            expect($(selector).text()).toBe('Test Content');
        });

        it.skip('should generate a unique selector for an element with class', () => {
            const html = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="unique-class">Test Content</div>
                    <div>Other content</div>
                </body>
                </html>
            `;
            const { $ } = setupDOM(html);

            const $target = $('.unique-class');
            const selector = $target.getSelector().join("\n");

            expect($(selector).length).toBe(1);
            expect($(selector).text()).toBe('Test Content');
        });

        it.skip('should generate a unique selector for nested elements', () => {
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
            const { $ } = setupDOM(html);

            const $target = $('.price');
            const selector = $target.getSelector().join("\n");

            expect($(selector).length).toBe(1);
            expect($(selector).text()).toBe('€29.99');
        });
    });
});
