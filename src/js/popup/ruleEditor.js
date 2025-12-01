var $testValue;
var $testLabel;
var $test;

$(document).ready(function () {
    $test = $(".test");
    $testValue = $(".test .test-value");
    $testLabel = $(".test .test-label");

    // Note: Create button click handler is now in popup.js
    // Note: Cancel button removed - clicking active button again closes
    // Note: Save and Test button handlers are now delegated in popup.js
});

function openRuleEditor() {
    closeAdditionalButtons();
    // Trigger the create button to open the editor
    $("#create").click();
}

function closeRuleEditor() {
    $(".rule-control[id=" + getRule().id + "]").toggleClass("edit", false);
    // Trigger the create button to close
    $("#create").click();
    persistStatePopup();
    clearEditor();
    $test.hide();
}

function onSaveClick() {
    if (validateFields()) {
        saveRule();
        // Close the action content
        $("#create").click();
    }
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

    if (isEmpty(newRule.id)) {
        createRule(newRule);
    } else {
        ruleStorage.readRule(newRule.id, function (exRule) {
            if (exRule) {
                exRule.title = newRule.title;
                exRule.url = newRule.url;
                exRule.selector = newRule.selector;

                ruleStorage.saveRule(exRule, function () {
                    persistStatePopup();
                    refreshRuleControls();
                    checkAndUpdate(exRule);
                });
            }
        });
    }
}

function createRule(newRule) {
    newRule.id = String(new Date().getTime());
    newRule.index = -1;

    ruleStorage.saveRule(newRule, function () {
        persistStatePopup();
        refreshRuleControls();
        checkAndUpdate(newRule);
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

function validateFields() {
    var $title = $('#title');
    var $url = $('#url');
    var $selector = $('#selector');

    var titleValid = !isEmpty($title.val());
    var urlValid = !isEmpty($url.val()) && $url.val().length <= validation.URL_MAX_LENGTH;
    var selectorValid = !isEmpty($selector.val()) && $selector.val().length <= validation.SELECTOR_MAX_LENGTH;

    $title.toggleClass("input-error", !titleValid);
    $url.toggleClass("input-error", !urlValid);
    $selector.toggleClass("input-error", !selectorValid);

    return titleValid && urlValid && selectorValid;
}

function onTestClick() {
    if (validateFields()) {
        var r = getRule();
        if (isEmpty(r.url) || r.url.indexOf("http") != 0) {
            showTestResult("");
        } else {
            c.checkUrl(getRule(), function (value) {
                showTestResult(value);
            });
        }
    }
}

function showTestResult(value) {
    // Find test elements in the dynamically generated content
    var $testValue = $("#action-content .test-value");
    var $testLabel = $("#action-content .test-label");
    var $test = $("#action-content .test");

    if (isEmpty(value)) {
        $testValue.text("");
        $testLabel.text(NOT_AVAILABLE);
    } else {
        $testValue.text(value);
        $testLabel.text("OK");
    }

    $testLabel.toggleClass("label-primary", !isEmpty(value));
    $testLabel.toggleClass("label-danger", isEmpty(value));

    $test.show();
}