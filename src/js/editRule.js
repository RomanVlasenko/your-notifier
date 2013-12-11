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
    tabs.query({active: true}, function (activeTabs) {
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

    persistence.findRule(newRule.id, function(oldRule) {
        if (oldRule) {
            updateRule(newRule, function (rule) {
                persistStatePopup();
                refreshRuleControls();
                checkAndUpdate(rule);
            });
        } else {
            createRule(newRule)
        }
    });

}

function updateRule(newRule, onComplete) {
    storage.get("rules", function (data) {
        var rules = data.rules;

        var oldRule = _.find(rules, function (r) {
            return r.id == newRule.id;
        });

        oldRule.title = newRule.title;
        oldRule.url = newRule.url;
        oldRule.selector = newRule.selector;

        storage.set({"rules": rules}, function () {
            onComplete(oldRule)
        });
    });
}

function createRule(newRule) {
    newRule.id = String(new Date().getTime());

    storage.get("rules", function (data) {
        var rules = data.rules;
        newRule.index = rules.length;
        rules.push(newRule);

        storage.set({"rules": rules}, function () {
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
    var valid = true;

    var $title = $('#title');
    var $url = $('#url');
    var $selector = $('#selector');

    if (isEmpty($title.val()) || isEmpty($url.val()) || isEmpty($selector.val())) {
        valid = false;
    }

    $title.toggleClass("input-error", isEmpty($title.val()));
    $url.toggleClass("input-error", isEmpty($url.val()));
    $selector.toggleClass("input-error", isEmpty($selector.val()));

    return valid;
}

function onTestClick() {
    var r = getRule();
    if (isEmpty(r.url)) {
        test();
    } else {
        check(getRule(), test);
    }
}

function test(value) {
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