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
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            var newVal = $($.parseHTML(xhr.responseText)).find(rule.selector).text();
            if (newVal) {
                rule.value = newVal;
                updateRuleValue(rule);
            }
        }
    };
    xhr.open('GET', rule.url, true);
    xhr.send(null);
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
