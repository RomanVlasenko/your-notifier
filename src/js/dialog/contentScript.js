var $clickedElement;
var selector;
var $editor = null;
var $overlay = null;
var dialogLoaded = false;

$(document).mousedown(function (e) {
    if (e.button == 2) {
        $clickedElement = $(e.target);
    }
});

// Load dialog HTML once
function loadDialog() {
    if (dialogLoaded) return Promise.resolve();

    return new Promise(function(resolve) {
        $.get(chrome.runtime.getURL("dialog.html"), function (data) {
            var $content = $(data);

            // Separate overlay and dialog
            $overlay = $content.filter("#yon-modal-overlay");
            $editor = $content.filter("#dialog");

            // Append to body
            $("body").append($overlay).append($editor);

            // Localize the dialog after loading
            localizeElement($editor[0]);

            // Set up event handlers
            setupEventHandlers();

            dialogLoaded = true;
            resolve();
        });
    });
}

function setupEventHandlers() {
    // Close on overlay click
    $overlay.on("click", function () {
        closeDialog();
    });

    // Cancel button
    $editor.on("click", "#cancel", function () {
        closeDialog();
    });

    // Test button
    $editor.on("click", "button#test", function () {
        clearResult();

        var $testPanel = $editor.find(".yon-test");
        $testPanel.addClass("visible");

        if (validateFields()) {
            $testPanel.css("background-image", "url('" + chrome.runtime.getURL("img/load.gif") + "')");

            c.checkUrl(getRule(), function (val) {
                $editor.find(".test-label").html(val);
                $testPanel.css("background-image", "none");

                if (isEmpty(val)) {
                    $editor.find(".not-available").addClass("visible");
                } else {
                    $editor.find(".ok").addClass("visible");
                }
            });
        }
    });

    // Save button
    $editor.on("click", "#save", function () {
        $editor.find(".yon-test").removeClass("visible");
        if (validateFields()) {
            chromeAPI.runtime.sendMessage({method: "saveRule", rule: getRule()});
            closeDialog();
        }
    });

    // ESC key to close
    $(document).on("keydown", function (e) {
        if (e.key === "Escape" && $editor && $editor.hasClass("open")) {
            closeDialog();
        }
    });

    // Make dialog draggable by titlebar
    var isDragging = false;
    var dragOffsetX = 0;
    var dragOffsetY = 0;

    $editor.find("#yon-dialog-titlebar").on("mousedown", function (e) {
        isDragging = true;
        var dialogOffset = $editor.offset();
        dragOffsetX = e.pageX - dialogOffset.left;
        dragOffsetY = e.pageY - dialogOffset.top;
        e.preventDefault();
    });

    $(document).on("mousemove", function (e) {
        if (isDragging && $editor) {
            $editor.css({
                left: e.pageX - dragOffsetX,
                top: e.pageY - dragOffsetY,
                transform: "none"
            });
        }
    });

    $(document).on("mouseup", function () {
        isDragging = false;
    });
}

chromeAPI.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.method == "createRule") {
            if ($clickedElement) {
                console.log("Element passed to selector generator:", {
                    tagName: $clickedElement[0].tagName,
                    className: $clickedElement[0].className,
                    id: $clickedElement[0].id,
                    textContent: $clickedElement.text().substring(0, 50),
                    outerHTML: $clickedElement[0].outerHTML.substring(0, 200)
                });

                try {
                    selector = generateSelector($clickedElement);
                } catch (e) {
                    console.log("Unable to generate selector: " + e);
                }
            }
            openDialog($(document).attr('title'), document.URL, selector);
        }
        else {
            sendResponse({});
        }
    });

function openDialog(title, url, selectorVal) {
    loadDialog().then(function() {
        $editor.find("#title").val(title);
        $editor.find("#url").val(url);
        $editor.find("#selector").val(selectorVal);

        // Reset position to center
        $editor.css({
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)"
        });

        // Show dialog and overlay
        $overlay.addClass("open");
        $editor.addClass("open");
    });
}

function closeDialog() {
    if ($editor) {
        clearDialogFields();
        $editor.removeClass("open");
    }
    if ($overlay) {
        $overlay.removeClass("open");
    }
}

function getRule() {
    return {
        title: $editor.find('#title').val(),
        url: $editor.find('#url').val(),
        selector: $editor.find('#selector').val()
    };
}

function clearDialogFields() {
    if (!$editor) return;

    $editor.find("#title").val("");
    $editor.find("#url").val("");
    $editor.find("#selector").val("");

    $editor.find(".yon-badge").removeClass("visible");
    $editor.find(".yon-test").removeClass("visible");

    selector = "";
    $clickedElement = null;
}

function validateFields() {
    var $editRule = $editor.find('#yon-edit-rule');
    var $title = $editRule.find('#title');
    var $url = $editRule.find('#url');
    var $selector = $editRule.find('#selector');

    var titleValid = !isEmpty($title.val());
    var urlValid = !isEmpty($url.val()) && $url.val().length <= validation.URL_MAX_LENGTH;
    var selectorValid = !isEmpty($selector.val()) && $selector.val().length <= validation.SELECTOR_MAX_LENGTH;

    $title.toggleClass("yon-input-error", !titleValid);
    $url.toggleClass("yon-input-error", !urlValid);
    $selector.toggleClass("yon-input-error", !selectorValid);

    return titleValid && urlValid && selectorValid;
}

function clearResult() {
    $editor.find(".yon-test .yon-badge.not-available").removeClass("visible");
    $editor.find(".yon-test .yon-badge.ok").removeClass("visible");
    $editor.find(".test-label").empty();
}