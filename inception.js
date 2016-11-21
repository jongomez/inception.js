function Inception(args) {  

  // Make sure the Inception code only runs on 1 window.
  // Used because the iframe's in sites like CodePen cannot access window.top.
  this.numParentsUntilTopWindow = args.numParentsUntilTopWindow || 0;
  shouldBeTopWindow = window.self;
  for(var i = 0; i < this.numParentsUntilTopWindow; i++){
    shouldBeTopWindow = shouldBeTopWindow.parent;
  }

  if(window.top === shouldBeTopWindow) {
    // The element with this Id will be the parent of all the iframes.
    this.iframeContainerId = args.iframeContainerId || null;
    // Used if the iframes go on top of an image.
    this.imageId = args.imageId || null;
    // Left align iframe. Used to center iframes horizontally.
    this.leftAlignWith = args.leftAlignWith || null;
    // Number of levels, i.e. number of nested iframes.
    this.levels = args.levels || 0;

    this.top = args.top || "0%";
    this.left = args.left || "0%";
    this.width = args.width || "100%";
    this.height = args.height || "100%";
    this.rotate = args.rotate || 0;
    this.backgroundColor = args.backgroundColor || "";

    // Used for distorted iframe containers. Usage: "matrix3d(0.326055, -0.0175387, ...)"
    this.matrix3d = args.matrix3d || null;

    // Image needs to be positioned for the z-index to have any effect.
    this.imagePosition = args.imagePosition || "relative";
    // XXX: Both imageWidth and imageHeight have to be pixels, e.g. "500px".
    this.imageWidth = args.imageWidth || null;
    this.imageHeight = args.imageHeight || null;

    // Call this callback function when all the iframes are done.
    this.onload = args.callback || null; 

    /// Iframe scaling stuff.
    this.matchWidthElementId = args.matchWidthElementId || null;
    this.matchHeightElementId = args.matchHeightElementId || null;
    this.sameHeightAsUser = args.sameHeightAsUser || false;

    // Track scroll or not. Defaults to YES.  
    this.trackScroll = typeof args.trackScroll == "undefined" ? true : args.trackScroll;
    this.trackResize = typeof args.trackResize == "undefined" ? true : args.trackResize;
    this.scrollOffset = args.scrollOffset || 0;

    // Removes jagged edges, but also blurs child iframes.
    this.backfaceVisibility = args.backfaceVisibility || "hidden";
    // Used to not display stuff inside the iframes.
    this.classesToRemove = args.classesToRemove || [];
    // Convert to array, if user passed in a string.
    this.classesToRemove = typeof this.classesToRemove === 'string' ? [this.classesToRemove] : this.classesToRemove;

    // Turn on scrolling inside the iframes: HTMLOverflow = "auto" and setZIndex = false.
    this.HTMLOverflow = args.HTMLOverflow || "hidden";
    // Set z-index on the iframes or not. Defaults to YES.  
    this.setZIndex = typeof args.setZIndex == "undefined" ? true : args.setZIndex;

    // User specified HTML code to use.
    this.userHTML = args.userHTML || null;

    //
    //// These guys are not set by the user.
    //

    this.HTMLCode = null;
    this.originalDoc = null;
    this.wrapId = null;
    this.documentLoadIntervalId = null;
    // Array with all the iframe elements.
    this.iframes = [];
    this.iframeContainers = [];

    //
    //// Waits until document is ready to add the first iframe.
    //

    this.mainDocumentLoadWait();
  } 
}

