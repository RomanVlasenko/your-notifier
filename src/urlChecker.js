function checkAndUpdate(rule, onValueChanged) {
    if (rule.url.length == 0) {
        onError();
    } else {
        $.ajax({url: rule.url,
                   success: function (srcHtml) {
                       var foundData = $(srcHtml).find(rule.selector);

                       if (foundData.length != 0) {
                           var newVal = foundData.first().text().trim();
                           if (newVal) {
                               rule.value = newVal;
                               updateRuleValue(rule);
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
            updateRuleValue(rule);
        }
    }
}

function updateRuleValue(rule, onValueChanged) {
    storage.get('rules', function (data) {
        var rules = data.rules;
        var oldRule = _.find(rules, function (r) {
            return r.id == rule.id;
        });

        if (oldRule.value != rule.value) {
            oldRule.value = rule.value;

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