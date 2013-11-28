$(document).ready(function (e) {
    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            if (request.msg == "timeToCheck") {
                performScheduledChecking();
            }
        });
});

function performScheduledChecking() {

    var rulesChecked = [];

    chrome.storage.sync.get('rules', function (data) {
        var rules = data.rules;
        $.each(rules, function (index, rule) {
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    var newVal = $($.parseHTML(xhr.responseText)).find(rule.selector).text();
                    if (newVal) {
                        rule.value = newVal;
                    }
                }
            };
            xhr.open('GET', rule.url, true);
            xhr.send(null);

            rulesChecked.push(rules);
            if (rulesChecked.length == rules.length) {
                sync(rules);
            }
        });

    });
}

function sync(rules) {
    chrome.storage.sync.set({'rules': rules}, function () {
        refreshRuleControls();
    });
}

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
    chrome.storage.sync.get('rules', function (data) {

        var rules = data.rules;

        var oldRule = _.find(rules, function (r) {
            return r.id == rule.id;
        });

        oldRule.value = rule.value;

        chrome.storage.sync.set({'rules': rules}, function () {
            refreshRuleControls();
        });
    });
}
