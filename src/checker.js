function check(rule) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            rule.value = $($.parseHTML(xhr.responseText)).find(rule.selector).text();
            updateRuleValue(rule);
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
            refreshList();
        });
    });
}