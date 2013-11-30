var storage = chrome.storage.sync;
var tabs = chrome.tabs;

var ruleControlDiv;
var buttonsDiv;
var additionalButtonsDiv;

$(document).ready(function () {
    initExtension();
    refreshRuleControls();

    var controls = $("#controls");
    ruleControlDiv = controls.find(".rule-control");
    buttonsDiv = controls.find(".rule-buttons");
    additionalButtonsDiv = controls.find(".rule-buttons-more");
});

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.msg == "refreshList") {
            refreshRuleControls();
        }
    });

//Initializing storage structure when app starts first time
function initExtension() {
    storage.get('rules', function (data) {
        var rules = data.rules;
        if (!(rules instanceof Array)) {
            storage.set({'counter': 0});
            rules = [];

            storage.set({'rules': rules}, function () {
                storage.get('counter', function (data) {
                    storage.set({'counter': data.counter});
                });
            });
        }
    });
}

function refreshRuleControls() {
    var oldRuleList = $('#existing-rules');
    var refreshedRuleList = oldRuleList.clone().empty();

    storage.get('rules', function (data) {
        var rules = data.rules;
        if (rules.length > 0) {
            _.each(rules, function (rule) {
                var control = createRuleControlDOM(rule);
                refreshedRuleList.append(control);
            });
        } else {
            refreshedRuleList.html("<h5 class='text-center'>You don't have any rules yet.</h5>");
        }

        oldRuleList.replaceWith(refreshedRuleList);
    });
}

function createRuleControlDOM(rule) {
//    Build DOM
    var ruleControl = ruleControlDiv.clone();
    var buttons = buttonsDiv.clone();
    var additionalButtons = additionalButtonsDiv.clone();

    ruleControl.attr("id", rule.id);
    ruleControl.find(".title a").attr("title", rule.title).text(rule.title);
    ruleControl.find(".value span").text(rule.value);
    ruleControl.find(".buttons").append(buttons);

    ruleControl.append(additionalButtons.attr("id", rule.id));

//    Add click listeners
    buttons.find("button.edit").bind("click", function (e) {
        onEditClick(rule);
    });

    buttons.find("button.settings").bind("click", function () {
        onMoreSettingsClick(additionalButtons);
    });

    additionalButtons.find("button.delete").bind("click", function (e) {
        additionalButtons.hide();
        onDeleteClick(e);
    });

    additionalButtons.find("button.clone").bind("click", function () {
        additionalButtons.hide();
        onCloneClick(rule);
    });

    ruleControl.find("a.url").bind("click", function () {
        tabs.create({url: rule.url});
    });

    return ruleControl;
}

function onDeleteClick(e) {
    var ruleId = $(e.target).closest('.rule-control').attr('id');

    storage.get('rules', function (data) {
        var rules = data.rules;
        rules = _.reject(rules, function (r) {
            return r.id == ruleId
        });
        storage.set({'rules': rules});

        refreshRuleControls();
    });
}

function onCloneClick(rule) {
    var clonedRule = _.clone(rule);
    clonedRule.id = '';
    setRule(clonedRule);
    openRuleEditor();
}

function onEditClick(rule) {
    setRule(rule);
    openRuleEditor();
    markRuleAsEditable(rule);
}

function onMoreSettingsClick(additionalButtonsDiv) {
    $(".rule-buttons-more").each(function (i, e) {
        var btnDiv = $(e);
        if (btnDiv.attr("id") == additionalButtonsDiv.attr("id")) {
            additionalButtonsDiv.slideToggle("fast");
        } else {
            btnDiv.slideUp("fast");
        }
    });
}

function closeAdditionalButtons() {
    $(".rule-buttons-more").each(function (i, e) {
        $(e).hide();
    });
}