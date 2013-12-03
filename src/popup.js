var ruleControlDiv;
var buttonsDiv;
var additionalButtonsDiv;
var $existingRulesContainer;

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
            storage.set({'rules': []}, function () {
            });
        }
    });
}

function refreshRuleControls() {
    storage.get("rules", function (data) {
        var rules = data.rules;
        if (rules && rules.length > 0) {

            //Clearing out "no rules" message
            if ($existingRulesContainer.find(".rule-control").length == 0) {
                $existingRulesContainer.empty();
            }

            var $ruleControls = $existingRulesContainer.find(".rule-control");

            var sortedRules = _.sortBy(data.rules, function (r) {
                return r.index;
            });

            //Create/Update elements
            _.each(sortedRules, function (rule) {
                var $ruleControl = $ruleControls.filter("[id=" + rule.id + "]");

                if ($ruleControl.length > 0) {
                    updateRuleControlDOM(rule, $ruleControl);
                } else {
                    createRuleControlDOM(rule);
                }
            });

            //Remove deleted elements
            _.each($ruleControls, function (e) {
                var ruleId = $(e).attr("id");
                var ruleExists = _.any(rules, function (r) {
                    return r.id == ruleId;
                });

                if (!ruleExists) {
                    $(e).remove();
                }
            });

        } else {
            $existingRulesContainer.html("<h5 class='text-center'>You don't have any rules yet.</h5>");
        }
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
    ruleControl.find(".value span").attr("title", rule.value).text(rule.value);
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
        onDeleteClick(rule.id);
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
        storage.get("rules", function (data) {
            var rules = data.rules;
            $existingRulesContainer.find(".rule-control").each(function (i, e) {
                var rule = _.find(rules, function (r) {
                    return r.id == $(e).attr("id");
                });
                rule.index = i;
            });
            storage.set({'rules': rules});
        });
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

function onDeleteClick(ruleId) {
    storage.get('rules', function (data) {
        var rules = _.reject(data.rules, function (r) {
            return r.id == ruleId
        });
        storage.set({'rules': rules}, function () {
            refreshRuleControls();
        });
    });
}

function onCloneClick(ruleId) {
    storage.get('rules', function (data) {
        var rule = _.find(data.rules, function (r) {
            return r.id == ruleId
        });

        var clonedRule = _.clone(rule);
        clonedRule.id = '';
        setRule(clonedRule);
        openRuleEditor();
    });
}

function onEditClick(ruleId) {
    storage.get('rules', function (data) {
        var rule = _.find(data.rules, function (r) {
            return r.id == ruleId
        });

        setRule(rule);
        openRuleEditor();
        markRuleAsEditable(rule);
    });
}

function onMoreSettingsClick($additionalPanel) {
    $(".rule-buttons-more").each(function (i, e) {
        var btnDiv = $(e);
        if (btnDiv.attr("id") == $additionalPanel.attr("id")) {

            if ($additionalPanel.is(":hidden")) {

                //Show value change history
                var historyTable = $additionalPanel.find("table.history").empty();
                storage.get("rules", function (data) {
                    var rule = _.find(data.rules, function (r) {
                        return r.id == $additionalPanel.attr("id");
                    });

                    if (rule.history && rule.history.length > 0) {
                        _.each(rule.history, function (h) {
                            historyTable.append("<tr><td>" + h.value + "</td><td>" + formatDate(new Date(h.date))
                                                    + "</td></tr>");
                        });
                    } else {
                        historyTable.append("<p class='text-center'>" + NO_HISTORY + "</p>");
                    }

                    $additionalPanel.slideDown("fast");

                });
            }

            $additionalPanel.slideUp("fast");
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