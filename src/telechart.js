/*jslint browser: true*/
/*global window*/
var TeleChart = function (ctxId) {
    "use strict";

    /**
     * External functions & variables (maybe need polyfills)
     */
    var oMath = Math,
        fParseInt = window.parseInt,
        fMathAbs = oMath.abs,
        fMathCeil = oMath.ceil,
        fMathFloor = oMath.floor,
        fMathRound = oMath.round,
        fMathLog = oMath.log,
        vDocument = document,
        vUndefined = undefined,
        vNull = null,
        vTrue = true,
        vFalse = false;

    /**
     * Constants
     * @type {Number|Array|String}
     * @const
     */
    var CONST_NAVIGATOR_HEIGHT_PERCENT = 12,
        CONST_NAVIGATOR_WIDTH_PERCENT = 25,
        CONST_DISPLAY_SCALE_FACTOR = 1.5,
        CONST_PADDING = 5,
        CONST_ANTI_BLUR_SHIFT = 0.5,
        CONST_PADDING_HALF = CONST_PADDING / 2,
        CONST_PADDING_2 = CONST_PADDING * 2,
        CONST_PADDING_3 = CONST_PADDING * 3,
        CONST_PADDING_4 = CONST_PADDING * 4,
        CONST_BTN_RADIUS = 20,
        CONST_BTN_RADIUS_2 = CONST_BTN_RADIUS * 2,
        CONST_HUMAN_SCALES = [2, 5, 10],
        CONST_MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        CONST_DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        CONST_CURSORS = ["inherit", "pointer", "col-resize"],
        CONST_TWO_PI = 2 * Math.PI,
        CONST_LOG_2E = Math.LOG2E,
        CONST_PIXEL = "px",
        CONST_BOLD_PREFIX = "bold ",
        CONST_WIDTH = "width",
        CONST_HEIGHT = "height",
        CONST_AXIS_X_LABEL_OPACITY_ANIMATION_KEY = getFunctionName(setAxisXLabelOpacity),
        CONST_SELECTION_FACTOR_Y_ANIMATION_KEY = getFunctionName(setSelectionFactorY),

        ENUM_NAVIGATOR_HOVER = 1,
        ENUM_START_SELECTION_HOVER = 2,
        ENUM_END_SELECTION_HOVER = 3,
        ENUM_ZOOM_HOVER = 4,
        ENUM_BUTTON_HOVER = 5,
        ENUM_SELECTION_HOVER = 6;

    /**
     * Global members
     * @type {Number|Array|String|HTMLCanvasElement|CanvasRenderingContext2D|Element|Object}
     */
    var container = vDocument.getElementById(ctxId),
        totalWidth = container.offsetWidth * CONST_DISPLAY_SCALE_FACTOR,
        navigatorHeight = fParseInt(totalWidth * CONST_NAVIGATOR_HEIGHT_PERCENT / 100),
        selectionHeight = totalWidth - navigatorHeight - navigatorHeight * 2,
        navigatorHeightHalf = navigatorHeight / 2,
        selectionBottom = selectionHeight + navigatorHeightHalf,
        navigatorTop = selectionHeight + navigatorHeight + CONST_PADDING_4,
        navigatorBottom = navigatorTop + navigatorHeight,
        totalHeight = navigatorBottom + CONST_PADDING * 10 + CONST_BTN_RADIUS * 4,
        needRedraw,
        mainCanvas,
        bufferNavigatorCanvas,
        frameContext,
        bufferNavigatorContext,
        xAxisDataRef,
        yAxisDataRefs = [],
        animations = {},

        minValueAxisY = 0, //todo config (if not assigned then auto scale)

        mouseX,
        mouseY,
        mouseOffsetX,
        mouseOffsetY,
        mouseHovered,
        mousePressed,
        mouseFrame = {},

        zoomStartSmooth,
        zoomEndSmooth,
        zoomStartHard,
        zoomEndHard,

        selectionStartIndexFloat,
        selectionEndIndexFloat,
        selectionStartIndexInt,
        selectionEndIndexInt,
        selectionCurrentIndexFloat,
        selectionFactorX,
        selectionFactorY,
        selectionMinY,
        selectionMaxY,
        selectionNeedUpdateFactorY,

        smartAxisXStart,
        smartAxisXRange,
        smartAxisXFrozen,
        smartAxisXRatio,
        smartAxisXFrozenStart,
        smartAxisXFrozenEnd,
        smartAxisXOpacity = 1,
        smartAxisYRange,
        smartAxisYRangeVal,
        smartAxisYOpacity = 1,

        navigatorFactorX,
        navigatorFactorY,
        navigatorMinY,
        navigatorPressed = 0,
        navigatorPressedSide,
        navigatorNeedUpdateBuffer,


        seriesMaxOpacity,

        legendDateText,
        legendWidth,
        legendHeight,
        legendTop,
        legendLeft,
        legendTextLeft = [],
        legendDateTop,
        legendTextOpacity = 1,
        legendBoxOpacity = 0,

        envSmallTextHeight,
        envNormalTextHeight,
        envColorGrad = [],
        envBgColorGrad = [],
        envRegularSmallFont,
        envBoldSmallFont,
        envBoldNormalFont,
        envRegularNormalFont,

        lastPerformance,
        frameDelay = 0,

        boundHighlight;

    /**
     * Initializes the environment
     */
    function initialize() {
        mainCanvas = createCanvas(totalWidth, totalHeight);
        frameContext = mainCanvas.getContext("2d");
        frameContext.lineJoin = "bevel";
        var _size = getBodyStyle("font-size"),
            _fontFamilyCombined = CONST_PIXEL + " " + getBodyStyle("font-family"),
            _mainCanvasStyle = mainCanvas.style,
            _baseFontSize = fParseInt(_size.replace(/\D/g, "")),
            _onMouseDown = function (e) {
                handleMouseClick(e, vTrue);
            },
            _onMouseUp = function (e) {
                handleMouseClick(e, vFalse);
            };

        bufferNavigatorCanvas = createCanvas(totalWidth, navigatorHeight);
        bufferNavigatorContext = bufferNavigatorCanvas.getContext("2d");
        bufferNavigatorContext.lineWidth = 2;
        envSmallTextHeight = fParseInt(_baseFontSize * 1.2);
        envNormalTextHeight = fParseInt(_baseFontSize * CONST_DISPLAY_SCALE_FACTOR);

        envRegularSmallFont = envSmallTextHeight + _fontFamilyCombined;
        envRegularNormalFont = envNormalTextHeight + _fontFamilyCombined;
        envBoldSmallFont = CONST_BOLD_PREFIX + envRegularSmallFont;
        envBoldNormalFont = CONST_BOLD_PREFIX + envRegularNormalFont;

        setFont(envRegularSmallFont);

        _mainCanvasStyle[CONST_WIDTH] = fParseInt(totalWidth / CONST_DISPLAY_SCALE_FACTOR) + CONST_PIXEL;
        _mainCanvasStyle[CONST_HEIGHT] = fParseInt(totalHeight / CONST_DISPLAY_SCALE_FACTOR) + CONST_PIXEL;

        container.appendChild(mainCanvas);

        mainCanvas.onmousemove = handleMouseMove;
        mainCanvas.ontouchmove = handleMouseMove;
        mainCanvas.onmouseout = handleMouseMove;
        mainCanvas.onmouseover = _onMouseUp;

        mainCanvas.onmousedown = _onMouseDown;
        mainCanvas.onmouseup = _onMouseUp;

        mainCanvas.ontouchstart = _onMouseDown;
        mainCanvas.ontouchend = _onMouseUp;

        addEventListener("scroll", calcMouseOffset);
        addEventListener("resize", calcMouseOffset);
        addEventListener("mouseup", _onMouseUp);
        calcMouseOffset();
        invalidate();
    }

    /**
     * Sets up a handler that will be called whenever the event is delivered to the target
     * @param name {String} name of event
     * @param handler {Function} callback
     */
    function addEventListener(name, handler) {
        window.addEventListener(name, handler);
    }

    /**
     * Creates the canvas
     * @param width {Number} width of canvas
     * @param height {Number} height of canvas
     * @returns {Element}
     */
    function createCanvas(width, height) {
        var _canvas = vDocument.createElement("canvas");
        _canvas[CONST_WIDTH] = width;
        _canvas[CONST_HEIGHT] = height;
        return _canvas;
    }

    //======== setters for animation ========
    function setSelectionFactorY(val) {
        selectionFactorY = val;
    }

    function setNavigationFactorY(val) {
        navigatorFactorY = val;
        navigatorNeedUpdateBuffer = vTrue;
    }

    function setNavigatorPressed(val) {
        navigatorPressed = val;
    }

    function setZoomStart(val) {
        zoomStartSmooth = val;
        selectionNeedUpdateFactorY = vTrue;
    }

    function setZoomEnd(val) {
        zoomEndSmooth = val;
        selectionNeedUpdateFactorY = vTrue;
    }

    function setSelectionCurrentIndexFloat(val) {
        selectionCurrentIndexFloat = val;
    }

    function setLegendOpacity(val) {
        legendBoxOpacity = val;
    }

    function setLegendWidth(val) {
        legendWidth = val;
    }

    function setSeriesOpacity(val, series) {
        series.sO = val;
        navigatorNeedUpdateBuffer = vTrue;
    }

    function setButtonPulse(val, series) {
        series.bPulse = val;
    }

    function setAxisYLabelOpacity(val) {
        smartAxisYOpacity = val;
    }

    function setSmartAxisYRange(val) {
        smartAxisYRange = val;
    }

    function setAxisXLabelOpacity(val) {
        smartAxisXOpacity = val;
    }

    function setSmartAxisRatio(val) {
        smartAxisXRatio = val;
    }

    function setBoundHighlight(val) {
        boundHighlight = val;
    }

    /**
     * Clears the chart
     */
    function clear() {
        xAxisDataRef = vNull;
        yAxisDataRefs = [];
        invalidateInner();
    }

    /**
     * Destroy chart
     */
    function destroy() {
        mainCanvas.parentNode.remove(mainCanvas);
    }

    /**
     * Invalidates the canvas
     */
    function invalidateInner() {
        needRedraw = vTrue;
    }

    /**
     * Invalidates the canvas & prepare environment colors
     */
    function invalidate() {
        var _envColor = getBodyStyle("color"),
            _envBgColor = getBodyStyle("background-color"),
            _opacity,
            _i;
        for (_i = 0; _i <= 100; _i++) {
            _opacity = _i / 100;
            envColorGrad[_i] = getRGBA(_envColor, _opacity);
            envBgColorGrad[_i] = getRGBA(_envBgColor, _opacity);
        }
        invalidateInner();
    }

    /**
     * Draws a json data
     * @param data {JSON} chart data
     */
    function draw(data) {
        if (data) {
            prepareCaches(data);
            invalidateInner();
        }
    }

    /**
     * Gets a style property from document body
     * @param propertyName {String} property name
     * @returns {String} property value
     */
    function getBodyStyle(propertyName) {
        var _el = vDocument.body,
            _currentStyle = _el.currentStyle;
        return _currentStyle ?
            _currentStyle[propertyName] :
            vDocument.defaultView.getComputedStyle(_el, vNull)[propertyName];
    }


    /**
     * Formats a date of UNIX timestamp
     * @param timestamp {Number} UNIX timestamp
     * @param withDay {Boolean=} with day of week
     * @returns {string} Formatted date
     */
    function formatDate(timestamp, withDay) {  //Jan 29
        var _date = new Date(timestamp);
        return (withDay ? CONST_DAY_NAMES_SHORT[_date.getDay()] + ", " : "" ) +
            CONST_MONTH_NAMES_SHORT[_date.getMonth()] + " " + _date.getDate();
    }

    function getMax(val, prev) {
        return prev === vUndefined || val > prev ? val : prev;
    }

    function getMin(val, prev) {
        return prev === vUndefined || val < prev ? val : prev;
    }

    /**
     * Sets the canvas cursor
     * @param cursorIndex {Number} cursor index of CONST_CURSORS
     */
    function setCursor(cursorIndex) {
        mainCanvas.style.cursor = CONST_CURSORS[cursorIndex];
    }

    /**
     * Sets the mouseHovered variable & fire events
     * @param proposed {Number} type of hovered element
     * @param force {Boolean=} force fire events
     */
    function updateHoveredInfo(proposed, force) {
        if (mouseHovered !== proposed || force) {
            mouseHovered = proposed;

            if (mouseHovered !== ENUM_SELECTION_HOVER) {
                animate(legendBoxOpacity, setLegendOpacity, 0);
            } else if (mouseHovered !== ENUM_BUTTON_HOVER) {
                //reset all hovered once
                for (var _i in yAxisDataRefs) {
                    yAxisDataRefs[_i].bO = vFalse;
                }
            }

            //Set cursor
            if (mouseHovered === ENUM_SELECTION_HOVER) { //most likely
                animate(legendBoxOpacity, setLegendOpacity, 1);
                setCursor(0);
            } else if (mouseHovered === ENUM_ZOOM_HOVER ||
                mouseHovered === ENUM_BUTTON_HOVER) {
                setCursor(1);
            } else if (mouseHovered === ENUM_START_SELECTION_HOVER ||
                mouseHovered === ENUM_END_SELECTION_HOVER) {
                setCursor(2);
            } else {
                setCursor(0);
            }
        }
    }

    /**
     * @param force {Boolean=} force calculate hovered if region not changed
     */
    function calcHoveredElement(force) {
        var _result = vNull,
            _i;

        if (!navigatorFactorX) {
            return;
        }

        if (mouseY < navigatorTop && selectionFactorX) { //Selection hovered
            var _proposed = fMathRound(mouseX / selectionFactorX + selectionStartIndexFloat);
            calcLegendPosition(_proposed);
            animate(selectionCurrentIndexFloat, setSelectionCurrentIndexFloat, _proposed);
            mouseFrame.tS = zoomStartSmooth;
            mouseFrame.tE = zoomEndSmooth;
            mouseFrame.tF = mouseX;
            _result = ENUM_SELECTION_HOVER;
            invalidateInner();
        } else if (mouseY > navigatorTop && mouseY < navigatorBottom) { //Navigator hovered
            _result = ENUM_NAVIGATOR_HOVER;
            var _startZoom = ( zoomStartSmooth) * navigatorFactorX,
                _endZoom = ( zoomEndSmooth) * navigatorFactorX,
                _startZShift = _startZoom - mouseX,
                _endZShift = _endZoom - mouseX;

            if (fMathAbs(_startZShift + CONST_PADDING_2) < CONST_PADDING_4) { //Navigator start edge hovered
                _result = ENUM_START_SELECTION_HOVER;
            } else if (fMathAbs(_endZShift - CONST_PADDING_2) < CONST_PADDING_4) { //Navigator end edge hovered
                _result = ENUM_END_SELECTION_HOVER;
            } else if (mouseX > _startZoom && mouseX < _endZoom) { //Navigator center hovered
                mouseFrame.nS = _startZShift / navigatorFactorX;
                mouseFrame.nE = _endZShift / navigatorFactorX;
                _result = ENUM_ZOOM_HOVER;
            }
        } else if (mouseY > navigatorBottom) {
            for (_i in yAxisDataRefs) {    //Chart button hovered
                var _axis = yAxisDataRefs[_i];
                _axis.bO = vFalse;
                if (mouseX > _axis.bX && mouseX < _axis.bX + _axis.bW &&
                    mouseY > _axis.bY && mouseY < _axis.bY + _axis.bH) {
                    _axis.bO = vTrue;
                    _result = ENUM_BUTTON_HOVER;
                }
            }
        }
        updateHoveredInfo(_result, force);
    }

    /**
     * Stops propagation DOM events
     * @param e {Object} event
     */
    function stopPropagation(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Setter for start navigator edge
     * @param val {Number} value
     */
    function associateZoomStart(val) {
        zoomStartHard = val * navigatorFactorX;
        animate(zoomStartSmooth, setZoomStart, val);
    }

    /**
     * Setter for end navigator edge
     * @param val {Number} value
     */
    function associateZoomEnd(val) {
        zoomEndHard = val * navigatorFactorX;
        animate(zoomEndSmooth, setZoomEnd, val);
    }

    /**
     * Move navigator frame
     * @param shift
     * @param maxX
     * @param start
     * @param end
     */
    function moveNavigatorFrame(shift, maxX, start, end) {
        var _start = shift + start,
            _end = shift + end;
        boundHighlight = 0;
        if (_start < 0) {
            boundHighlight = getMax(_start * 3 / (_end - _start), -1);
            _start = 0;
            _end = end - start;
        }
        if (_end > maxX) {
            boundHighlight = getMin((_end - maxX) * 3 / (_end - _start), 1);
            _end = maxX;
            _start = maxX - end + start;
        }
        associateZoomStart(_start);
        associateZoomEnd(_end);
    }

    /**
     * Browse chart
     */
    function navigateChart() {
        if (navigatorFactorX) {
            var _proposedX = mouseX / navigatorFactorX,
                _maxProposedX = xAxisDataRef.l - 2,
                _threshold = 30 / navigatorFactorX;

            if (_proposedX < 0) {
                _proposedX = 0;
            } else if (_proposedX > _maxProposedX) {
                _proposedX = _maxProposedX;
            }

            if (mouseHovered === ENUM_ZOOM_HOVER) {
                moveNavigatorFrame(_proposedX, _maxProposedX, mouseFrame.nS, mouseFrame.nE);
            } else if (mouseHovered === ENUM_START_SELECTION_HOVER) {
                if (zoomEndSmooth - _proposedX > _threshold) {
                    associateZoomStart(_proposedX);
                }
            } else if (mouseHovered === ENUM_END_SELECTION_HOVER) {
                if (_proposedX - zoomStartSmooth > _threshold) {
                    associateZoomEnd(_proposedX);
                }
            }
        }
    }

    /**
     * Moves a hovered element
     */
    function moveHoveredElement() {
        if (xAxisDataRef) {
            if (mouseHovered === ENUM_SELECTION_HOVER) {
                var _interval = ( mouseFrame.tF - mouseX ) / selectionFactorX,
                    _maxProposedX = xAxisDataRef.l - 2;
                moveNavigatorFrame(_interval, _maxProposedX, mouseFrame.tS, mouseFrame.tE);

            } else {
                navigateChart();
            }
        }
    }

    /**
     * Calculates the local mouse coordinates
     * @param e {Event} global coordinates container
     * @param calcOnly {Boolean} without move calculate only
     */
    function assignMousePos(e, calcOnly) {
        var _clientX = e.clientX,
            _clientY = e.clientY;
        if (_clientX && _clientY) {
            mouseX = fParseInt((_clientX - mouseOffsetX) * CONST_DISPLAY_SCALE_FACTOR);
            mouseY = fParseInt((_clientY - mouseOffsetY) * CONST_DISPLAY_SCALE_FACTOR);
            if (mouseY >= -CONST_PADDING && mouseX >= -CONST_PADDING &&
                mouseX <= totalWidth + CONST_PADDING && mouseY <= totalHeight + CONST_PADDING) {
                mousePressed && !calcOnly ? moveHoveredElement() : calcHoveredElement();
                invalidateInner();
                return vTrue;
            }
        }
        updateHoveredInfo(vNull);
        return vFalse;
    }

    /**
     * Handles the mouse move
     * @param e {Object}
     * @param withoutPress {Boolean=}
     */
    function handleMouseMove(e, withoutPress) {
        var _touches = e.touches;
        return (_touches && getLength(_touches)) ?
            assignMousePos(_touches[0], withoutPress) :
            assignMousePos(e, withoutPress);
    }

    /**
     * Handles the mouse click
     * @param e {Object} event
     * @param pressed {Boolean} left button pressed
     */
    function handleMouseClick(e, pressed) {
        if (!handleMouseMove(e, vTrue)) {
            pressed = vFalse;
        }
        mousePressed = pressed;
        if (pressed) {
            animate(smartAxisXRatio, setSmartAxisRatio, 0, 1);
            smartAxisXFrozenStart = selectionStartIndexFloat;
            smartAxisXFrozenEnd = selectionEndIndexFloat;
            smartAxisXFrozen = vTrue;
            calcHoveredElement(vTrue);
            if (mouseHovered === ENUM_BUTTON_HOVER) {
                stopPropagation(e);
                mousePressed = vFalse;
                for (var _i in yAxisDataRefs) {
                    var _axis = yAxisDataRefs[_i];
                    if (_axis.bO) {
                        _axis.bOn = !_axis.bOn;
                        animate(_axis.sO, setSeriesOpacity, _axis.bOn ? 1 : 0, vUndefined, _axis);
                        animate(0, setButtonPulse, 1, 30, _axis);
                        calcNavigatorFactors();
                        calcSelectionFactors();
                    }
                }
            } else if (mouseHovered === ENUM_ZOOM_HOVER ||
                mouseHovered === ENUM_START_SELECTION_HOVER ||
                mouseHovered === ENUM_END_SELECTION_HOVER) {
                stopPropagation(e);
                animate(navigatorPressed, setNavigatorPressed, 1, 15);
                navigatorPressedSide = mouseHovered;
            }
        } else {
            animate(navigatorPressed, setNavigatorPressed, 0, 15);
            animate(boundHighlight, setBoundHighlight, 0, 15);
            if (smartAxisXFrozen) {
                if (smartAxisXFrozenStart !== selectionStartIndexFloat ||
                    smartAxisXFrozenEnd !== selectionEndIndexFloat) {
                    animate(smartAxisXOpacity, setAxisXLabelOpacity, 0, 5);
                } else {
                    smartAxisXFrozen = vFalse;
                    animate(smartAxisXRatio, setSmartAxisRatio, 0, 1);
                }
            }
        }
        invalidateInner();
    }

    /**
     * Calculates the mouse offset
     */
    function calcMouseOffset() {
        var _bb = mainCanvas.getBoundingClientRect();
        mouseOffsetX = _bb.left;
        mouseOffsetY = _bb.top;
        invalidateInner();
    }

    /**
     * Gets rgba color from hex
     * @param color {String} color in HEX or rgb
     * @param opacity {Number} opacity
     * @returns {String} color in rgba
     */
    function getRGBA(color, opacity) {
        if (opacity < 1) {
            if (color.indexOf("#") !== -1) {
                var _normal = getLength(color) === 7,
                    _regExp = _normal ?
                    /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i :
                    /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
                    _result = _regExp.exec(color),
                    _r = fParseInt(_result[1], 16),
                    _g = fParseInt(_result[2], 16),
                    _b = fParseInt(_result[3], 16);
                if (!_normal) {  //short color notation support
                    _r = (_r << 4) + _r;
                    _g = (_g << 4) + _r;
                    _b = (_b << 4) + _r;
                }
                color = "rgb(" + _r + "," + _g + "," + _b + ")";
            }
            if (color.indexOf("a") === -1) {
                color = color.replace(")", ", " + opacity + ")").replace("rgb", "rgba");
            }

        }
        return color;
    }

    /**
     * Sets the current line width
     * @param width {Number=} width in pixels (default 1)
     */
    function setLineWidth(width) {
        frameContext.lineWidth = width || 1;
    }

    /**
     * Begins a path, or resets the current path
     */
    function beginPath() {
        frameContext.beginPath();
    }

    /**
     * Creates a path from the current point back to the starting point
     */
    function endPath() {
        frameContext.stroke();
    }

    /**
     * Creates a path from the current point back to the starting point
     */
    function closePath() {
        frameContext.closePath();
    }

    /**
     * Width of the specified text, in pixels
     * @param text {String} measured text
     * @returns {Number} width in pixels
     */
    function getTextWidth(text) {
        return frameContext.measureText(text)[CONST_WIDTH];
    }

    /**
     * Draws filled text on the canvas
     * @param text {String} text that will be written on the canvas
     * @param x {Number} x coordinate where to start painting the text
     * @param y {Number} y coordinate where to start painting the text
     */
    function fillText(text, x, y) {
        frameContext.fillText(text, x, y);
    }

    /**
     * Creates a line TO that point or moves FROM the last specified point
     * @param isMove {Boolean} move only
     * @param x {Number} x coordinate in pixels
     * @param y {Number} y coordinate in pixels
     */
    function moveOrLine(isMove, x, y) {
        isMove ? frameContext.moveTo(x, y) : frameContext.lineTo(x, y);
    }

    /**
     * Adds a point to the current path by using the specified control points that represent a quadratic Bézier curve
     * @param cpx {Number} The x-coordinate of the Bézier control point
     * @param cpy {Number} The y-coordinate of the Bézier control point
     * @param x {Number} The x-coordinate of the ending point
     * @param y {Number} The y-coordinate of the ending point
     */
    function quadraticCurveTo(cpx, cpy, x, y) {
        frameContext.quadraticCurveTo(cpx, cpy, x, y);
    }

    /**
     * Fills the current drawing (path)
     */
    function fill() {
        frameContext.fill();
    }

    /**
     * Creates an circle
     * @param x {Number} the x-coordinate of the center of the circle
     * @param y {Number} the y-coordinate of the center of the circle
     * @param radius {Number} the radius of the circle
     */
    function circle(x, y, radius) {
        frameContext.arc(x, y, radius, 0, CONST_TWO_PI);
    }

    /**
     * Draws a "filled" rectangle
     * @param x {Number} The x-coordinate of the upper-left corner of the rectangle
     * @param y {Number} The y-coordinate of the upper-left corner of the rectangle
     * @param w {Number} The width of the rectangle, in pixels
     * @param h {Number} The height of the rectangle, in pixels
     */
    function fillRect(x, y, w, h) {
        frameContext.fillRect(x, y, w, h);
    }

    /**
     * Draws a rounded balloon
     * @param x {Number} The x-coordinate of the upper-left corner of the rectangle
     * @param y {Number} The y-coordinate of the upper-left corner of the rectangle
     * @param width {Number} The width of the balloon
     * @param height {Number} The height of the balloon
     * @param highlighted {Boolean} balloon is highlighted
     * @param opacity {Number} opacity between 0 - 1
     */
    function drawBalloon(x, y, width, height, highlighted, opacity) {
        var _xWidth = x + width,
            _yHeight = y + height;

        beginPath();
        setStrokeStyle(envColorGrad[fParseInt((highlighted ? 40 : 20) * opacity)]);
        setFillStyle(envBgColorGrad[fParseInt(30 + 60 * opacity)]);
        setLineWidth();
        moveOrLine(vTrue, x + CONST_BTN_RADIUS, y);
        moveOrLine(vFalse, _xWidth - CONST_BTN_RADIUS, y);
        quadraticCurveTo(_xWidth, y, _xWidth, y + CONST_BTN_RADIUS);
        moveOrLine(vFalse, _xWidth, _yHeight - CONST_BTN_RADIUS);
        quadraticCurveTo(_xWidth, _yHeight, _xWidth - CONST_BTN_RADIUS, _yHeight);
        moveOrLine(vFalse, x + CONST_BTN_RADIUS, _yHeight);
        quadraticCurveTo(x, _yHeight, x, _yHeight - CONST_BTN_RADIUS);
        moveOrLine(vFalse, x, y + CONST_BTN_RADIUS);
        quadraticCurveTo(x, y, x + CONST_BTN_RADIUS, y);
        closePath();
        fill();
        endPath();
    }

    /**
     * Sets the color, gradient, or pattern used for strokes
     * @param strokeStyle {String} color
     */
    function setStrokeStyle(strokeStyle) {
        frameContext.strokeStyle = strokeStyle;
    }

    /**
     * Sets the color, gradient, or pattern used to fill the drawing
     * @param fillStyle {Object} color
     */
    function setFillStyle(fillStyle) {
        frameContext.fillStyle = fillStyle;
    }

    /**
     * Font of text
     * @param val
     */
    function setFont(val) {
        frameContext.font = val;
    }

    /**
     * Remaps the (0,0) position on the canvas
     * @param x {Number} the value to add to horizontal (x) coordinates
     * @param y {Number} the value to add to vertical (y) coordinates
     */
    function translate(x, y) {
        frameContext.translate(x, y);
    }

    /**
     * Draws the horizontal grid
     */
    function drawHorizontalGrid() {
        var _nextScaleLevel = selectionBottom,
            _yCoordinate;
        beginPath();
        setStrokeStyle(envColorGrad[10]);
        setLineWidth(2);
        while (_nextScaleLevel > navigatorHeightHalf) {
            _yCoordinate = fMathCeil(_nextScaleLevel) + CONST_ANTI_BLUR_SHIFT;
            moveOrLine(vTrue, 0, _yCoordinate);
            moveOrLine(vFalse, totalWidth, _yCoordinate);
            _nextScaleLevel = _nextScaleLevel + smartAxisYRange * selectionFactorY;
        }
        endPath();
    }

    /**
     * Draws the axis labels
     */
    function drawAxisLabels() {
        var _selectionAxis = selectionBottom,
            _color = envColorGrad[fParseInt(50 * seriesMaxOpacity * smartAxisXOpacity)],
            _bgColor = envBgColorGrad[fParseInt(70 * smartAxisYOpacity)],
            _needCalc = !smartAxisXStart || !smartAxisXFrozen,
            _i,
            _prevSmartAxisRange,
            _nextItem,
            _labelX,
            _labelY,
            _nextScaleValue = 0,
            _opacity,
            _nextStage,
            _axisRange,
            _value,
            _textLength;

        //X-axis labels ============================
        if (_needCalc) {
            smartAxisXRange = fMathCeil((selectionEndIndexFloat - selectionStartIndexFloat) / 5); //Five labels in screen
            smartAxisXStart = selectionStartIndexInt - smartAxisXRange + 1;
            if (smartAxisXStart < 1) {
                smartAxisXStart = 1;
            }
        }

        _nextItem = smartAxisXStart;
        _axisRange = smartAxisXRange;

        if (!_needCalc) { //Auto show/hide sub labels when resize
            if (smartAxisXRatio < 0) {
                _nextStage = fMathFloor(smartAxisXRatio);
                _opacity = 1 - smartAxisXRatio + _nextStage;
                for (_i = 0; _i > _nextStage; _i--) {
                    _prevSmartAxisRange = _axisRange;
                    _axisRange /= 2;
                }
            } else if (smartAxisXRatio > 0) {
                _nextStage = fMathCeil(smartAxisXRatio);
                _opacity = _nextStage - smartAxisXRatio;
                _prevSmartAxisRange = _axisRange;
                for (_i = 0; _i < _nextStage; _i++) {
                    _axisRange = _prevSmartAxisRange;
                    _prevSmartAxisRange *= 2;
                }
            }

            while (_nextItem - _axisRange >= selectionStartIndexInt) {
                _nextItem = _nextItem - _axisRange;
            }
            while (_nextItem < selectionStartIndexInt) {
                _nextItem = _nextItem + _axisRange;
            }
            _opacity = envColorGrad[fParseInt(50 * _opacity * seriesMaxOpacity * smartAxisXOpacity)];
        }
        _labelY = _selectionAxis + CONST_PADDING * 5;

        setLineWidth();
        for (_i = _nextItem - _axisRange; _i <= selectionEndIndexInt; _i += _axisRange) {
            _nextItem = fMathCeil(_i);
            _labelX = (_nextItem - selectionStartIndexFloat ) * selectionFactorX;
            _opacity && fMathAbs((_nextItem - smartAxisXStart) % _prevSmartAxisRange) >= 1 ?
                setFillStyle(_opacity) :
                setFillStyle(_color);
            if (_nextItem > 0) {
                fillText(formatDate(xAxisDataRef.data[_nextItem]), _labelX, _labelY);
            }
        }

        //Y-axis labels ============================
        _color = envColorGrad[fParseInt(50 * getMin(seriesMaxOpacity, smartAxisYOpacity))];
        while (_selectionAxis > navigatorHeightHalf) {
            _labelY = fParseInt(_selectionAxis) + CONST_ANTI_BLUR_SHIFT - CONST_PADDING;
            _value = _nextScaleValue.toString();
            _textLength = getLength(_value);
            if (_textLength > 6) {
                _value = _nextScaleValue / 1000000 + "M";
            }
            else if (_textLength > 3) {
                _value = _nextScaleValue / 1000 + "K";
            }

            setFillStyle(_bgColor);
            fillRect(CONST_PADDING_HALF, _labelY - envSmallTextHeight + 2,
                getTextWidth(_value) + CONST_PADDING_2, envSmallTextHeight);
            setFillStyle(_color);
            fillText(_value, CONST_PADDING, _labelY);
            _nextScaleValue = fParseInt(_nextScaleValue + smartAxisYRangeVal);
            _selectionAxis = _selectionAxis + smartAxisYRange * selectionFactorY;
        }
    }

    /**
     * Draws a button
     * @param axis {Object} Y-data series
     */
    function drawButton(axis) {
        var _x = axis.bX,
            _y = axis.bY,
            _color = axis.color,
            _name = axis.name,
            _xCenter = _x + CONST_BTN_RADIUS,
            _yCenter = _y + CONST_BTN_RADIUS;

        drawBalloon(_x, _y, axis.bW, axis.bH, axis.bO, 1);

        setFillStyle(_color);
        beginPath();

        circle(_xCenter, _yCenter, CONST_BTN_RADIUS - CONST_PADDING);
        fill();

        setStrokeStyle(envBgColorGrad[100]);
        setLineWidth(4);
        // setRound(vTrue);
        beginPath();
        translate(-2, 4);
        moveOrLine(vTrue, _xCenter - CONST_PADDING, _yCenter - CONST_PADDING);
        moveOrLine(vFalse, _xCenter, _yCenter);
        moveOrLine(vFalse, _xCenter + CONST_PADDING * 1.8, _yCenter - CONST_PADDING * 1.8);
        translate(2, -4);
        endPath();
        //   setRound(vFalse);

        beginPath();
        setFillStyle(envBgColorGrad[100]);
        circle(_xCenter, _yCenter, 12 * (1 - axis.sO));
        fill();

        setFillStyle(envColorGrad[100]);
        setFont(envRegularNormalFont);
        fillText(_name, _x + CONST_BTN_RADIUS_2 + CONST_PADDING + 1, _yCenter + envSmallTextHeight / 2 - CONST_PADDING + 4);
        setFont(envRegularSmallFont);

        beginPath();
        setStrokeStyle(envColorGrad[fParseInt((1 - axis.bPulse) * 40)]);
        setLineWidth(10);
        circle(_xCenter, _yCenter, axis.bPulse * 30);
        endPath();
    }

    /**
     * Draws all buttons
     */
    function drawButtons() {
        for (var _i in yAxisDataRefs) {
            drawButton(yAxisDataRefs[_i]);
        }
    }

    /**
     * Draws a navigator series in buffer
     * @param series
     */
    function drawNavigatorSeriesInBuffer(series) {
        var _xValue = 0,
            _yValue,
            _k;

        bufferNavigatorContext.beginPath();
        bufferNavigatorContext.strokeStyle = series.sCg[100];
        bufferNavigatorContext.globalAlpha = series.sO;
        for (_k = 1; _k < xAxisDataRef.l;) {
            _yValue = navigatorHeight + (series.data[_k] - navigatorMinY) * navigatorFactorY;
            _k === 1 ? bufferNavigatorContext.moveTo(_xValue, _yValue) : bufferNavigatorContext.lineTo(_xValue, _yValue);
            _xValue = _k++ * navigatorFactorX;
        }
        bufferNavigatorContext.stroke();
    }

    /**
     * Draws the chart series (Attention! Performance critical)
     */
    function drawSeries() {
        seriesMaxOpacity = 0;
        var _i,
            _k,
            _axisY,
            _xValue,
            _yValue;

        if (navigatorNeedUpdateBuffer) {
            clearCanvas(bufferNavigatorContext, totalWidth, navigatorHeight);
        }

        for (_i in yAxisDataRefs) {
            _axisY = yAxisDataRefs[_i];
            seriesMaxOpacity = getMax(_axisY.sO, seriesMaxOpacity);

            //navigator series
            if (navigatorNeedUpdateBuffer) {
                drawNavigatorSeriesInBuffer(_axisY);
            }
            //   setRound(vTrue);
            //selection series
            beginPath();
            setStrokeStyle(_axisY.sCg[fParseInt(100 * _axisY.sO)]);
            setLineWidth(3);
            for (_k = selectionStartIndexInt; _k <= selectionEndIndexInt;) {
                _xValue = (_k - selectionStartIndexFloat) * selectionFactorX;
                _yValue = selectionBottom + (_axisY.data[_k] - selectionMinY) * selectionFactorY;
                moveOrLine(_k++ === selectionStartIndexInt, _xValue, _yValue);
            }
            endPath();
            //     setRound(vFalse);
        }
        navigatorNeedUpdateBuffer = vFalse;
        frameContext.drawImage(bufferNavigatorCanvas, 0, navigatorTop);
    }

    /**
     * Draws the legend
     */
    function drawSeriesLegend() { //todo optimize (big code)
        var _selectionAxis = selectionBottom,
            _sValueX = (selectionCurrentIndexFloat - selectionStartIndexFloat  ) * selectionFactorX,
            _sValueY,
            _leftThreshold = _sValueX + legendLeft - 3,
            _rightThreshold = 0,
            _from = fMathFloor(selectionCurrentIndexFloat),
            _to = _from + 1,
            _i,
            _axisY,
            _legendBoxOpacity = 10 * legendBoxOpacity,
            _qnt = 0,
            _overlap,
            _sValueYFrom,
            _sValueYTo,
            _opacity,
            _isEven,
            _shiftX,
            _value;

        beginPath();
        setStrokeStyle(envColorGrad[fParseInt(40 * legendBoxOpacity)]);
        setLineWidth();
        moveOrLine(vTrue, _sValueX, 0);
        moveOrLine(vFalse, _sValueX, selectionBottom);
        endPath();
        setLineWidth(3);

        for (_i in yAxisDataRefs) {
            _axisY = yAxisDataRefs[_i];
            _sValueYFrom = _selectionAxis + (_axisY.data[_from] - selectionMinY) * selectionFactorY;
            _opacity = _axisY.sO;
            if (_from === selectionCurrentIndexFloat || _to >= selectionEndIndexFloat) {
                _sValueY = _sValueYFrom;
            } else {
                _sValueYTo = _selectionAxis + (_axisY.data[_to] - selectionMinY) * selectionFactorY;
                _sValueY = _sValueYFrom + (_sValueYTo - _sValueYFrom) * (selectionCurrentIndexFloat - _from);
            }

            beginPath();
            setFillStyle(envBgColorGrad[fParseInt(10 * _legendBoxOpacity * _opacity)]);
            circle(_sValueX, _sValueY, 4);
            fill();

            beginPath();
            setStrokeStyle(_axisY.sCg[fParseInt(10 * _legendBoxOpacity * _opacity)]);

            circle(_sValueX, _sValueY, 5);
            endPath();
        }

        if (_leftThreshold < 0) {
            _sValueX = 3 - legendLeft;
        }
        else {
            _overlap = _leftThreshold + legendWidth - totalWidth + 6;
            if (_overlap > 0) {
                _rightThreshold = _overlap - legendWidth + CONST_BTN_RADIUS_2;
                _sValueX = totalWidth - legendLeft - legendWidth - 3;
            }
            _leftThreshold = 0;
        }

        if (_rightThreshold < 0) {
            _rightThreshold = 0;
        }

        drawBalloon(_sValueX + legendLeft + _leftThreshold, legendTop,
            legendWidth - _leftThreshold + _rightThreshold, legendHeight, vTrue, legendBoxOpacity);
        setFont(envBoldSmallFont);
        setFillStyle(envColorGrad[fParseInt(10 * _legendBoxOpacity * legendTextOpacity)]);
        fillText(legendDateText, _sValueX + legendTextLeft[0], legendDateTop);

        _sValueY = CONST_BTN_RADIUS + CONST_PADDING_2;
        for (_i in yAxisDataRefs) {
            _axisY = yAxisDataRefs[_i];
            _value = _axisY.data[fMathRound(selectionCurrentIndexFloat)];
            if (_axisY.bOn) {
                _isEven = (_qnt & 1);
                _shiftX = legendTextLeft[_isEven];
                if (!_isEven) {
                    _sValueY += (envNormalTextHeight + envSmallTextHeight + CONST_PADDING_4);
                }
                setFillStyle(_axisY.sCg[fParseInt(10 * _legendBoxOpacity * legendTextOpacity)]);
                setFont(envBoldNormalFont);
                fillText(_value, _sValueX + _shiftX, _sValueY);
                setFont(envRegularSmallFont);
                fillText(_axisY.name, _sValueX + _shiftX,
                    _sValueY + envNormalTextHeight + CONST_PADDING);
                _qnt++;
            }
        }
    }

    /**
     * Draws a touch circle
     */
    function drawPressHighlight() {
        if (navigatorPressed > 0) {
            var _x;

            if (navigatorPressedSide === ENUM_START_SELECTION_HOVER) {
                _x = zoomStartHard;
            } else if (navigatorPressedSide === ENUM_END_SELECTION_HOVER) {
                _x = zoomEndHard;
            }
            else {
                _x = zoomStartHard + (zoomEndHard - zoomStartHard) / 2;
            }

            beginPath();
            setFillStyle(envColorGrad[fParseInt(navigatorPressed * 20)]);

            circle(_x, navigatorTop + navigatorHeightHalf, navigatorPressed * 35);
            fill();

        }
        if (boundHighlight) {
            drawBoundHighlight(boundHighlight);
        }


    }

    /**
     * Draws a highlight when chart out of bounds
     * @param overflow (-1;0) - left bound, (0;1) - right bound
     */
    function drawBoundHighlight(overflow) {
        if (overflow !== 0) {
            var _x = overflow < 0 ? 0 : totalWidth - CONST_BTN_RADIUS,
                _grd;
            _grd = frameContext.createLinearGradient(_x, 0, _x + CONST_BTN_RADIUS, 0);
            _grd.addColorStop(_x ? 0 : 1, envColorGrad[0]);
            _grd.addColorStop(_x ? 1 : 0, envColorGrad[fParseInt(20 * fMathAbs(overflow))]);
            setFillStyle(_grd);
            fillRect(_x, 0, CONST_BTN_RADIUS, selectionBottom);
        }
    }

    /**
     * Draws a navigator opacity layers
     * @param isBackground
     */
    function drawNavigatorLayer(isBackground) {
        if (isBackground) {
            setFillStyle(envColorGrad[30]);
            fillRect(zoomStartHard, navigatorTop, zoomEndHard - zoomStartHard, navigatorHeight);
            setFillStyle(envBgColorGrad[100]);
            fillRect(zoomStartHard + CONST_PADDING_2, navigatorTop + CONST_PADDING_HALF, zoomEndHard -
                zoomStartHard - CONST_PADDING_4, navigatorHeight - CONST_PADDING);
        } else {
            setFillStyle(envColorGrad[10]);
            fillRect(0, navigatorTop, zoomStartHard, navigatorHeight);
            fillRect(zoomEndHard, navigatorTop, totalWidth - zoomEndHard, navigatorHeight);

            setFillStyle(envBgColorGrad[50]);
            fillRect(0, navigatorTop, zoomStartHard, navigatorHeight);
            fillRect(zoomEndHard, navigatorTop, totalWidth - zoomEndHard, navigatorHeight);
        }
    }

    /**
     * Sets the pixels in a rectangular area to transparent black
     * @param canvas
     * @param width
     * @param height
     */
    function clearCanvas(canvas, width, height) {
        canvas.clearRect(0, 0, width, height);
    }

    /**
     * Draws a frame on canvas
     */
    function redrawFrame() {
        clearCanvas(frameContext, totalWidth, totalHeight);
        if (xAxisDataRef && yAxisDataRefs) {
            setFont(envRegularSmallFont);
            drawNavigatorLayer(vTrue);
            drawHorizontalGrid();
            drawSeries();
            drawNavigatorLayer();

            if (seriesMaxOpacity > 0) {
                drawAxisLabels();
                if (legendBoxOpacity > 0) {
                    drawSeriesLegend();
                }
            }

            drawButtons();
            drawPressHighlight();
        }
    }

    /**
     * Calculates the navigator factors
     */
    function calcNavigatorFactors(withoutAnimation) {
        var _max = vUndefined,
            _min = minValueAxisY,
            _i,
            _axisY,
            _navigatorFactorY;
        for (_i in yAxisDataRefs) {
            _axisY = yAxisDataRefs[_i];
            if (_axisY.bOn) {
                _max = getMax(_axisY.max, _max);
                _min = getMin(_axisY.min, _min);
            }
        }
        if (_max) {
            navigatorMinY = _min + 1;
            _navigatorFactorY = -(navigatorHeight - 2) / (_max - _min);
            if (withoutAnimation) {
                setNavigationFactorY(_navigatorFactorY);
                smartAxisYOpacity = 1;
            }
            else {
                if (animate(navigatorFactorY, setNavigationFactorY, _navigatorFactorY, vNull, vUndefined, vTrue)) {
                    animate(smartAxisYOpacity, setAxisYLabelOpacity, 0, 2);
                }
            }
        }
    }

    /**
     * Calculates the X-axis labels
     */
    function calcSmartAxisY() {
        var _prevProposed = fMathCeil((selectionMaxY - selectionMinY) / 6),
            _threshold = _prevProposed / 25,
            _i = 0,
            _factor = 1,
            _newProposed,
            _divider;

        do {
            if (_i >= getLength(CONST_HUMAN_SCALES)) {
                _i = 0;
                _factor = _factor * 10;
            }
            _divider = CONST_HUMAN_SCALES[_i] * _factor;
            _newProposed = fMathCeil(_prevProposed / _divider) * _divider;
            _i++;
        } while (_newProposed - _prevProposed < _threshold);
        animate(smartAxisYRange, setSmartAxisYRange, _newProposed);
        smartAxisYRangeVal = _newProposed;
    }

    /**
     * Calculates the selection factors
     */
    function calcSelectionFactors() {
        selectionStartIndexFloat = zoomStartSmooth + 1;
        selectionEndIndexFloat = zoomEndSmooth + 1;
        var _max = vUndefined,
            _min = minValueAxisY,
            _i,
            _j,
            _axisY,
            _value;

        if (smartAxisXFrozen && smartAxisXFrozenEnd > smartAxisXFrozenStart) {
            _value = fMathRound(fMathLog((selectionEndIndexFloat - selectionStartIndexFloat) /
                (smartAxisXFrozenEnd - smartAxisXFrozenStart)) * CONST_LOG_2E);
            if (fMathAbs(_value - smartAxisXRatio) >= 1) {
                animate(smartAxisXRatio, setSmartAxisRatio, _value, 10);
            }
        }
        for (_i in yAxisDataRefs) {
            _axisY = yAxisDataRefs[_i];
            if (_axisY.bOn) {
                selectionStartIndexInt = fMathFloor(selectionStartIndexFloat);
                if (selectionStartIndexInt === 0) {
                    selectionStartIndexInt++;
                }
                selectionEndIndexInt = fMathCeil(selectionEndIndexFloat);
                for (_j = selectionStartIndexInt; _j <= selectionEndIndexInt; _j++) {
                    _value = _axisY.data[_j];
                    _max = getMax(_value, _max);
                    _min = getMin(_value, _min);
                }
            }
        }
        if (_max) {
            selectionFactorX = totalWidth / (selectionEndIndexFloat - selectionStartIndexFloat);
            selectionMinY = _min;
            selectionMaxY = _max;
            animate(selectionFactorY, setSelectionFactorY, -(selectionHeight - 2) / (_max - _min),
                vNull, vUndefined, vTrue);
            calcSmartAxisY();
        }
    }

    /**
     * Calculates the buttons params
     */
    function calcButtonsParams() {
        var _x = CONST_PADDING_2,
            _y = navigatorBottom + CONST_PADDING_3 * 2,
            _height = CONST_BTN_RADIUS_2,
            _axis,
            _width,
            _i,
            _j;
        setFont(envRegularNormalFont);
        for (_i in yAxisDataRefs) {
            _axis = yAxisDataRefs[_i];
            _width = CONST_BTN_RADIUS * 2 + CONST_PADDING_4 + getTextWidth(_axis.name);

            if (_x + _width > totalWidth) {
                _x = CONST_PADDING_2;
                _y += _height + CONST_PADDING_3;
            }
            _axis.bX = _x;
            _axis.bY = _y;
            _axis.bW = _width;
            _axis.bH = _height;
            _axis.sCg = [];
            _x += _width + CONST_PADDING_3;
            for (_j = 0; _j <= 100; _j++) {
                _axis.sCg[_j] = getRGBA(_axis.color, _j / 100);
            }
        }
        setFont(envRegularSmallFont);
    }

    /**
     * Assign property from source
     * @param source {Object} data
     * @param field {String} target field of data
     */
    function assignAxisProperty(source, field) {
        if (source) {
            var _axis,
                _i,
                _yAxisRef;
            for (_axis in source) {
                for (_i in  yAxisDataRefs) {
                    _yAxisRef = yAxisDataRefs[_i];
                    if (_yAxisRef.alias === _axis) {
                        _yAxisRef[field] = source[_axis];
                    }
                }
            }
        }
    }

    /**
     * Prepares the data caches
     * @param src {JSON} data for prepare
     */
    function prepareCaches(src) {
        clear();
        if (src) {
            var columns = src.columns,
                _i,
                _k,
                _endOfSeries;
            if (columns) {
                for (_i in columns) {
                    var _column = columns[_i],
                        _dataLen = getLength(_column),
                        _max = vUndefined,
                        _min = vUndefined,
                        _alias = _column[0];
                    for (_k = 1; _k < _dataLen; _k++) {
                        var _elementVal = _column[_k];
                        _max = getMax(_elementVal, _max);
                        _min = getMin(_elementVal, _min);
                    }

                    if (_alias === "x") {
                        xAxisDataRef = {
                            data: _column,
                            l: _dataLen,
                            min: _min,
                            max: _max
                        };
                        _endOfSeries = _dataLen - 2;
                        navigatorFactorX = (totalWidth) / (_endOfSeries);
                        associateZoomEnd(_endOfSeries);
                        associateZoomStart(_endOfSeries - (_endOfSeries) * CONST_NAVIGATOR_WIDTH_PERCENT / 100);
                    } else {
                        yAxisDataRefs.push(
                            {
                                alias: _alias,
                                data: _column, //without realloc mem
                                name: _alias,
                                min: _min,
                                max: _max,
                                bOn: vTrue,
                                sO: 1
                            });
                    }
                }

                assignAxisProperty(src.types, "type");
                assignAxisProperty(src.colors, "color");
                assignAxisProperty(src.names, "name");
                calcNavigatorFactors(vTrue);
                calcButtonsParams();
            }
        }
    }

    /**
     * Gets the name of function
     * @param f {Function} callback function
     * @returns {String} function name
     */
    function getFunctionName(f) {
        return f.name || f.toString().substring(9, 32);
    }

    /**
     * Length of array
     * @param a {Object}
     */
    function getLength(a) {
        return a.length;
    }

    /**
     * Animates the properties
     * @param i {Number} initial value
     * @param c {Function} setter of value
     * @param s {Number=} speed (number of frames)
     * @param p {Number} proposed value
     * @param o {Object=} callback context
     * @param l {Boolean=} is logarithmic scale
     * @returns {Boolean} animation enqueued
     */
    function animate(i, c, p, s, o, l) {

        var _key = getFunctionName(c),
            _frameCount,
            _exAnimationFrames;
        if (i !== p && c) { //no need animation
            if (o) {
                _key += o.alias;
            }

            _frameCount = s || (mousePressed || mouseHovered === ENUM_SELECTION_HOVER ? 5 : 15); //faster when user active
            if (l && i) { // smooth logarithmic scale for big transitions
                _exAnimationFrames = fMathCeil(fMathAbs(fMathLog(fMathAbs(p / i)) * 10));
                _frameCount += getMin(_exAnimationFrames, 15);
            }
            animations[_key] = {
                i: i,
                c: c,
                p: p,
                s: _frameCount,
                o: o
            };
            return vTrue;
        }
        delete animations[_key];
        animationComplete(_key);
    }

    /**
     * Handles the animations
     */
    function processAnimations() {
        var _key,
            _animation,
            _increment;
        for (_key in animations) {
            _animation = animations[_key];
            if (_animation) {
                if (!_animation.f) {
                    _animation.f = (_animation.p - _animation.i) / _animation.s;
                }
                _increment = _animation.f;
                if (frameDelay > 20) {
                    _increment = _increment * frameDelay / 20;
                }

                _animation.i = _animation.i + _increment;
                if (_animation.f !== 0 && fMathAbs(_animation.i - _animation.p) > fMathAbs(_increment * 2)) {
                    _animation.c(_animation.i, _animation.o);
                } else {
                    _animation.c(_animation.p, _animation.o);
                    delete animations[_key];
                    animationComplete(_key);
                }
                invalidateInner();
            }
        }
    }

    /**
     *  Calculate legend in cache once before show
     */
    function calcLegendPosition(pos) {
        legendTop = CONST_BTN_RADIUS + CONST_ANTI_BLUR_SHIFT;
        legendLeft = -25 + CONST_ANTI_BLUR_SHIFT;
        legendTextLeft[0] = -25 + CONST_PADDING_3;
        legendDateTop = CONST_BTN_RADIUS + CONST_PADDING_3 + envSmallTextHeight + CONST_ANTI_BLUR_SHIFT;
        var _dataIndex = fMathFloor(pos),
            _width = [],
            _isEven,
            _qnt = 0,
            _axisY,
            _value,
            _proposedWidth,
            _i;
        legendDateText = formatDate(xAxisDataRef.data[_dataIndex], vTrue);
        for (_i in yAxisDataRefs) {
            _axisY = yAxisDataRefs[_i];
            if (_axisY.bOn) {
                _isEven = (_qnt & 1);
                _value = _axisY.data[_dataIndex];
                setFont(envBoldNormalFont);
                _width[_isEven] = getMax(getTextWidth(_value) + CONST_PADDING, _width[_isEven]);
                setFont(envRegularSmallFont);
                _width[_isEven] = getMax(getTextWidth(_axisY.name) + CONST_PADDING, _width[_isEven]);
                _qnt++;
            }
        }

        legendTextLeft[1] = _width[0];
        _proposedWidth = _width[0] + (_width[1] || 0) + CONST_PADDING_3 * 2;

        _proposedWidth = getMax(120 + CONST_ANTI_BLUR_SHIFT, _proposedWidth);
        legendHeight = 36 + envNormalTextHeight + fMathCeil(_qnt / 2) * (envNormalTextHeight + envSmallTextHeight + CONST_PADDING_4);
        animate(legendWidth, setLegendWidth, _proposedWidth);
    }

    /**
     * Animation complete event
     * @param animationKey {String} callback function name
     */
    function animationComplete(animationKey) {
        if (animationKey === CONST_SELECTION_FACTOR_Y_ANIMATION_KEY) {
            animate(smartAxisYOpacity, setAxisYLabelOpacity, 1, 10);
        } else if (animationKey === CONST_AXIS_X_LABEL_OPACITY_ANIMATION_KEY && smartAxisXFrozen) {
            smartAxisXFrozen = vFalse;
            animate(smartAxisXRatio, setSmartAxisRatio, 0, 1);
            animate(smartAxisXOpacity, setAxisXLabelOpacity, 1, 5);
        }
    }

    /**
     * Render cycle
     */
    function render() {
        processAnimations();
        if (selectionNeedUpdateFactorY) {
            selectionNeedUpdateFactorY = vFalse;
            calcSelectionFactors();
        }

        if (needRedraw) {
            needRedraw = vFalse;
            redrawFrame();
        }
        var _proposed = performance.now();
        if (lastPerformance) {
            frameDelay = 0.8 * frameDelay + 0.2 * (_proposed - lastPerformance );
        }
        lastPerformance = _proposed;
        requestAnimationFrame(render);
    }

    initialize();
    render();

    return {
        draw: draw,
        invalidate: invalidate,
        clear: clear,
        destroy: destroy
    };
};

