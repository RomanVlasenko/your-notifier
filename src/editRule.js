var storage = chrome.storage.sync;

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
    closeAdditionalButtons();
    $('#edit-rule-div').slideDown("fast");
    $('#create').hide();
    persistStateEdit();
}

function closeRuleEditor() {
    $(".rule-control[id=" + getRule().id + "]").toggleClass("edit", false);
    $('#edit-rule-div').hide();
    $('#create').show();
    persistStatePopup();
    clearEditor();
}

function onSaveClick() {
    saveRule();
    $('#edit-rule-div').hide();
    closeRuleEditor()
}

function clearEditor() {
    $('#ruleId').val('');
    $('#title').val('');
    $('#url').val('');
    $('#selector').val('');
}

function markRuleAsEditable(rule) {
    _.each($(".rule-control"), function (e) {
        $(e).toggleClass("edit", rule.id == $(e).attr("id"));
    });
}

function saveRule() {
    var newRule = getRule();

    storage.get('rules', function (data) {
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
    storage.get('rules', function (data) {
        var rules = data.rules;

        var oldRule = _.find(rules, function (r) {
            return r.id == newRule.id;
        });

        oldRule.title = newRule.title;
        oldRule.url = newRule.url;
        oldRule.selector = newRule.selector;
        oldRule.value = newRule.value;

        storage.set({'rules': rules}, function () {
            persistStatePopup();
            checkAndUpdate(newRule);
        });
    });
}

function createRule(newRule) {
    newRule.id = new Date().getTime();

    storage.get('rules', function (data) {
        var rules = data.rules;
        if (rules instanceof Array) {
            rules.unshift(newRule);
        } else {
            rules = [];
        }

        storage.set({'rules': rules}, function () {
            persistStatePopup();
            checkAndUpdate(newRule);
        });
    });
}

function getRule() {
    return {
        id: $('#ruleId').val(),
        title: $('#title').val(),
        url: $('#url').val(),
        selector: $('#selector').val()
    };
}

function setRule(rule) {
    $('#ruleId').val(rule.id);
    $('#title').val(rule.title);
    $('#url').val(rule.url);
    $('#selector').val(rule.selector);
}
