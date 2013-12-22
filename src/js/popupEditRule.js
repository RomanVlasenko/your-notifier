var $testValue;
var $testLabel;
var $test;

$(document).ready(function () {
    $test = $(".test");
    $testValue = $(".test .test-value");
    $testLabel = $(".test .test-label");

    $('#create').click(function () {
        onCreateClick();
    });

    $('#cancel').click(function () {
        closeRuleEditor();
    });

    $('#save').click(function () {
        onSaveClick();
    });

    $('#test').click(function () {
        onTestClick();
    });
});

function onCreateClick() {
    chromeAPI.tabs.query({active: true}, function (activeTabs) {
        if (activeTabs && activeTabs.length > 0) {
            var currentTab = activeTabs[0];
            $("#title").val(currentTab.title);
            $("#url").val(currentTab.url);

            persistStateEdit();
        }
    });

    openRuleEditor();
}

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
    $test.hide();
}

function onSaveClick() {
    if (validateFields()) {
        saveRule();
        $('#edit-rule-div').hide();
        closeRuleEditor()
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

    persistence.findRule(newRule.id, function (exRule) {
        if (exRule) {
            exRule.title = newRule.title;
            exRule.url = newRule.url;
            exRule.selector = newRule.selector;

            exRule = persistence.incVersion(exRule);
            persistence.saveRule(exRule, function () {
                persistStatePopup();
                refreshRuleControls();
                checkAndUpdate(exRule);
            });
        } else {
            createRule(newRule)
        }
    });
}

function createRule(newRule) {
    newRule.id = String(new Date().getTime());

    persistence.readRules(function (rules) {
        newRule.index = rules.length;
        newRule = persistence.incVersion(newRule);
        persistence.saveRule(newRule, function () {
            persistStatePopup();
            refreshRuleControls();
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
            common.checkUrl(getRule(), function (value) {
                showTestResult(value);
            });
        }
    }
}

function showTestResult(value) {
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