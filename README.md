jQuery-Draggable-Touch
======================

Draggable/Droppable __[jQuery UI](http://jqueryui.com/droppable/)__ remake for mobile and tablet.
Use translateX/Y instead of top/left.

Use __[Transform Css](https://github.com/flavienliger/Transform-Css)__ for convert parameter.


Adding Functionality
========

- Multitouch : can drag multiple objects simultaneously !bug
```
$('.draggable').draggable({
  multitouch: true
});
```

- $.fn.getDragPos : return position left/top of element

Option available
=======

Draggable
-

- addClasses
- appendTo
- axis
- cursorAt
- disabled
- distance
- helper
- opacity
- revert
- revertDuration
- zIndex

Droppable
-

- activeClass
- hoverClass
- accept

Support
=======

- Safari
- Chrome
- Android 4+

Features unstable
=======

- cursorAt with axis
- offset in fast movement
