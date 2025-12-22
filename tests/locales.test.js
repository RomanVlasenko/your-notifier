import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '../src/_locales');

/**
 * Load all locale files and their message keys
 */
function loadLocales() {
    const locales = {};
    const localeDirs = readdirSync(localesDir);

    for (const locale of localeDirs) {
        const messagesPath = join(localesDir, locale, 'messages.json');
        try {
            const content = readFileSync(messagesPath, 'utf-8');
            locales[locale] = JSON.parse(content);
        } catch (e) {
            // Skip if not a valid locale directory
        }
    }

    return locales;
}

describe('Locale Files', () => {
    const locales = loadLocales();
    const localeNames = Object.keys(locales);

    // Use English as the reference locale
    const referenceLocale = 'en';
    const referenceKeys = Object.keys(locales[referenceLocale] || {}).sort();

    it('should have English as reference locale', () => {
        expect(locales[referenceLocale]).toBeDefined();
        expect(referenceKeys.length).toBeGreaterThan(0);
    });

    it('should have at least 2 locales', () => {
        expect(localeNames.length).toBeGreaterThanOrEqual(2);
    });

    describe('Message key consistency', () => {
        for (const locale of localeNames) {
            if (locale === referenceLocale) continue;

            it(`${locale} should have the same keys as ${referenceLocale}`, () => {
                const localeKeys = Object.keys(locales[locale]).sort();

                const missingKeys = referenceKeys.filter(key => !localeKeys.includes(key));
                const extraKeys = localeKeys.filter(key => !referenceKeys.includes(key));

                if (missingKeys.length > 0 || extraKeys.length > 0) {
                    let errorMessage = `Locale "${locale}" has key mismatches with "${referenceLocale}":\n`;
                    if (missingKeys.length > 0) {
                        errorMessage += `  Missing keys: ${missingKeys.join(', ')}\n`;
                    }
                    if (extraKeys.length > 0) {
                        errorMessage += `  Extra keys: ${extraKeys.join(', ')}`;
                    }
                    expect.fail(errorMessage);
                }
            });
        }
    });

    describe('Message structure validation', () => {
        for (const locale of localeNames) {
            it(`${locale} should have valid message structure`, () => {
                const messages = locales[locale];

                for (const [key, value] of Object.entries(messages)) {
                    // Each message must have a "message" property
                    expect(value, `${locale}:${key} should be an object`).toBeTypeOf('object');
                    expect(value.message, `${locale}:${key} should have a "message" property`).toBeDefined();
                    expect(value.message, `${locale}:${key}.message should be a string`).toBeTypeOf('string');

                    // Message should not be empty
                    expect(value.message.trim().length, `${locale}:${key}.message should not be empty`).toBeGreaterThan(0);
                }
            });
        }
    });

    describe('Placeholder consistency', () => {
        for (const locale of localeNames) {
            if (locale === referenceLocale) continue;

            it(`${locale} should have matching placeholders for messages that use them`, () => {
                const refMessages = locales[referenceLocale];
                const localeMessages = locales[locale];

                for (const [key, refValue] of Object.entries(refMessages)) {
                    if (refValue.placeholders) {
                        const localeValue = localeMessages[key];
                        if (localeValue) {
                            const refPlaceholderNames = Object.keys(refValue.placeholders).sort();
                            const localePlaceholderNames = Object.keys(localeValue.placeholders || {}).sort();

                            expect(
                                localePlaceholderNames,
                                `${locale}:${key} should have the same placeholders as ${referenceLocale}`
                            ).toEqual(refPlaceholderNames);
                        }
                    }
                }
            });
        }
    });
});
