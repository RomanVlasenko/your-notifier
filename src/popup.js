var storage = chrome.storage.sync;
var tabs = chrome.tabs;
var runtime = chrome.runtime;

var ruleControlDiv;
var buttonsDiv;
var additionalButtonsDiv;
var $existingRulesContainer;

var rulesArray;

$(document).ready(function () {

    initExtension();
    refreshRuleControls();

    $existingRulesContainer = $("#existing-rules");
    var controls = $("#controls");
    ruleControlDiv = controls.find(".rule-control");
    buttonsDiv = controls.find(".rule-buttons");
    additionalButtonsDiv = controls.find(".rule-buttons-more");

    runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            if (request.msg == "refreshList") {
                refreshRuleControls();
            }
        });
});

//Initializing storage structure when app starts first time
function initExtension() {
    storage.get('rules', function (data) {
        var rules = data.rules;
        if (!(rules instanceof Array)) {
            rules = [];

            storage.set({'rules': rules}, function () {
            });
        }
    });
}

function refreshRuleControls() {
    storage.get('rules', function (data) {
        var rules = data.rules;
        if (rules && rules.length > 0) {
            _.each(rules, function (rule) {
                var $ruleControl = $existingRulesContainer.find(".rule-control[id=" + rule.id + "]");

                if ($ruleControl.length > 0) {
                    updateRuleControlDOM(rule, $ruleControl);
                } else {
                    createRuleControlDOM(rule);
                }

            });
        } else {
            $existingRulesContainer.html("<h5 class='text-center'>You don't have any rules yet.</h5>");
        }
        rulesArray = rules;
    });
}

function createRuleControlDOM(rule) {
//    Build DOM
    var ruleControl = ruleControlDiv.clone();
    var buttons = buttonsDiv.clone();
    var $additionalButtons = additionalButtonsDiv.clone();
    $additionalButtons.attr("id", rule.id);

    ruleControl.attr("id", rule.id);
    ruleControl.find(".title a").attr("title", rule.title).text(rule.title);
    ruleControl.find(".value span").text(rule.value);
    ruleControl.find(".buttons").append(buttons);

    $existingRulesContainer.append(ruleControl);
    $additionalButtons.insertAfter(ruleControl);

//    Add click listeners
    buttons.on("click", ".edit", function (e) {
        onEditClick(rule.id);
        e.preventDefault();
    });

    buttons.on("click", ".settings", function (e) {
        onMoreSettingsClick($additionalButtons);
        e.preventDefault();
    });

    $additionalButtons.on("click", ".delete", function (e) {
        $additionalButtons.hide();
        onDeleteClick(e);
        e.preventDefault();
    });

    $additionalButtons.on("click", ".clone", function (e) {
        $additionalButtons.hide();
        onCloneClick(rule.id);
        e.preventDefault();
    });

    ruleControl.on("click", ".url", function (e) {
        tabs.create({url: rule.url});
        e.preventDefault();
    });

    function onDragStart() {
        closeAdditionalButtons();
    }

    function onDragEnd() {
        onMoreSettingsClick(additionalButtonsDiv);
    }

    ruleControl.drags({onDragStart: function () {
        onDragStart();
    }, onDragEnd: function () {
        onDragEnd();
    }});
}

function updateRuleControlDOM(rule, ruleControl) {
    ruleControl.find(".title a").attr("title", rule.title).text(rule.title);
    ruleControl.find(".value span").text(rule.value);

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

function onCloneClick(ruleId) {
    var rule = _.find(rulesArray, function (r) {
        return r.id == ruleId
    });

    var clonedRule = _.clone(rule);
    clonedRule.id = '';
    setRule(clonedRule);
    openRuleEditor();
}

function onEditClick(ruleId) {
    var rule = _.find(rulesArray, function (r) {
        return r.id == ruleId
    });

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