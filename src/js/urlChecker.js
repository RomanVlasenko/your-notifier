function checkAndUpdate(rule) {

    var callbackHandler;
    if (arguments && arguments.length > 1) {
        callbackHandler = arguments[1];
    } else {
        callbackHandler = function (o) {
        }
    }

    $.ajax({url: rule.url,
        success: function (srcHtml) {
            var foundData = $(srcHtml).find(rule.selector);

            if (foundData.length != 0) {
                var newVal = foundData.first().text().trim();
                if (newVal) {

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

                }
            } else {
                console.log("unable to parse value for rule %s. Attempts made: %s", rule.id, rule.attempts);
                onError();
            }

        },
        error: function () {
            console.log("%s is not reachable at the moment. Attempts made: %s", rule.id, rule.attempts);
            onError();
        }});

    function onError() {
        if (rule.value) {
            if ((rule.attempts || 0) >= updates.MAX_ATTEMPTS) {
                rule.value = NOT_AVAILABLE;
                updateRuleValue(rule, callbackHandler);
            } else {
                ruleStorage.readRule(rule.id, function (rule) {
                    rule.attempts = (rule.attempts || 0) + 1;
                    ruleStorage.updateRule(rule, function () {
                        callbackHandler();
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
                chromeAPI.runtime.sendMessage({msg: "refreshList"});
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
