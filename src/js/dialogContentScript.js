$(document).ready(function () {

    var $clickedElement;
    var selector;
    $(document).mousedown(function (e) {
        if (e.button == 2) {
            $clickedElement = $(e.target);
        }
    });

    $.get(chrome.extension.getURL("dialog.html"), function (data) {
        var $editor = $(data);

        $editor.on("click", "#cancel", function () {
            $editor.find("#title").val();
            $editor.find("#url").val();
            $editor.find("#selector").val();

            url = "";
            title = "";
            $clickedElement = null;

            $editor.dialog("close");
        });

        $editor.on("click", "#test", function () {
            check({url: url, selector: selector}, function (val) {
                $editor.find(".test-label").html(val);
                $editor.find(".yon-test").slideDown(200);

                if (isEmpty(val)) {
                    $editor.find(".not-available").show();
                } else {
                    $editor.find(".ok").show();
                }
            });
        });

        $editor.on("click", "#save", function () {
            runtime.sendMessage({method: "saveRule", rule: getRule($editor)});
            $editor.dialog("close");
        });

        runtime.onMessage.addListener(
            function (request, sender, sendResponse) {
                if (request.method == "createRule") {
                    if ($clickedElement) {
                        selector = $clickedElement.getSelector().join("\n");
                        console.log(selector);
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

            $editor.dialog({title: "Create new item", width: "400", dialogClass: "yon-dialog"});
        }

        function getRule($editor) {
            return {
                title: $editor.find('#title').val(),
                url: $editor.find('#url').val(),
                selector: $editor.find('#selector').val()
            };
        }
    });

});