$(document).ready(function () {
    $.fn.drags = function (opt) {

        opt = $.extend({
                           handle: "",
                           draggableClass: "draggable",
                           activeHandleClass: "active-handle"
                       }, opt);

        var $selected = null;
        var $elements = (opt.handle === "") ? this : this.find(opt.handle);

        $elements.css('cursor', opt.cursor).on("mousedown",function (e) {
            if (event.which == 1) {
                if (opt.handle === "") {
                    $selected = $(this);
                    $selected.addClass(opt.draggableClass);
                } else {
                    $selected = $(this).parent();
                    $selected.addClass(opt.draggableClass).find(opt.handle).addClass(opt.activeHandleClass);
                }
                var drg_h = $selected.outerHeight(),
                    drg_w = $selected.outerWidth(),
                    pos_y = $selected.offset().top + drg_h - e.pageY,
                    pos_x = $selected.offset().left + drg_w - e.pageX;
                $(document).on("mousemove",function (e) {
                    $selected.offset({
                                         top: e.pageY + pos_y - drg_h,
                                         left: e.pageX + pos_x - drg_w
                                     });
//                    console.log($selected.parent().children().index(getNewNeighbour(e.clientY, $selected)));
                }).on("mouseup", function () {
                          $(this).off("mousemove"); // Unbind events from document
                          if ($selected !== null) {
                              $selected.removeClass(opt.draggableClass);
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

                  var $neighbour = getNewNeighbour(e.clientY, $selected);
                  $selected.css({"left": "auto", "top": "auto"});
                  $selected.detach().insertAfter($neighbour);
                  $selected = null;
              });

        return this;

    };

    function getNewNeighbour(clientY, $selected) {
        var $children = $selected.parent().children();
        var n = $children[0];

        $.each($children, function (i, e) {
            var mid = $(e).offset().top;
            if (clientY > mid) {
                if ($(e).index() != $selected.index()) {
                    n = e;
                }
            }
        });
        return n;
    }
});