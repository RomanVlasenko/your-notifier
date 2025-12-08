var $clickedElement;
var selector;
$(document).mousedown(function (e) {
    if (e.button == 2) {
        $clickedElement = $(e.target);
    }
});

$.get(chrome.runtime.getURL("dialog.html"), function (data) {
    var $editor = $(data);

    // Localize the dialog after loading
    localizeElement($editor[0]);

    $editor.on("click", "#cancel", function () {
        clearDialog();

        $editor.dialog("close");
    });

    $editor.on("click", "button#test", function () {
        clearResult();

        var $testPanel = $editor.find(".yon-test");
        $testPanel.show();

        if (validateFields()) {

            $testPanel.css("background-image", "url('" + chrome.runtime.getURL("img/load.gif") + "')");

            c.checkUrl(getRule($editor), function (val) {
                $editor.find(".test-label").html(val);
                $testPanel.slideDown(200);

                $testPanel.css("background-image", "none");

                if (isEmpty(val)) {
                    $editor.find(".not-available").show();
                } else {
                    $editor.find(".ok").show();
                }
            });
        }
    });

    $editor.on("click", "#save", function () {
        $editor.find(".yon-test").hide();
        if (validateFields()) {
            chromeAPI.runtime.sendMessage({method: "saveRule", rule: getRule($editor)});
            $editor.dialog("close");
        }
    });

    chromeAPI.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            if (request.method == "createRule") {
                if ($clickedElement) {
                    // Debug: Log the element being passed to selector generator
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

    function openDialog(title, url, selector) {
        $editor.find("#title").val(title);
        $editor.find("#url").val(url);
        $editor.find("#selector").val(selector);

        $editor.dialog({title: chrome.i18n.getMessage('dialogTitleCreateNewItem'), width: "400", dialogClass: "yon-dialog"});
    }

    function getRule($editor) {
        return {
            title: $editor.find('#title').val(),
            url: $editor.find('#url').val(),
            selector: $editor.find('#selector').val()
        };
    }

    function clearDialog() {
        $editor.find("#title").val("");
        $editor.find("#url").val("");
        $editor.find("#selector").val("");

        $editor.find(".yon-badge").hide();
        $editor.find(".yon-test").hide();

        url = "";
        title = "";
        selector = "";
        $clickedElement = null;
    }

    function validateFields() {
        var $editRule = $('#yon-edit-rule');
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
        $(".yon-test .yon-badge.not-available").hide();
        $(".yon-test .yon-badge.ok").hide();
        $editor.find(".test-label").empty();
    }
});