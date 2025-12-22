var MESSAGE_TIMEOUT = 30000; // 30 second timeout for offscreen document messages

// Helper to send messages with timeout
function sendMessageWithTimeout(message, timeout) {
    return new Promise(function (resolve, reject) {
        var timeoutId = setTimeout(function () {
            reject(new Error('Message timeout after ' + timeout + 'ms'));
        }, timeout);

        chrome.runtime.sendMessage(message, function (response) {
            clearTimeout(timeoutId);
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
}

function checkAndUpdate(rule, callbackHandler) {
    callbackHandler = callbackHandler || function () {};

    console.log("[urlChecker] Starting fetch for rule %s: %s", rule.id, rule.url);

    var callbackCalled = false;
    var safeCallback = function(result) {
        if (!callbackCalled) {
            callbackCalled = true;
            console.log("[urlChecker] Calling callback for rule %s", rule.id);
            callbackHandler(result);
        }
    };

    // Timeout - if callback hasn't been called after 60 seconds, call it with error state
    var timeoutId = setTimeout(function() {
        console.error("[urlChecker] Timeout for rule %s - callback not called", rule.id);
        rule.value = rule.value || ERROR;
        safeCallback(rule);
    }, 60000);

    fetch(rule.url, { credentials: 'include' })
        .then(function (response) {
            console.log("[urlChecker] Fetch successful for rule %s, status: %s", rule.id, response.status);
            return response.text();
        })
        .then(function (srcHtml) {
            console.log("[urlChecker] HTML received for rule %s, length: %s bytes", rule.id, srcHtml.length);

            // Parse HTML using offscreen document with timeout
            console.log("[urlChecker] Sending PARSE_HTML message for rule %s with selector: %s", rule.id, rule.selector);
            return sendMessageWithTimeout({
                type: 'PARSE_HTML',
                html: srcHtml,
                selector: rule.selector
            }, MESSAGE_TIMEOUT);
        })
        .then(function (response) {
            console.log("[urlChecker] Received response from offscreen document for rule %s:", rule.id, response);
            var newVal = response && response.result ? response.result : '';

            if (newVal) {
                console.log("[urlChecker] Successfully parsed value for rule %s: %s", rule.id, newVal);
                // Reset attempts counter if needed, then update value
                return ruleStorage.readRule(rule.id).then(function (storedRule) {
                    if ((storedRule.attempts || 0) > 0) {
                        storedRule.attempts = 0;
                        return ruleStorage.updateRule(storedRule).then(function () {
                            rule.value = newVal;
                            return updateRuleValue(rule, safeCallback);
                        });
                    } else {
                        rule.value = newVal;
                        return updateRuleValue(rule, safeCallback);
                    }
                });
            } else {
                console.log("[urlChecker] Unable to parse value for rule %s. Attempts made: %s", rule.id, rule.attempts);
                return onSelectorNotFound();
            }
        })
        .catch(function (error) {
            console.error("[urlChecker] Error for rule %s: %s. Attempts made: %s", rule.id, error.message, rule.attempts);
            return onNetworkError();
        })
        .finally(function() {
            clearTimeout(timeoutId);
        });

    // Called when network request fails
    function onNetworkError() {
        if (rule.value && rule.value !== ERROR && rule.value !== ELEMENT_NOT_FOUND) {
            // Had a valid value before, increment attempts
            if ((rule.attempts || 0) >= updates.MAX_ATTEMPTS) {
                rule.value = NOT_AVAILABLE;
                return updateRuleValue(rule, safeCallback);
            } else {
                return ruleStorage.readRule(rule.id).then(function (updatedRule) {
                    updatedRule.attempts = (updatedRule.attempts || 0) + 1;
                    return ruleStorage.updateRule(updatedRule).then(function () {
                        safeCallback(updatedRule);
                    });
                });
            }
        } else {
            // No previous value or was already an error state
            rule.value = ERROR;
            return updateRuleValue(rule, safeCallback);
        }
    }

    // Called when selector doesn't match any element
    function onSelectorNotFound() {
        if (rule.value && rule.value !== ERROR && rule.value !== ELEMENT_NOT_FOUND) {
            // Had a valid value before, increment attempts
            if ((rule.attempts || 0) >= updates.MAX_ATTEMPTS) {
                rule.value = NOT_AVAILABLE;
                return updateRuleValue(rule, safeCallback);
            } else {
                return ruleStorage.readRule(rule.id).then(function (updatedRule) {
                    updatedRule.attempts = (updatedRule.attempts || 0) + 1;
                    return ruleStorage.updateRule(updatedRule).then(function () {
                        safeCallback(updatedRule);
                    });
                });
            }
        } else {
            // No previous valid value - use ELEMENT_NOT_FOUND instead of ERROR
            rule.value = ELEMENT_NOT_FOUND;
            return updateRuleValue(rule, safeCallback);
        }
    }
}

function updateRuleValue(newRule, onRuleUpdated) {
    var callback = onRuleUpdated || c.emptyCallback;

    return ruleStorage.readRule(newRule.id).then(function (exRule) {
        if (!isValuesEqual(exRule.value, newRule.value)) {
            exRule.value = newRule.value;
            exRule.new = true;
            exRule.notified = false;

            if (_.isEmpty(exRule.history) || newRule.value != exRule.history[0].value) {
                appendHistoryRecord(exRule, {"value": exRule.value, "date": new Date().getTime()});
            }

            return ruleStorage.updateRule(exRule).then(function () {
                chromeAPI.runtime.sendMessage({msg: "refreshList"}, function() {
                    if (chrome.runtime.lastError) {
                        // Ignore - popup may not be open
                    }
                });
                callback(exRule);
            });
        } else {
            callback(exRule);
        }
    });
}

function appendHistoryRecord(rule, record) {
    if (!rule.history) {
        rule.history = [];
    } else if (rule.history.length >= HISTORY_MAX - 1) {
        rule.history = rule.history.slice(0, HISTORY_MAX - 1);
    }
    rule.history.unshift(record);
}

function isValuesEqual(val1, val2) {
    if (_.isUndefined(val1) || _.isUndefined(val2)) {
        return false;
    } else {
        return c.shortenStr(val1, validation.VALUE_MAX_LENGTH) == c.shortenStr(val2, validation.VALUE_MAX_LENGTH);
    }
}
