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
    var ruleControlHtml = "<div class='row rule-control'>"
                              + "<div class='title col-xs-7'></div>"
                              + "<div class='value col-xs-3'></div>"
                              + "<div class='buttons col-xs-2'></div>"
        + "</div>";

    var buttonsHtml = "<div class='rule-buttons btn-group btn-group-sm'>"
                          + "<button type='button' class='edit btn'><span class='glyphicon glyphicon-pencil'></span></button>"
                          + "<button type='button' class='delete btn'><span class='glyphicon glyphicon-remove'></span></button>"
        + "</div>";

    var ruleControlDiv = $(ruleControlHtml);
    var buttonsDiv = $(buttonsHtml);

    ruleControlDiv.attr("id", rule.id);
    ruleControlDiv.find(".title").html("<a class='url' href=''#' title='" + rule.title + "'>" + rule.title + "</a>");
    ruleControlDiv.find(".value").html("<span title='" + rule.value + "'>" + rule.value + "</span>");
    ruleControlDiv.find(".buttons").append(buttonsDiv);

    buttonsDiv.find("button.delete").bind("click", function (e) {
        onDeleteClick(e);
    });

    buttonsDiv.find("button.edit").bind("click", function (e) {
        onEditClick(e);
    });

    ruleControlDiv.find("a.url").bind("click", function (e) {
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

function onEditClick(e) {
    var ruleId = $(e.target).closest('.rule-control').attr('id');

    storage.get('rules', function (data) {
        var rules = data.rules;
        var editableRule = _.find(rules, function (r) {
            return r.id == ruleId
        });

        setRule(editableRule);
        openRuleEditor();
    });
}

