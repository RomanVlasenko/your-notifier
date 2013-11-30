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

                  //Setting element to new place
                  var n;
                  var parent = $selected.parent();
                  $selected = $selected.detach();

                  $.each(parent.find(".rule-control"), function (i, el) {
                      var y = $(el).offset().top + $(el).height() / 2;
                      if (y < e.clientY) {
                          n = el;
                      } else if (y > e.clientY) {
                          if (i == 0) {
                              $selected.prependTo(parent);
                          } else {
                              $selected.insertAfter($(n));
                          }
                          return false;
                      }
                      return true;
                  });
                  $selected.css({"left": "auto", "top": "auto"});
                  $selected = null;
              });

        return this;

    };



//    function getNewIndex(clientY, $selected) {
//        var i = 0;
//        var $children = $selected.parent().children();
//
//        $.each($children, function (i, e) {
//            var mid = $(e).offset().top;
//            if (clientY > mid) {
//                if ($(e).index() != $selected.index()) {
//                    n = e;
//                }
//            }
//        });
//        return n;
//    }
});