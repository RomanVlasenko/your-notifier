var storage = chrome.storage.sync;
var NOT_AVAILABLE = "Not available";

$(document).ready(function () {
    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            if (request.msg == "timeToCheck") {
                performScheduledChecking()
            }
        });
});

function checkAndUpdate(rule) {
    $.ajax({url: rule.url,
               success: function (srcHtml) {
                   var newVal = $(srcHtml).find(rule.selector).text().trim();
                   if (newVal != 'undefined' && newVal != rule.value) {
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

        oldRule.value = rule.value;

        storage.set({'rules': rules}, function () {
            refreshRuleControls();
        });
    });
}

function performScheduledChecking() {
    var somethingChanged = false;
    var rulesChecked = [];

    storage.get('rules', function (data) {
        var rules = data.rules;

        _.each(rules, function (rule) {

            $.ajax({url: rule.url,
                       success: function (srcHtml) {
                           var newVal = $(srcHtml).find(rule.selector).text().trim();

                           if (newVal && newVal != rule.value) {
                               rule.value = newVal;
                               somethingChanged = true;
                           }

                           rulesChecked.push(rule);
                           if (rulesChecked.length == rules.length && somethingChanged) {
                               refreshRuleControls();
                           }
                       },
                       error: function () {
                           rule.value = NOT_AVAILABLE;
                           rulesChecked.push(rule);
                           if (rulesChecked.length == rules.length && somethingChanged) {
                               refreshRuleControls();
                           }
                       }});
        });
    });
}