Inception.prototype = {
  // Instance counter.
  numInstances: 0,

  // How scaling is done:
  // - Get iframeContainers's dimensions. 
  // - If user specified matchWidthElement argument, i.e. to match a certain element's width:
  //   - Look at user specified matchWidthElement's width (aka matchWidth) element dimensions.
  //   - Scale iframe's HTML tag so that matchWidth is equal to iframeContainer width.
  scaleIframe: function(iframe) {
    currentScaleRatio = iframe.scaleRatio || 1;

    // With matrix3d, outerWidth CAN BE smaller than innerWidth. Why?
    // EASY. The browser window is SMALLER than the iframe window, which has a matrix3d applied.
    //console.log(iframe.contentWindow.outerWidth, iframe.contentWindow.innerWidth)

    containerWidth = iframe.parentElement.clientWidth;
    containerHeight = iframe.parentElement.clientHeight;

    // XXX: Transforms like rotate affect the bounding rect dimensions of the iframe container, but...
    // ... iframe's <html> and elements bounding rect dimensions aren't affected by these transforms (because they happen on different windows?)
    if(this.matchHeightElementId != null) {
      elementToMatchHeight = iframe.contentDocument.getElementById(this.matchWidthElementId).getBoundingClientRect().height;
      // If the element to match has been scaled... get back it's original boundingRect size.
      elementToMatchHeigth = iframe.scaleRatio ? elementToMatchHeight / iframe.scaleRatio : elementToMatchHeight;
      scaleRatio = containerHeight / elementToMatchHeight;
    } else if(this.matchWidthElementId != null) {
      elementToMatchWidth = iframe.contentDocument.getElementById(this.matchWidthElementId).getBoundingClientRect().width;
      // If the element to match has been scaled... get back it's original boundingRect size.
      elementToMatchWidth = iframe.scaleRatio ? elementToMatchWidth / iframe.scaleRatio : elementToMatchWidth;
      scaleRatio = containerWidth / elementToMatchWidth;  
    } else if(this.sameHeightAsUser) {
      // XXX: When you're matching heights, what happens to the widths?
      elementToMatchHeight = window.top.innerHeight;
      scaleRatio = containerHeight / elementToMatchHeight;
    } else {
      // DEFAULT - The iframe's scale ratio will be determined by the user's window.innerWidth.
      // i.e. the iframe will "see" the same width as the user sees.
      elementToMatchWidth = window.innerWidth;
      scaleRatio = containerWidth / elementToMatchWidth;
    }

    //console.log("containerWidth:", containerWidth,  "match:", elementToMatchWidth, "ScaleRatio:", scaleRatio)

    // Small little increment to the scale. Makes sure the iframe content 100% fills up it's window.
    // XXX: Maybe you aren't filling the container 100% because you're doing something wrong here?
    scaleRatio += 0.01;
    //scaleRatio = 1;

    iframe.scaleRatio = scaleRatio;
    iframe.contentDocument.documentElement.style.transform = "scale(" + scaleRatio + ")";
    iframe.contentDocument.documentElement.style.transformOrigin = "0 0";

    return scaleRatio;
  },

  // Waits until top window is ready for 1st iframe.
  mainDocumentLoadWait: function () {
    // - doc.readyState "complete" means: DOM ready for interaction;
    // - window "load" fires when: elements (imgs, etc) done loading;
    // However, MDN says they're the same. https://developer.mozilla.org/en-US/docs/Web/API/Document/readyState
    if(document.readyState != "complete") {
      // The 1st time the script is run, make sure the window has loaded. This way, the element's height and width are OK.
      window.addEventListener("load", this.firstTimeSetup.bind(this));
    } else {
      // If the document's already loaded, no need to add event listeners.
      this.firstTimeSetup();
    }
  },

  // Creates a parent <div>, on a given document.
  createParent: function(parentId, childId, doc, position, display) {
    childEl = doc.getElementById(childId);
    originalParent = childEl.parentNode;
    newParent = doc.createElement('div');
    newParent.style.position = position || "relative";
    newParent.style.display = display || "inline-block";
    newParent.id = parentId;

    // Removes the childEl, and inserts newImageParent in it's place.
    originalParent.replaceChild(newParent, childEl);
    newParent.appendChild(childEl);

    return newParent;
  },

  // If the user wants to add iframes on top of an image, run this function.
  // This function adds a parent container and a "brother" container to the image, something like:
  //  <div id="inception-parent-container">
  //    <img id="GIVEN_ID" src="...">
  //    <div id="inception-iframe-container"></div>
  //  </div>
  // If matrix3d was defined, adds yet another parent. A grandparent if you will.
  setupImageContainers: function(doc) {
    // The iframe container is a sibling of the image element. This way we can position one on top of the other.
    iframeContainer = doc.createElement('div');
    iframeContainer.id = "inceptionjs-iframe-container-" + this.imageId; 
    imageEl = doc.getElementById(this.imageId);
    imageParent = this.createParent("inceptionjs-image-iframe-container-" + this.imageId, this.imageId, doc);

    // The iframeContainer is a sibling osetupIf the image element.
    imageParent.appendChild(iframeContainer);

    // Image needs to be positioned for the z-index to have any effect.
    imageEl.style.position = this.imagePosition;
    // Check out what happens if you don't set these guys (by setting the arg setZIndex = false)...
    if(this.setZIndex) {
      // Make sure nothing bursts out of the image container (sometimes it happens).
      imageParent.style.zIndex = -1;
      imageEl.style.zIndex = -2;
      iframeContainer.style.zIndex = -1;
    }

    // If the user wants a matrix3d, run this code.
    if(this.matrix3d != null) {
      iframeContainer.style.transform = this.matrix3d;
      iframeContainer.style.transformOrigin = "0 0";
      imageParent.style.width = this.imageWidth;
      imageParent.style.height = this.imageHeight;
      this.wrapId = "inceptionjs-matrix3d-container-" + this.imageId;
      // I set it to "block" for some reason... can't remember why. I think it was due to iframe's content width issues.
      //grandP = this.createParent(this.wrapId, imageParent.id, doc, "relative", "block")
      grandP = this.createParent(this.wrapId, imageParent.id, doc, "relative", "inline-block");
      grandP.style.maxWidth = "100%";
      grandP.style.overflow = "hidden";
    } else {
      iframeContainer.style.transform = "rotate(" + this.rotate + ")";
    }


    // Removes jagged edges.
    iframeContainer.style.backfaceVisibility = this.backfaceVisibility;

    iframeContainer.style.position = "absolute";
    iframeContainer.style.top = this.top;
    iframeContainer.style.left = this.left;
    iframeContainer.style.width = this.width;
    iframeContainer.style.height = this.height; 
    iframeContainer.style.backgroundColor = this.backgroundColor;

    this.iframeContainerId = iframeContainer.id;

    return iframeContainer;
  },

  setupiframeContainer: function(doc) {
    if(this.imageId != null) {
      iframeContainer = this.setupImageContainers(doc);
    } else if(this.iframeContainerId != null) {
      iframeContainer = doc.getElementById(this.iframeContainerId)
    } else {
      console.log("Sorry, couldn't find iframeContainerId or imageId :(\nDid you pass them in as arguments?");
      return null;
    }

    if(iframeContainer == null) {
      console.log("Sorry, couldn't find the iframeContainer :(");
      return null;
    }

    iframeContainer.style.overflow = "hidden";
    this.iframeContainers.push(iframeContainer);
    return iframeContainer;
  },

  // Set things up and add the 1st iframe.
  firstTimeSetup: function() {
    if(this.levels == 0) {
      console.log("args.levels is either 0 or not provided. Please provide a value that's > 0.");
      return;
    }

    // Set HTMLCode, but only set it once per constructor call.
    this.saveOriginalHTML();
    iframeContainer = this.setupiframeContainer(document);
    if(iframeContainer != null) {
      this.addIframe(document, iframeContainer);
    }
  },

  // After doc.readyState is "complete", this function is called.
  // XXX: Avoid document owner issues: make sure iframeContainer belongs to the correct document, etc.
  addIframe: function(doc, iframeContainer) {
    iframe = doc.createElement('iframe');

    // First time this function is called (from firstTimeSetup()) iframeContainer is already set up. No need to set it up again.
    if(iframeContainer == null || typeof iframeContainer == "undefined") {
      iframeContainer = this.setupiframeContainer(doc);
    }

    // Add iframe to the DOM.
    iframeContainer.appendChild(iframe);

    // iframe styles.
    // Used if the user wants to center the iframes horizontally. This is done in this.centerIframesHorizontally().
    //iframe.style.position = "relative";
    // Very important. May clip content inside sub iframes, messing up everything.
    //iframe.style.float = "none";
    iframe.style.height = "100%";
/*

Problems with width == 100%: 
- When you set the width to 100%, and reset the html width back again...
- ... the element's widths may be different. Something like the following could mess things up:
clientWidth = mostRecentIframe.contentDocument.documentElement.clientWidth;
mostRecentIframe.style.width = "100%"
mostRecentIframe.contentDocument.documentElement.style.width = clientWidth + "px";

*/
    iframe.style.width = "100vw";
    // Make sure the iframe always fills up the container (100vw may not be enough to do so).
    iframe.style.minWidth = "100%";
    iframe.style.border = "0";
/*
      
- Writing HTML with contentDocument.documentElement.innerHTML = originalDoc.documentElement.innerHTML:
  - Chrome's docs are always "complete", even right after executing the command above.
    - BUT IT WORKS!
  - Firefox's docs go through the states: uninitialized, interactive, complete
    - And it doesn't work... The iframes HTML code is just an empty body and head.

- Writing HTML with contentDocument.write(originalDoc.documentElement.outerHTML) (with .open() and .close())
  - Firefox and Chrome work 100% 
    - With all the document ready states as you'd expect, etc..

*/
    //iframe.contentDocument.documentElement.innerHTML = this.originalDoc.documentElement.innerHTML;
    iframe.contentDocument.open();
    iframe.contentDocument.write(this.originalDoc.documentElement.outerHTML);
    iframe.contentDocument.close();

    // iframe javascript object properties.
    iframe.level = this.iframes.length;
    iframe.trackScroll = this.trackScroll;
    // Left position iframe with some child element. Used to center the iframe's content, for example.
    iframe.leftAlignWith = this.leftAlignWith;
    // Default value for 'reverseScroll' is false. Can be changed on the iframe, i.e. inception.iframes[i].reverseScroll = false or true
    iframe.reverseScroll = false;
    // Turns into "true" when the iframe's doc has been loaded.
    iframe.loaded = false;
    iframe.scaleRatio = null;

    // Save the iframe in an array of iframes. The user can then access this array and do whatever with the iframes.
    this.iframes.push(iframe);
    this.documentLoadIntervalId = setInterval(this.iframeDocumentLoadWait.bind(this), 50);
  },

  // Saves original HTML to be displayed inside other iframes. Removes elements with 'classesToRemove' classes.
  saveOriginalHTML: function() {
    // Document element != document.
    var documentElementClone = document.documentElement.cloneNode(true),
        parser = new DOMParser();

    // Makes sure originalHTML is only set once.
    if(this.HTMLCode != null) {
      return;
    }

    // - If user passed in HTML code, use that code.
    // - If none of the above are passed, use the current page's head and body.
    // XXX: Issue with this approach: The DOM gets parsed twice. Here and when the iframe code is added.
    if(this.userHTML != null) {
      this.originalDoc = parser.parseFromString(this.userHTML, "text/html");
    } else {
      // Use the HTML code of the current page.
      this.originalDoc = parser.parseFromString(documentElementClone.outerHTML, "text/html");
    }

    // TODO: Pass in your (simple) custom HTML site, and add a class to remove. SEE IF IT WORKS BRAH.
    for(var i = 0; i < this.classesToRemove.length; i++) {
      elementsToRemove = this.originalDoc.documentElement.getElementsByClassName(this.classesToRemove[i]);
      while(elementsToRemove.length != 0) {
        elementsToRemove[0].parentNode.removeChild(elementsToRemove[0]);
      }
    }

    this.HTMLCode = this.originalDoc.documentElement.outerHTML;
    //console.log(Inception.prototype.originalHTML)
  },

  // An iframe document has been loaded. If all the iframes are done loading, return 'true'.
  iframeDocumentLoaded: function () {
    var mostRecentIframe = this.iframes[this.iframes.length - 1];
    // overflow = "auto" enables scrolling inside the iframes. Default is "hidden".
    // position = "absolute" makes the <html> contents fit inside the iframe element. Why?
    //mostRecentIframe.contentDocument.documentElement.style.position = "absolute";
    mostRecentIframe.contentDocument.documentElement.style.position = "relative";
    mostRecentIframe.contentDocument.documentElement.style.overflow = this.HTMLOverflow;
    mostRecentIframe.loaded = true;

    return this.iframes.length >= this.levels ? true : false; 
  },

  // Wait until iframe's document is ready to insert a new iframe.
  iframeDocumentLoadWait: function() {
    // The last document in the docs array is the document where we want to add and iframe.
    var currentDoc = this.iframes[this.iframes.length - 1].contentDocument;

    if(currentDoc.readyState == "complete") {
      //console.log("Iframe number", this.iframes.length - 1, "has finished loading.")
      clearInterval(this.documentLoadIntervalId);
      allIframesLoaded = this.iframeDocumentLoaded();
      if(allIframesLoaded) {
        this.theEnd();
        return;
      }

      this.addIframe(currentDoc, null);
      //setTimeout(this.addIframe.bind(this, currentDoc, null), 4000);  
    }
  },


  resizeAndScaleStuff: function() {
    var scaleRatio = 1;

    if(this.matrix3d != null) {
      this.set3DScale(null);
    }

    for(var i = 0; i < this.iframes.length; i++) {
      //console.log("BCR width:", this.iframes[i].contentDocument.documentElement.getBoundingClientRect().width)
      //console.log("BCR height:", this.iframes[i].contentDocument.documentElement.getBoundingClientRect().height)

      // set3DScale - Scales the iframe according to the wrap
      if(this.matrix3d != null) {
        this.set3DScale(this.iframes[i]);
      }

      // scaleIframe - scales the iframe according to the matching element.
      scaleRatio = this.scaleIframe(this.iframes[i]);
      
      //console.log("BCR width AFTER SCALING:", this.iframes[i].contentDocument.documentElement.getBoundingClientRect().width)
      //console.log("BCR height AFTER SCALING:", this.iframes[i].contentDocument.documentElement.getBoundingClientRect().height)
    }
  },

  // Final tidy up: 
  // - Add an empty iframe container to the last iframe;
  // - Resize;
  // - Scroll;
  // - Align.
  // XXX: Resize needs to happen before scroll stuff: scroll stuff needs correct bounding rect dimensions.
  tidyUpIframes: function() {
    this.setupiframeContainer(this.iframes[this.iframes.length - 1].contentDocument);
    this.resizeAndScaleStuff();

    // Left align iframes.
    if(this.leftAlignWith != null) {
      this.leftAlign(this.iframes);
    }  

    this.setupScrolling();  
  },

  addEventListeners: function() {
    // Setup resize listener.
    if(this.trackResize) {
      window.addEventListener("resize", this.resizeHandler.bind(this));
    }

    // Scrolling.
    if(this.trackScroll) {
      // XXX: Event listener is added ONCE to the TOP WINDOW. All the other iframe windows don't have event listeners.
      window.addEventListener("scroll", this.handleScroll.bind(this));
    }
  },


  // The end! All the iframes have been added.
  theEnd: function() {
    this.tidyUpIframes();
    this.addEventListeners();

    // User defined callback.
    if(this.onload != null) {
      this.onload();
    }
  },

  setupDocumentDimensions: function() {
    body = document.body,
    html = document.documentElement;

    documentHeight =  Math.max(body.scrollHeight, body.offsetHeight, 
                           html.clientHeight, html.scrollHeight, html.offsetHeight);

    documentWidth =  Math.max(body.scrollWidth, body.offsetWidth, 
                          html.clientWidth, html.scrollWidth, html.offsetWidth);

    return [documentWidth, documentHeight];
  },

  // Called everytime the user scrolls (if this.trackScroll == true).
  handleScroll: function() {
    docDimensions = this.setupDocumentDimensions()
    // 0 is width, 1 is height.
    maxYOffset = docDimensions[1] - window.innerHeight;
    scrollPercentage = window.pageYOffset / maxYOffset;
    
    //console.log("current doc height:", docDimensions[1])
    //console.log("offset:", window.pageYOffset, "Scroll %:", scrollPercentage);

    for(var i = 0; i < this.iframes.length; i++) {
      if(!this.iframes[i].trackScroll) {
        continue;
      }

      if(this.iframes[i].reverseScroll) {
        scrollAmount = this.iframes[i].maxScrollTop * (1 - scrollPercentage);
      } else {
        scrollAmount = this.iframes[i].maxScrollTop * scrollPercentage;
      }

      this.iframes[i].contentWindow.scrollTo(0, scrollAmount + this.scrollOffset);
    }
  }, 

  // 3D scaling for the matrix3d cases.
  // If iframe == null, then this function was called from the top window.
  set3DScale: function(iframe) {
    scaleRatio = 1;
    // Get the document object of the iframe's parent window.
    doc = iframe == null ? document : iframe.contentDocument;
    imageParent = doc.getElementById(this.imageId).parentElement;
    // TODO: You are doing 2 transforms here. Find a way to make it just 1.
    imageParent.style.transform = '';
    imageParent.style.WebkitTransform = '';

    wrap = doc.getElementById(this.wrapId);
    image = doc.getElementById(this.imageId);
    val = wrap.getBoundingClientRect().width / image.getBoundingClientRect().width;
    imageParent = doc.getElementById(this.imageId).parentElement;

    //console.log("wrap width:", wrap.getBoundingClientRect().width , "imageWidth:", image.getBoundingClientRect().width, "val:", val)

    imageParent.style.transformOrigin = "0 0";
    imageParent.style.transform = 'scale3d(' + val + ', ' + val + ', 1)';
    imageParent.style.WebkitTransform = 'scale3d(' + val + ', ' + val + ', 1)';

    // scale3d DOES NOT auto adjust the wrap's height. To fix this, you need to set the wrap's height manually.
    // Also, when the iframe's HTML is scaled and you set the wrap's height...
    // ... the wrap's real height (or bounding rect height) will be set to 'height' * scaleRatio.
    // To counteract this effect, simply divide the height by the scaleRatio.
    if(iframe != null) {
      if(iframe.scaleRatio != null) {
        scaleRatio = iframe.scaleRatio;
      }
    }

    wrap.style.height = imageParent.getBoundingClientRect().height/scaleRatio + "px";

    return val;
  },

  // Called when the user resizes the top window.
  resizeHandler: function() {
    this.resizeAndScaleStuff();

    for(var i = 0; i < this.iframes.length; i++) {
      if(this.iframes[i].leftAlignWith) {
        this.leftAlign(this.iframes[i]);
      }
    }

    // Re-set scrolling stuff.
    this.setupScrolling();
  },


  // Assumes all the iframes have been added.
  setupScrolling: function() {
    for(var i = 0; i < this.iframes.length; i++) {
      // !!! DIRTYHACK !!! Use body.scrollTop = 99999 to get the max value for scrollTop.
      currentScrollTop = this.iframes[i].contentDocument.body.scrollTop;
      // Set the scrollTop to the max value. After calling handleScroll(), things will go back to normal.
      this.iframes[i].contentDocument.body.scrollTop = 99999;
      this.iframes[i].maxScrollTop = this.iframes[i].contentDocument.body.scrollTop;
    }

    // 1st call to handleScroll() makes sure the iframe windows are scrolled in the same initial position as the top window.
    this.handleScroll();
  },

  // Horizontally center iframes.
  leftAlign: function(iframes) {
    if(iframes.constructor != Array) {
      iframes = [iframes];
    }

    // XXX: horizontal centering doesn't account for borders (I think boundingRect.left excludes borders)
    // What it does: widthDiff = iframe container width - centering element width.
    // AND THEN: Divide by 2 (so it's centered). Finally, remove any left offsets it may already have.
    for(var i = 0; i < iframes.length; i++) {
      if(iframes[i].leftAlignWith != null) {
        iframes[i].contentDocument.documentElement.style.left = "";

        elId = iframes[i].leftAlignWith;
        boundingRect = iframes[i].contentDocument.getElementById(elId).getBoundingClientRect();
        // Can iframes[i].contentDocument left CSS value be different from boundingRect.left?
        // - YES! Left is in relation to the parent, but boundingClientRect().left is in relation to the window (I think).
        //console.log("iframes[i].left:", iframes[i].left, "boundingRect.left:", boundingRect.left)
        left = boundingRect.left;

        //width = iframes[i].contentDocument.getElementById(elId).getBoundingClientRect().width;
        width = iframes[i].contentDocument.getElementById(elId).clientWidth * iframes[i].scaleRatio;
        width = boundingRect.width;
        widthDiff = iframes[i].parentElement.clientWidth - width;

        leftOffset = (widthDiff)/2 - left;

        iframes[i].left = leftOffset;
        iframes[i].contentDocument.documentElement.style.left = leftOffset - 1 + "px";
        //console.log("level:", iframes[i].level, "containerWidth:", iframes[i].contentWindow.innerWidth,"width:" , width, "left:", left, "offset:", leftOffset)
      } // if() {...}
    } // for() {...}
  } // leftAlign: function() {...}
} // Inception.prototype = {...}
