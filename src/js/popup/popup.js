var ruleControlDiv;
var buttonsDiv;
var additionalButtonsDiv;
var $existingRulesContainer;
var currentAction = null;

$(document).ready(function () {

    $existingRulesContainer = $("#existing-rules");

    var $container = $("#container");

    // Load and display rules
    refreshRuleControls(function () {
        // Clear the badge count on extension icon
        chromeAPI.browser.setBadgeText({text: ""});

        // Hide "New" badges after a brief delay (so users see them briefly)
        // But envelope icons remain until clicked
        setTimeout(function() {
            $(".badge.new").fadeOut(500);
        }, 1500);

        sl.readState(function (state) {
            if (state.page == NORMAL_MODE) {
                $container.show();
            } else {
                restoreEdit();
                $container.show();
            }
        });
    });

    var $ruleControls = $("#controls");
    ruleControlDiv = $ruleControls.find(".rule-control");
    buttonsDiv = $ruleControls.find(".rule-buttons");
    additionalButtonsDiv = $ruleControls.find(".rule-buttons-more");

    chromeAPI.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            if (request.msg == "refreshList") {
                refreshRuleControls();
            }
        });

    // Helper function to detect browser name
    function getBrowserName() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes("Brave")) return "Brave Browser";
        if (userAgent.includes("OPR") || userAgent.includes("Opera")) return "Opera";
        if (userAgent.includes("Edg")) return "Microsoft Edge";
        if (userAgent.includes("Chrome")) return "Google Chrome";
        return null; // Return null for unknown browsers
    }

    // Helper function to detect OS
    function getOS() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes("Mac")) return "mac";
        if (userAgent.includes("Linux")) return "linux";
        if (userAgent.includes("Windows")) return "windows";
        return "unknown";
    }

    // Populate help steps based on OS
    function populateHelpSteps() {
        const os = getOS();
        const browser = getBrowserName();
        const $helpSteps = $("#help-steps");

        // Use "your browser" if browser is unknown
        const browserText = browser || "your browser";

        if (os === "mac") {
            $helpSteps.html(
                '<li>Open <strong>System Settings</strong> &gt; <strong>Notifications</strong></li>' +
                '<li>Find <strong>' + browserText + '</strong> in the list</li>' +
                '<li>Enable <strong>"Allow notifications"</strong></li>' +
                '<li>Set style to <strong>"Banners"</strong> or <strong>"Alerts"</strong></li>' +
                '<li>Make sure <strong>Focus/Do Not Disturb</strong> is off</li>'
            );
        } else if (os === "linux") {
            $helpSteps.html(
                '<li>Open <strong>System Settings</strong> &gt; <strong>Notifications</strong></li>' +
                '<li>Find <strong>' + browserText + '</strong> in the list</li>' +
                '<li>Enable notifications for ' + browserText + '</li>' +
                '<li>Make sure <strong>Do Not Disturb</strong> is off</li>'
            );
        } else if (os === "windows") {
            $helpSteps.html(
                '<li>Open <strong>Settings</strong> &gt; <strong>System</strong> &gt; <strong>Notifications</strong></li>' +
                '<li>Find <strong>' + browserText + '</strong> in the list</li>' +
                '<li>Enable notifications for ' + browserText + '</li>' +
                '<li>Make sure <strong>Focus Assist</strong> is off</li>'
            );
        } else {
            $helpSteps.html(
                '<li>Check your system notification settings</li>' +
                '<li>Find <strong>' + browserText + '</strong> in the list</li>' +
                '<li>Enable notifications for the browser</li>'
            );
        }
    }

    // Initialize help steps on page load
    populateHelpSteps();

    // Unified function to toggle action content
    function toggleActionContent(actionType, contentGenerator) {
        var $actionContent = $("#action-content");
        var $createBtn = $("#create");
        var $testBtn = $("#test-notification-btn");

        // If clicking the same button, close it
        if (currentAction === actionType) {
            $actionContent.removeClass("open");
            setTimeout(function() {
                $actionContent.empty();
            }, 150); // Match transition duration
            $createBtn.removeClass("active-action");
            $testBtn.removeClass("active-action");
            currentAction = null;
            return;
        }

        // Update button states
        $createBtn.toggleClass("active-action", actionType === "create");
        $testBtn.toggleClass("active-action", actionType === "test-notification");

        // Generate and show content
        var content = contentGenerator();

        if (currentAction === null) {
            // First time opening - add content then trigger transition
            $actionContent.html(content);
            // Force reflow to ensure transition happens
            $actionContent[0].offsetHeight;
            $actionContent.addClass("open");
        } else {
            // Switching between actions - just replace content (already open)
            $actionContent.html(content);
        }

        currentAction = actionType;
    }

    // Generate create item form content
    function generateCreateItemForm() {
        return '<input type="hidden" id="ruleId"/>' +
            '<div class="input-group input-group-sm">' +
            '    <span class="input-group-addon">Title</span>' +
            '    <input type="text" id="title" class="form-control" placeholder="Title">' +
            '</div>' +
            '<div class="input-group input-group-sm">' +
            '    <span class="input-group-addon">URL</span>' +
            '    <input type="text" id="url" class="form-control" placeholder="URL">' +
            '</div>' +
            '<div class="input-group input-group-sm">' +
            '    <span class="input-group-addon">Selector:</span>' +
            '    <input type="text" id="selector" class="form-control" placeholder="CSS/jQuery selector...">' +
            '</div>' +
            '<div class="row">' +
            '    <div class="col-xs-6">' +
            '        <div class="test" style="display: none;">' +
            '            <h5><span class="test-value"></span> <span class="label test-label label-primary"></span></h5>' +
            '        </div>' +
            '    </div>' +
            '    <div class="col-xs-6">' +
            '        <div class="editor-buttons pull-right">' +
            '            <button class="btn btn-small btn-default btn-sm" type="button" id="test">Test</button>' +
            '            <button class="btn btn-small btn-primary btn-sm" type="button" id="save">Save</button>' +
            '        </div>' +
            '    </div>' +
            '</div>';
    }

    // Generate test notification content
    function generateTestNotificationContent() {
        return '<div id="notification-status" style="display: none;" class="alert"></div>' +
            '<div id="notification-help" style="display: none;" class="alert alert-info">' +
            '    <strong>Don\'t see notifications?</strong> Follow these steps:' +
            '    <ol id="help-steps" style="margin: 10px 0; padding-left: 20px;">' +
            '        <!-- Steps will be populated by JavaScript based on OS -->' +
            '    </ol>' +
            '    <a href="#" id="hide-help">Hide</a>' +
            '</div>';
    }

    // Test notification function
    function testNotification() {
        var $status = $("#notification-status");
        var $help = $("#notification-help");

        chromeAPI.runtime.sendMessage({ method: "testNotification" }, function(response) {
            if (response.success) {
                $status.removeClass("alert-danger").addClass("alert-success")
                       .html(response.message +
                             ' <a href="#" id="show-help">Show setup guide</a>')
                       .show();

                // Add click handler for show help link
                $("#show-help").on("click", function(e) {
                    e.preventDefault();
                    $help.slideDown();
                });
            } else {
                $status.removeClass("alert-success").addClass("alert-danger")
                       .html('<strong>Error:</strong> ' + response.error)
                       .show();
            }
        });

        // Populate help steps
        populateHelpSteps();
    }

    // Update "Create item" button handler
    $("#create").on("click", function() {
        // Save existing field values before regenerating form
        var existingRuleId = $("#ruleId").val();
        var existingTitle = $("#title").val();
        var existingUrl = $("#url").val();
        var existingSelector = $("#selector").val();
        var hasExistingData = existingRuleId || existingTitle || existingUrl || existingSelector;

        toggleActionContent("create", function() {
            return generateCreateItemForm();
        });

        // Restore or populate form fields after content is generated
        if (currentAction === "create") {
            if (hasExistingData) {
                // Restore saved values (from clone/edit)
                $("#ruleId").val(existingRuleId);
                $("#title").val(existingTitle);
                $("#url").val(existingUrl);
                $("#selector").val(existingSelector);
            } else {
                // Populate with current tab info for new items
                chromeAPI.tabs.query({active: true}, function (activeTabs) {
                    if (activeTabs && activeTabs.length > 0) {
                        var currentTab = activeTabs[0];
                        $("#title").val(currentTab.title);
                        $("#url").val(currentTab.url);
                    }
                });
            }
        }
    });

    // Update "Test Notifications" button handler
    $("#test-notification-btn").on("click", function() {
        if (currentAction !== "test-notification") {
            // Opening test notifications
            toggleActionContent("test-notification", function() {
                return generateTestNotificationContent();
            });

            // Trigger the test
            testNotification();
        } else {
            // Closing
            toggleActionContent("test-notification", function() {
                return "";
            });
        }
    });

    // Event delegation for dynamically generated content
    $(document).on("click", "#test", function() {
        onTestClick();
    });

    $(document).on("click", "#save", function() {
        onSaveClick();
    });

    $(document).on("click", "#hide-help", function(e) {
        e.preventDefault();
        $("#notification-help").slideUp();
    });

    // Phase 5: Check for recent notification errors on popup load
    chromeAPI.storage.get(['notificationError'], function(result) {
        if (result.notificationError) {
            $("#notification-status")
                .removeClass("alert-success").addClass("alert-warning")
                .html('<strong>Notice:</strong> ' + result.notificationError +
                      ' <a href="#" id="clear-error">Dismiss</a>')
                .show();

            $("#clear-error").on("click", function(e) {
                e.preventDefault();
                chromeAPI.storage.remove('notificationError');
                $("#notification-status").fadeOut();
            });
        }
    });

});

