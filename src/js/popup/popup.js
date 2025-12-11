var ruleControlDiv;
var buttonsDiv;
var additionalButtonsDiv;
var $existingRulesContainer;
var currentAction = null;

$(document).ready(function () {

    // Localize the page
    localizeElement(document.body);

    $existingRulesContainer = $("#existing-rules");

    var $container = $("#container");

    // Load and display rules
    refreshRuleControls(function () {
        // Clear the badge count on extension icon
        chromeAPI.browser.setBadgeText({text: ""});
        chromeAPI.browser.setTitle({title: "Your notifier"});

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

        // Use localized "your browser" if browser is unknown
        const browserText = browser || chrome.i18n.getMessage('helpYourBrowser');

        if (os === "mac") {
            $helpSteps.html(
                '<li>' + chrome.i18n.getMessage('helpMacStep1') + '</li>' +
                '<li>' + chrome.i18n.getMessage('helpMacStep2', [browserText]) + '</li>' +
                '<li>' + chrome.i18n.getMessage('helpMacStep3') + '</li>' +
                '<li>' + chrome.i18n.getMessage('helpMacStep4') + '</li>' +
                '<li>' + chrome.i18n.getMessage('helpMacStep5') + '</li>'
            );
        } else if (os === "linux") {
            $helpSteps.html(
                '<li>' + chrome.i18n.getMessage('helpLinuxStep1') + '</li>' +
                '<li>' + chrome.i18n.getMessage('helpLinuxStep2', [browserText]) + '</li>' +
                '<li>' + chrome.i18n.getMessage('helpLinuxStep3') + '</li>'
            );
        } else if (os === "windows") {
            $helpSteps.html(
                '<li>' + chrome.i18n.getMessage('helpWindowsStep1') + '</li>' +
                '<li>' + chrome.i18n.getMessage('helpWindowsStep2', [browserText]) + '</li>' +
                '<li>' + chrome.i18n.getMessage('helpWindowsStep3', [browserText]) + '</li>' +
                '<li>' + chrome.i18n.getMessage('helpWindowsStep4') + '</li>'
            );
        } else {
            $helpSteps.html(
                '<li>' + chrome.i18n.getMessage('helpLinuxStep1') + '</li>' +
                '<li>' + chrome.i18n.getMessage('helpLinuxStep2', [browserText]) + '</li>' +
                '<li>' + chrome.i18n.getMessage('helpLinuxStep3') + '</li>'
            );
        }
    }

    // Initialize help steps on page load
    populateHelpSteps();

    // Unified function to toggle action content
    function toggleActionContent(actionType, contentGenerator) {
        var $actionContent = $("#action-content");
        var $createBtn = $("#create");
        var $settingsBtn = $("#settings-btn");

        // If clicking the same button, close it
        if (currentAction === actionType) {
            $actionContent.removeClass("open");
            setTimeout(function() {
                $actionContent.empty();
            }, 150); // Match transition duration
            $createBtn.removeClass("active-action");
            $settingsBtn.removeClass("active-action");
            currentAction = null;
            return;
        }

        // Update button states
        $createBtn.toggleClass("active-action", actionType === "create");
        $settingsBtn.toggleClass("active-action", actionType === "settings");

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
            '    <span class="input-group-addon" data-i18n="labelTitle">' + chrome.i18n.getMessage('labelTitle') + '</span>' +
            '    <input type="text" id="title" class="form-control" data-i18n-placeholder="placeholderTitle" placeholder="' + chrome.i18n.getMessage('placeholderTitle') + '">' +
            '</div>' +
            '<div class="input-group input-group-sm">' +
            '    <span class="input-group-addon">URL</span>' +
            '    <input type="text" id="url" class="form-control" placeholder="URL">' +
            '</div>' +
            '<div class="input-group input-group-sm">' +
            '    <span class="input-group-addon" data-i18n="labelSelector">' + chrome.i18n.getMessage('labelSelector') + '</span>' +
            '    <input type="text" id="selector" class="form-control" data-i18n-placeholder="placeholderSelector" placeholder="' + chrome.i18n.getMessage('placeholderSelector') + '">' +
            '</div>' +
            '<div class="row">' +
            '    <div class="col-xs-6">' +
            '        <div class="test" style="display: none;">' +
            '            <h5><span class="test-value"></span> <span class="label test-label label-primary"></span></h5>' +
            '        </div>' +
            '    </div>' +
            '    <div class="col-xs-6">' +
            '        <div class="editor-buttons pull-right">' +
            '            <button class="btn btn-small btn-default btn-sm" type="button" id="test" data-i18n="buttonTest">' + chrome.i18n.getMessage('buttonTest') + '</button>' +
            '            <button class="btn btn-small btn-primary btn-sm" type="button" id="save" data-i18n="buttonSave">' + chrome.i18n.getMessage('buttonSave') + '</button>' +
            '        </div>' +
            '    </div>' +
            '</div>';
    }

    // Test notification function
    function testNotification() {
        var $status = $("#test-notification-status");

        chromeAPI.runtime.sendMessage({ method: "testNotification" }, function(response) {
            if (response.success) {
                $status.removeClass("alert-danger").addClass("alert-success")
                       .html(response.message +
                             ' <a href="#" id="show-help">' + chrome.i18n.getMessage('linkShowGuide') + '</a>')
                       .show();

                populateHelpSteps();
            } else {
                $status.removeClass("alert-success").addClass("alert-danger")
                       .html('<strong>' + chrome.i18n.getMessage('errorLabel') + '</strong> ' + response.error)
                       .show();
            }
        });
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

    // Update "Test Notifications" button handler (now inside settings)
    $(document).on("click", "#test-notification-btn", function() {
        testNotification();
    });

    // Settings button handler
    $("#settings-btn").on("click", function() {
        toggleActionContent("settings", function() {
            return $("#settings-panel").html();
        });
    });

    // Event delegation for dynamically generated content
    $(document).on("click", "#test", function() {
        onTestClick();
    });

    $(document).on("click", "#save", function() {
        onSaveClick();
    });

    $(document).on("click", "#show-help", function(e) {
        e.preventDefault();
        $("#notification-help").slideToggle();
    });

    $(document).on("click", "#hide-help-link", function(e) {
        e.preventDefault();
        $("#notification-help").slideUp();
    });

    // Import/Export handlers
    $(document).on("click", "#export-btn", function() {
        exportRules();
    });

    $(document).on("click", "#import-btn", function() {
        $("#import-file-input").click();
    });

    $(document).on("change", "#import-file-input", function(e) {
        var file = e.target.files[0];
        if (file) {
            importRules(file);
        }
        // Reset file input so the same file can be selected again
        $(this).val('');
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

    // Export all rules to JSON file
    function exportRules() {
        var $status = $("#import-export-status");

        ruleStorage.readRules(function(rules) {
            if (rules.length === 0) {
                $status.removeClass("alert-success").addClass("alert-warning")
                       .html('<strong>Warning:</strong> No items to export.')
                       .show();
                setTimeout(function() { $status.fadeOut(); }, 3000);
                return;
            }

            // Create export data with metadata
            var exportData = {
                version: "1.0",
                exportDate: new Date().toISOString(),
                itemCount: rules.length,
                rules: rules
            };

            var dataStr = JSON.stringify(exportData, null, 2);
            var dataBlob = new Blob([dataStr], { type: 'application/json' });

            // Create download link
            var url = URL.createObjectURL(dataBlob);
            var downloadLink = document.createElement('a');
            downloadLink.href = url;

            // Generate filename with current date
            var date = new Date().toISOString().split('T')[0];
            downloadLink.download = 'your-notifier-backup-' + date + '.json';

            // Trigger download
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);

            // Show success message
            $status.removeClass("alert-warning alert-danger").addClass("alert-success")
                   .html('<strong>Success!</strong> Exported ' + rules.length + ' item(s).')
                   .show();
            setTimeout(function() { $status.fadeOut(); }, 3000);
        });
    }

    // Import rules from JSON file
    function importRules(file) {
        var $status = $("#import-export-status");

        if (!file.name.endsWith('.json')) {
            $status.removeClass("alert-success").addClass("alert-danger")
                   .html('<strong>Error:</strong> Please select a valid JSON file.')
                   .show();
            setTimeout(function() { $status.fadeOut(); }, 5000);
            return;
        }

        var reader = new FileReader();

        reader.onload = function(e) {
            try {
                var importData = JSON.parse(e.target.result);

                // Validate import data structure
                if (!importData.rules || !Array.isArray(importData.rules)) {
                    throw new Error('Invalid file format: missing or invalid rules array');
                }

                var rules = importData.rules;

                if (rules.length === 0) {
                    $status.removeClass("alert-success").addClass("alert-warning")
                           .html('<strong>Warning:</strong> The file contains no items to import.')
                           .show();
                    setTimeout(function() { $status.fadeOut(); }, 5000);
                    return;
                }

                // Validate each rule has required fields with proper types
                var invalidRules = rules.filter(function(rule) {
                    return !rule.id ||
                           !rule.title ||
                           !rule.url ||
                           !rule.selector ||
                           typeof rule.id !== 'string' ||
                           typeof rule.title !== 'string' ||
                           typeof rule.url !== 'string' ||
                           typeof rule.selector !== 'string';
                });

                if (invalidRules.length > 0) {
                    throw new Error('Invalid rule data: ' + invalidRules.length + ' rule(s) missing required fields or have invalid types');
                }

                // Ensure all rules have the necessary default values
                rules = rules.map(function(rule) {
                    return {
                        id: rule.id,
                        title: rule.title,
                        url: rule.url,
                        selector: rule.selector,
                        updateFrequency: rule.updateFrequency || 5,
                        index: rule.index || 0,
                        value: rule.value || '',
                        history: rule.history || [],
                        lastUpdated: rule.lastUpdated || null,
                        attempts: rule.attempts || 0,
                        new: rule.new || false,
                        notify: rule.notify !== undefined ? rule.notify : true,
                        notified: rule.notified || false,
                        ver: rule.ver || 1
                    };
                });

                // Show confirmation dialog
                var message = 'Import ' + rules.length + ' item(s)?\n\n' +
                             'This will add them to your existing items. ' +
                             'Duplicate IDs will be overwritten.';

                if (!confirm(message)) {
                    return;
                }

                // Import rules
                ruleStorage.saveRules(rules, function() {
                    $status.removeClass("alert-warning alert-danger").addClass("alert-success")
                           .html('<strong>Success!</strong> Imported ' + rules.length + ' item(s).')
                           .show();

                    // Refresh the list to show imported rules
                    refreshRuleControls();

                    setTimeout(function() { $status.fadeOut(); }, 5000);
                });

            } catch (error) {
                console.error('Import error:', error);
                $status.removeClass("alert-success").addClass("alert-danger")
                       .html('<strong>Error:</strong> ' + error.message)
                       .show();
                setTimeout(function() { $status.fadeOut(); }, 5000);
            }
        };

        reader.onerror = function() {
            $status.removeClass("alert-success").addClass("alert-danger")
                   .html('<strong>Error:</strong> Failed to read file.')
                   .show();
            setTimeout(function() { $status.fadeOut(); }, 5000);
        };

        reader.readAsText(file);
    }

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

    $selectedInterval.text(chrome.i18n.getMessage('labelUpdateEvery') + " " + $selectedInterval.text());

    ruleControl.attr("id", rule.id);
    var $favicon = ruleControl.find(".favicon");
    $favicon.attr("src", c.getFavicon(rule.url));
    // Hide favicon if it fails to load (instead of showing broken image icon)
    $favicon.on('error', function() {
        $(this).hide();
    });
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

        // If showing envelope icon (new update), change back to th-list and mark as not new
        if ($icon.hasClass("glyphicon-envelope")) {
            $icon.removeClass("glyphicon-envelope").addClass("glyphicon-th-list");

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
    var $favicon = ruleControl.find(".favicon");
    $favicon.attr("src", c.getFavicon(rule.url)).show();
    // Hide favicon if it fails to load (instead of showing broken image icon)
    $favicon.on('error', function() {
        $(this).hide();
    });
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

        // Change settings icon from th-list to envelope
        // This persists until user clicks on it
        var $settingsBtn = $ruleControl.find(".settings");
        var $icon = $settingsBtn.find("span");
        $icon.removeClass("glyphicon-th-list").addClass("glyphicon-envelope");
    }
}

function repaintStripes() {
    $existingRulesContainer.find(".rule-control").removeClass("odd, even");
    $existingRulesContainer.find(".rule-control:odd").addClass("odd");
    $existingRulesContainer.find(".rule-control:even").addClass("even");
}