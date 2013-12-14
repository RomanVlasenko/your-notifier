$(document).ready(function () {
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

        var $selected = null;
        var $elements = (opt.handle === "") ? this : this.find(opt.handle);

        var inDragMode = false;

        $elements.css('cursor', opt.cursor).on("mousedown",function (e) {
            if (event.which == 1) {
                if (opt.handle === "") {
                    $selected = $(this);
                } else {
                    $selected = $(this).parent();
                    $selected.addClass(opt.draggableClass).find(opt.handle).addClass(opt.activeHandleClass);
                }
                var drg_h = $selected.outerHeight(),
                    drg_w = $selected.outerWidth(),
                    pos_y = $selected.offset().top + drg_h - e.pageY,
                    pos_x = $selected.offset().left + drg_w - e.pageX;
                $(document).on("mousemove",function (e) {
                    if (!inDragMode) {
                        $selected.addClass(opt.draggableClass);
                        opt.onDragStart();
                        inDragMode = true;
                    } else {
                        $selected.offset({
                                             top: e.pageY + pos_y - drg_h,
                                             left: e.pageX + pos_x - drg_w
                                         });
                    }

                }).on("mouseup", function () {
                          $(this).off("mousemove"); // Unbind events from document
                          inDragMode = false;
                          if ($selected !== null) {
                              $selected.removeClass(opt.draggableClass);
                              opt.onDragEnd();
                              $selected = null;
                          }

                      });
                e.preventDefault(); // disable selection
            }
        }).on("mouseup", function (e) {
                  if (opt.handle === "") {
                      $selected.removeClass(opt.draggableClass);
                  } else {
                      $selected.removeClass(opt.draggableClass)
                          .find(opt.handle).removeClass(opt.activeHandleClass);
                  }

                  //Setting element to new place
                  if (inDragMode) {
                      var parent = $selected.parent();
                      var $additionalPanel = $selected.nextUntil(".rule-control");

                      $additionalPanel = $additionalPanel.detach();
                      $selected = $selected.detach();

                      var children = parent.find(".rule-control");
                      var newIndex = index(children, $selected, e.clientY);
                      if (newIndex == -1) {
                          $selected.prependTo(parent);
                      } else {
                          var newSibling = $(children[newIndex]).nextUntil(".rule-control").last();
                          $selected.insertAfter(newSibling);
                      }
                      $additionalPanel.insertAfter($selected);
                  }
                  $selected.css("top", "").css("left", "");
                  $selected = null;
                  $additionalPanel = null;
                  opt.onDragEnd();
                  inDragMode = false;
              });

        return this;

    };

    function index(children, selected, mouseY) {
        var index = -1;

        for (var i = 0; i < children.length; i++) {
            if (i == selected.index()) {
                continue;
            }
            var e = children[i];
            var y = $(e).offset().top + $(e).height();
            if (y < mouseY) {
                index = i;
            } else {
                return index;
            }
        }
        return children.length - 1;
    }
});