function refreshRuleControls() {
    var callback = arguments.length > 0 ? arguments[0] : c.emptyCallback;

    ruleStorage.readRules(function (rules) {
        if (rules.length > 0) {
            $existingRulesContainer.find("#norules").remove();

            var $ruleControls = $existingRulesContainer.find(".rule-control");

            var sortedRules = _.sortBy(rules, function (r) {
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

            repaintStripes();

            // Execute callback after rendering is complete
            callback();

        } else {
            $existingRulesContainer.html($("#empty-rules").html());
            callback();
        }
    });
}

function createRuleControlDOM(rule) {
//    Build DOM
    var ruleControl = ruleControlDiv.clone();
    var buttons = buttonsDiv.clone();
    var $additionalButtons = additionalButtonsDiv.clone();
    $additionalButtons.attr("id", rule.id);
    $additionalButtons.find(".popup-notification input").attr("checked", rule.notify);

    var $selectedInterval = $additionalButtons.find("select.update-frequency option").filter(function() {
        return ($(this).attr("value") == rule.updateFrequency);
    });

    if ($selectedInterval.length == 0) {
        $selectedInterval = $additionalButtons.find("select.update-frequency option").first();
    }

    $selectedInterval.prop('selected', true);

    $selectedInterval.text("Update every " + $selectedInterval.text());

    ruleControl.attr("id", rule.id);
    ruleControl.find(".favicon").attr("src", c.getFavicon(rule.url));
    ruleControl.find(".title a").attr("title", rule.title).attr("href", rule.url).text(rule.title);
    ruleControl.find(".value span").attr("title", rule.value).text(rule.value);
    ruleControl.find(".buttons").append(buttons);

    // Call showNewBadge AFTER buttons are appended so the settings icon exists
    showNewBadge(ruleControl, rule);

    $existingRulesContainer.append(ruleControl);

    $additionalButtons.insertAfter(ruleControl);

    //Add listeners
    buttons.on("click", ".edit", function (e) {
        onEditClick(rule.id);
        e.preventDefault();
    });

    buttons.on("click", ".settings", function (e) {
        var $settingsBtn = $(this);
        var $icon = $settingsBtn.find("span");
        var ruleId = $additionalButtons.attr("id");

        // If showing envelope icon (new update), change back to cog and mark as not new
        if ($icon.hasClass("glyphicon-envelope")) {
            $icon.removeClass("glyphicon-envelope").addClass("glyphicon-cog");

            ruleStorage.readRule(ruleId, function (rule) {
                rule.new = false;
                ruleStorage.updateRule(rule, c.emptyCallback);
            });
        }

        onMoreSettingsClick($additionalButtons);
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

    $additionalButtons.on("change", ".popup-notification input[type=checkbox]", function () {
        var checked = $(this).is(':checked');
        ruleStorage.readRule(rule.id, function (r) {
            r.notify = checked;
            ruleStorage.updateRule(r, c.emptyCallback);
        });
    });

    $additionalButtons.on("change", "select.update-frequency", function () {
        var selectedInterval = $(this).find(":selected").attr("value");

        ruleStorage.readRule(rule.id, function (r) {
            r.updateFrequency = parseInt(selectedInterval);
            ruleStorage.updateRule(r, c.emptyCallback);
        });
    });

    ruleControl.on("click", ".url", function (e) {
        chromeAPI.tabs.create({url: rule.url});
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
        ruleStorage.readRules(function (rules) {
            $existingRulesContainer.find(".rule-control").each(function (i, e) {
                var rule = _.find(rules, function (r) {
                    return r.id == $(e).attr("id");
                });
                rule.index = i;
                rule.ver = rule.ver + 1;
            });

            ruleStorage.saveRules(rules);
        });

        repaintStripes();
    }

    ruleControl.drags({onDragStart: function () {
        onDragStart();
    }, onDragEnd: function () {
        onDragEnd();
    }});
}

function updateRuleControlDOM(rule, ruleControl) {
    showNewBadge(ruleControl, rule);
    ruleControl.find(".favicon").attr("src", c.getFavicon(rule.url));
    ruleControl.find(".title a").attr("title", rule.title).attr("href", rule.url).text(rule.title);
    ruleControl.find(".value span").text(rule.value);
    return ruleControl;
}

function onDeleteClick(ruleId) {
    ruleStorage.deleteRule(ruleId, function () {
        refreshRuleControls();
    });
}

function onCloneClick(ruleId) {
    ruleStorage.readRule(ruleId, function (rule) {
        var clonedRule = _.clone(rule);
        clonedRule.id = '';
        setRule(clonedRule);
        openRuleEditor();
    });
}

function onEditClick(ruleId) {
    ruleStorage.readRule(ruleId, function (rule) {
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

                var ruleId = $additionalPanel.attr("id");
                ruleStorage.readRule(ruleId, function (rule) {
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

    ruleStorage.readRule(ruleWithHistory.id, function (rule) {
        rule.history = [];

        ruleStorage.saveRule(rule, function () {
            updateHistory($additionalPanel.find("table.history"), rule)
        });
    });
}

function updateHistory($historyTable, rule) {
    $historyTable.empty();
    if (rule.history && rule.history.length > 0) {
        _.each(rule.history, function (h) {
            $historyTable.append("<tr><td><div class='history-cell' title='" + h.value + "'>" + h.value
                + "</div></td><td>"
                + "<div class='date-cell pull-right'>" + c.formatDate(new Date(h.date))
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
        // Note: Badge is shown initially but hidden immediately on popup open
        // We keep this for potential future use or when refreshList is called while popup is open
        $ruleControl.find(".badge.new").fadeIn(1000);

        // Change settings icon from cog to envelope
        // This persists until user clicks on it
        var $settingsBtn = $ruleControl.find(".settings");
        var $icon = $settingsBtn.find("span");
        $icon.removeClass("glyphicon-cog").addClass("glyphicon-envelope");
    }
}

function repaintStripes() {
    $existingRulesContainer.find(".rule-control").removeClass("odd, even");
    $existingRulesContainer.find(".rule-control:odd").addClass("odd");
    $existingRulesContainer.find(".rule-control:even").addClass("even");
}