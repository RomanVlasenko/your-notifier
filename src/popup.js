var storage = chrome.storage.sync;

$(document).ready(function () {
    initExtension();
    refreshRuleControls();
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
    var ruleControlDiv = $(".rule-control").clone();
    var buttonsDiv = $(".rule-buttons").clone();
    var additionalButtonsDiv = $(".rule-buttons-more").clone();

    ruleControlDiv.attr("id", rule.id);
    ruleControlDiv.find(".title").html("<a class='url' href=''#' title='" + rule.title + "'>" + rule.title + "</a>");
    ruleControlDiv.find(".value").html("<span title='" + rule.value + "'>" + rule.value + "</span>");
    ruleControlDiv.find(".buttons").append(buttonsDiv);

    ruleControlDiv.append(additionalButtonsDiv.attr("id", rule.id));

//    Add click listeners
    buttonsDiv.find("button.edit").bind("click", function (e) {
        onEditClick(rule);
    });

    buttonsDiv.find("button.settings").bind("click", function () {
        onMoreSettingsClick(additionalButtonsDiv);
    });

    additionalButtonsDiv.find("button.delete").bind("click", function (e) {
        additionalButtonsDiv.hide();
        onDeleteClick(e);
    });

    additionalButtonsDiv.find("button.clone").bind("click", function () {
        additionalButtonsDiv.hide();
        onCloneClick(rule);
    });

    buttonsDiv.find("a.url").bind("click", function () {
        chrome.tabs.create({url: rule.url});
    });

    return ruleControlDiv;
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