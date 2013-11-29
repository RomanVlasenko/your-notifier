var storage = chrome.storage.sync;

$(document).ready(function () {
    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            if (request.msg == "timeToCheck") {
                refreshRuleControls();
            }
        });
});

function checkAndUpdate(rule) {
    $.get(rule.url, function (data) {
        var newVal = $(data).find(rule.selector).text().trim();
        if (newVal != 'undefined' && newVal != rule.value) {
            rule.value = newVal;
            updateRuleValue(rule);
        }
    });
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
