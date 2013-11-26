$(document).ready(function () {

    $('#create').click(function (e) {
        if ($("#edit-rule-div").is(":hidden")) {
            openRuleEditor();
        } else {
            closeRuleEditor();
        }
    });

    $('#save').click(function () {
        onSaveClick();
    });
});

function openRuleEditor() {
    $('#edit-rule-div').slideDown('fast');
    $('#create').text("Close");
    persistStateEdit();
}
function closeRuleEditor() {
    $('#edit-rule-div').hide();
    $('#create').text("Create rule");
    persistStatePopup();
}

function onSaveClick() {
    saveRule();
    $('#edit-rule-div').hide();
    $('#create').text("Create rule");

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

function updateRule(rule) {
    chrome.storage.sync.get('rules', function (data) {

        var rules = data.rules;

        var oldRule = _.find(rules, function (r) {
            return r.id == rule.id;
        });

        oldRule.title = rule.title;
        oldRule.url = rule.url;
        oldRule.selector = rule.selector;
        oldRule.value = rule.value;

        chrome.storage.sync.set({'rules': rules}, function () {
            persistStatePopup();
            check(newRule);
            refreshList();
        });
    });
}

function createRule(rule) {
    chrome.storage.sync.get('counter', function (data) {
        rule.id = data.counter;
    });

    chrome.storage.sync.get('rules', function (data) {
        var rules = data.rules;
        if (rules instanceof Array) {
            rules.push(rule);
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
            check(rule);
            refreshList();
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
