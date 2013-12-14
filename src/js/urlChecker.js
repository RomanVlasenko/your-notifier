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
                           rule.value = newVal;
                           updateRuleValue(rule, callbackHandler);
                       }
                   } else {
                       onError();
                   }

               },
               error: function () {
                   onError();
               }});

    function onError() {
        rule.value = NOT_AVAILABLE;
        updateRuleValue(rule, callbackHandler);
    }
}

function updateRuleValue(newRule, onRuleUpdated) {
    if (!onRuleUpdated) {
        onRuleUpdated = function () {
        };
    }

    persistence.findRule(newRule.id, function (exRule) {
        if (exRule.value != newRule.value) {
            exRule.value = newRule.value;
            exRule.new = true;

            if (newRule.value != NOT_AVAILABLE) {
                if (_.isEmpty(exRule.history) || newRule.value != exRule.history[0].value) {
                    appendHistoryRecord(exRule, {"value": exRule.value, "date": new Date().getTime()});
                }
            }

            persistence.saveRule(exRule, function () {
                chromeAPI.runtime.sendMessage({msg: "refreshList"});
                onRuleUpdated(exRule);
            });
        } else {
            onRuleUpdated(exRule);
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