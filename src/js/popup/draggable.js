$(document).ready(function () {
    // Track which containers have been initialized
    var initializedContainers = new WeakMap();

    // SortableJS wrapper to match the original API
    $.fn.drags = function (opt) {
        opt = $.extend({
            handle: "",
            draggableClass: "draggable",
            activeHandleClass: "active-handle",
            onDragStart: function () {
            },
            onDragEnd: function () {
            }
        }, opt);

        // Find the parent container (#existing-rules)
        var $container = this.parent();
        var container = $container[0];

        if (!container) return this;

        // If already initialized, just return
        if (initializedContainers.has(container)) {
            return this;
        }

        // Mark as initialized
        initializedContainers.set(container, true);

        // Initialize SortableJS on the container
        var sortable = Sortable.create(container, {
            animation: 150,  // Smooth animation when items shift
            ghostClass: 'sortable-ghost',  // Class for the drop placeholder
            chosenClass: 'sortable-chosen',  // Class for the selected item
            dragClass: 'sortable-drag',  // Class for the dragging item
            handle: opt.handle || undefined,  // Drag handle selector
            forceFallback: false,  // Use native HTML5 drag and drop

            // Filter out elements that shouldn't trigger drag
            filter: '.rule-buttons-more, .rule-buttons-more *, button, input, select, option, textarea, a',

            // Don't call preventDefault on filtered elements - let them work normally
            preventOnFilter: false,

            // Only move .rule-control elements
            draggable: '.rule-control',

            // Called when dragging starts
            onStart: function (evt) {
                opt.onDragStart();
            },

            // Called when dragging ends
            onEnd: function (evt) {
                // Handle the additional panel that follows each rule-control
                var $item = $(evt.item);
                var $additionalPanel = $item.next('.rule-buttons-more');

                // If there's an additional panel, move it after the dragged item
                if ($additionalPanel.length > 0) {
                    $additionalPanel.detach().insertAfter($item);
                }

                opt.onDragEnd();
            }
        });

        return this;
    };
});
