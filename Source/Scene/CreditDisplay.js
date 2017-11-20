define([
    '../Core/Check',
    '../Core/Credit',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/destroyObject',
    '../Core/DeveloperError'
], function(
    Check,
    Credit,
    defaultValue,
    defined,
    destroyObject,
    DeveloperError) {
    'use strict';

    var lightboxHeight = 300;

    function makeTextCredit(credit, element) {
        if (!defined(credit.element)) {
            var text = credit.text;
            var link = credit.link;
            if (credit.hasLink()) {
                var a = document.createElement('a');
                a.textContent = text;
                a.href = link;
                a.target = '_blank';
                element.appendChild(a);
            } else {
                element.textContent = text;
            }
            element.className = 'cesium-credit-text';
            credit.element = element;
            return element;
        }
        // return credit.element;
    }

    function makeImageCredit(credit, element) {
        if (!defined(credit.element)) {
            var text = credit.text;
            var link = credit.link;
            var content = document.createElement('img');
            content.src = credit.imageUrl;
            content.style['vertical-align'] = 'bottom';
            if (defined(text)) {
                content.alt = text;
                content.title = text;
            }

            if (credit.hasLink()) {
                var a = document.createElement('a');
                a.appendChild(content);
                a.href = link;
                a.target = '_blank';
                element.appendChild(a);
            } else {
                element.appendChild(content);
            }
            element.className = 'cesium-credit-image';
            credit.element = element;
        }
        return credit.element;
    }

    function contains(credits, credit) {
        var len = credits.length;
        for (var i = 0; i < len; i++) {
            var existingCredit = credits[i];
            if (Credit.equals(existingCredit, credit)) {
                return true;
            }
        }
        return false;
    }

    function displayTextCredits(creditDisplay, textCredits) {
        var i;
        var index;
        var credit;
        var displayedTextCredits = creditDisplay._displayedCredits.textCredits;
        var container = creditDisplay._textContainer;
        for (i = 0; i < textCredits.length; i++) {
            credit = textCredits[i];
            if (defined(credit)) {
                index = displayedTextCredits.indexOf(credit);
                if (index === -1) {
                    var element = makeTextCredit(credit, document.createElement('span'));
                    if (defined(element)) {
                        if (container.hasChildNodes()) {
                            var del = document.createElement('span');
                            del.textContent = creditDisplay._delimiter;
                            del.className = 'cesium-credit-delimiter';
                            container.appendChild(del);
                        }
                        container.appendChild(element);
                    }
                } else {
                    displayedTextCredits.splice(index, 1);
                }
            }
        }
    }

    function displayImageCredits(creditDisplay, imageCredits) {
        var i;
        var index;
        var credit;
        var displayedImageCredits = creditDisplay._displayedCredits.imageCredits;
        var container = creditDisplay._imageContainer;
        for (i = 0; i < imageCredits.length; i++) {
            credit = imageCredits[i];
            if (defined(credit)) {
                index = displayedImageCredits.indexOf(credit);
                if (index === -1) {
                    var element = makeImageCredit(credit, document.createElement('span'));
                    container.appendChild(element);
                } else {
                    displayedImageCredits.splice(index, 1);
                }
            }
        }
    }

    function displayLightboxCredits(creditDisplay, lighboxCredits) {
        var i;
        var index;
        var credit;
        var displayedCredits = creditDisplay._displayedCredits.lightboxCredits;
        var container = creditDisplay._imageContainer;
        for (i = 0; i < lighboxCredits.length; i++) {
            credit = lighboxCredits[i];
            if (defined(credit)) {
                index = displayedCredits.indexOf(credit);
                if (index === -1) {
                    var element;
                    if (credit.hasImage()) {
                        element = makeImageCredit(credit, document.createElement('li'));
                    } else {
                        element = makeTextCredit(credit, document.createElement('li'));
                    }
                    container.appendChild(element);
                } else {
                    displayedCredits.splice(index, 1);
                }
            }
        }
    }

    function removeCreditDomElement(credit) {
        var element = credit.element;
        if (defined(element)) {
            var container = element.parentNode;
            if (!credit.hasImage() && !credit.showInPopup) {
                var delimiter = element.previousSibling;
                if (delimiter === null) {
                    delimiter = element.nextSibling;
                }
                if (delimiter !== null) {
                    container.removeChild(delimiter);
                }
            }
            container.removeChild(element);
        }
    }

    function removeUnusedCredits(creditDisplay) {
        var i;
        var credit;
        var displayedTextCredits = creditDisplay._displayedCredits.textCredits;
        for (i = 0; i < displayedTextCredits.length; i++) {
            credit = displayedTextCredits[i];
            if (defined(credit)) {
                removeCreditDomElement(credit);
            }
        }
        var displayedImageCredits = creditDisplay._displayedCredits.imageCredits;
        for (i = 0; i < displayedImageCredits.length; i++) {
            credit = displayedImageCredits[i];
            if (defined(credit)) {
                removeCreditDomElement(credit);
            }
        }
        var displayedLightboxCredits = creditDisplay._displayedCredits.lightboxCredits;
        for (i = 0; i < displayedLightboxCredits.length; i++) {
            credit = displayedLightboxCredits[i];
            if (defined(credit)) {
                removeCreditDomElement(credit);
            }
        }
    }

    /**
     * The credit display is responsible for displaying credits on screen.
     *
     * @param {HTMLElement} container The HTML element where credits will be displayed
     * @param {HTMLElement} viewport The HTML element that will contain the credits popup
     * @param {String} [delimiter= ' • '] The string to separate text credits
     *
     * @alias CreditDisplay
     * @constructor
     *
     * @example
     * var creditDisplay = new Cesium.CreditDisplay(creditContainer);
     */
    function CreditDisplay(container, viewport, delimiter) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('container', container);
        Check.defined('viewport', viewport);
        //>>includeEnd('debug');
        var that = this;

        var lightbox = document.createElement('div');
        lightbox.className = 'cesium-credit-lightbox';
        lightbox.style.display = 'none';
        lightbox.style.zIndex = '5';
        lightbox.style.position = 'absolute';
        lightbox.style.top = 0;
        lightbox.style.left = 0;
        lightbox.style.width = '100%';
        lightbox.style.height = '100%';
        lightbox.style.backgroundColor = 'rgba(80, 80, 80, 0.8)';
        viewport.appendChild(lightbox);

        var viewportHeight = viewport.clientHeight;
        var lightboxCredits = document.createElement('div');
        lightboxCredits.style.backgroundColor = '#303336';
        lightboxCredits.style.color = '#edffff';
        lightboxCredits.style.border = '1px solid #444';
        lightboxCredits.style.borderRadius = '5px';
        lightboxCredits.style.padding = '12px 20px';
        lightboxCredits.style.position = 'relative';
        lightboxCredits.style.margin = 'auto';
        lightboxCredits.style.marginTop = Math.floor((viewportHeight - lightboxHeight) * 0.5) + 'px';
        lightboxCredits.style.width = '500px';
        lightboxCredits.style.height = lightboxHeight + 'px';
        lightbox.appendChild(lightboxCredits);
        lightbox.onclick = function(event) {
            if (event.target === lightboxCredits) {
                return;
            }
            that.hideLightbox();
        };

        var closeButton = document.createElement('a');
        closeButton.onclick = this.hideLightbox.bind(this);
        closeButton.textContent = '×';
        closeButton.style.fontSize = '18pt';
        closeButton.style.cursor = 'pointer';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '0';
        closeButton.style.right = '6px';
        closeButton.onmouseover = function() {
            this.style.color = '#48b';
        };
        closeButton.onmouseout = function() {
            this.style.color = '#edffff';
        };
        lightboxCredits.appendChild(closeButton);

        var creditList = document.createElement('ul');
        lightboxCredits.appendChild(creditList);

        var imageContainer = document.createElement('span');
        imageContainer.className = 'cesium-credit-imageContainer';
        container.appendChild(imageContainer);

        var textContainer = document.createElement('span');
        textContainer.className = 'cesium-credit-textContainer';
        container.appendChild(textContainer);

        var expandLink = document.createElement('a');
        expandLink.onclick = this.showLightbox.bind(this);
        expandLink.textContent = 'Terrain and imagery data from multiple sources';
        expandLink.style.cursor = 'pointer';
        expandLink.style.textDecoration = 'underline';
        expandLink.onmouseover = function() {
            this.style.color = '#48b';
        };
        expandLink.onmouseout = function() {
            this.style.color = '#fff';
        };
        container.appendChild(expandLink);

        this._delimiter = defaultValue(delimiter, ' • ');
        this._textContainer = textContainer;
        this._imageContainer = imageContainer;
        this._lastViewportHeight = viewportHeight;
        this._lightboxCredits = lightboxCredits;
        this._creditList = creditList;
        this._lightbox = lightbox;
        this._expanded = false;
        this._defaultImageCredits = [];
        this._defaultTextCredits = [];

        this._displayedCredits = {
            imageCredits : [],
            textCredits : [],
            lightboxCredits: []
        };
        this._currentFrameCredits = {
            imageCredits : [],
            textCredits : [],
            lightboxCredits: []
        };

        this.viewport = viewport;

        /**
         * The HTML element where credits will be displayed.
         * @type {HTMLElement}
         */
        this.container = container;
    }

    /**
     * Adds a credit to the list of current credits to be displayed in the credit container
     *
     * @param {Credit} credit The credit to display
     */
    CreditDisplay.prototype.addCredit = function(credit) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('credit', credit);
        //>>includeEnd('debug');

        if (credit.showInPopup) {
            this._currentFrameCredits.lightboxCredits[credit.id] = credit;
        } else if (credit.hasImage()) {
            this._currentFrameCredits.imageCredits[credit.id] = credit;
        } else {
            this._currentFrameCredits.textCredits[credit.id] = credit;
        }
    };

    /**
     * Adds credits that will persist until they are removed
     *
     * @param {Credit} credit The credit to added to defaults
     */
    CreditDisplay.prototype.addDefaultCredit = function(credit) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('credit', credit);
        if (credit.showInPopup) {
            throw new DeveloperError('showInPopup must be false for default credits');
        }
        //>>includeEnd('debug');

        if (credit.hasImage()) {
            var imageCredits = this._defaultImageCredits;
            if (!contains(imageCredits, credit)) {
                imageCredits.push(credit);
            }
        } else {
            var textCredits = this._defaultTextCredits;
            if (!contains(textCredits, credit)) {
                textCredits.push(credit);
            }
        }
    };

    /**
     * Removes a default credit
     *
     * @param {Credit} credit The credit to be removed from defaults
     */
    CreditDisplay.prototype.removeDefaultCredit = function(credit) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('credit', credit);
        //>>includeEnd('debug');

        var index;
        if (credit.hasImage()) {
            index = this._defaultImageCredits.indexOf(credit);
            if (index !== -1) {
                this._defaultImageCredits.splice(index, 1);
            }
        } else {
            index = this._defaultTextCredits.indexOf(credit);
            if (index !== -1) {
                this._defaultTextCredits.splice(index, 1);
            }
        }
    };

    CreditDisplay.prototype.showLightbox = function() {
        this._lightbox.style.display = 'block';
        this._expanded = true;
    };

    CreditDisplay.prototype.hideLightbox = function() {
        this._lightbox.style.display = 'none';
        this._expanded = false;
    };

    /**
     * Resets the credit display to a beginning of frame state, clearing out current credits.
     */
    CreditDisplay.prototype.beginFrame = function() {
        this._currentFrameCredits.imageCredits.length = 0;
        this._currentFrameCredits.textCredits.length = 0;
    };

    /**
     * Sets the credit display to the end of frame state, displaying current credits in the credit container
     */
    CreditDisplay.prototype.endFrame = function() {
        displayImageCredits(this, this._defaultImageCredits);
        displayTextCredits(this, this._defaultTextCredits);

        displayImageCredits(this, this._currentFrameCredits.imageCredits);
        displayTextCredits(this, this._currentFrameCredits.textCredits);

        var displayedTextCredits = this._defaultTextCredits.concat(this._currentFrameCredits.textCredits);
        var displayedImageCredits = this._defaultImageCredits.concat(this._currentFrameCredits.imageCredits);
        var displayedLightboxCredits = [];

        if (this._expanded) {
            var height = this.viewport.clientHeight;
            if (height !== this._lastViewportHeight) {
                this._lightboxCredits.style.marginTop = Math.floor((height - lightboxHeight) * 0.5) + 'px';
                this._lastViewportHeight = height;
            }

            displayLightboxCredits(this, this._currentFrameCredits.lightboxCredits);

            displayedLightboxCredits = this._currentFrameCredits.lightboxCredits;
            displayedTextCredits = displayedTextCredits.concat(this._currentFrameCredits.textCredits);
            displayedImageCredits = displayedImageCredits.concat(this._currentFrameCredits.imageCredits);
        }

        removeUnusedCredits(this);

        this._displayedCredits.textCredits = displayedTextCredits;
        this._displayedCredits.imageCredits = displayedImageCredits;
        this._displayedCredits.lightboxCredits = displayedLightboxCredits;
    };

    /**
     * Destroys the resources held by this object.  Destroying an object allows for deterministic
     * release of resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    CreditDisplay.prototype.destroy = function() {
        this.container.removeChild(this._textContainer);
        this.container.removeChild(this._imageContainer);
        document.body.removeChild(this._lightbox);

        return destroyObject(this);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     */
    CreditDisplay.prototype.isDestroyed = function() {
        return false;
    };

    return CreditDisplay;
});
