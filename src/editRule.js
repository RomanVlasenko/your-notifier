var storage = chrome.storage.sync;
var storageLocal = chrome.storage.local;

$(document).ready(function () {

    $('#create').click(function () {
        openRuleEditor();
    });

    $('#cancel').click(function () {
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

    storage.get("rules", function (data) {
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
    storage.get("rules", function (data) {
        var rules = data.rules;

        var oldRule = _.find(rules, function (r) {
            return r.id == newRule.id;
        });

        oldRule.title = newRule.title;
        oldRule.url = newRule.url;
        oldRule.selector = newRule.selector;
        oldRule.value = newRule.value;

        storage.set({"rules": rules}, function () {
            persistStatePopup();
            checkAndUpdate(newRule);
        });
    });
}

function createRule(newRule) {
    newRule.id = String(new Date().getTime());

    storage.get("rules", function (data) {
        var rules = data.rules;

        rules.unshift(newRule);

        storage.set({"rules": rules}, function () {
            persistStatePopup();
            storageLocal.get("rules", function (data) {
                var ruleIndexes = data.rules;
                newRule.index = ruleIndexes.length;
                ruleIndexes.unshift(newRule);
                storageLocal.set({"rules": ruleIndexes});
            });
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
