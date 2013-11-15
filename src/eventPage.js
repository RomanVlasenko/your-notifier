var i = 0;

function check(rule) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            rule.value = $($.parseHTML(xhr.responseText)).find(rule.selector).text();
        }
    };
    xhr.open('GET', rule.url, true);
    xhr.send(null);
}

chrome.alarms.create("CheckRulesSchedule", {periodInMinutes: 1});

chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name = 'CheckRulesSchedule') {
        chrome.storage.sync.get('rules', function (data) {
            var rules = data.rules;

            $.each(rules, function (index, rule) {
                check(rule);
            });

        });
    }
});