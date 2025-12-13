function checkAndUpdate(rule) {

    var callbackHandler;
    if (arguments && arguments.length > 1) {
        callbackHandler = arguments[1];
    } else {
        callbackHandler = function (o) {
        }
    }

    console.log("[urlChecker] Starting fetch for rule %s: %s", rule.id, rule.url);

    fetch(rule.url, { credentials: 'include' })
        .then(function (response) {
            console.log("[urlChecker] Fetch successful for rule %s, status: %s", rule.id, response.status);
            return response.text();
        })
        .then(function (srcHtml) {
            console.log("[urlChecker] HTML received for rule %s, length: %s bytes", rule.id, srcHtml.length);

            // Parse HTML using offscreen document
            console.log("[urlChecker] Sending PARSE_HTML message for rule %s with selector: %s", rule.id, rule.selector);
            chrome.runtime.sendMessage({
                type: 'PARSE_HTML',
                html: srcHtml,
                selector: rule.selector
            }, function (response) {
                if (chrome.runtime.lastError) {
                    console.error('[urlChecker] Error sending to offscreen document for rule %s:', rule.id, chrome.runtime.lastError.message);
                    onError();
                    return;
                }

                console.log("[urlChecker] Received response from offscreen document for rule %s:", rule.id, response);
                var newVal = response && response.result ? response.result : '';

                if (newVal) {
                    console.log("[urlChecker] Successfully parsed value for rule %s: %s", rule.id, newVal);
                    //Resetting attempts counter if it's needed
                    ruleStorage.readRule(rule.id, function (rule) {
                        if ((rule.attempts || 0) > 0) {
                            rule.attempts = 0;
                            rule.value = newVal;
                            ruleStorage.updateRule(rule, function () {
                                updateRuleValue(rule, callbackHandler);
                            });
                        } else {
                            rule.value = newVal;
                            updateRuleValue(rule, callbackHandler);
                        }
                    });
                } else {
                    console.log("[urlChecker] Unable to parse value for rule %s. Attempts made: %s", rule.id, rule.attempts);
                    onError();
                }
            });
        })
        .catch(function (error) {
            console.log("[urlChecker] Fetch failed for rule %s. Error: %s. Attempts made: %s", rule.id, error, rule.attempts);
            onError();
        });

    function onError() {
        if (rule.value) {
            if ((rule.attempts || 0) >= updates.MAX_ATTEMPTS) {
                rule.value = NOT_AVAILABLE;
                updateRuleValue(rule, callbackHandler);
            } else {
                ruleStorage.readRule(rule.id, function (updatedRule) {
                    updatedRule.attempts = (updatedRule.attempts || 0) + 1;
                    ruleStorage.updateRule(updatedRule, function () {
                        callbackHandler(updatedRule);
                    });
                });
            }
        } else {
            rule.value = ERROR;
            updateRuleValue(rule, callbackHandler);
        }
    }
}

function updateRuleValue(newRule, onRuleUpdated) {
    var callback = onRuleUpdated ? onRuleUpdated : c.emptyCallback;

    ruleStorage.readRule(newRule.id, function (exRule) {
        if (!isValuesEqual(exRule.value, newRule.value)) {
            exRule.value = newRule.value;
            exRule.new = true;
            exRule.notified = false;

            if (_.isEmpty(exRule.history) || newRule.value != exRule.history[0].value) {
                appendHistoryRecord(exRule, {"value": exRule.value, "date": new Date().getTime()});
            }

            ruleStorage.updateRule(exRule, function () {
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
