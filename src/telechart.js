/*jslint browser: true*/
/*global $ */
var TeleChart = function (ctxId) {
    "use strict";

    /**
     * External functions & variables
     */
    var fParseInt = window.parseInt,
        fMathAbs = Math.abs,
        fMathCeil = Math.ceil,
        fMathFloor = Math.floor,
        fMathPow = Math.pow,
        vUndefined = undefined,
        vTrue = true,
        vFalse = false;

    /**
     * Constants
     */
    var CONST_DEFAULT_TYPE = "line",
        CONST_NAVIGATOR_HEIGHT_PERCENT = 12,
        CONST_NAVIGATOR_WIDTH_PERCENT = 25,
        CONST_DISPLAY_SCALE_FACTOR = 1.5,
        CONST_PADDING = 5,
        CONST_BTN_RADIUS = 20,
        ENUM_NAVIGATOR_HOVER = 1,
        ENUM_START_SELECTION_HOVER = 2,
        ENUM_END_SELECTION_HOVER = 3,
        ENUM_IN_FRAME_SELECTION_HOVER = 4,
        ENUM_BUTTON_HOVER = 5,
        ENUM_SELECTION_HOVER = 6,
        CONST_HUMAN_SCALES = [2, 5, 10],
        CONST_MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        CONST_DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        CONST_TWO_PI = 2 * Math.PI,
        CONST_PIXEL = "px",
        CONST_SELECTION_CURRENT_INDEX_ANIMATION_KEY = getFunctionName(setSelectionCurrentIndexFloat),
        CONST_SELECTION_FACTOR_Y_ANIMATION_KEY = getFunctionName(setSelectionFactorY);

    /**
     * Global members
     */
    var container = document.getElementById(ctxId),
        totalWidth = container.offsetWidth * CONST_DISPLAY_SCALE_FACTOR,
        totalHeight = container.offsetHeight * CONST_DISPLAY_SCALE_FACTOR,
        navigatorHeight = fParseInt(totalWidth * CONST_NAVIGATOR_HEIGHT_PERCENT / 100),
        selectionHeight = totalWidth - navigatorHeight - navigatorHeight * 2,
        selectionUpSpace = navigatorHeight / 2,
        navigatorTop = selectionHeight + navigatorHeight + CONST_PADDING * 4,
        navigatorBottom = navigatorTop + navigatorHeight,
        needRedraw,
        mainCanvas = createCanvas(totalWidth, totalHeight, "m_" + ctxId),
        frameCanvas = createCanvas(totalWidth, totalHeight, "f_" + ctxId),
        mainCtx = mainCanvas.getContext("2d"),
        frameContext = frameCanvas.getContext("2d"),
        xAxisDataRef,
        yAxisDataRefs = [],
        animations = {},

        mouseX,
        mouseY,
        mouseOffsetX,
        mouseOffsetY,
        mouseHovered,
        mousePressed,
        mouseFrame = {start: 0, end: 0},

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

        navigatorFactorX,
        navigatorFactorY,
        navigatorMinY,

        scaleIntervalY,
        axisXLabelWidth,
        axisYLabelOpacity = 1,

        legendWidth,
        legendHeight,
        legendTextOpacity = 0,
        legendBoxOpacity = 0,

        textHeight,
        needUpdateSelectionFactor,
        minValueAxisY = 0, //todo config (if not assigned then auto scale)
        envColor,
        envBgColor;

    /**
     * Initializes the environment
     */
    function initialize() {
        var _size = getBodyStyle("font-size"),
            _canvasStyle = mainCanvas.style;
        frameContext.lineJoin = "round";
        textHeight = fParseInt(fParseInt(_size.replace(/\D/g, '')) * 1.2);
        _size = textHeight + CONST_PIXEL;
        frameContext.font = _size + " " + getBodyStyle("font-family");
        axisXLabelWidth = getTextWidth("XXX XX");
        _canvasStyle.width = fParseInt(totalWidth / CONST_DISPLAY_SCALE_FACTOR) + CONST_PIXEL;
        _canvasStyle.height = fParseInt(totalHeight / CONST_DISPLAY_SCALE_FACTOR) + CONST_PIXEL;
        container.appendChild(mainCanvas);

        mainCanvas.onmousemove = handleMouseMove;
        mainCanvas.onmouseout = handleMouseMove;
        mainCanvas.onmousedown = function (e) {
            handleMouseClick(e, vTrue);
        };

        mainCanvas.onmouseup = function (e) {
            handleMouseClick(e, vFalse);
        };

        window.addEventListener("scroll", function (e) {
            calcMouseOffset();
        });
        window.addEventListener("resize", function (e) {
            calcMouseOffset();
        });
        calcMouseOffset();
        invalidate();
    }

    //======== setters ========
    function setSelectionFactorY(val) {
        selectionFactorY = val;
    }

    function setNavigationFactorY(val) {
        navigatorFactorY = val;
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

    function setLegendTextOpacity(val) {
        legendTextOpacity = val;
    }

    function setSeriesOpacity(val, series) {
        series.opacity = val;
    }

    function setAxisYLabelOpacity(val) {
        axisYLabelOpacity = val;
    }

    /**
     * Clears the chart
     */
    function clear() {
        xAxisDataRef = null;
        yAxisDataRefs = [];
        invalidate();
    }

    /**
     * Invalidates the canvas
     */
    function invalidate() {
        needRedraw = vTrue;
    }

    /**
     * Draws a json data
     * @param data {JSON} chart data
     */
    function draw(data) {
        if (data) {
            prepareCaches(data);
            invalidate();
        }
    }

    /**
     * Gets a style property from document body
     * @param propertyName {String} property name
     * @returns {String} property value
     */
    function getBodyStyle(propertyName) {
        var _el = document.body,
            _currentStyle = _el.currentStyle;
        if (_currentStyle) {
            return _currentStyle[propertyName];
        }
        return document.defaultView.getComputedStyle(_el, null)[propertyName];
    }

    /**
     *  Creates the  canvas
     * @param width {Number} width of canvas
     * @param height {Number} height of canvas
     * @param postfix {String} postfix name
     * @returns {Element} created canvas
     */
    function createCanvas(width, height, postfix) {
        var canvas = document.createElement("canvas");
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
        return prev === vUndefined  || val < prev ? val : prev;
    }

    /**
     * Sets the canvas cursor
     * @param cursor {String} cursor name
     */
    function setCursor(cursor) {
        mainCanvas.style.cursor = cursor;
    }

    /**
     *  Calculates a hovered element
     */
    function calcHoveredElement() {
        var _result = null;

        if (mouseY < navigatorTop && mouseX > 0 && mouseX < totalWidth) {
            var _proposed = Math.round(mouseX / selectionFactorX + selectionStartIndexFloat);
            if (animate(selectionCurrentIndexFloat, setSelectionCurrentIndexFloat, _proposed)) {
                animate(legendTextOpacity, setLegendTextOpacity, 0);
            }
            _result = ENUM_SELECTION_HOVER;
            invalidate();
        } else if (mouseY > navigatorTop && mouseY < navigatorBottom) {
            _result = ENUM_NAVIGATOR_HOVER;
            var _startZoom = ( zoomStartSmooth) * navigatorFactorX,
                _endZoom = ( zoomEndSmooth) * navigatorFactorX,
                _startZShift = _startZoom - mouseX,
                _endZShift = _endZoom - mouseX;
            if (fMathAbs(_startZShift + CONST_PADDING) < CONST_PADDING) {
                _result = ENUM_START_SELECTION_HOVER;
            } else if (fMathAbs(_endZShift - CONST_PADDING) < CONST_PADDING) {
                _result = ENUM_END_SELECTION_HOVER;
            } else if (mouseX > _startZoom && mouseX < _endZoom) {
                mouseFrame.start = _startZShift / navigatorFactorX;
                mouseFrame.end = _endZShift / navigatorFactorX;
                _result = ENUM_IN_FRAME_SELECTION_HOVER;
            }
        } else if (mouseY > navigatorBottom) {
            for (var _i = 0; _i < yAxisDataRefs.length; _i++) {
                var _axis = yAxisDataRefs[_i];
                _axis.hovered = vFalse;
                if (mouseX > _axis.bX && mouseX < _axis.bX + _axis.bW &&
                    mouseY > _axis.bY && mouseY < _axis.bY + _axis.bH) {
                    _axis.hovered = vTrue;
                    _result = ENUM_BUTTON_HOVER;
                    break;
                }
            }
        }
        if (mouseHovered !== _result) {
            mouseHovered = _result;

            if (mouseHovered !== ENUM_SELECTION_HOVER) {
                animate(legendBoxOpacity, setLegendOpacity, 0);
            } else if (mouseHovered !== ENUM_BUTTON_HOVER) {
                //reset all hovered once
                for (var _j = 0; _j < yAxisDataRefs.length; _j++) {
                    yAxisDataRefs[_j].hovered = vFalse;
                }
            }

            switch (mouseHovered) {
                case ENUM_START_SELECTION_HOVER:
                case ENUM_END_SELECTION_HOVER:
                    setCursor("col-resize");
                    break;
                case ENUM_IN_FRAME_SELECTION_HOVER:
                case ENUM_BUTTON_HOVER:
                    setCursor("pointer");
                    break;
                case ENUM_SELECTION_HOVER:
                    animate(legendBoxOpacity, setLegendOpacity, 1);
                    setCursor("inherit");
                    break;
                default:

                    setCursor("inherit");
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

    /**
     * Moves a hovered element
     */
    function moveHoveredElement() {
        if (!xAxisDataRef) {
            return;
        }
        var _proposedX = mouseX / navigatorFactorX,
            _maxProposedX = xAxisDataRef.data.length - 2;
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
            case ENUM_IN_FRAME_SELECTION_HOVER:
                var _start = _proposedX + mouseFrame.start,
                    _end = _proposedX + mouseFrame.end;
                if (_start < 0) {
                    _start = 0;
                    _end = mouseFrame.end - mouseFrame.start;
                }
                if (_end > _maxProposedX) {
                    _end = _maxProposedX;
                    _start = _maxProposedX - mouseFrame.end + mouseFrame.start;
                }
                associateZoomStart(_start);
                associateZoomEnd(_end);
                break;
        }
    }

    /**
     * Handles the mouse move
     * @param e {Object}
     */
    function handleMouseMove(e) {
        stopPropagation(e);
        if (mousePressed && e.buttons !== 1) {
            mousePressed = vFalse;
        }

        mouseX = fParseInt((e.clientX - mouseOffsetX) * CONST_DISPLAY_SCALE_FACTOR);
        mouseY = fParseInt((e.clientY - mouseOffsetY) * CONST_DISPLAY_SCALE_FACTOR);
        if (!mousePressed) {
            calcHoveredElement();
        } else {
            moveHoveredElement();
        }
        invalidate();
    }

    /**
     * Handles the mouse click
     * @param e {Object} event
     * @param pressed {Boolean} left button pressed
     */
    function handleMouseClick(e, pressed) {
        stopPropagation(e);
        mousePressed = pressed;
        if (pressed) {
            switch (mouseHovered) {
                case ENUM_BUTTON_HOVER:
                    for (var _j = 0; _j < yAxisDataRefs.length; _j++) {
                        var _axis = yAxisDataRefs[_j];
                        if (_axis.hovered) {
                            _axis.enabled = !_axis.enabled;
                            var _opacity = _axis.enabled ? 1 : 0;
                            animate(_axis.opacity, setSeriesOpacity, _opacity, vUndefined, _axis);
                            calcNavigatorFactors();
                            calcSelectionFactors();
                        }
                    }
                    break;
            }
        }
        invalidate();
    }

    /**
     * Calculates the mouse offset
     */
    function calcMouseOffset() {
        var _bb = mainCanvas.getBoundingClientRect();
        mouseOffsetX = _bb.left;
        mouseOffsetY = _bb.top;
        invalidate();
    }

    /**
     * Gets rgba color from hex
     * @param color {String} color in HEX or rgb
     * @param opacity {Number} opacity
     * @returns {String} color in rgba
     */
    function getRGBA(color, opacity) {
        if (color.indexOf("#") !== -1) {
            var regExp = color.length === 7 ?
                /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i :
                /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
            var result = regExp.exec(color);
            color = "rgb(" + fParseInt(result[1], 16) + "," + fParseInt(result[2], 16) + "," + fParseInt(result[3], 16) + ")";
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
     * Turns the current or given path into the current clipping region
     */
    function clip() {
        frameContext.clip();
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
        if (isMove) {
            frameContext.moveTo(x, y);
        } else {
            frameContext.lineTo(x, y);
        }
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
        var _selectionAxis = selectionHeight + selectionUpSpace;
        beginPath();
        setStrokeStyle(getRGBA(envColor, 0.1));
        setLineWidth(1);
        var nextScale = _selectionAxis;
        while (nextScale > selectionUpSpace) {
            var _y = fParseInt(nextScale) + 0.5;
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
            _c = getRGBA(envColor, 0.4),
            _needCalc = !smartAxisStart || !mousePressed;
        if (_needCalc) {
            smartAxisStart = selectionStartIndexInt;
            smartAxisRange =  fParseInt(fMathCeil((selectionEndIndexFloat - selectionStartIndexFloat) / 6));
        }


        setFillStyle(envBgColor);
        fillRect(0, navigatorTop- navigatorHeight, totalWidth, navigatorHeight);

        //X-axis labels
        setLineWidth(1);
        setFillStyle(_c);
        var _nextItem = smartAxisStart;
       // while (!_needCalc && (_nextItem - smartAxisRange - selectionStartIndexFloat ) * selectionFactorX > -axisXLabelWidth) {
      //      _nextItem = _nextItem - smartAxisRange;
    //    }
        if (!_needCalc) {
            while (_nextItem - smartAxisRange >= selectionStartIndexInt) {
                _nextItem = _nextItem - smartAxisRange;
            }
          //  _nextItem = _nextItem - smartAxisRange;
            while (_nextItem < selectionStartIndexInt) {
                _nextItem = _nextItem + smartAxisRange;
            }
        }

        for (var _l = selectionStartIndexInt; _l <= selectionEndIndexInt; _l++) {
            var _labelX = (_l - selectionStartIndexFloat ) * selectionFactorX;
            if (_nextItem <= _l) {
                var _label = formatDate(xAxisDataRef.data[_l]);
                fillText(_label, _labelX, _selectionAxis + CONST_PADDING * 5);
                _nextItem = _nextItem + smartAxisRange;
            }
        }

        //Y-axis labels
        var _nextScaleValue = 0,
            _nextScale = _selectionAxis,
            _bg = getRGBA(envBgColor, 0.7* axisYLabelOpacity);
        _c = getRGBA(envColor, 0.4* axisYLabelOpacity);
        while (_nextScale > selectionUpSpace) {
            var _y = fParseInt(_nextScale) + 0.5 - CONST_PADDING;
            var _text = _nextScaleValue.toString();
            var _textWidth = getTextWidth(_text);
            setFillStyle(_bg);
            fillRect(CONST_PADDING / 2, _y - textHeight + 2, _textWidth + CONST_PADDING * 2, textHeight); //todo
            setFillStyle(_c);
            fillText(_text, CONST_PADDING, _y);
            _nextScaleValue = fParseInt(_nextScaleValue + scaleIntervalY);
            _nextScale = _nextScale + scaleIntervalY * selectionFactorY;
        }
    }


    function drawBalloon(x, y, width, height, hovered, opacity) {
        beginPath();
        setStrokeStyle(getRGBA(envColor, (hovered ? 0.4 : 0.2) * opacity));
        setFillStyle(getRGBA(envBgColor, 0.3 + 0.6 * opacity));
        setLineWidth(1);
        moveOrLine(vTrue, x + CONST_BTN_RADIUS, y);
        moveOrLine(vFalse, x + width - CONST_BTN_RADIUS, y);
        quadraticCurveTo(x + width, y, x + width, y + CONST_BTN_RADIUS);
        moveOrLine(vFalse, x + width,  y +height -  CONST_BTN_RADIUS);
        quadraticCurveTo(x + width, y + height, x + width - CONST_BTN_RADIUS, y + height);
        moveOrLine(vFalse, x + CONST_BTN_RADIUS, y + height);
        quadraticCurveTo(x, y + height, x, y + height - CONST_BTN_RADIUS);
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

        drawBalloon(_x, _y, axis.bW, axis.bH, axis.hovered, 1);

        setFillStyle(_color);
        beginPath();

        circle(_x + CONST_BTN_RADIUS, _y + CONST_BTN_RADIUS, CONST_BTN_RADIUS - CONST_PADDING );
        fill();

        setStrokeStyle(envBgColor);
        setLineWidth(4);
        beginPath();
        translate(-2, 4);
        moveOrLine(vTrue, _x + CONST_BTN_RADIUS - CONST_PADDING, _y + CONST_BTN_RADIUS - CONST_PADDING);
        moveOrLine(vFalse, _x + CONST_BTN_RADIUS, _y + CONST_BTN_RADIUS);
        moveOrLine(vFalse, _x + CONST_BTN_RADIUS + CONST_PADDING * 1.8, _y + CONST_BTN_RADIUS - CONST_PADDING * 1.8);
        translate(2, -4);
        endPath();

        //todo animation circle


        beginPath();
        setFillStyle(envBgColor);
        circle(_x + CONST_BTN_RADIUS, _y + CONST_BTN_RADIUS, 12 - axis.opacity * 12);
        fill();


        setFillStyle(envColor);
        fillText(_name, _x + CONST_BTN_RADIUS * 2 + CONST_PADDING, _y + CONST_BTN_RADIUS + textHeight / 2 - CONST_PADDING + 2);
    }

    /**
     * Draws all buttons
     */
    function drawButtons() {
        for (var _i = 0; _i < yAxisDataRefs.length; _i++) {
            var _axis = yAxisDataRefs[_i];
            drawButton(_axis);
        }
    }

    /**
     * Draws the chart series
     * @returns {Boolean} exist visualise
     */
    function drawSeries() {
        var _existVisible = vFalse,
            _selectionAxis = selectionHeight + selectionUpSpace;
        for (var _i = 0; _i < yAxisDataRefs.length; _i++) {
            var _axisY = yAxisDataRefs[_i],
                _seriesColor = _axisY.color;
            if (_axisY.enabled) {
                _existVisible = vTrue;
           }
           // beginPath()
           // fillRect(0, navigatorTop, totalWidth, navigatorHeight);
           // clip();
            //navigator series
            beginPath();
            setLineWidth(2);

            setStrokeStyle(getRGBA(_seriesColor, _axisY.opacity));
            var _length = xAxisDataRef.data.length;
            for (var _k = 1; _k < _length; _k++) {
                var _xValue = (_k - 1) * navigatorFactorX,
                    _yValue = navigatorTop + navigatorHeight + (_axisY.data[_k] - navigatorMinY) * navigatorFactorY;
                moveOrLine(_k === 1, _xValue, _yValue);
            }
            endPath();

            //selection series
            beginPath();
            setLineWidth(3);
            for (var _j = selectionStartIndexInt; _j <= selectionEndIndexInt; _j++) {
                var _selValueX = (_j - selectionStartIndexFloat) * selectionFactorX,
                    _selValueY = _selectionAxis + (_axisY.data[_j] - selectionMinY) * selectionFactorY;
                moveOrLine(_j === selectionStartIndexFloat, _selValueX, _selValueY);
            }
            endPath();
        }
        return _existVisible;
    }

    /**
     * Draws the legend
     */
    function drawSeriesLegend() { //todo optimize
        var _selectionAxis = selectionHeight + selectionUpSpace,
            _sValueX = (selectionCurrentIndexFloat - selectionStartIndexFloat  ) * selectionFactorX,
            _from = fMathFloor(selectionCurrentIndexFloat),
            _to = _from + 1;

        beginPath();
        setStrokeStyle(getRGBA(envColor, 0.4 * legendBoxOpacity));
        setLineWidth(1);
        moveOrLine(vTrue, _sValueX, 0);
        moveOrLine(vFalse, _sValueX, selectionHeight + selectionUpSpace);
        endPath();
        setLineWidth(3);
        for (var _i = 0; _i < yAxisDataRefs.length; _i++) {
            var _axisY = yAxisDataRefs[_i],
                _color = _axisY.color,
                _sValueYFrom = _selectionAxis + (_axisY.data[_from] - selectionMinY) * selectionFactorY,
                _sValueY,
                _opacity = _axisY.opacity;
            if (_from === selectionCurrentIndexFloat || _to >= selectionEndIndexFloat) {
                _sValueY = _sValueYFrom;
            } else {
                var _sValueYTo = _selectionAxis + (_axisY.data[_to] - selectionMinY) * selectionFactorY;
                _sValueY = _sValueYFrom + (_sValueYTo - _sValueYFrom) * (selectionCurrentIndexFloat - _from);
            }

            beginPath();
            setFillStyle(getRGBA(envBgColor, _opacity* legendBoxOpacity));
            circle(_sValueX, _sValueY, 3);
            fill();

            beginPath();
            setStrokeStyle(getRGBA(_color, _opacity* legendBoxOpacity));

            circle(_sValueX, _sValueY, 5);
            endPath();
        }
        drawBalloon(_sValueX - 25.5, CONST_BTN_RADIUS  + 0.5, 100.5, 100, vTrue, legendBoxOpacity);

        setFillStyle(getRGBA(envColor, legendBoxOpacity * legendTextOpacity));
        var _date = formatDate(xAxisDataRef.data[fMathFloor(selectionCurrentIndexFloat)], vTrue);
        fillText(_date, _sValueX - 25.5 + CONST_PADDING*2, CONST_BTN_RADIUS + CONST_PADDING*2 + textHeight);
    }

    /**
     * Draws a frame on canvas
     */
    function redrawFrame() {
        frameContext.clearRect(0, 0, totalWidth, totalHeight);
        if (xAxisDataRef && yAxisDataRefs && yAxisDataRefs.length) {
            envColor = getBodyStyle("color");
            envBgColor = getBodyStyle("background-color");
            var _startZoom = ( zoomStartHard) * navigatorFactorX,
                _endZoom = ( zoomEndHard) * navigatorFactorX;

            setFillStyle(getRGBA(envColor, 0.3));
            fillRect(_startZoom, navigatorTop, _endZoom - _startZoom, navigatorHeight);
            setFillStyle(envBgColor);
            fillRect(_startZoom + CONST_PADDING * 2, navigatorTop + CONST_PADDING / 2, _endZoom - _startZoom - CONST_PADDING * 4, navigatorHeight - CONST_PADDING); //todo optimize
            drawHorizontalGrid();
            var _existVisible = drawSeries();
            if (_existVisible && legendBoxOpacity > 0) {
                drawSeriesLegend();
            }
            //Draw navigation frame
            setFillStyle(getRGBA(envColor, 0.1));
            fillRect(0, navigatorTop, _startZoom, navigatorHeight);
            fillRect(_endZoom, navigatorTop, totalWidth - _endZoom, navigatorHeight);

            setFillStyle(getRGBA(envBgColor, 0.5));
            fillRect(0, navigatorTop, _startZoom, navigatorHeight);
            fillRect(_endZoom, navigatorTop, totalWidth - _endZoom, navigatorHeight);

            if (_existVisible) {
                drawAxisLabels();
            }
            drawButtons();


            //todo debug need remove
            //  frameContext.fillStyle = "rgba(0, 0, 0, 0.2)";
            //   frameContext.fillText("mouseX " + mouseX, 10, 50);
            //    frameContext.fillText("mouseY " + mouseY, 10, 70);
            //    _frameContext.fillText("selectionFactorX " + selectionFactorX, 10, 90);
            mainCtx.clearRect(0, 0, totalWidth, totalHeight);
            mainCtx.drawImage(frameCanvas, 0, 0, totalWidth, totalHeight);
        }
    }

    /**
     * Calculates the navigator factors
     */
    function calcNavigatorFactors() {
        navigatorFactorX = (totalWidth) / (xAxisDataRef.data.length - 2);
        var _max = vUndefined,
            _min = minValueAxisY;
        for (var _i = 0; _i < yAxisDataRefs.length; _i++) {
            var _axisY = yAxisDataRefs[_i];
            if (_axisY.enabled) {
                _max = getMax(_axisY.max, _max);
                _min = getMin(_axisY.min, _min);
            }
        }
        if (_max) {
            navigatorMinY = _min + 1;
            if (animate(navigatorFactorY, setNavigationFactorY, -(navigatorHeight - 2) / (_max - _min))) {
                animate(axisYLabelOpacity, setAxisYLabelOpacity, 0, 2);
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
            _min = minValueAxisY;
        for (var _i = 0; _i < yAxisDataRefs.length; _i++) {
            var _axisY = yAxisDataRefs[_i];
            if (_axisY.enabled) {
                selectionStartIndexInt = fMathFloor(selectionStartIndexFloat);
                selectionEndIndexInt = fMathCeil(selectionEndIndexFloat);
                for (var _j = selectionStartIndexInt; _j <= selectionEndIndexInt; _j++) {
                    var _value = _axisY.data[_j];
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
            _y = navigatorTop + navigatorHeight + CONST_PADDING * 6,
            _height = 40;

        for (var _i = 0; _i < yAxisDataRefs.length; _i++) {
            var _axis = yAxisDataRefs[_i],
                _width = 40 + CONST_PADDING * 4 + getTextWidth(_axis.name);

            if (_x + _width > totalWidth) {
                _x = CONST_PADDING;
                _y = _y + _height + CONST_PADDING * 3;
            }
            _axis.bX = _x;
            _axis.bY = _y;
            _axis.bW = _width;
            _axis.bH = _height;
            _x = _x + _width + CONST_PADDING * 3;
        }


        //todo legendHeight, legendHeight
    }

    /**
     * Prepares the data caches
     * @param src {JSON} data for prepare
     */
    function prepareCaches(src) {
        if (!src) {
            return;
        }
        var columns = src.columns;
        if (columns) {
            for (var _i = 0; _i < columns.length; _i++) {
                var _column = columns[_i],
                    _dataLen = _column.length,
                    _max = vUndefined,
                    _min = vUndefined;
                for (var _k = 1; _k < _dataLen; _k++) {
                    var _elementVal = _column[_k];
                    _max = getMax(_elementVal, _max);
                    _min = getMin(_elementVal, _min);
                }

                if (_column[0] === "x") {
                    xAxisDataRef = {
                        data: _column,
                        min: _min,
                        max: _max
                    };
                    associateZoomEnd(_dataLen - 2);
                    associateZoomStart(zoomEndHard - (zoomEndHard) * CONST_NAVIGATOR_WIDTH_PERCENT / 100);
                } else {
                    yAxisDataRefs.push(
                        {
                            alias: _column[0],
                            data: _column, //without realloc mem
                            type: CONST_DEFAULT_TYPE,
                            name: _column[0],
                            min: _min,
                            max: _max,
                            enabled: vTrue,
                            opacity: 1
                        });
                }
            }
            calcNavigatorFactors();
            calcButtonsParams();
        }

        function assignAxisProperty(source, field) {
            if (source) {
                for (var axis in source) {
                    if (source.hasOwnProperty(axis)) {
                        var _type = source[axis];
                        for (var _i = 0; _i < yAxisDataRefs.length; _i++) {
                            var _yAxisRef = yAxisDataRefs[_i];
                            if (_yAxisRef.alias === axis) {
                                _yAxisRef[field] = _type;
                            }
                        }
                    }
                }
            }
        }

        assignAxisProperty(src.types, "type");
        assignAxisProperty(src.colors, "color");
        assignAxisProperty(src.names, "name");
    }

    /**
     * Gets the name of function
     * @param f {Function} callback function
     * @returns {String} function name
     */
    function getFunctionName(f) {
        return f.name ||  f.toString().match(/^function\s*([^\s(]+)/)[1];
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

        animations[getFunctionName(c)] = {
            i: i,
            c: c,
            p: p,
            s: s || (mouseY < navigatorTop + navigatorHeight ? 5 : 15),
            o: o
        };
        return vTrue;
    }

    /**
     * Handles the animations
     */
    function processAnimations() {
        for (var key in animations) {
            if (animations.hasOwnProperty(key)) {
                var _animation = animations[key];
                if (_animation) {
                    if (!_animation.f) {
                        _animation.f = (_animation.p - _animation.i) / _animation.s;
                    }
                    _animation.i = _animation.i + _animation.f;
                    if (_animation.f !== 0 && fMathAbs(_animation.i - _animation.p) > fMathAbs(_animation.f * 2)) {
                        _animation.c(_animation.i, _animation.o);
                    } else {
                        _animation.c(_animation.p, _animation.o);
                        delete animations[key];
                        animationComplete(key);
                    }
                    invalidate();
                }
            }
        }
    }

    /**
     * Animation complete event
     * @param animationKey {String} callback function name
     */
    function animationComplete(animationKey) {
        switch (animationKey) {
            case CONST_SELECTION_CURRENT_INDEX_ANIMATION_KEY:
                animate(legendTextOpacity, setLegendTextOpacity, 1, 5);
                break;
            case CONST_SELECTION_FACTOR_Y_ANIMATION_KEY:
                animate(axisYLabelOpacity, setAxisYLabelOpacity, 1, 10);
                break;
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
        clear: clear
    };
};
