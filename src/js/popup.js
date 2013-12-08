var ruleControlDiv;
var buttonsDiv;
var additionalButtonsDiv;
var $existingRulesContainer;

$(document).ready(function () {

    $existingRulesContainer = $("#existing-rules");

    initExtension(function () {
        var $container = $("#container");

        refreshRuleControls(function () {
            $container.slideDown(300);
        });

        var $ruleControls = $("#controls");
        ruleControlDiv = $ruleControls.find(".rule-control");
        buttonsDiv = $ruleControls.find(".rule-buttons");
        additionalButtonsDiv = $ruleControls.find(".rule-buttons-more");

    });

    runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            if (request.msg == "refreshList") {
                refreshRuleControls();
            }
        });

});

//Initializing storage structure when app starts first time
function initExtension(whenDone) {
    browser.setTitle({title: "Your notifier"});

    storage.get('rules', function (data) {

        if (data.rules instanceof Array) {
            whenDone();
        } else {
            storage.set({'rules': []}, function () {
                whenDone();
            });
        }
    });
}

function refreshRuleControls() {
    var onComplete;
    if (arguments[0]) {
        onComplete = arguments[0];
    }

    storage.get("rules", function (data) {
        var rules = data.rules;
        if (rules && rules.length > 0) {

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

            //Update rules flag NEW to 'false'
            storage.get("rules", function (data) {
                _.each(data.rules, function (r) {
                    r.new = false;
                });
                storage.set({"rules": data.rules}, function () {
                    if (onComplete) {
                        onComplete();
                    }
                });
            });

            $existingRulesContainer.find(".rule-control:odd").addClass("odd");
            $existingRulesContainer.find(".rule-control:even").addClass("even");

        } else {
            $existingRulesContainer.html("<h5 class='text-center'>You don't have any items to watch yet.</h5>");
            if (onComplete) {
                onComplete();
            }
        }
    });
}

function createRuleControlDOM(rule) {
//    Build DOM
    var ruleControl = ruleControlDiv.clone();
    var buttons = buttonsDiv.clone();
    var $additionalButtons = additionalButtonsDiv.clone();
    $additionalButtons.find(".settings").addClass("active");
    $additionalButtons.attr("id", rule.id);

    showNewBadge(ruleControl, rule);

    ruleControl.attr("id", rule.id);
    ruleControl.find(".favicon").attr("src", getFavicon(rule.url));
    ruleControl.find(".title a").attr("title", rule.title).attr("href", rule.url).text(rule.title);
    ruleControl.find(".value span").attr("title", rule.value).text(rule.value);
    ruleControl.find(".buttons").append(buttons);

    $existingRulesContainer.append(ruleControl);

    $additionalButtons.insertAfter(ruleControl);

//    Add listeners
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

    $additionalButtons.on("click", ".clear-history", function (e) {
        onClearHistoryClick($additionalButtons, rule);
        e.preventDefault();
    });

    $additionalButtons.on("click", ".popup-notification", function (e) {
//        var opt = {
//            type: "basic",
//            title: "Primary Title",
//            message: "Primary message to display",
//            iconUrl: getFavicon(rule.url)
//        }
        var opt = {
            type: "list",
            title: "Primary Title",
            message: "Primary message to display",
            iconUrl: getFavicon(rule.url),
            items: [
                { title: "Item1", message: "This is item 1."},
                { title: "Item2", message: "This is item 2."},
                { title: "Item3", message: "This is item 3."}
            ]
        };
        notifications.create("1", opt, function () {

        });
    });

    ruleControl.on("click", ".url", function (e) {
        tabs.create({url: rule.url});
        e.preventDefault();
    });

    var $favicon = ruleControl.find(".favicon");
    ruleControl.find(".url").hover(function () {
        $favicon.addClass("hover");
    }, function () {
        $favicon.removeClass("hover");
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

        $existingRulesContainer.find(".rule-control").removeClass("odd, even");
        $existingRulesContainer.find(".rule-control:odd").addClass("odd");
        $existingRulesContainer.find(".rule-control:even").addClass("even");
    }

    ruleControl.drags({onDragStart: function () {
        onDragStart();
    }, onDragEnd: function () {
        onDragEnd();
    }});
}

function updateRuleControlDOM(rule, ruleControl) {
    showNewBadge(ruleControl, rule);
    ruleControl.find(".favicon").attr("src", getFavicon(rule.url));
    ruleControl.find(".title a").attr("title", rule.title).attr("href", rule.url).text(rule.title);
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
        var buttonsMoreDiv = $(e);
        if (buttonsMoreDiv.attr("id") == $additionalPanel.attr("id")) {

            if ($additionalPanel.is(":hidden")) {

                //Show value change history
                var historyTable = $additionalPanel.find("table.history").empty();
                storage.get("rules", function (data) {
                    var rule = _.find(data.rules, function (r) {
                        return r.id == $additionalPanel.attr("id");
                    });

                    updateHistory(historyTable, rule);
                    $additionalPanel.slideDown("fast");

                });
            }

            $additionalPanel.slideUp("fast");
        } else {
            buttonsMoreDiv.slideUp("fast");
        }
    });
}

function onClearHistoryClick($additionalPanel, ruleWithHistory) {
    storage.get("rules", function (data) {
        var rules = data.rules;
        var rule = _.find(rules, function (r) {
            return r.id == ruleWithHistory.id;
        });

        rule.history = [];
        storage.set({"rules": rules}, function () {
            updateHistory($additionalPanel.find("table.history"), rule)
        });
    });
}

function updateHistory($historyTable, rule) {
    $historyTable.empty();
    if (rule.history && rule.history.length > 0) {
        _.each(rule.history, function (h) {
            $historyTable.append("<tr><td><div class='history-cell'>" + h.value + "</div></td><td>"
                                     + "<div class='date-cell pull-right'>" + formatDate(new Date(h.date))
                                     + "</div></td></tr>");
        });
    } else {
        $historyTable.append("<p class='text-center'>" + NO_HISTORY + "</p>");
    }
}

function closeAdditionalButtons() {
    $(".rule-buttons-more").each(function (i, e) {
        $(e).hide();
    });
}

function showNewBadge($ruleControl, rule) {
    if (rule.new == true) {
        $ruleControl.find(".badge.new").fadeIn(1000);
    }
}