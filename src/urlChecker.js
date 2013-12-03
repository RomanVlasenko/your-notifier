var storage = chrome.storage.sync;
var NOT_AVAILABLE = "Not available";

function checkAndUpdate(rule) {
    $.ajax({url: rule.url,
               success: function (srcHtml) {
                   var newVal = $(srcHtml).find(rule.selector).text().trim();
                   if (newVal) {
                       rule.value = newVal;
                       updateRuleValue(rule);
                   }
               },
               error: function () {
                   rule.value = NOT_AVAILABLE;
                   updateRuleValue(rule);
               }});
}

function updateRuleValue(rule) {
    storage.get('rules', function (data) {
        var rules = data.rules;
        var oldRule = _.find(rules, function (r) {
            return r.id == rule.id;
        });

        if (rule.value != NOT_AVAILABLE && oldRule.value != rule.value) {
            oldRule.value = rule.value;

            if (!oldRule.history) {
                oldRule.history = [];
            }

            oldRule.history.unshift({"value": oldRule.value, "date": new Date().getTime()});

            storage.set({'rules': rules}, function () {
                refreshRuleControls();
            });
        }
    });
}