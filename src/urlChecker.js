function check(rule, onComplete) {
    $.ajax({url: rule.url,
               success: function (srcHtml) {
                   var foundData = $(srcHtml).find(rule.selector);
                   if (foundData.length != 0) {
                       var newVal = foundData.first().text().trim();
                       onComplete(newVal);
                   } else {
                       onComplete("");
                   }

               },
               error: function () {
                   onComplete("");
               }});
}

function checkAndUpdate(rule, onValueChanged) {
    $.ajax({url: rule.url,
               success: function (srcHtml) {
                   var foundData = $(srcHtml).find(rule.selector);

                   if (foundData.length != 0) {
                       var newVal = foundData.first().text().trim();
                       if (newVal) {
                           rule.value = newVal;
                           updateRuleValue(rule, onValueChanged);
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
        updateRuleValue(rule, onValueChanged);
    }
}

function updateRuleValue(newRule, onValueChanged) {
    storage.get('rules', function (data) {
        var rules = data.rules;
        var oldRule = _.find(rules, function (r) {
            return r.id == newRule.id;
        });

        if (oldRule.value != newRule.value) {

            oldRule.value = newRule.value;

            if (oldRule.value != NOT_AVAILABLE) {
                addHistory(oldRule, {"value": oldRule.value, "date": new Date().getTime()});
            }

            storage.set({'rules': rules}, function () {
                refreshRuleControls();
                onValueChanged(true);
            });

        } else {
            onValueChanged(false);
        }

    });
}

function addHistory(rule, record) {
    if (!rule.history) {
        rule.history = [];
    } else if (rule.history.length >= HISTORY_MAX - 1) {
        rule.history = rule.history.slice(0, HISTORY_MAX - 1);
    }
    rule.history.unshift(record);
}