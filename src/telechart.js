/*jslint browser: true*/
/*global window*/
var TeleChart = function (ctxId) {
    "use strict";

    /**
     * External functions & variables
     */
    var fParseInt = window.parseInt,
        fMathAbs = Math.abs,
        fMathCeil = Math.ceil,
        fMathFloor = Math.floor,
        fMathRound = Math.round,
        fMathLog = Math.log,
        vDocument = document,
        vUndefined = undefined,
        vTrue = true,
        vFalse = false;
    /**
     * Constants
     */
    var CONST_LINE_TYPE = "line",
        CONST_AREA_TYPE = "area", //todo TBD
        CONST_NAVIGATOR_HEIGHT_PERCENT = 12,
        CONST_NAVIGATOR_WIDTH_PERCENT = 25,
        CONST_DISPLAY_SCALE_FACTOR = 1.5,
        CONST_PADDING = 5,
        CONST_PADDING_HALF = CONST_PADDING / 2,
        CONST_PADDING_2 = CONST_PADDING * 2,
        CONST_PADDING_3 = CONST_PADDING * 3,
        CONST_PADDING_4 = CONST_PADDING * 4,
        CONST_BTN_RADIUS = 20,
        CONST_BTN_RADIUS_2 = CONST_BTN_RADIUS * 2,
        ENUM_NAVIGATOR_HOVER = 1,
        ENUM_START_SELECTION_HOVER = 2,
        ENUM_END_SELECTION_HOVER = 3,
        ENUM_ZOOM_HOVER = 4,
        ENUM_BUTTON_HOVER = 5,
        ENUM_SELECTION_HOVER = 6,
        CONST_HUMAN_SCALES = [2, 5, 10],
        CONST_MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        CONST_DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        CONST_CURSORS = ["inherit", "pointer", "col-resize"],
        CONST_TWO_PI = 2 * Math.PI,
        CONST_PIXEL = "px",
        CONST_BOLD_PREFIX = "bold ",

        CONST_AXIS_X_LABEL_OPACITY_ANIMATION_KEY = getFunctionName(setAxisXLabelOpacity),
        CONST_SELECTION_FACTOR_Y_ANIMATION_KEY = getFunctionName(setSelectionFactorY);

    /**
     * Global members
     */
    var container = vDocument.getElementById(ctxId),
        totalWidth = container.offsetWidth * CONST_DISPLAY_SCALE_FACTOR,
        navigatorHeight = fParseInt(totalWidth * CONST_NAVIGATOR_HEIGHT_PERCENT / 100),
        selectionHeight = totalWidth - navigatorHeight - navigatorHeight * 2,
        selectionUpSpace = navigatorHeight / 2,
        navigatorTop = selectionHeight + navigatorHeight + CONST_PADDING_4,
        navigatorBottom = navigatorTop + navigatorHeight,
        totalHeight = navigatorBottom + CONST_PADDING * 10 + CONST_BTN_RADIUS * 4,
        needRedraw,
        mainCanvas = createCanvas(totalWidth, totalHeight, "m_" + ctxId),
        frameContext = mainCanvas.getContext("2d"),
        xAxisDataRef,
        yAxisDataRefs = [],
        animations = {},

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

        smartAxisStart,
        smartAxisRange,
        smartAxisFrozen,
        smartAxisRatio,

        smartAxisFrozenStart,
        smartAxisFrozenEnd,

        navigatorFactorX,
        navigatorFactorY,
        navigatorMinY,
        navigatorPressed = 0,
        navigatorPressedSide,

        scaleIntervalY,
        axisXLabelWidth,
        axisYLabelOpacity = 1,
        axisXLabelOpacity = 1,
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
        needUpdateSelectionFactor,
        minValueAxisY = 0, //todo config (if not assigned then auto scale)
        envColorGrad = [],
        envBgColorGrad = [],
        envRegularSmallFont,
        envBoldSmallFont,
        envBoldNormalFont,
        envRegularNormalFont;

    function setRound(enable) {
        frameContext.lineJoin = enable ? "round" : "bevel";
    }

    /**
     * Initializes the environment
     */
    function initialize() {
        var _size = getBodyStyle("font-size"),
            _fontFamily = getBodyStyle("font-family"),
            _canvasStyle = mainCanvas.style;
        setRound(vFalse);
        var _baseFontSize = fParseInt(_size.replace(/\D/g, "")),
            _onMouseDown = function (e) {
                handleMouseClick(e, vTrue);
            },
            _onMouseUp = function (e) {
                handleMouseClick(e, vFalse);
            };
        envSmallTextHeight = fParseInt(_baseFontSize * 1.2);
        envNormalTextHeight = fParseInt(_baseFontSize * CONST_DISPLAY_SCALE_FACTOR);

        envRegularSmallFont = envSmallTextHeight + CONST_PIXEL + " " + _fontFamily;
        envRegularNormalFont = envNormalTextHeight + CONST_PIXEL + " " + _fontFamily;
        envBoldSmallFont = CONST_BOLD_PREFIX + envRegularSmallFont;
        envBoldNormalFont = CONST_BOLD_PREFIX + envRegularNormalFont;

        setFont(envRegularSmallFont);
        axisXLabelWidth = getTextWidth("XXX XX");
        _canvasStyle.width = fParseInt(totalWidth / CONST_DISPLAY_SCALE_FACTOR) + CONST_PIXEL;
        _canvasStyle.height = fParseInt(totalHeight / CONST_DISPLAY_SCALE_FACTOR) + CONST_PIXEL;
        container.appendChild(mainCanvas);

        mainCanvas.onmousemove = handleMouseMove;
        mainCanvas.ontouchmove = handleMouseMove;
        mainCanvas.onmouseout = _onMouseUp;

        mainCanvas.onmousedown = _onMouseDown;
        mainCanvas.onmouseup = _onMouseUp;

        mainCanvas.ontouchstart = _onMouseDown;
        mainCanvas.ontouchend = _onMouseUp;

        window.addEventListener("scroll", calcMouseOffset);
        window.addEventListener("resize", calcMouseOffset);
        window.addEventListener("mouseup", _onMouseUp);
        calcMouseOffset();
        invalidate();
    }

    //======== setters for animation ========
    function setSelectionFactorY(val) {
        selectionFactorY = val;
    }

    function setNavigationFactorY(val) {
        navigatorFactorY = val;
    }

    function setNavigatorPressed(val) {
        navigatorPressed = val;
    }

    function setZoomStart(val) {
        zoomStartSmooth = val;
        needUpdateSelectionFactor = vTrue;
    }

    function setZoomEnd(val) {
        zoomEndSmooth = val;
        needUpdateSelectionFactor = vTrue;
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
        series.sOp = val;
    }

    function setButtonPulse(val, series) {
        series.bPulse = val;
    }

    function setAxisYLabelOpacity(val) {
        axisYLabelOpacity = val;
    }

    function setAxisXLabelOpacity(val) {
        axisXLabelOpacity = val;
    }

    function setSmartAxisRatio(val) {
        smartAxisRatio = val;
    }

    /**
     * Clears the chart
     */
    function clear() {
        xAxisDataRef = null;
        yAxisDataRefs = [];
        invalidateInner();
    }

    /**
     * Destroy chart
     */
    function destroy() {
        //todo remove canvas
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
        for (_i = 0; _i <= 10; _i++) {
            _opacity = _i / 10;
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
        if (_currentStyle) {
            return _currentStyle[propertyName];
        }
        return vDocument.defaultView.getComputedStyle(_el, null)[propertyName];
    }

    /**
     *  Creates the  canvas
     * @param width {Number} width of canvas
     * @param height {Number} height of canvas
     * @param postfix {String} postfix name
     * @returns {Element} created canvas
     */
    function createCanvas(width, height, postfix) {
        var canvas = vDocument.createElement("canvas");
        canvas.id = "lr_" + postfix;
        canvas.width = width;
        canvas.height = height;
        return canvas;
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
     *  Calculates a hovered element
     */
    function calcHoveredElement(force) {
        var _result = null,
            _i;

        if (!selectionFactorX || !navigatorFactorX) {
            return;
        }

        if (mouseY < navigatorTop && mouseX > 0 && mouseX < totalWidth) {
            var _proposed = fMathRound(mouseX / selectionFactorX + selectionStartIndexFloat);
            calcLegendPosition(_proposed);
            if (animate(selectionCurrentIndexFloat, setSelectionCurrentIndexFloat, _proposed)) {
                //      animate(legendTextOpacity, setLegendTextOpacity, 0.5);
            }
            mouseFrame.tS = zoomStartSmooth;
            mouseFrame.tE = zoomEndSmooth;
            mouseFrame.tF = mouseX;
            _result = ENUM_SELECTION_HOVER;
            invalidateInner();
        } else if (mouseY > navigatorTop && mouseY < navigatorBottom) {
            _result = ENUM_NAVIGATOR_HOVER;
            var _startZoom = ( zoomStartSmooth) * navigatorFactorX,
                _endZoom = ( zoomEndSmooth) * navigatorFactorX,
                _startZShift = _startZoom - mouseX,
                _endZShift = _endZoom - mouseX;

            if (fMathAbs(_startZShift + CONST_PADDING) < CONST_PADDING_2) {
                _result = ENUM_START_SELECTION_HOVER;
            } else if (fMathAbs(_endZShift - CONST_PADDING) < CONST_PADDING_2) {
                _result = ENUM_END_SELECTION_HOVER;
            } else if (mouseX > _startZoom && mouseX < _endZoom) {
                mouseFrame.nS = _startZShift / navigatorFactorX;
                mouseFrame.nE = _endZShift / navigatorFactorX;
                _result = ENUM_ZOOM_HOVER;
            }
        } else if (mouseY > navigatorBottom) {
            for (_i in yAxisDataRefs) {
                var _axis = yAxisDataRefs[_i];
                _axis.bO = vFalse;
                if (mouseX > _axis.bX && mouseX < _axis.bX + _axis.bW &&
                    mouseY > _axis.bY && mouseY < _axis.bY + _axis.bH) {
                    _axis.bO = vTrue;
                    _result = ENUM_BUTTON_HOVER;
                }
            }
        }
        if (mouseHovered !== _result || force) {
            mouseHovered = _result;

            if (mouseHovered !== ENUM_SELECTION_HOVER) {
                animate(legendBoxOpacity, setLegendOpacity, 0);
            } else if (mouseHovered !== ENUM_BUTTON_HOVER) {
                //reset all hovered once
                for (_i in yAxisDataRefs) {
                    yAxisDataRefs[_i].bO = vFalse;
                }
            }

            switch (mouseHovered) {
                case ENUM_START_SELECTION_HOVER:
                case ENUM_END_SELECTION_HOVER:
                    setCursor(2);
                    break;
                case ENUM_ZOOM_HOVER:
                case ENUM_BUTTON_HOVER:
                    setCursor(1);
                    break;
                case ENUM_SELECTION_HOVER:
                    animate(legendBoxOpacity, setLegendOpacity, 1);
                    setCursor(0);
                    break;
                default:
                    setCursor(0);
                    break;
            }
        }
    }

    /**
     * Stops propagation DOM events
     * @param e {Object} event
     */
    function stopPropagation(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function associateZoomStart(val) {
        zoomStartHard = val;
        animate(zoomStartSmooth, setZoomStart, val);
    }

    function associateZoomEnd(val) {
        zoomEndHard = val;
        animate(zoomEndSmooth, setZoomEnd, val);
    }

    function moveChartCore(shift, maxX, start, end) {
        var _start = shift + start,
            _end = shift + end;
        if (_start < 0) {
            _start = 0;
            _end = end - start;
        }
        if (_end > maxX) {
            _end = maxX;
            _start = maxX - end + start;
        }
        associateZoomStart(_start);
        associateZoomEnd(_end);
    }

    function moveChart() {
        var _proposedX = mouseX / navigatorFactorX,
            _maxProposedX = xAxisDataRef.l - 2;
        if (_proposedX < 0) {
            _proposedX = 0;
        } else if (_proposedX > _maxProposedX) {
            _proposedX = _maxProposedX;
        }
        var threshold = 30 / navigatorFactorX;


        switch (mouseHovered) {
            case ENUM_START_SELECTION_HOVER:
                if (zoomEndSmooth - _proposedX > threshold) {
                    associateZoomStart(_proposedX);
                }
                break;
            case ENUM_END_SELECTION_HOVER:
                if (_proposedX - zoomStartSmooth > threshold) {
                    associateZoomEnd(_proposedX);
                }
                break;
            case ENUM_ZOOM_HOVER:
                moveChartCore(_proposedX, _maxProposedX, mouseFrame.nS, mouseFrame.nE);
                break;
        }
    }

    /**
     * Moves a hovered element
     */
    function moveHoveredElement() {
        if (!xAxisDataRef) {
            return;
        }
        if (ENUM_SELECTION_HOVER === mouseHovered) {
            var _interval = ( mouseFrame.tF - mouseX ) / selectionFactorX;
            if (_interval > CONST_PADDING || mouseFrame.tI) {
                mouseFrame.tI = vTrue;
                var _maxProposedX = xAxisDataRef.l - 2;
                moveChartCore(_interval, _maxProposedX, mouseFrame.tS, mouseFrame.tE);
            }
        } else {
            moveChart();
        }
    }

    function assignMousePos(e, withoutPress) {
        var _clientX = e.clientX,
            _clientY = e.clientY;
        if (_clientX && _clientY) {
            mouseX = fParseInt((_clientX - mouseOffsetX) * CONST_DISPLAY_SCALE_FACTOR);
            mouseY = fParseInt((_clientY - mouseOffsetY) * CONST_DISPLAY_SCALE_FACTOR);
            (mousePressed && !withoutPress) ? moveHoveredElement() : calcHoveredElement();
            invalidateInner();
        }
    }

    /**
     * Handles the mouse move
     * @param e {Object}
     * @param withoutPress {Boolean=}
     */
    function handleMouseMove(e, withoutPress) {
        stopPropagation(e);
        var _touches = e.touches;
        (_touches && _touches.length) ?
            assignMousePos(_touches[0], withoutPress) :
            assignMousePos(e, withoutPress);
    }

    /**
     * Handles the mouse click
     * @param e {Object} event
     * @param pressed {Boolean} left button pressed
     */
    function handleMouseClick(e, pressed) {
        stopPropagation(e);
        mousePressed = pressed;
        handleMouseMove(e, vTrue);
        if (pressed) {
            smartAxisFrozen = vTrue;
            smartAxisFrozenStart = selectionStartIndexFloat;
            smartAxisFrozenEnd = selectionEndIndexFloat;
            smartAxisRatio = 0;
            calcHoveredElement(vTrue);
            switch (mouseHovered) {
                case ENUM_ZOOM_HOVER:
                case ENUM_START_SELECTION_HOVER:
                case ENUM_END_SELECTION_HOVER:
                    animate(navigatorPressed, setNavigatorPressed, 1, 15);
                    navigatorPressedSide = mouseHovered;
                    break;
                case ENUM_BUTTON_HOVER:
                    mousePressed = vFalse;
                    for (var _i in yAxisDataRefs) {
                        var _axis = yAxisDataRefs[_i];
                        if (_axis.bO) {
                            _axis.bOn = !_axis.bOn;
                            animate(_axis.sOp, setSeriesOpacity, _axis.bOn ? 1 : 0, vUndefined, _axis);
                            animate(0, setButtonPulse, 1, 30, _axis);
                            calcNavigatorFactors();
                            calcSelectionFactors();
                        }
                    }
                    break;
                case ENUM_SELECTION_HOVER:
                    mouseFrame.tI = vTrue;
                    break;
            }
        } else {
            mouseFrame.tI = vFalse;
            if (navigatorPressed > 0) {
                animate(navigatorPressed, setNavigatorPressed, 0, 15);
            }

            if (smartAxisFrozen) {
                if (smartAxisFrozenStart !== selectionStartIndexFloat ||
                    smartAxisFrozenEnd !== selectionEndIndexFloat) {
                    animate(axisXLabelOpacity, setAxisXLabelOpacity, 0, 5);
                } else {
                    smartAxisFrozen = vFalse;
                    smartAxisRatio = 0;
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
        if (opacity === 1) {
            return color;
        }
        if (color.indexOf("#") !== -1) {
            var _regExp = color.length === 7 ?
                /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i :
                /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
                _result = _regExp.exec(color);
            color = "rgb(" + fParseInt(_result[1], 16) + "," + fParseInt(_result[2], 16) + "," + fParseInt(_result[3], 16) + ")";
        }
        if (color.indexOf("a") === -1) {
            return color.replace(")", ", " + opacity + ")").replace("rgb", "rgba");
        }
        return color;
    }

    /**
     * Sets the current line width
     * @param width {Number} width in pixels
     */
    function setLineWidth(width) {
        frameContext.lineWidth = width;
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
        return frameContext.measureText(text).width;
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
     * Sets the color, gradient, or pattern used for strokes
     * @param strokeStyle {String} color
     */
    function setStrokeStyle(strokeStyle) {
        frameContext.strokeStyle = strokeStyle;
    }

    /**
     * Sets the color, gradient, or pattern used to fill the drawing
     * @param fillStyle {String} color
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
        var _selectionAxis = selectionHeight + selectionUpSpace,
            nextScale = _selectionAxis,
            _y;
        beginPath();
        setStrokeStyle(envColorGrad[1]);
        setLineWidth(1);
        while (nextScale > selectionUpSpace) {
            _y = fParseInt(nextScale) + 0.5;
            moveOrLine(vTrue, 0, _y);
            moveOrLine(vFalse, totalWidth, _y);
            nextScale = nextScale + scaleIntervalY * selectionFactorY;
        }
        endPath();
    }



    /**
     * Draws the axis labels
     */
    function drawAxisLabels() { //todo need optimize & fixes
        var _selectionAxis = selectionHeight + selectionUpSpace,
            _color = envColorGrad[fParseInt(5 * seriesMaxOpacity * axisXLabelOpacity)],
            _bgColor = envBgColorGrad[fParseInt(7 * axisYLabelOpacity)],
            _needCalc = !smartAxisStart || !smartAxisFrozen,
            _l,
            _prevSmartAxisRange,
            _nextItem,
            _labelX,
            _labelY,
            _nextScaleValue = 0,
            _opacity,
            _nextStage;

        //X-axis labels ============================
        if (_needCalc) {
            smartAxisRange = fMathCeil((selectionEndIndexFloat - selectionStartIndexFloat) / 5);
            smartAxisStart = selectionStartIndexInt;
            smartAxisStart = ++smartAxisStart - smartAxisRange; //+1 to visible frame and -range for overflow
            if (smartAxisStart < 1) {
                smartAxisStart = 1;
            }
        }

        setLineWidth(1);

        _nextItem = smartAxisStart;

        var _axisRange = smartAxisRange;
        _opacity = 1;
      // _prevSmartAxisRange = _axisRange;
        if (smartAxisRatio < 0) {
            _nextStage = fMathFloor(smartAxisRatio);
            _opacity = 1 - smartAxisRatio + _nextStage;
            for (_l = 0; _l > _nextStage; _l--) {
                _prevSmartAxisRange = _axisRange;
                _axisRange /= 2;
            }
        } else if (smartAxisRatio > 0) {
            _nextStage = fMathCeil(smartAxisRatio);
            _opacity =  _nextStage - smartAxisRatio ;
            _prevSmartAxisRange = _axisRange;
            for (_l = 0; _l < _nextStage; _l++) {
                _axisRange = _prevSmartAxisRange;
                _prevSmartAxisRange *= 2;
            }
        }

        if (!_needCalc) {
            while (_nextItem - _axisRange >= selectionStartIndexInt) {
                _nextItem = _nextItem - _axisRange;
            }
            while (_nextItem < selectionStartIndexInt) {
                _nextItem = _nextItem + _axisRange;
            }
        }
        _labelY = _selectionAxis + CONST_PADDING * 5;

        var _newStartIndex = selectionStartIndexInt - fMathCeil(_axisRange);



        var _prev = _prevSmartAxisRange;
        for (_l = _newStartIndex; _l <= selectionEndIndexInt; _l++) {
            _labelX = (_l - selectionStartIndexFloat ) * selectionFactorX;
            if (_nextItem <= _l) {
                if (_opacity < 1 && fMathAbs((_l - smartAxisStart) % _prev) >=1) {
                    setFillStyle(envColorGrad[fParseInt(5 * _opacity * seriesMaxOpacity * axisXLabelOpacity)]); //
                } else {
                    setFillStyle(_color);
                }

                fillText(formatDate(xAxisDataRef.data[_l]), _labelX, _labelY);
                _nextItem = _nextItem + _axisRange;
            }
        }


        //Y-axis labels ============================
        _color = envColorGrad[fParseInt(5 * getMin(seriesMaxOpacity, axisYLabelOpacity))];
        while (_selectionAxis > selectionUpSpace) {
            _labelY = fParseInt(_selectionAxis) + 0.5 - CONST_PADDING;
            setFillStyle(_bgColor);
            fillRect(CONST_PADDING_HALF, _labelY - envSmallTextHeight + 2,
                getTextWidth(_nextScaleValue) + CONST_PADDING_2, envSmallTextHeight); //todo
            setFillStyle(_color);
            fillText(_nextScaleValue, CONST_PADDING, _labelY);
            _nextScaleValue = fParseInt(_nextScaleValue + scaleIntervalY);
            _selectionAxis = _selectionAxis + scaleIntervalY * selectionFactorY;
        }
    }

    function drawBalloon(x, y, width, height, hovered, opacity) {
        var _xWidth = x + width,
            _yHeight = y + height;

        beginPath();
        setStrokeStyle(envColorGrad[fParseInt((hovered ? 4 : 2) * opacity)]);
        setFillStyle(envBgColorGrad[fParseInt(3 + 6 * opacity)]);
        setLineWidth(1);
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
     * Draws button
     * @param axis {Object} Y-data series
     */
    function drawButton(axis) { //todo optimize
        var _x = axis.bX,
            _y = axis.bY,
            _color = axis.color,
            _name = axis.name;

        drawBalloon(_x, _y, axis.bW, axis.bH, axis.bO, 1);

        setFillStyle(_color);
        beginPath();

        circle(_x + CONST_BTN_RADIUS, _y + CONST_BTN_RADIUS, CONST_BTN_RADIUS - CONST_PADDING);
        fill();

        setStrokeStyle(envBgColorGrad[10]);
        setLineWidth(4);
        setRound(vTrue);
        beginPath();
        translate(-2, 4);
        moveOrLine(vTrue, _x + CONST_BTN_RADIUS - CONST_PADDING, _y + CONST_BTN_RADIUS - CONST_PADDING);
        moveOrLine(vFalse, _x + CONST_BTN_RADIUS, _y + CONST_BTN_RADIUS);
        moveOrLine(vFalse, _x + CONST_BTN_RADIUS + CONST_PADDING * 1.8, _y + CONST_BTN_RADIUS - CONST_PADDING * 1.8);
        translate(2, -4);
        endPath();
        setRound(vFalse);

        beginPath();
        setFillStyle(envBgColorGrad[10]);
        circle(_x + CONST_BTN_RADIUS, _y + CONST_BTN_RADIUS, 12 - axis.sOp * 12);
        fill();

        setFillStyle(envColorGrad[10]);
        setFont(envRegularNormalFont);
        fillText(_name, _x + CONST_BTN_RADIUS_2 + CONST_PADDING + 1, _y + CONST_BTN_RADIUS + envSmallTextHeight / 2 - CONST_PADDING + 4);
        setFont(envRegularSmallFont);

        beginPath();
        setStrokeStyle(envColorGrad[fParseInt((1 - axis.bPulse) * 4)]);
        setLineWidth(10);
        circle(_x + CONST_BTN_RADIUS, _y + CONST_BTN_RADIUS, axis.bPulse * 30);
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
     * Draws the chart series (Attention! Performance critical)
     * @returns {Boolean} exist visualise
     */
    function drawSeries() {
        seriesMaxOpacity = 0;
        var _selectionAxis = selectionHeight + selectionUpSpace,
            _i,
            _k,
            _axisY,
            _xValue,
            _yValue;
        for (_i in yAxisDataRefs) {
            _axisY = yAxisDataRefs[_i];
            seriesMaxOpacity = getMax(_axisY.sOp, seriesMaxOpacity);

            //navigator series
            beginPath();
            setLineWidth(2);

            setStrokeStyle(_axisY.sCg[fParseInt(10 * _axisY.sOp)]);
            var _length = xAxisDataRef.l;
            _xValue = 0;
            for (_k = 1; _k < _length;) {
                _yValue = navigatorBottom + (_axisY.data[_k] - navigatorMinY) * navigatorFactorY;
                if (_yValue < navigatorTop) {
                    _yValue = navigatorTop;
                }
                moveOrLine(_k === 1, _xValue, _yValue);
                _xValue = _k++ * navigatorFactorX;
            }
            endPath();
            setRound(vTrue);
            //selection series
            beginPath();
            setLineWidth(3);
            for (_k = selectionStartIndexInt; _k <= selectionEndIndexInt;) {
                _xValue = (_k - selectionStartIndexFloat) * selectionFactorX;
                _yValue = _selectionAxis + (_axisY.data[_k] - selectionMinY) * selectionFactorY;
                moveOrLine(_k++ === selectionStartIndexInt, _xValue, _yValue);
            }
            endPath();
            setRound(vFalse);
        }
    }

    /**
     * Draws the legend
     */
    function drawSeriesLegend() { //todo optimize (big code)
        var _selectionAxis = selectionHeight + selectionUpSpace,
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
        setStrokeStyle(envColorGrad[fParseInt(4 * legendBoxOpacity)]);
        setLineWidth(1);
        moveOrLine(vTrue, _sValueX, 0);
        moveOrLine(vFalse, _sValueX, selectionHeight + selectionUpSpace);
        endPath();
        setLineWidth(3);

        for (_i in yAxisDataRefs) {
            _axisY = yAxisDataRefs[_i];
            _sValueYFrom = _selectionAxis + (_axisY.data[_from] - selectionMinY) * selectionFactorY;
            _opacity = _axisY.sOp;
            if (_from === selectionCurrentIndexFloat || _to >= selectionEndIndexFloat) {
                _sValueY = _sValueYFrom;
            } else {
                _sValueYTo = _selectionAxis + (_axisY.data[_to] - selectionMinY) * selectionFactorY;
                _sValueY = _sValueYFrom + (_sValueYTo - _sValueYFrom) * (selectionCurrentIndexFloat - _from);
            }

            beginPath();
            setFillStyle(envBgColorGrad[fParseInt(_legendBoxOpacity * _opacity)]);
            circle(_sValueX, _sValueY, 4);
            fill();

            beginPath();
            setStrokeStyle(_axisY.sCg[fParseInt(_legendBoxOpacity * _opacity)]);

            circle(_sValueX, _sValueY, 5);
            endPath();
        }

        if (_leftThreshold < 0) {
            _sValueX = -legendLeft + 3;
        }
        else {
            _overlap = _leftThreshold + legendWidth - totalWidth + 6;
            if (_overlap > 0) {
                _rightThreshold = _overlap - legendWidth + CONST_BTN_RADIUS_2;
                _sValueX = totalWidth - legendLeft - legendWidth - 3;
            }
        }

        if (_leftThreshold > 0) {
            _leftThreshold = 0;
        }
        if (_rightThreshold < 0) {
            _rightThreshold = 0;
        }

        drawBalloon(_sValueX + legendLeft + _leftThreshold, legendTop,
            legendWidth - _leftThreshold + _rightThreshold, legendHeight, vTrue, legendBoxOpacity);
        setFont(envBoldSmallFont);
        setFillStyle(envColorGrad[fParseInt(_legendBoxOpacity * legendTextOpacity)]);
        fillText(legendDateText, _sValueX + legendTextLeft[0], legendDateTop);
        var _currentY = CONST_BTN_RADIUS + CONST_PADDING_2;

        for (_i in yAxisDataRefs) {
            _axisY = yAxisDataRefs[_i];
            _value = _axisY.data[fMathRound(selectionCurrentIndexFloat)];
            if (_axisY.bOn) {
                _isEven = (_qnt & 1);
                _shiftX = legendTextLeft[_isEven];
                if (!_isEven) {
                    _currentY += (envNormalTextHeight + envSmallTextHeight + CONST_PADDING_4);
                }
                setFillStyle(_axisY.sCg[fParseInt(_legendBoxOpacity * legendTextOpacity)]);
                setFont(envBoldNormalFont);
                fillText(_value, _sValueX + _shiftX, _currentY);
                setFont(envRegularSmallFont);
                fillText(_axisY.name, _sValueX + _shiftX,
                    _currentY + envNormalTextHeight + CONST_PADDING);
                _qnt++;
            }
        }
    }

    function drawPressHighlight(start, end) {
        if (navigatorPressed > 0) {
            var _x;

            if (navigatorPressedSide === ENUM_START_SELECTION_HOVER) {
                _x = start;
            } else if (navigatorPressedSide === ENUM_END_SELECTION_HOVER) {
                _x = end;
            }
            else {
                _x = start + (end - start) / 2;
            }

            beginPath();
            setFillStyle(envColorGrad[fParseInt(navigatorPressed * 2)]);

            circle(_x, navigatorTop + selectionUpSpace, navigatorPressed * 35);
            fill();
        }
    }

    /**
     * Draws a frame on canvas
     */
    function redrawFrame() {
        frameContext.clearRect(0, 0, totalWidth, totalHeight);
        if (xAxisDataRef && yAxisDataRefs && yAxisDataRefs.length) {
            setFont(envRegularSmallFont);

            var _startZoom = zoomStartHard * navigatorFactorX,
                _endZoom = zoomEndHard * navigatorFactorX;

            setFillStyle(envColorGrad[3]);
            fillRect(_startZoom, navigatorTop, _endZoom - _startZoom, navigatorHeight);
            setFillStyle(envBgColorGrad[10]);
            fillRect(_startZoom + CONST_PADDING_2, navigatorTop + CONST_PADDING_HALF, _endZoom - _startZoom - CONST_PADDING_4, navigatorHeight - CONST_PADDING); //todo optimize
            drawHorizontalGrid();

            drawSeries();
            //Draw navigation frame  //todo function
            setFillStyle(envColorGrad[1]);
            fillRect(0, navigatorTop, _startZoom, navigatorHeight);
            fillRect(_endZoom, navigatorTop, totalWidth - _endZoom, navigatorHeight);

            setFillStyle(envBgColorGrad[5]);
            fillRect(0, navigatorTop, _startZoom, navigatorHeight);
            fillRect(_endZoom, navigatorTop, totalWidth - _endZoom, navigatorHeight);


            if (seriesMaxOpacity > 0) {
                drawAxisLabels();
                if (legendBoxOpacity > 0) {
                    drawSeriesLegend();
                }
            }

            drawButtons();
            drawPressHighlight(_startZoom, _endZoom);

            //todo debug need remove
            /* frameContext.fillStyle = "rgba(0, 0, 0, 0.5)";
            frameContext.fillText("_debug=" + JSON.stringify(_debug), 50, 20);
            frameContext.fillText("_debug2=" + JSON.stringify(_debug2), 50, 40);
            frameContext.fillText("selectionStartIndexInt=" + selectionStartIndexInt, 50, 60);
            frameContext.fillText("_newStartIndex=" + _debug3[0], 50, 80);
            frameContext.fillText("smartAxisRange=" + _debug3[1], 50, 100);
            frameContext.fillText("smartAxisStart=" + _debug3[2], 50, 120);
            frameContext.fillText("_axisRange=" + _debug3[3], 50, 140);
            frameContext.fillText("_prevAxisRange=" + _debug3[4], 50, 160);


            // frameContext.fillText("selectionStartIndexInt=" + selectionStartIndexInt +" "+ formatDate(xAxisDataRef.data[selectionStartIndexInt]), 10, 40);
             frameContext.fillStyle = "rgba(0, 0, 0, 0.2)";
             frameContext.fillText("mouseX " + mouseX, 10, 50);
               frameContext.fillText("mouseY " + mouseY, 10, 70);

            frameContext.fillText("other=" + fParseInt(_perfResult.other), 10, 40);
            frameContext.fillText("series=" + fParseInt(_perfResult.series), 10, 60);
            frameContext.fillText("navi=" + fParseInt(_perfResult.navi), 10, 80);
            frameContext.fillText("axes=" + fParseInt(_perfResult.axes), 10, 100);
            frameContext.fillText("legend=" + fParseInt(_perfResult.legend), 10, 120);
            frameContext.fillText("buttons=" + fParseInt(_perfResult.buttons), 10, 140); */
            //mainCtx.clearRect(0, 0, totalWidth, totalHeight);
            //mainCtx.drawImage(frameCanvas, 0, 0);

        }
    }

    /**
     * Calculates the navigator factors
     */
    function calcNavigatorFactors(withoutAnimation) {
        navigatorFactorX = (totalWidth) / (xAxisDataRef.l - 2);
        var _max = vUndefined,
            _min = minValueAxisY,
            _i;
        for (_i in yAxisDataRefs) {
            var _axisY = yAxisDataRefs[_i];
            if (_axisY.bOn) {
                _max = getMax(_axisY.max, _max);
                _min = getMin(_axisY.min, _min);
            }
        }
        if (_max) {
            navigatorMinY = _min + 1;
            var _navigatorFactorY = -(navigatorHeight - 2) / (_max - _min);
            if (withoutAnimation) {
                setNavigationFactorY(_navigatorFactorY);
                axisYLabelOpacity = 1;
                axisYLabelOpacity = 1;
            }
            else {
                if (animate(navigatorFactorY, setNavigationFactorY, _navigatorFactorY)) {
                    animate(axisYLabelOpacity, setAxisYLabelOpacity, 0, 2);
                }
            }
        }
    }

    /**
     * Calculates the X-axis labels
     */
    function calcSmartAxisX() { //todo refactor
        var _prevProposed = fMathCeil((selectionMaxY - selectionMinY) / 6),
            _threshold = _prevProposed / 25,
            _i = 0,
            _factor = 1,
            _newProposed,
            _divider;

        do {
            if (_i >= CONST_HUMAN_SCALES.length) {
                _i = 0;
                _factor = _factor * 10;
            }
            _divider = CONST_HUMAN_SCALES[_i] * _factor;
            _newProposed = fMathCeil(_prevProposed / _divider) * _divider;
            _i++;
        } while (_newProposed - _prevProposed < _threshold);
        scaleIntervalY = _newProposed;
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

        if (smartAxisFrozen && smartAxisFrozenEnd > smartAxisFrozenStart) {
            _value = fMathRound(fMathLog((selectionEndIndexFloat - selectionStartIndexFloat) /
                (smartAxisFrozenEnd - smartAxisFrozenStart)) * Math.LOG2E);
            if (fMathAbs(_value - smartAxisRatio) >= 1) {
                animate(smartAxisRatio, setSmartAxisRatio, _value, 10); //todo faster
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
            animate(selectionFactorY, setSelectionFactorY, -(selectionHeight - 2) / (_max - _min));
            calcSmartAxisX();
        }
    }

    /**
     * Calculates the buttons params
     */
    function calcButtonsParams() {
        var _x = CONST_PADDING,
            _y = navigatorBottom + CONST_PADDING * 6,
            _height = CONST_BTN_RADIUS_2,
            _axis,
            _width,
            _i,
            _j;
        setFont(envRegularNormalFont);
        for (_i in yAxisDataRefs) {
            _axis = yAxisDataRefs[_i];
            _width = 40 + CONST_PADDING_4 + getTextWidth(_axis.name);

            if (_x + _width > totalWidth) {
                _x = CONST_PADDING;
                _y = _y + _height + CONST_PADDING_3;
            }
            _axis.bX = _x;
            _axis.bY = _y;
            _axis.bW = _width;
            _axis.bH = _height;
            _axis.sCg = [];
            _x = _x + _width + CONST_PADDING_3;
            for (_j = 0; _j <= 10; _j++) {
                _axis.sCg[_j] = getRGBA(_axis.color, _j / 10);
            }
        }
        setFont(envRegularSmallFont);
    }

    /**
     * Prepares the data caches
     * @param src {JSON} data for prepare
     */
    function prepareCaches(src) {
        if (!src) {
            return;
        }
        var columns = src.columns,
            _i,
            _k;
        if (!columns) {
            return;
        }
        for (_i in columns) {
            var _column = columns[_i],
                _dataLen = _column.length,
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
                associateZoomEnd(_dataLen - 2);
                associateZoomStart(zoomEndHard - (zoomEndHard) * CONST_NAVIGATOR_WIDTH_PERCENT / 100);
            } else {
                yAxisDataRefs.push(
                    {
                        alias: _alias,
                        data: _column, //without realloc mem
                        type: CONST_LINE_TYPE,
                        name: _alias,
                        min: _min,
                        max: _max,
                        bOn: vTrue,
                        sOp: 1
                    });
            }
        }


        function assignAxisProperty(source, field) {
            if (source) {
                var _axis,
                    _type,
                    _i,
                    _yAxisRef;
                for (_axis in source) {
                    _type = source[_axis];
                    for (_i in  yAxisDataRefs) {
                        _yAxisRef = yAxisDataRefs[_i];
                        if (_yAxisRef.alias === _axis) {
                            _yAxisRef[field] = _type;
                        }
                    }
                }
            }
        }

        assignAxisProperty(src.types, "type");
        assignAxisProperty(src.colors, "color");
        assignAxisProperty(src.names, "name");

        calcNavigatorFactors(vTrue);
        calcButtonsParams();
    }

    /**
     * Gets the name of function
     * @param f {Function} callback function
     * @returns {String} function name
     */
    function getFunctionName(f) {
        return f.name || f.toString().match(/^function\s*([^\s(]+)/)[1];
    }

    /**
     * Animates the properties
     * @param i {Number} initial value
     * @param c {Function} setter of value
     * @param s {Number=} speed (number of frames)
     * @param p {Number} proposed value
     * @param o {Object=} callback context
     * @returns {Boolean} animation enqueued
     */
    function animate(i, c, p, s, o) {

        if (i === p || !c) { //no need animation
            return vFalse;
        }

        var _key = getFunctionName(c);
        if (o) {
            _key += o.alias;
        }
        animations[_key] = {
            i: i,
            c: c,
            p: p,
            s: s || (mousePressed || mouseHovered === ENUM_SELECTION_HOVER ? 5 : 15), //faster when user active
            o: o
        };
        return vTrue;
    }

    /**
     * Handles the animations
     */
    function processAnimations() {
        var _key,
            _animation;
        for (_key in animations) {
            _animation = animations[_key];
            if (_animation) {
                if (!_animation.f) {
                    _animation.f = (_animation.p - _animation.i) / _animation.s;
                }
                _animation.i = _animation.i + _animation.f;
                if (_animation.f !== 0 && fMathAbs(_animation.i - _animation.p) > fMathAbs(_animation.f * 2)) {
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
        legendTop = CONST_BTN_RADIUS + 0.5;
        legendLeft = -25.5;
        legendTextLeft[0] = -25 + CONST_PADDING_3;
        legendDateTop = CONST_BTN_RADIUS + CONST_PADDING_3 + envSmallTextHeight + 0.5;
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
        _proposedWidth = _width[0] + (_width[1] || 0) + CONST_PADDING * 6;

        _proposedWidth = getMax(120.5, _proposedWidth);
        legendHeight = 36 + envNormalTextHeight + fMathCeil(_qnt / 2) * (envNormalTextHeight + envSmallTextHeight + CONST_PADDING_4);
        animate(legendWidth, setLegendWidth, _proposedWidth);
    }

    /**
     * Animation complete event
     * @param animationKey {String} callback function name
     */
    function animationComplete(animationKey) {
        if (animationKey === CONST_SELECTION_FACTOR_Y_ANIMATION_KEY) {
            animate(axisYLabelOpacity, setAxisYLabelOpacity, 1, 10);
        } else if (animationKey === CONST_AXIS_X_LABEL_OPACITY_ANIMATION_KEY) {
            if (smartAxisFrozen) {
                smartAxisFrozen = false;
                smartAxisRatio = 0;
                animate(axisXLabelOpacity, setAxisXLabelOpacity, 1, 5);
            }
        }

    }

    /**
     * Render cycle
     */
    function render() {
        processAnimations();
        if (needUpdateSelectionFactor) {
            needUpdateSelectionFactor = vFalse;
            calcSelectionFactors();
        }

        if (needRedraw) {
            needRedraw = vFalse;
            redrawFrame();
        }

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



