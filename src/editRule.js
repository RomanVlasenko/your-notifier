$(document).ready(function () {

    $('#create').click(function (e) {
        openRuleEditor();
    });

    $('#cancel').click(function (e) {
        closeRuleEditor();
    });

    $('#save').click(function () {
        onSaveClick();
    });
});

function openRuleEditor() {
    $('#edit-rule-div').slideDown("fast");
    $('#create').hide();
    persistStateEdit();
}
function closeRuleEditor() {
    $('#edit-rule-div').hide();
    $('#create').show();
    persistStatePopup();
    clearEditor();
}

function onSaveClick() {
    saveRule();
    $('#edit-rule-div').hide();
    clearEditor();
}

function clearEditor() {
    $('#ruleId').val('');
    $('#title').val('');
    $('#url').val('');
    $('#selector').val('');
}

function saveRule() {
    var newRule = getRule();

    chrome.storage.sync.get('rules', function (data) {
        var rules = data.rules;
        var existingRule = _.find(rules, function (r) {
            return r.id == newRule.id;
        });

        if (existingRule) {
            updateRule(newRule)
        } else {
            createRule(newRule)
        }
    });

}

function updateRule(newRule) {
    chrome.storage.sync.get('rules', function (data) {

        var rules = data.rules;

        var oldRule = _.find(rules, function (r) {
            return r.id == newRule.id;
        });

        oldRule.title = newRule.title;
        oldRule.url = newRule.url;
        oldRule.selector = newRule.selector;
        oldRule.value = newRule.value;

        chrome.storage.sync.set({'rules': rules}, function () {
            persistStatePopup();
            check(newRule);
        });
    });
}

function createRule(newRule) {
    chrome.storage.sync.get('counter', function (data) {
        newRule.id = data.counter;
    });

    chrome.storage.sync.get('rules', function (data) {
        var rules = data.rules;
        if (rules instanceof Array) {
            rules.push(newRule);
        } else {
            chrome.storage.sync.set({'counter': 0});
            rules = [];
        }

        //Save rules and increment counter
        chrome.storage.sync.set({'rules': rules}, function () {
            chrome.storage.sync.get('counter', function (data) {
                chrome.storage.sync.set({'counter': data.counter + 1});
            });
            persistStatePopup();
            check(newRule);
        });
    });
}

function getRule() {
    var rule = {
        id: $('#ruleId').val(),
        title: $('#title').val(),
        url: $('#url').val(),
        selector: $('#selector').val()
    };
    return rule;
}

function setRule(rule) {
    $('#ruleId').val(rule.id);
    $('#title').val(rule.title);
    $('#url').val(rule.url);
    $('#selector').val(rule.selector);
}
