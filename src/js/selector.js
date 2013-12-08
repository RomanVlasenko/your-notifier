$(document).ready(function () {

    var head = $("head");

    var ext = chrome.extension;

    $("<link>").attr({rel: "stylesheet", type: "text/css", href: ext.getURL("/css/editorModal.css")}).appendTo(head);

    $("<script>").attr({type: "text/javascript", href: ext.getURL("lib/jquery-2.0.3.min.js")}).appendTo(head);
    $("<script>").attr({type: "text/javascript", href: ext.getURL("lib/jquery-ui-1.10.3.min.js")}).appendTo(head);
    $("<script>").attr({type: "text/javascript", href: ext.getURL("js/selector.js")}).appendTo(head);

    $(document).mousedown(function (e) {
        if (e.button == 2) {
            selector = $(e.target).getSelector().join("\n");
            console.log(selector);
        }
    });

    var selector;

    runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            if (request.method == "createRule") {
                openDialog($(document).attr('title'), document.URL, selector);
            }
            else {
                sendResponse({});
            }
        });

    function openDialog(title, url, selector) {
        $.get(chrome.extension.getURL("editorModal.html"), function (data) {
            var $editor = $(data);

            $editor.on("click", "#cancel", function () {
                $editor.dialog("close");
            });

            $editor.on("click", "#test", function () {
                check({url: url, selector: selector}, function (val) {
                    $editor.find(".test-label").html(val);
                });
            });

            $editor.on("click", "#save", function () {
                runtime.sendMessage({method: "saveRule", rule: getRule($editor)});
                $editor.dialog("close");
            });

            $editor.find("#title").val(title);
            $editor.find("#url").val(url);
            $editor.find("#selector").val(selector);

            $editor.dialog({title: "Create new item", width: "400", dialogClass: "yon-dialog"});
        });
    }

    function getRule($editor) {
        return {
            title: $editor.find('#title').val(),
            url: $editor.find('#url').val(),
            selector: $editor.find('#selector').val()
        };
    }

});