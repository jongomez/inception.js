# __inception.js__

---

![alt text](http://i64.tinypic.com/23v01gn.jpg "inception.js")

* Display the current page inside an iframe
* Create loops of iframes within iframes
* [Blog post](https://jongomez.github.io/post/inceptionjs/)

### How does it work?

1. Read top window's HTML code, e.g. window.top.document.documentElement.outerHTML.
2. Set the iframe's HTML code to be equal to the top window's HTML. This is done with iframe.contentDocument.write(top window's HTML code).
3. Repeat 1. and 2.

### Example 1 - <div> container
First thing we need is an iframe container. If we have a <div> with id "iframeContainer1", the Inception call is:

```javascript
inception = new Inception({
  iframeContainerId: "iframeContainer1", 
  levels: 3
})
```

The "levels" argument defines the number of nested iframes we want inside "iframeContainer1".

[Check it out on Codepen.](https://codepen.io/jonGomez/full/xROgqO/)

BTW, the pens on editor view scroll up by themselves. Not sure why.

### Example 2 - Image

If we have an image and want to add an iframe container on top of it, we need to position the iframe container and set it's dimensions. That's what the width, height, top, left and rotate arguments do: they define the dimensions and position of the iframe container, relative to the given image. Example call:

```javascript
inception = new Inception({
  imageId: "img1", 
  levels: 4, 

  width: "60%",
  height: "56%",
  top: "25%",
  left: "10%",
  rotate: "5deg"
})
```
[Check it out on Codepen.](https://codepen.io/jonGomez/full/xRgRQa)

[I made a CodePen to help with the positioning and dimensions of the iframe container.](http://codepen.io/jonGomez/full/YGOdPE/)

### Example 3 - Image with matrix3d

Suppose our image has a phone in it, and we want to add an iframe container on top of the phone screen. However, the phone is tilted in a weird way. We try to position the iframe container with the width, height, top, left and rotate args, but they aren't enough for the task at hand. In situations like these, we need to use the powers of the matrix3d. [Franklin Ta came up with this, link to his blog post.](http://franklinta.com/2014/09/08/computing-css-matrix3d-transforms/) Example call:

```javascript
inception = new Inception({
    imageId: "img1", 
    levels: 4, 

    matrix3d: "matrix3d(0.326055, -0.0175387, ...)",
    imageWidth: "960px",
    imageHeight: "640px"
})
```
The 'imageWidth' and 'imageHeight' are necessary when using matrix3d's, because if the image is resized, we need to rescale the matrix3d stuff to make sure everything is in the right place. To rescale the matrix3d stuff correctly, we need to know the original 'imageWidth' and 'imageHeight'. [This approach was inspired by this Codrops article.](http://tympanus.net/codrops/2014/11/21/perspective-mockup-slideshow/)

[Check it out on Codepen.](https://codepen.io/jonGomez/full/WoRRep/)

### Arguments

Arguments are passed in as object literals, e.g.:

```javascript
inception = new Inception({
  arg1: val1,
  arg2: val2,
  ...
})
```

##### Arguments - Misc

* levels (int) - number of nested iframes.
* onload (function) - callback function called when everything is done. All the iframe's are accessible via the iframes[] array, so we can do stuff like: 

```javascript
inception.onload = function() {
  this.iframes[2].contentDocument.getElementById(...)
}
```

* backgroundColor (string) - background color of the iframes.
* backfaceVisibility ("hidden", "visible", etc) - Default is "hidden". When set to "hidden", removes jagged edges, but also blurs child iframes. So there is a trade-off here: if you want smooth edges, the nested iframes get blurry. 
* classesToRemove (array with classes, e.g. ["class1", "class2"]) - Will remove all elements with given classes from the iframes.
* HTMLOverflow ("hidden", "visible", etc) - Used to display the scroll bars inside the iframes. Default value is "hidden" (i.e. default is no scroll bars).
* setZIndex (true || false) - Set z-index values in the image, iframeContainer, and iframeContainer parent. These z-index values are used because some iframes, when rendering, delete stuff on parent iframes. Not sure why it happens. Only happens on Chrome though, never had issues with Firefox.
* userHTML (string, e.g. "<html> (...) </html>") - Sets the HTML code of the iframes. If the user does not specify this argument, the HTML code of the iframes is the same as the current webpage.
* numParentsUntilTopWindow (int) - Number of parent windows until top window. This is used when the inception call is made inside an iframe. If the iframe's contentWindow is the direct child of window.top (i.e. window.top === iframe.contentWindow.parent), the numParentUntilTopWindow value is 1. Why is this used? Because inception.js needs to know it's being called on the correct window. This was created to enable usage on sites like CodePen, or any site that displays code inside a sandboxed iframe.

##### Arguments - Definning the iframe containers

You can choose 1 of 3 kinds: imageId, matrix3d, and iframeContainerId. These a mutually exclusive - if you use one, it doesn't make sense to use any other.

* imageId (string) - Id of an image that will have the iframes on top of it. [Example](https://codepen.io/jonGomez/full/xRgRQa)
* matrix3d (string of the type "matrix3d(0.326055, -0.0175387, ...)") - Used for distorted iframe containers. [Example](https://codepen.io/jonGomez/full/WoRRep/)
* iframeContainerId (string) - Id of the iframe container. Should be a <div>, but can probably be other things? [Example](https://codepen.io/jonGomez/full/xROgqO/)

[If you're using imageId instead of matrix3d (recommended), this CodePen may help you position and dimension the iframe container.](http://codepen.io/jonGomez/full/YGOdPE/)

[If you decide to go ahead and use matrix3d's, this CodePen may help you find the matrix3d values.](http://codepen.io/jonGomez/full/yaRgjG)

##### Iframe container's position and dimension

If you used imageId to define you iframe container, use the following:

* top (string, e.g. "10%" or "10px") - Define the iframe container's position from the top, relative to the image.
* left (string, e.g. "10%" or "10px") - Define the iframe container's position from the left, relative to the image.
* width (string, e.g. "10%" or "10px") - Define the iframe container's width, relative to the image.
* height (string, e.g. "10%" or "10px") - Define the iframe container's height, relative to the image.
* rotate (int) - Define the rotation of the iframe container, in degrees.

[CodePen to help you position and dimension using these args.](http://codepen.io/jonGomez/full/YGOdPE/)

If you used matrix3d, the matrix3d transform should take care of the positioning and dimensions by itself. [CodePen to help you find the matrix3d values.](http://codepen.io/jonGomez/full/yaRgjG)

##### Scroll and resize

The iframes scroll and resize along with the main window. The following args influence these behaviours.

* trackScroll (true || false) - Scroll inside the iframe or not. Defaults to true. Only tracks Y-axis scrolling.
* scrollOffset (true || false) - When scrolling inside the iframes, adds an offset to the Y-axis scrolling value.
* trackResize (true || false) - Resizes the iframe's content accordingly when the user resizes the browser's window. Defaults to true.
* imageWidth (string value in pixels, e.g. "500px") - Used with matrix3d in order to resize everything correctly.
* imageHeight - (string value in pixels, e.g. "500px") - Used with matrix3d in order to resize everything correctly.

##### Iframe's content position and dimensions

Sometimes we want the iframe's content to be scaled or positioned in certain ways. The following args help with that.

* leftAlignWith (element Id string) - Left align iframe, based on an element inside the iframe. Used to center iframes horizontally, among other things.
* imagePosition ("relative", "absolute", etc...) - Image needs to be positioned for the z-index to have any effect. The default value is "relative".
* matchWidthElementId (element Id string) - Scale the iframe's content in a way that the iframe's windows are filled with the given element, but only width wise. 
* matchHeightElementId (element Id string) - Scale the iframe's content in a way that the iframe's windows are filled with the given element, but only height wise. 
* sameHeightAsUser (true || false) - If true, scale the iframe's content in such a way that the iframe's windows "see" the same things as the user, but only height wise. 

I really suck at explaining these things.

### Massive shout outs
* [Franklin Ta - Computing CSS matrix3d transforms](http://franklinta.com/2014/09/08/computing-css-matrix3d-transforms/)
* [Codrops - Perspective Mockup Slideshow](http://tympanus.net/codrops/2014/11/21/perspective-mockup-slideshow/)

### Mockup images taken from
* [Magic Mockups](http://magicmockups.com/)
