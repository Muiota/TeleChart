/*jslint browser: true*/
/*global window*/
var Telegraph = function (ctxId, config) {
    "use strict";

    var measure = {
        start: "start",
        animation: "animation",
        calcSelectionFactors: "calcSelectionFactors",
        drawNavigatorLayer: "drawNavigatorLayer",
        drawHorizontalGrid: "drawHorizontalGrid",
        drawSeries: "drawSeries",
        drawNavigatorLayerB: "drawNavigatorLayerB",
        drawSeriesLegend: "drawSeriesLegend",
        drawPressHighlight: "drawPressHighlight",
        end: "end"
    }

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
        CONST_ANTI_BLUR_SHIFT = 0.5,
        CONST_HUMAN_SCALES = [2, 5, 10],
        CONST_MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        CONST_MONTH_NAMES_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        CONST_DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        CONST_CURSORS = ["inherit", "pointer", "col-resize"],
        CONST_TWO_PI = 2 * Math.PI,
        CONST_LOG_2E = Math.LOG2E,
        CONST_PIXEL = "px",
        CONST_PIXEL_MARGIN = "5" + CONST_PIXEL,
        CONST_BOLD_PREFIX = "bold ",
        CONST_WIDTH = "width",
        CONST_HEIGHT = "height",
        CONST_AXIS_X_LABEL_OPACITY_ANIMATION_KEY = getFunctionName(setAxisXLabelOpacity),
        CONST_SELECTION_FACTOR_Y_ANIMATION_KEY = getFunctionName(setSelectionFactorY),
        CONST_SET_ZOOM_START_ANIMATION_KEY = getFunctionName(setZoomStart),
        CONST_SET_ZOOM_END_ANIMATION_KEY = getFunctionName(setZoomEnd),

        ENUM_NAVIGATOR_HOVER = 1,
        ENUM_START_SELECTION_HOVER = 2,
        ENUM_END_SELECTION_HOVER = 3,
        ENUM_ZOOM_HOVER = 4,
        ENUM_SELECTION_HOVER = 5,
        ENUM_LEGEND_HOVER = 6,

        STATE_ZOOM_DAYS = 1,
        STATE_ZOOM_TRANSFORM_TO_HOURS = 2,
        STATE_ZOOM_HOURS = 3,
        STATE_ZOOM_TRANSFORM_TO_DAYS = 4;

    /**
     * Global members
     * @type {Number|Array|String|HTMLCanvasElement|CanvasRenderingContext2D|Element|Object|Date}
     */
    var container = vDocument.getElementById(ctxId),                               //canvases container
        isMobile = ("ontouchstart" in window),
        charts = [],
        displayScaleFactor,
        uIGlobalPadding,
        uiGlobalPaddingHalf,
        uIGlobalPadding2,
        uIGlobalPadding3,
        uIGlobalPadding4,
        uIBtnRadius,
        uIBtnRadius2,
        totalWidth,           //main frame width
        navigatorHeight, //nav height
        selectionHeight,      //selection window height
        navigatorHeightHalf,                                 //half navigator height
        selectionBottom,                   //selection window bottom
        navigatorTop,        //navigator top
        navigatorBottom,                          //navigator bottom
        totalHeight, //main frame height
        needRedraw,                 //main frame invalidated need redraw
        mainCanvas,                 //canvas of the main frame
        bufferNavigatorCanvas,      //canvas of the navigators buffer
        frameContext,               //drawing context of the main frame canvas
        bufferNavigatorContext,     //drawing context of the navigators buffer

        xAxisDataRef,

        yAxisDataRefs = [],

        animations = {},
        configMinValueAxisY,    //@type {Number} Min value for Y-axes (if undefined then will be auto calculated)

        mouseX,                 //@type {Number} mouse X-coord
        mouseY,                 //@type {Number} mouse Y-coord
        mouseOffsetX,           //@type {Number} mouse X-coord offset
        mouseOffsetY,           //@type {Number} mouse Y-coord offset
        mouseHoveredRegionType, //@type {Number} type of region hovered (ENUM_..._HOVERED const)
        mousePressed,           //@type {Boolean} mouse pressed (touched)

        mouseFrame = {},

        zoomStartFloat,                 //@type {Number} floated left bound index of data in navigator
        zoomEndFloat,                   //@type {Number} floated right bound index of data in navigator
        zoomStartInt,                   //@type {Number} natural left bound index of data in navigator
        zoomEndInt,                     //@type {Number} natural right bound index of data in navigator

        selectionStartIndexFloat,       //@type {Number} floated left bound index of data in selection window
        selectionEndIndexFloat,         //@type {Number} floated right bound index of data in selection window
        selectionStartIndexInt,         //@type {Number} natural left bound index of data in selection window
        selectionEndIndexInt,           //@type {Number} natural right bound index of data in selection window

        selectionCurrentIndexFloat,     //@type {Number} floated under cursor index of data under cursor
        selectionCurrentIndexPinned,
        isSelectionCurrentIndexChanged,

        selectionFactorX,               //@type {Number} ratio factor of X-axis in selection window
        selectionFactorY,               //@type {Number} ratio factor of Y-axis in selection window
        selectionMinY,                  //@type {Number} min value of Y-axis in selection window
        selectionMaxY,                  //@type {Number} max value of Y-axis in selection window
        selectionNeedUpdateFactorY,     //@type {Number} selectionFactorY invalidated need recalculate

        smartAxisXStart,                //@type {Number} frozen X-axis left bound for scroll
        smartAxisXRange,                //@type {Number} frozen X-axis range for scroll
        smartAxisXFrozen,               //@type {Number} X-axis labels resort frozen
        smartAxisXRatio,                //@type {Number} floated X-axis sub labels factor
        smartAxisXFrozenStart,          //@type {Number} frozen selectionStartIndexFloat for scroll
        smartAxisXFrozenEnd,            //@type {Number} frozen selectionEndIndexFloat for scroll
        smartAxisXOpacity = 1,          //@type {Number} opacity of X-axis labels
        smartAxisYOpacity = 1,          //@type {Number} opacity of Y-axis labels

        navigatorFactorX,               //@type {Number} ratio factor of X-axis in navigator
        navigatorFactorY,               //@type {Number} ratio factor of Y-axis in navigator
        navigatorMinY,                  //@type {Number} min value of Y-axis in navigator
        navigatorMaxY,                  //@type {Number} max value of Y-axis in navigator
        navigatorPressed = 0,           //@type {Number} pressed navigator 0..1 (opacity)
        navigatorPressedRegionType,     //@type {Number} type of pressed element for animations
        navigatorNeedUpdateBuffer,      //@type {Boolean} navigators buffer invalidated need repaint

        seriesMaxOpacity,               //@type {Number} max opacity of series for animations

        legendDateText,                 //@type {String} X-axis value legend text
        legendWidth,                    //@type {Number} width of legend
        legendHeight,                   //@type {Number} height of legend
        legendTop,                      //@type {Number} top of legend
        legendLeft,                     //@type {Number} left of legend
        legendTextLeft = [],            //@type {Array of number} left coords of columns in legend
        legendDateTop,                  //@type {Number} top of X-axis value legend text
        legendCursorOpacity = 0,           //@type {Number} opacity of legend container
        legendBoxOpacity = 0,           //@type {Number} opacity of legend container

        envSmallTextHeight,             //@type {Number} small font height
        envDefaultTextHeight,           //@type {Number} regular font height
        envColor,              //@type {Array of numbers} array of opacity by environment color 0..1 step 0.01
        envBgColor,            //@type {Array of numbers} array of opacity by environment background color 0..1
        envRegularSmallFont,            //@type {String} regular small font
        envBoldSmallFont,               //@type {String} bold small font
        envRegularDefaultFont,          //@type {String} regular default font
        envBoldDefaultFont,             //@type {String} bold default font

        lastPerformance,                //@type {Number} last frame time
        frameDelay = 0,                 //@type {Number} current repaint time for animation corrections

        boundHighlight,                 //@type {Number} out of bounds highlight opacity 0..1
        dateSingleton = new Date(),     //@type {Date} singleton for date format
        dateSingletonFull = new Date(),     //@type {Date} singleton for date format

        timeZoneOffset = dateSingleton.getTimezoneOffset() * 60000,

        isTouchEvent,
        dayRangeDiv,
        titleDiv,
        zoomOutDiv,
        currentZoomState,

        updateDateRangeTextTimer,
        buttonsContainer,
        loadDetailsCallback,
        animationCounter,
        dataStore = {
            days: {
                xAxisData: vNull,
                yAxisData: vNull,
                startIndex: vNull,
                endIndex: vNull
            },
            hours: {
                xAxisData: vNull,
                yAxisData: vNull,
                startIndex: vNull,
                endIndex: vNull,
                from: vNull,
                to: vNull
            }
        };

    var AxisInfo = function (alias, xData, yData, width, height, lineWidth, isStartFromZero) {
        var length = xData.length,
            maxX = xData[length - 1],
            minX = xData[1],
            maxY = vUndefined,
            minY = isStartFromZero ? 0 : vUndefined,

            localMaxY,
            localMinY,

            factorX,
            factorY;

        for (var _k = 1; _k < length; _k++) {
            var _val = yData[_k];
            maxY = getMax(_val, maxY);
            minY = getMin(_val, minY);
        }
        localMaxY = maxY;
        localMinY = minY;

        function getMaxX() {
            return maxX;
        }

        function getMaxY() {
            return maxY;
        }

        function getMinX() {
            return minX;
        }

        function getMinY() {
            return minY;
        }

        function setLocalMinY(val) {
            localMinY = val;
            animate(factorY, setFactorY, -(height - 2) / (localMaxY - localMinY),
                vNull, vUndefined, vTrue);
        }

        function getLocalMaxY() {
            return localMaxY;
        }

        function getLocalMinY() {
            return localMinY;
        }

        function getFactorY() {
            return factorY;
        }

        function getFactorX() {
            return factorX;
        }

        function setFactorY(val) {
            factorY = val;
        }

        function setFactorX(val) {
            factorX = val;
        }

        function getLineWidth() {
            return lineWidth;
        }

        function calculateFactors(startIndex, endIndex, withoutAnimations) {
            var _startIndexInt = fMathFloor(startIndex),
                _endIndexInt = fMathCeil(endIndex),
                _localMaxY = vUndefined,
                _localMinY = isStartFromZero ? 0 : vUndefined,
                _factorY,
                _value,
                _j;

            if (_startIndexInt === 0) {
                _startIndexInt++;
            }
            for (_j = _startIndexInt; _j <= _endIndexInt; _j++) {
                _value = yData[_j];
                _localMaxY = getMax(_value, _localMaxY);
                _localMinY = getMin(_value, _localMinY);
            }
            if (_localMaxY) {
                _factorY = -(height - 2) / (localMaxY - localMinY);
                factorX = width / (endIndex - startIndex);
                localMaxY = _localMaxY;
                if (isStartFromZero || localMinY === selectionMinY) {
                    localMinY = _localMinY
                    animate.apply(this, [factorY, setFactorY, _factorY,
                        (withoutAnimations ? 1 : vNull), vTrue]);
                } else {
                    animate.apply(this, [localMinY * 1, setLocalMinY, _localMinY,
                        (withoutAnimations ? 1 : vNull), vTrue]);
                }
            }
        }

        function getAlias() {
            return alias;
        }

        function toString() {
            return "AxisInfo " + name + " {\n" +
                "\t\tlength: " + length + ",\n" +
                "\t\tminX: " + minX + " " + (new Date(minX)).toISOString() + ",\n" +
                "\t\tmaxX: " + maxX + " " + (new Date(maxX)).toISOString() + ",\n" +
                "\t\tfactorX: " + factorX + ",\n" +
                "\t\tminY: " + minY + ",\n" +
                "\t\tmaxY: " + maxY + ",\n" +
                "\t\tfactorY: " + factorY + ",\n" +
                "}";
        }

        return {
            getAlias: getAlias,
            getMaxX: getMaxX,
            getMinX: getMinX,
            getMaxY: getMaxY,
            getMinY: getMinY,
            getLocalMaxY: getLocalMaxY,
            getLocalMinY: getLocalMinY,
            getFactorY: getFactorY,
            getFactorX: getFactorX,
            calculateFactors: calculateFactors,
            getLineWidth: getLineWidth,
            toString: toString
        };
    };

    var ChartInfo = function (xInfo, yInfo) {

        var alias = yInfo.alias;
        var name = yInfo.name;
        var type = yInfo.type;
        var xData = xInfo.data;
        var yData = yInfo.data;
        var color = yInfo.color;
        var smartAxisYRangeInt;
        var smartAxisYRangeFloat;

        var opacity = 1,
            enabled = vTrue,
            filterAxis = new AxisInfo(alias + "f", xData, yData, totalWidth, navigatorHeight, 1, vTrue),
            mainAxis = new AxisInfo(alias + "m", xData, yData, totalWidth, selectionHeight, config.lineWidth || 2, vTrue);

        var _lastIndex = xData.length - 1;
        filterAxis.calculateFactors(1, _lastIndex);
        mainAxis.calculateFactors(1, _lastIndex);

        function setSmartAxisYRange(val) {
            smartAxisYRangeFloat = val;
        }

        function calculateSmartAxisY() {
            var _prevProposed = fMathCeil((mainAxis.getLocalMaxY() - mainAxis.getLocalMinY()) / 6),
                _threshold = _prevProposed / 25,
                _i = fMathCeil(mainAxis.getLocalMinY()),
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
            animate.apply(this, [smartAxisYRangeFloat, setSmartAxisYRange, _newProposed]);
            smartAxisYRangeInt = _newProposed;
        }

        function getColor() {
            return color;
        }

        function getOpacity() {
            return opacity;
        }

        function setOpacity(val) {
            opacity = val;
            navigatorNeedUpdateBuffer = vTrue;
        }

        function getName() {
            return name;
        }

        function getType() {
            return type;
        }

        function getAlias() {
            return alias;
        }

        function drawYAxisLabels(isRight) {
            var _selectionAxis = selectionBottom,
                _labelY,
                _nextScaleValue = fMathCeil(mainAxis.getLocalMinY()),
                _value,
                _textLength;
            while (_selectionAxis > navigatorHeightHalf) {
                _labelY = fParseInt(_selectionAxis) + CONST_ANTI_BLUR_SHIFT - uIGlobalPadding;
                _value = _nextScaleValue.toString();
                _textLength = _value.length;
                if (_textLength > 6) {
                    _value = _nextScaleValue / 1000000 + "M";
                }
                else if (_textLength > 3) {
                    _value = _nextScaleValue / 1000 + "K";
                }

                setFillStyle(frameContext, envBgColor);
                var _textWidth = getTextWidth(frameContext, _value);
                var _labelX = isRight ? totalWidth - uiGlobalPaddingHalf - _textWidth : uiGlobalPaddingHalf;

                fillRect(frameContext, _labelX, _labelY - envSmallTextHeight + 2 * displayScaleFactor,
                    _textWidth + uIGlobalPadding2, envSmallTextHeight);
                setFillStyle(frameContext, envColor);
                fillText(frameContext, _value, _labelX, _labelY);
                _nextScaleValue = fParseInt(_nextScaleValue + smartAxisYRangeInt);
                _selectionAxis = _selectionAxis + smartAxisYRangeFloat * mainAxis.getFactorY();
            }

        }

        /**
         * Draws the horizontal grid
         */
        function drawHorizontalGrid() {
            var _nextScaleLevel = selectionBottom,
                _yCoordinate;
            beginPath(frameContext);
            setGlobalAlpha(frameContext, 0.1);
            setStrokeStyle(frameContext, envColor);
            setLineWidth(frameContext, displayScaleFactor);
            while (_nextScaleLevel > navigatorHeightHalf) {
                _yCoordinate = fMathCeil(_nextScaleLevel) + CONST_ANTI_BLUR_SHIFT;
                moveOrLine(frameContext, vTrue, 0, _yCoordinate);
                moveOrLine(frameContext, vFalse, totalWidth, _yCoordinate);
                _nextScaleLevel = _nextScaleLevel + smartAxisYRangeFloat * mainAxis.getFactorY();
            }
            endPath(frameContext);
            setGlobalAlpha(frameContext, 1);
        }


        function drawSeriesCore(context, axis, startIndexFloat, startIndexInt, endIndexInt, bottom) {
            var _k,
                _j,
                _i,
                _xValue,
                _yValue,
                _minY = axis.getLocalMinY(),
                _factorX = axis.getFactorX(),
                _factorY = axis.getFactorY(),
                _lineWidth = axis.getLineWidth();
            //selection series
            beginPath(context);
            setGlobalAlpha(context, opacity);
            setStrokeStyle(context, color);
            setLineWidth(context, _lineWidth * displayScaleFactor);

            for (_k = startIndexInt; _k <= endIndexInt;) {
                _xValue = (_k - startIndexFloat) * _factorX;
                _yValue = bottom + (yData[_k] - _minY) * _factorY;
                moveOrLine(context, _k++ === startIndexInt, _xValue, _yValue);

                //todo
                if (currentZoomState === STATE_ZOOM_TRANSFORM_TO_HOURS ||
                    currentZoomState === STATE_ZOOM_TRANSFORM_TO_DAYS) {
                    var _currentLeft = _xValue;
                    var _currentTop = _yValue;
                    if (_k - 1 === dataStore.hours.from) {
                        for (_j = dataStore.hours.startIndex; _j <= dataStore.hours.endIndex; _j++) {
                            _xValue = _currentLeft + (_j - dataStore.hours.startIndex) * dataStore.hours.factors.factorX;
                            _yValue = bottom + ( dataStore.hours.yAxisData[_i].data[_j] - dataStore.hours.factors.minY) * dataStore.hours.factors.factorY;
                            var _resultY = _currentTop * (1 - animationCounter) + _yValue * animationCounter;
                            moveOrLine(context, vFalse, _xValue, _resultY);
                        }
                    }
                }
            }
            endPath(context);
        }

        function drawMainSeries() {
            drawSeriesCore(frameContext, mainAxis,
                selectionStartIndexFloat,
                selectionStartIndexInt,
                selectionEndIndexInt,
                selectionBottom);
        }

        function drawFilterSeries() {
            drawSeriesCore(bufferNavigatorContext, filterAxis,
                1,
                1,
                _lastIndex,
                navigatorHeight);
        }

        function drawPoints() {
            setLineWidth(frameContext, mainAxis.getLineWidth() * displayScaleFactor);
            var _sValueX = (selectionCurrentIndexFloat - selectionStartIndexFloat  ) * mainAxis.getFactorX(),
                _sValueY,
                _sValueYTo,
                _from = fMathFloor(selectionCurrentIndexFloat),
                _to = _from + 1,
                _sValueYFrom = selectionBottom + (yData[_from] - mainAxis.getLocalMinY()) * mainAxis.getFactorY();
            if (_from === selectionCurrentIndexFloat || _to > _lastIndex) {
                _sValueY = _sValueYFrom;
            } else {
                _sValueYTo = selectionBottom + (yData[_to] -  mainAxis.getLocalMinY()) *  mainAxis.getFactorY();
                _sValueY = _sValueYFrom + (_sValueYTo - _sValueYFrom) * (selectionCurrentIndexFloat - _from);
            }

            beginPath(frameContext);
            setGlobalAlpha(frameContext, legendCursorOpacity * opacity);
            setFillStyle(frameContext, envBgColor);
            circle(frameContext, _sValueX, _sValueY, 3 * displayScaleFactor);
            fill(frameContext);
            beginPath(frameContext);
            setStrokeStyle(frameContext, color);
            circle(frameContext, _sValueX, _sValueY, 4 * displayScaleFactor);
            endPath(frameContext);
        }

        function handleButtonPress(e, owner) {
            enabled = !enabled
            if (enabled) {
                e.currentTarget.classList.add("checked");
            } else {
                e.currentTarget.classList.remove("checked");
            }
            animate.apply(owner, [opacity, setOpacity, enabled ? 1 : 0]);
            selectionNeedUpdateFactorY = vTrue;
        }

        function createButton() {
            var _button = createElement("div",
                "btn_", ["button", "checked"], {
                    border: "2px " + color + " solid",
                    color: color, backgroundColor: color
                }, buttonsContainer);
            var _that = this;
            _button.addEventListener("click", function (e) {
                handleButtonPress(e, _that);
            });

            var _checkBox = createElement("span",
                "ch_", ["button-icon"], {}, _button);

            _checkBox.innerHTML = "<?xml version=\"1.0\" encoding=\"iso-8859-1\"?>\n" +
                "<svg  xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"12px\" height=\"12px\" x=\"0px\" y=\"0px\"" +
                " viewBox=\"0 0 17.837 17.837\">" +
                "<g>" +
                "<path style=\"fill:#ffffff;\" d=\"M16.145,2.571c-0.272-0.273-0.718-0.273-0.99,0L6.92,10.804l-4.241-4.27" +
                "c-0.272-0.274-0.715-0.274-0.989,0L0.204,8.019c-0.272,0.271-0.272,0.717,0,0.99l6.217,6.258c0.272,0.271,0.715,0.271,0.99,0" +
                "L17.63,5.047c0.276-0.273,0.276-0.72,0-0.994L16.145,2.571z\"/>" +
                "</g>" +
                "</svg>";

            var _text = createElement("span",
                "ch_", ["button-text"], {}, _button);
            _text.innerHTML = name;
        }

        function toString() {
            return "Chart " + name + " {\n" +
                "\ttype: " + type + ",\n" +
                "\tcolor: " + color + ",\n" +
                "\tmainAxis: " + mainAxis.toString() + ",\n" +
                "\tfilterAxis: " + filterAxis.toString() + ",\n" +
                "\tismartAxisYRangeInt: " + smartAxisYRangeInt + ",\n" +
                "}";
        }

        function getMainAxis() {
            return mainAxis;
        }

        return {
            getColor: getColor,
            getName: getName,
            getType: getType,
            getAlias: getAlias,
            getOpacity: getOpacity,
            calculateSmartAxisY: calculateSmartAxisY,
            drawYAxisLabels: drawYAxisLabels,
            drawHorizontalGrid: drawHorizontalGrid,
            drawMainSeries: drawMainSeries,
            drawFilterSeries: drawFilterSeries,
            drawPoints: drawPoints,
            getMainAxis: getMainAxis,
            createButton: createButton,
            toString: toString
        };
    };

    /**
     * Initializes the environment
     */
    function initialize() {
        if (!config) {
            config = {};
        }
        if (config.startAxisAtZero === vFalse ? vFalse : vTrue) {
            configMinValueAxisY = 0;
        }
        config.showTouches = config.showTouches === vFalse ? vFalse : vTrue;
        config.showBounds = config.showBounds === vFalse ? vFalse : vTrue;
        createTitleLabels();

        mainCanvas = createCanvas();
        bufferNavigatorCanvas = createCanvas();
        frameContext = mainCanvas.getContext("2d");
        bufferNavigatorContext = bufferNavigatorCanvas.getContext("2d");
        recalculateBounds();
        container.appendChild(mainCanvas);

        buttonsContainer = createElement("div",
            "buttons_cnt_", ["buttons"], {margin: CONST_PIXEL_MARGIN}, container);


        mainCanvas.onmousemove = handleMouseMove;
        mainCanvas.ontouchmove = handleMouseMove;
        mainCanvas.onmouseout = handleMouseMove;
        mainCanvas.onmouseover = onMouseUpInner;
        mainCanvas.onmousedown = onMouseDownInner;
        mainCanvas.onmouseup = onMouseUpInner;
        mainCanvas.ontouchstart = onMouseDownInner;
        mainCanvas.ontouchend = onMouseUpInner;

        calcMouseOffset();
        invalidate();
    }

    function updateDateRangeText() { //        "1 April 2019 - 30 April 2019";
        var result = "-";
        if (xAxisDataRef) {
            var from = formatDateFull(xAxisDataRef.data[selectionStartIndexInt]);
            var to = formatDateFull(xAxisDataRef.data[selectionEndIndexInt]);
            result = from + " - " + to;
        }
        dayRangeDiv.innerHTML = result;
    }

    function recalculateBounds() {
        isMobile = ('ontouchstart' in window);
        displayScaleFactor = window.devicePixelRatio;
        uIGlobalPadding = 5 * displayScaleFactor;
        uiGlobalPaddingHalf = uIGlobalPadding / 2;
        uIGlobalPadding2 = uIGlobalPadding * 2;
        uIGlobalPadding3 = uIGlobalPadding * 3;
        uIGlobalPadding4 = uIGlobalPadding * 4;
        uIBtnRadius = 16 * displayScaleFactor;
        uIBtnRadius2 = uIBtnRadius * 2;

        totalWidth = container.offsetWidth * displayScaleFactor - uIGlobalPadding2;           //main frame width
        navigatorHeight = fParseInt(totalWidth * CONST_NAVIGATOR_HEIGHT_PERCENT / 100); //nav height
        selectionHeight = totalWidth - navigatorHeight - navigatorHeight * 2;      //selection window height
        navigatorHeightHalf = navigatorHeight / 2;                                 //half navigator height
        selectionBottom = selectionHeight + navigatorHeightHalf;                   //selection window bottom
        navigatorTop = fParseInt(selectionHeight + navigatorHeight + uIGlobalPadding4);        //navigator top
        navigatorBottom = navigatorTop + navigatorHeight;                          //navigator bottom
        totalHeight = navigatorBottom + uIGlobalPadding; //main frame height

        mainCanvas[CONST_WIDTH] = totalWidth;
        mainCanvas[CONST_HEIGHT] = totalHeight;

        bufferNavigatorCanvas[CONST_WIDTH] = totalWidth;
        bufferNavigatorCanvas[CONST_HEIGHT] = navigatorHeight;


        var _size = getBodyStyle("font-size"),
            _fontFamilyCombined = CONST_PIXEL + " " + getBodyStyle("font-family"),
            _mainCanvasStyle = mainCanvas.style,
            _baseFontSize = fParseInt(_size.replace(/\D/g, ""));


        setLineWidth(bufferNavigatorContext);
        envSmallTextHeight = fParseInt(_baseFontSize * 0.8 * displayScaleFactor);
        envDefaultTextHeight = fParseInt(_baseFontSize * displayScaleFactor);

        envRegularSmallFont = envSmallTextHeight + _fontFamilyCombined;
        envRegularDefaultFont = envDefaultTextHeight + _fontFamilyCombined;
        envBoldSmallFont = CONST_BOLD_PREFIX + envRegularSmallFont;
        envBoldDefaultFont = CONST_BOLD_PREFIX + envRegularDefaultFont;

        setFont(frameContext, envRegularSmallFont);
        _mainCanvasStyle[CONST_WIDTH] = fParseInt(totalWidth / displayScaleFactor) + CONST_PIXEL;
        _mainCanvasStyle[CONST_HEIGHT] = fParseInt(totalHeight / displayScaleFactor) + CONST_PIXEL;
        _mainCanvasStyle.marginLeft = "5" + CONST_PIXEL;
        navigatorNeedUpdateBuffer = vTrue;
        selectionNeedUpdateFactorY = vTrue;
        frameContext.lineJoin = "bevel";
        calcNavigatorFactors(vTrue); //todo not reset
    }

    function onMouseDownInner(e) {
        handleMouseClick(e, vTrue);
    }

    function onMouseUpInner(e) {
        handleMouseClick(e, vFalse);
    }

    /**
     * Creates the canvas
     * @returns {Element}
     */
    function createCanvas() {
        return vDocument.createElement("canvas");
    }

    /**
     * Return hovered element
     * @returns {Number}
     */
    function getMouseHoveredRegionType() {
        return mouseHoveredRegionType;
    }

    function setLoadDetailsCallback(callback) {
        loadDetailsCallback = callback;
    }


    //======== setters for animation ========
    function setSelectionFactorY(val) {
        selectionFactorY = val;
    }

    function setSelectionMinY(val) {
        selectionMinY = val;
        animate(selectionFactorY, setSelectionFactorY, -(selectionHeight - 2) / (selectionMaxY - selectionMinY),
            vNull, vTrue);
    }

    function setNavigationFactorY(val) {
        navigatorFactorY = val;
        navigatorNeedUpdateBuffer = vTrue;
    }

    function setNavigatorMinY(val) {
        navigatorMinY = val;
        navigatorNeedUpdateBuffer = vTrue;
        if (animate(navigatorFactorY, setNavigationFactorY, -(navigatorHeight - 2) / (navigatorMaxY - navigatorMinY), vNull, vTrue)) {
            animate(smartAxisYOpacity, setAxisYLabelOpacity, 0, 2);
        }
    }

    function setNavigatorPressed(val) {
        navigatorPressed = val;
    }

    function setZoomStart(val) {
        zoomStartFloat = val;
        selectionNeedUpdateFactorY = vTrue;
    }

    function setZoomEnd(val) {
        zoomEndFloat = val;
        selectionNeedUpdateFactorY = vTrue;
    }

    function setSelectionCurrentIndexFloat(val) {
        selectionCurrentIndexFloat = val;
    }

    function setLegendCursorOpacity(val) {
        legendCursorOpacity = val;
    }

    function setLegendBoxOpacity(val) {
        legendBoxOpacity = val;
    }

    function setLegendWidth(val) {
        legendWidth = val;
    }

    function setAxisYLabelOpacity(val) {
        smartAxisYOpacity = val;
    }


    function setAxisXLabelOpacity(val) {
        smartAxisXOpacity = val;
    }

    function setSmartAxisRatio(val) {
        smartAxisXRatio = val;
    }

    function setAnimationCounter(val) {
        animationCounter = val;
    }

    function setBoundHighlight(val) {
        boundHighlight = val;
    }

    /**
     * Clears the chart
     */
    function clear() {
        removeAllChild(buttonsContainer);
        charts.length = 0;
        xAxisDataRef = vNull;
        yAxisDataRefs = [];
        invalidateInner();
    }

    function removeAllChild(parent) {
        while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
        }
        parent.innerHTML = "";
    }


    /**
     * Destroy chart
     */
    function destroy() {
        mainCanvas.onmousemove = vUndefined;
        mainCanvas.ontouchmove = vUndefined;
        mainCanvas.onmouseout = vUndefined;
        mainCanvas.onmouseover = vUndefined;
        mainCanvas.onmousedown = vUndefined;
        mainCanvas.onmouseup = vUndefined;
        mainCanvas.ontouchstart = vUndefined;
        mainCanvas.ontouchend = vUndefined;
        removeAllChild(container);
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
    function invalidate(isFull) {

        if (isFull) {
            recalculateBounds();
        }

        envColor = getBodyStyle("color");
        envBgColor = getBodyStyle("background-color");

        calcMouseOffset();
        invalidateInner();
    }

    /**
     * Draws a json data
     * @param data {JSON} chart data
     */
    function draw(data) {
        if (data) {
            prepareCaches(data);
            currentZoomState = STATE_ZOOM_DAYS;
            invalidateInner();
        }
    }


    function getBodyStyle(propertyName) {
        var _el = vDocument.body,
            _currentStyle = _el.currentStyle;
        return _currentStyle ?
            _currentStyle[propertyName] :
            vDocument.defaultView.getComputedStyle(_el, vNull)[propertyName];
    }


    function formatDate(timestamp, withDay) {  //Jan 29
        dateSingleton.setTime(timestamp + timeZoneOffset);
        var _result = (withDay ? CONST_DAY_NAMES_SHORT[dateSingleton.getDay()] + ", " : "" ) +
            CONST_MONTH_NAMES_SHORT[dateSingleton.getMonth()] + " " + dateSingleton.getDate();
        if (withDay && config.withYearLabel) {
            _result = dateSingleton.getFullYear() + ", " + _result;
        }
        return _result;
    }


    function formatTime(timestamp) {  //Jan 29
        dateSingleton.setTime(timestamp + timeZoneOffset);
        return ("0" + (dateSingleton.getHours())).slice(-2) + ":" + ("0" + (dateSingleton.getMinutes())).slice(-2);
    }


    function formatDateFull(timestamp) {
        dateSingletonFull.setTime(timestamp + timeZoneOffset);
        var _result = dateSingletonFull.getDate() + " " +
            CONST_MONTH_NAMES_FULL[dateSingletonFull.getMonth()] + " " + dateSingletonFull.getFullYear();
        return _result;
    }


    function getMax(val, prev) {
        return prev === vUndefined || val > prev ? val : prev;
    }

    function getMin(val, prev) {
        return prev === vUndefined || val < prev ? val : prev;
    }


    function setCursor(cursorIndex) {
        mainCanvas.style.cursor = CONST_CURSORS[cursorIndex];
    }


    function updateHoveredInfo(proposed, force) {
        if (mouseHoveredRegionType !== proposed || force) {
            mouseHoveredRegionType = proposed;

            if (mouseHoveredRegionType !== ENUM_SELECTION_HOVER &&
                mouseHoveredRegionType !== ENUM_LEGEND_HOVER) {
                selectionCurrentIndexPinned = vFalse;
                animate(legendCursorOpacity, setLegendCursorOpacity, 0);
                animate(legendBoxOpacity, setLegendBoxOpacity, 0);
            }

            //Set cursor
            if (mouseHoveredRegionType === ENUM_SELECTION_HOVER) { //most likely
                if (currentZoomState !== STATE_ZOOM_TRANSFORM_TO_HOURS) {
                    animate(legendCursorOpacity, setLegendCursorOpacity, 1);
                    setCursor(0);
                }
            } else if (mouseHoveredRegionType === ENUM_ZOOM_HOVER ||
                mouseHoveredRegionType === ENUM_LEGEND_HOVER) {
                setCursor(1);
            } else if (mouseHoveredRegionType === ENUM_START_SELECTION_HOVER ||
                mouseHoveredRegionType === ENUM_END_SELECTION_HOVER) {
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
        var _result = vNull;

        if (!navigatorFactorX) {
            return;
        }

        if (mouseY < navigatorTop && selectionFactorX) { //Selection hovered
            var _sValueX = (selectionCurrentIndexFloat - selectionStartIndexFloat  ) * selectionFactorX + legendLeft;

            if (_sValueX > totalWidth - legendWidth) {
                _sValueX = totalWidth - legendWidth;
            } else if (_sValueX < 0) {
                _sValueX = 0;
            }
            if (legendBoxOpacity === 1 &&
                mouseY > legendTop &&
                mouseY < legendTop + legendHeight &&
                mouseX > _sValueX &&
                mouseX < _sValueX + legendWidth) { //Legend hovered
                _result = ENUM_LEGEND_HOVER;
                invalidateInner();
            }
            else {
                if ((legendBoxOpacity === 0 && !force) || !selectionCurrentIndexPinned || mousePressed) {
                    var _proposed = fMathRound(mouseX / selectionFactorX + selectionStartIndexFloat);
                    _proposed = getMin(getMax(1, _proposed), xAxisDataRef.l - 1);
                    isSelectionCurrentIndexChanged = _proposed !== selectionCurrentIndexFloat;
                    calcLegendPosition(_proposed);
                    animate(selectionCurrentIndexFloat, setSelectionCurrentIndexFloat, _proposed, 3);
                    mouseFrame.tS = zoomStartFloat;
                    mouseFrame.tE = zoomEndFloat;
                    mouseFrame.tF = mouseX;
                }
                _result = ENUM_SELECTION_HOVER;
                invalidateInner();
            }
        } else if (mouseY > navigatorTop && mouseY < navigatorBottom) { //Navigator hovered
            _result = ENUM_NAVIGATOR_HOVER;
            var _startZoom = ( zoomStartFloat) * navigatorFactorX,
                _endZoom = ( zoomEndFloat) * navigatorFactorX,
                _startZShift = _startZoom - mouseX,
                _endZShift = _endZoom - mouseX;

            if (fMathAbs(_startZShift) < uIGlobalPadding2) { //Navigator start edge hovered
                _result = ENUM_START_SELECTION_HOVER;
            } else if (fMathAbs(_endZShift) < uIGlobalPadding2) { //Navigator end edge hovered
                _result = ENUM_END_SELECTION_HOVER;
            } else if (mouseX > _startZoom && mouseX < _endZoom) { //Navigator center hovered
                mouseFrame.nS = _startZShift / navigatorFactorX;
                mouseFrame.nE = _endZShift / navigatorFactorX;
                _result = ENUM_ZOOM_HOVER;
            }
        }
        updateHoveredInfo(_result, force);
    }


    function stopPropagation(e) {
        e.preventDefault();
        e.stopPropagation();
    }


    function associateZoomStart(val, frameCount) {
        zoomStartInt = val * navigatorFactorX;
        animate(zoomStartFloat, setZoomStart, val, frameCount);
    }


    function associateZoomEnd(val, frameCount) {
        zoomEndInt = val * navigatorFactorX;
        animate(zoomEndFloat, setZoomEnd, val, frameCount);
    }


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

            if (mouseHoveredRegionType === ENUM_ZOOM_HOVER) {
                moveNavigatorFrame(_proposedX, _maxProposedX, mouseFrame.nS, mouseFrame.nE);
            } else if (mouseHoveredRegionType === ENUM_START_SELECTION_HOVER) {
                if (zoomEndFloat - _proposedX > _threshold) {
                    associateZoomStart(_proposedX);
                }
            } else if (mouseHoveredRegionType === ENUM_END_SELECTION_HOVER) {
                if (_proposedX - zoomStartFloat > _threshold) {
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
            if (mouseHoveredRegionType !== ENUM_SELECTION_HOVER) {
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
            mouseX = fParseInt((_clientX - mouseOffsetX) * displayScaleFactor);
            mouseY = fParseInt((_clientY - mouseOffsetY) * displayScaleFactor);
            if (mouseY >= -uIGlobalPadding && mouseX >= -uIGlobalPadding &&
                mouseX <= totalWidth + uIGlobalPadding && mouseY <= totalHeight + uIGlobalPadding) {
                mousePressed && !calcOnly ? moveHoveredElement() : calcHoveredElement();
                invalidateInner();
                return vTrue;
            }
        }
        if (!calcOnly) {
            updateHoveredInfo(vNull);
        }
        return vFalse;
    }


    function handleMouseMove(e, withoutPress) {

        if (mouseHoveredRegionType === ENUM_ZOOM_HOVER ||
            mouseHoveredRegionType === ENUM_START_SELECTION_HOVER ||
            mouseHoveredRegionType === ENUM_END_SELECTION_HOVER) {
            stopPropagation(e);
        }
        calcMouseOffset();
        var _touches = e.touches;
        isTouchEvent = _touches && getLength(_touches);

        if (mouseHoveredRegionType === ENUM_SELECTION_HOVER) {
            withoutPress = vTrue;
            if (currentZoomState !== STATE_ZOOM_TRANSFORM_TO_HOURS &&
                legendBoxOpacity === 0 && (selectionCurrentIndexPinned || isTouchEvent)) {
                if (isTouchEvent) {
                    selectionCurrentIndexPinned = vFalse;
                }
                animate(legendBoxOpacity, setLegendBoxOpacity, 1);
            }
        }

        var newVar = isTouchEvent ?
            assignMousePos(_touches[0], withoutPress) :
            assignMousePos(e, withoutPress);

        if (isTouchEvent && mouseHoveredRegionType === ENUM_SELECTION_HOVER && withoutPress) {
            newVar = false;
        }
        return newVar;
    }

    function updateTitleStatus() {
        if (currentZoomState === STATE_ZOOM_HOURS ||
            currentZoomState === STATE_ZOOM_TRANSFORM_TO_HOURS) {
            zoomOutDiv.classList.remove("hidden");
            titleDiv.classList.add("hidden");
        } else {
            zoomOutDiv.classList.add("hidden");
            titleDiv.classList.remove("hidden");
        }
    }

    function zoomInToHours(pData, pTimeStamp) {
        currentZoomState = STATE_ZOOM_TRANSFORM_TO_HOURS;
        updateTitleStatus();
        dataStore.days.startIndex = selectionStartIndexInt;
        dataStore.days.endIndex = getMin(selectionEndIndexInt, xAxisDataRef.l - 2);
        dataStore.days.factorY = selectionFactorY;
        dataStore.hours.from = fParseInt(selectionCurrentIndexFloat);
        dataStore.hours.to = dataStore.hours.from + 1;
        prepareCaches(pData, vTrue);
        updateHoveredInfo(vNull);
        animate(smartAxisXRatio, setSmartAxisRatio, 0, 1);
        smartAxisXFrozenStart = selectionStartIndexFloat;
        smartAxisXFrozenEnd = selectionEndIndexFloat;
        smartAxisXFrozen = vTrue;
        delete animations[CONST_AXIS_X_LABEL_OPACITY_ANIMATION_KEY];
        setAxisXLabelOpacity(1);

        associateZoomEnd(dataStore.hours.to - 1, 15);
        associateZoomStart(dataStore.hours.from - 1, 15);
        animationCounter = 0;
        animate(animationCounter, setAnimationCounter, 1, 15);
        // invalidateInner();
    }

    function zoomOutToDays() {
        currentZoomState = STATE_ZOOM_TRANSFORM_TO_DAYS;
        xAxisDataRef = dataStore.days.xAxisData;
        yAxisDataRefs = dataStore.days.yAxisData;
        selectionFactorY = dataStore.days.factorY;
        zoomStartInt = dataStore.days.startIndexOff * navigatorFactorX;
        zoomEndInt = dataStore.days.endIndexOff * navigatorFactorX;
        zoomStartFloat = dataStore.days.startIndexOff;
        zoomEndFloat = dataStore.days.endIndexOff;
        dataStore.hours.from = zoomStartFloat + 1;
        dataStore.hours.to = zoomEndFloat + 1;
        calcNavigatorFactors();
        associateZoomStart(dataStore.days.startIndex, 15);
        associateZoomEnd(dataStore.days.endIndex, 15);
        animationCounter = 1;
        animate(animationCounter, setAnimationCounter, 0, 15);
        updateTitleStatus();
    }

    function loadHoursDataSuccess(data, timeStamp) {
        xAxisDataRef.detailCache[timeStamp] = data;
        zoomInToHours(data, timeStamp);
    }

    function loadHoursDataFail() {
        currentZoomState = STATE_ZOOM_DAYS;
    }

    function lookupHourData() {
        var _currentPosition = fParseInt(selectionCurrentIndexFloat);
        var _currentTimeStamp = xAxisDataRef.data[_currentPosition];
        var _detailCache = xAxisDataRef.detailCache[_currentTimeStamp];
        if (_detailCache) {
            zoomInToHours(_detailCache, _currentTimeStamp);
        } else {
            loadDetailsCallback(_currentTimeStamp,
                loadHoursDataSuccess, loadHoursDataFail);
        }
    }


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
            delete animations[CONST_AXIS_X_LABEL_OPACITY_ANIMATION_KEY];
            setAxisXLabelOpacity(1);
            if (mouseHoveredRegionType === ENUM_ZOOM_HOVER ||
                mouseHoveredRegionType === ENUM_START_SELECTION_HOVER ||
                mouseHoveredRegionType === ENUM_END_SELECTION_HOVER) {
                stopPropagation(e);
                animate(navigatorPressed, setNavigatorPressed, 1, 15);
                navigatorPressedRegionType = mouseHoveredRegionType;
            } else if (mouseHoveredRegionType === ENUM_LEGEND_HOVER) {
                if (currentZoomState === STATE_ZOOM_DAYS && loadDetailsCallback) {
                    animate(legendBoxOpacity, setLegendBoxOpacity, 0);
                    animate(legendBoxOpacity, setLegendCursorOpacity, 0);
                    lookupHourData();
                }
            } else if (mouseHoveredRegionType === ENUM_SELECTION_HOVER) {
                selectionCurrentIndexPinned = isTouchEvent ? vFalse : !selectionCurrentIndexPinned;
                if (legendBoxOpacity === 1 && !selectionCurrentIndexPinned && !isTouchEvent && !isSelectionCurrentIndexChanged) {
                    animate(legendBoxOpacity, setLegendBoxOpacity, 0);
                }
                isSelectionCurrentIndexChanged = vFalse;
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


    function setLineWidth(context, width) {
        context.lineWidth = width || displayScaleFactor;
    }


    function beginPath(context) {
        context.beginPath();
    }


    function endPath(context) {
        context.stroke();
    }


    function closePath(context) {
        context.closePath();
    }


    function getTextWidth(context, text) {
        return context.measureText(text)[CONST_WIDTH];
    }


    function fillText(context, text, x, y) {
        context.fillText(text, x, y);
    }

    function moveOrLine(context, isMove, x, y) {
        isMove ? context.moveTo(x, y) : context.lineTo(x, y);
    }


    function quadraticCurveTo(context, cpx, cpy, x, y) {
        context.quadraticCurveTo(cpx, cpy, x, y);
    }


    function fill(context) {
        context.fill();
    }


    function circle(context, x, y, radius) {
        context.arc(x, y, radius, 0, CONST_TWO_PI);
    }

    /**
     * Draws a "filled" rectangle
     * @param context {CanvasRenderingContext2D} context for drawing
     * @param x {Number} The x-coordinate of the upper-left corner of the rectangle
     * @param y {Number} The y-coordinate of the upper-left corner of the rectangle
     * @param w {Number} The width of the rectangle, in pixels
     * @param h {Number} The height of the rectangle, in pixels
     */
    function fillRect(context, x, y, w, h) {
        context.fillRect(x, y, w, h);
    }

    /**
     * Draws a rounded balloon
     * @param context {CanvasRenderingContext2D} context for drawing
     * @param x {Number} The x-coordinate of the upper-left corner of the rectangle
     * @param y {Number} The y-coordinate of the upper-left corner of the rectangle
     * @param width {Number} The width of the balloon
     * @param height {Number} The height of the balloon
     * @param highlighted {Boolean} balloon is highlighted
     * @param opacity {Number} opacity between 0 - 1
     */
    function drawBalloon(context, x, y, width, height) {
        var _xWidth = x + width,
            _yHeight = y + height;

        beginPath(context);
        setLineWidth(context);
        moveOrLine(context, vTrue, x + uIBtnRadius, y);
        moveOrLine(context, vFalse, _xWidth - uIBtnRadius, y);
        quadraticCurveTo(context, _xWidth, y, _xWidth, y + uIBtnRadius);
        moveOrLine(context, vFalse, _xWidth, _yHeight - uIBtnRadius);
        quadraticCurveTo(context, _xWidth, _yHeight, _xWidth - uIBtnRadius, _yHeight);
        moveOrLine(context, vFalse, x + uIBtnRadius, _yHeight);
        quadraticCurveTo(context, x, _yHeight, x, _yHeight - uIBtnRadius);
        moveOrLine(context, vFalse, x, y + uIBtnRadius);
        quadraticCurveTo(context, x, y, x + uIBtnRadius, y);
        closePath(context);
        setGlobalAlpha(frameContext, legendBoxOpacity * legendCursorOpacity * 0.9);
        fill(context);
        endPath(context);
    }

    /**
     * Sets the color, gradient, or pattern used for strokes
     * @param context {CanvasRenderingContext2D} context for drawing
     * @param strokeStyle {String} color
     */
    function setStrokeStyle(context, strokeStyle) {
        context.strokeStyle = strokeStyle;
    }

    /**
     * Sets the global opacity of canvas
     * @param context {CanvasRenderingContext2D} context for drawing
     * @param opacity {Number} opacity
     */
    function setGlobalAlpha(context, opacity) {
        context.globalAlpha = opacity;
    }

    /**
     * Sets the color, gradient, or pattern used to fill the drawing
     * @param context {CanvasRenderingContext2D} context for drawing
     * @param fillStyle {String} color
     */
    function setFillStyle(context, fillStyle) {
        context.fillStyle = fillStyle;
    }

    /**
     * Font of text
     * @param context {CanvasRenderingContext2D} context for drawing
     * @param val
     */
    function setFont(context, val) {
        context.font = val;
    }

    /**
     @param {Element} imgElem
     @param {Number} dx
     @param {Number} dy
     */
    function drawImage(imgElem, dx, dy) {
        frameContext.drawImage(imgElem, dx, dy);
    }


    /**
     * Draws the axis labels
     */
    function drawAxisLabels() {
        var _selectionAxis = selectionBottom,
            _needCalc = !smartAxisXStart || !smartAxisXFrozen,
            _i,
            _prevSmartAxisRange,
            _nextItem,
            _labelX,
            _labelY,
            _opacity,
            _nextStage,
            _axisRange
        ;

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

        var _mainOpacity = seriesMaxOpacity * smartAxisXOpacity * 0.5;

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
            _opacity = _opacity * _mainOpacity;
        }
        _labelY = _selectionAxis + uIGlobalPadding * 5;
        setFillStyle(frameContext, envColor);
        setLineWidth(frameContext);
        for (_i = _nextItem - _axisRange; _i <= selectionEndIndexInt; _i += _axisRange) {
            _nextItem = fMathCeil(_i);
            _labelX = (_nextItem - selectionStartIndexFloat ) * selectionFactorX;
            _opacity !== vUndefined && fMathAbs((_nextItem - smartAxisXStart) % _prevSmartAxisRange) >= 1 ?
                setGlobalAlpha(frameContext, _opacity) :
                setGlobalAlpha(frameContext, _mainOpacity);
            if (_nextItem > 0) {
                var _text = currentZoomState !== STATE_ZOOM_HOURS ?
                    formatDate(xAxisDataRef.data[_nextItem]) :
                    formatTime(xAxisDataRef.data[_nextItem]);// formatDate(xAxisDataRef.data[_nextItem]);

                fillText(frameContext, _text, _labelX, _labelY);
            }
        }

        //Y-axis labels ============================
        setGlobalAlpha(frameContext, getMin(seriesMaxOpacity, smartAxisYOpacity) * 0.5);
        for (_i in charts) {
            charts[_i].drawYAxisLabels(_i > 0);
        }


        setGlobalAlpha(frameContext, 1);
    }

    /**
     * Draws the chart series (Attention! Performance critical)
     */
    function drawSeries() {
        seriesMaxOpacity = 0;
        var _i,
            _axisY;

        if (navigatorNeedUpdateBuffer) {
            clearCanvas(bufferNavigatorContext, totalWidth, navigatorHeight);
            for (_i in charts) {
                charts[_i].drawFilterSeries();
            }
            navigatorNeedUpdateBuffer = vFalse;
        }

        for (_i in charts) {
            _axisY = charts[_i];
            seriesMaxOpacity = getMax(_axisY.getOpacity(), seriesMaxOpacity);
            _axisY.drawMainSeries();
        }

        setGlobalAlpha(frameContext, 1);
        drawImage(bufferNavigatorCanvas, 0, navigatorTop);
    }

    /**
     * Draws the legend
     */
    function drawSeriesLegend() { //todo optimize (big code)
        var _sValueX = (selectionCurrentIndexFloat - selectionStartIndexFloat  ) * selectionFactorX,
            _sValueY,
            _leftThreshold = _sValueX + legendLeft - displayScaleFactor * 2,
            _rightThreshold = 0,
            _i,
            _axisY,
            _qnt = 0,
            _overlap,
            _isEven,
            _shiftX,
            _value;

        beginPath(frameContext);
        setStrokeStyle(frameContext, envColor);
        setGlobalAlpha(frameContext, 0.4 * legendCursorOpacity);
        setLineWidth(frameContext);
        moveOrLine(frameContext, vTrue, _sValueX, 0);
        moveOrLine(frameContext, vFalse, _sValueX, selectionBottom);
        endPath(frameContext);
        for (_i in charts) {
            charts[_i].drawPoints();
        }

        if (legendBoxOpacity > 0) {
            if (_leftThreshold < 0) {
                _sValueX = displayScaleFactor * 2 - legendLeft;
            }
            else {
                _overlap = _leftThreshold + legendWidth - totalWidth + displayScaleFactor * 4;
                if (_overlap > 0) {
                    _rightThreshold = _overlap - legendWidth + uIBtnRadius2;
                    _sValueX = totalWidth - legendLeft - legendWidth - displayScaleFactor * 2;
                }
                _leftThreshold = 0;
            }

            if (_rightThreshold < 0) {
                _rightThreshold = 0;
            }
            setGlobalAlpha(frameContext, legendBoxOpacity * legendCursorOpacity);
            setGlobalAlpha(frameContext, 1);
            setStrokeStyle(frameContext, envColor);
            setFillStyle(frameContext, envBgColor);
            drawBalloon(frameContext, _sValueX + legendLeft + _leftThreshold, legendTop,
                legendWidth - _leftThreshold + _rightThreshold, legendHeight);
            setFont(frameContext, envBoldSmallFont);
            setFillStyle(frameContext, envColor);
            fillText(frameContext, legendDateText, _sValueX + legendTextLeft[0], legendDateTop);

            _sValueY = uIBtnRadius + uIGlobalPadding2;
            for (_i in yAxisDataRefs) {
                _axisY = yAxisDataRefs[_i];
                _value = _axisY.data[fMathRound(selectionCurrentIndexFloat)];
                if (_axisY.bOn) {
                    _isEven = (_qnt & 1);
                    _shiftX = legendTextLeft[_isEven];
                    if (!_isEven) {
                        _sValueY += (envDefaultTextHeight + envSmallTextHeight + uIGlobalPadding4);
                    }
                    setGlobalAlpha(frameContext, legendBoxOpacity * legendCursorOpacity);
                    setFillStyle(frameContext, _axisY.color);
                    setFont(frameContext, envBoldDefaultFont);
                    fillText(frameContext, _value, _sValueX + _shiftX, _sValueY);
                    setFont(frameContext, envRegularSmallFont);
                    fillText(frameContext, _axisY.name, _sValueX + _shiftX,
                        _sValueY + envDefaultTextHeight + uIGlobalPadding);
                    _qnt++;
                }
            }
        }
        setGlobalAlpha(frameContext, 1);
    }

    /**
     * Draws a touch circle
     */
    function drawPressHighlight() {
        if (navigatorPressed > 0 && config.showTouches) {
            var _x;

            if (navigatorPressedRegionType === ENUM_START_SELECTION_HOVER) {
                _x = zoomStartInt;
            } else if (navigatorPressedRegionType === ENUM_END_SELECTION_HOVER) {
                _x = zoomEndInt;
            }
            else {
                _x = zoomStartInt + (zoomEndInt - zoomStartInt) / 2;
            }

            beginPath(frameContext);
            setGlobalAlpha(frameContext, 0.2 * navigatorPressed);
            setFillStyle(frameContext, envColor);

            circle(frameContext, _x, navigatorTop + navigatorHeightHalf, navigatorPressed * 20 * displayScaleFactor);
            fill(frameContext);

        }
        if (boundHighlight && config.showBounds) {
            drawBoundHighlight(boundHighlight);
        }


    }

    /**
     * Draws a highlight when chart out of bounds
     * @param overflow (-1;0) - left bound, (0;1) - right bound
     */
    function drawBoundHighlight(overflow) {
        if (overflow !== 0) {
            var _x = overflow < 0 ? 0 : totalWidth - uIBtnRadius,
                _grd;
            _grd = frameContext.createLinearGradient(_x, 0, _x + uIBtnRadius, 0);
            _grd.addColorStop(_x ? 0 : 1, getRGBA(envColor, 0));
            _grd.addColorStop(_x ? 1 : 0, getRGBA(envColor, fMathAbs(overflow) * 0.2));
            setFillStyle(frameContext, _grd);
            fillRect(frameContext, _x, 0, uIBtnRadius, selectionBottom);
        }
    }

    /**
     * Draws a navigator opacity layers
     * @param isBackground
     */
    function drawNavigatorLayer(isBackground) {
        setFillStyle(frameContext, envColor);
        if (isBackground) {
            setGlobalAlpha(frameContext, 0.3);
            fillRect(frameContext, zoomStartInt, navigatorTop, zoomEndInt - zoomStartInt, navigatorHeight);
            setGlobalAlpha(frameContext, 1);
            setFillStyle(frameContext, envBgColor);
            fillRect(frameContext, zoomStartInt + uIGlobalPadding2, navigatorTop + uiGlobalPaddingHalf, zoomEndInt -
                zoomStartInt - uIGlobalPadding4, navigatorHeight - uIGlobalPadding);
        } else {
            setGlobalAlpha(frameContext, 0.1);
            fillRect(frameContext, 0, navigatorTop, zoomStartInt, navigatorHeight);
            fillRect(frameContext, zoomEndInt, navigatorTop, totalWidth - zoomEndInt, navigatorHeight);
            setFillStyle(frameContext, envBgColor);
            fillRect(frameContext, 0, navigatorTop, zoomStartInt, navigatorHeight);
            fillRect(frameContext, zoomEndInt, navigatorTop, totalWidth - zoomEndInt, navigatorHeight);
        }
        setGlobalAlpha(frameContext, 1);
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
        if (xAxisDataRef && yAxisDataRefs && charts.length) {
            setFont(frameContext, envRegularSmallFont);
            drawNavigatorLayer(vTrue);
            performance.mark(measure.drawNavigatorLayer);
            charts[0].drawHorizontalGrid();
            performance.mark(measure.drawHorizontalGrid);
            drawSeries();
            performance.mark(measure.drawSeries);
            drawNavigatorLayer();
            performance.mark(measure.drawNavigatorLayerB);
            if (seriesMaxOpacity > 0) {
                drawAxisLabels();
                if (legendCursorOpacity > 0) {
                    drawSeriesLegend();
                }
            }
            performance.mark(measure.drawSeriesLegend);
            drawPressHighlight();
            performance.mark(measure.drawPressHighlight);
        }
    }

    /**
     * Calculates the navigator factors
     */
    function calcNavigatorFactors(isReset) {
        var _max = vUndefined,
            _min = configMinValueAxisY,
            _i,
            _axisY,
            _navigatorFactorY,
            _endOfSeries;
        if (!xAxisDataRef || xAxisDataRef.l <= 2) {
            return;
        }
        _endOfSeries = xAxisDataRef.l - 2;
        navigatorFactorX = totalWidth / _endOfSeries;
        if (isReset) {
            associateZoomEnd(_endOfSeries);
            associateZoomStart(_endOfSeries - (_endOfSeries) * CONST_NAVIGATOR_WIDTH_PERCENT / 100);
        }
        for (_i in yAxisDataRefs) {
            _axisY = yAxisDataRefs[_i];
            if (_axisY.bOn) {
                _max = getMax(_axisY.max, _max);
                _min = getMin(_axisY.min, _min);
            }
        }
        if (_max) {
            _navigatorFactorY = -(navigatorHeight - 2) / (_max - _min);
            if (isReset) {
                navigatorMinY = _min;
                setNavigationFactorY(_navigatorFactorY);
                smartAxisYOpacity = 1;
            }
            else {
                navigatorMaxY = _max;
                if (configMinValueAxisY !== vUndefined || navigatorMinY === _min) {
                    navigatorMinY = _min;
                    if (animate(navigatorFactorY, setNavigationFactorY, _navigatorFactorY, vNull, vTrue)) {
                        animate(smartAxisYOpacity, setAxisYLabelOpacity, 0, 2);
                    }
                } else {
                    animate(navigatorMinY * 1, setNavigatorMinY, _min * 1, vNull, vTrue);
                }
            }
        }
    }

    /**
     * Calculates the X-axis labels
     */
    function calcSmartAxisY() {
        for (var _i in charts) {
            charts[_i].calculateSmartAxisY();
        }
    }

    function calcSelectionFactors(yData, startIndex, endIndex, width, height) {
        var _max = vUndefined,
            _min = configMinValueAxisY,
            _localMin = vUndefined,
            _i,
            _j,
            _axisY,
            _value;
        var _startIndexInt = fMathFloor(startIndex);
        if (_startIndexInt === 0) {
            _startIndexInt++;
        }
        var _endIndexInt = fMathCeil(endIndex);


        for (var _i in charts) {
            var _chart = charts[_i];
            _chart.getMainAxis().calculateFactors(startIndex, endIndex);
            _chart.calculateSmartAxisY();
        }

        for (_i in yData) {
            _axisY = yData[_i];
            if (_axisY.bOn) {
                for (_j = _startIndexInt; _j <= _endIndexInt; _j++) {
                    _value = _axisY.data[_j];
                    _max = getMax(_value, _max);
                    _min = getMin(_value, _min);
                    _localMin = getMin(_value, _localMin);
                }
            }
        }
        if (_max) {
            var _factorY = -(height - 2) / (_max - _min);
            return {
                maxY: _max,
                minY: _min,
                axisHeight: (_max - _localMin) * _factorY,
                factorY: -(height - 2) / (_max - _min),
                factorX: width / (endIndex - startIndex)
            };
        }
        return vFalse;
    }

    /**
     * Calculates the selection factors
     */
    function assignSelectionFactors(withoutAnimations) {
        selectionStartIndexFloat = zoomStartFloat + 1;
        selectionEndIndexFloat = zoomEndFloat + 1;
        if (smartAxisXFrozen && smartAxisXFrozenEnd > smartAxisXFrozenStart) {
            var _value = fMathRound(fMathLog((selectionEndIndexFloat - selectionStartIndexFloat) /
                (smartAxisXFrozenEnd - smartAxisXFrozenStart)) * CONST_LOG_2E);
            if (fMathAbs(_value - smartAxisXRatio) >= 1) {
                animate(smartAxisXRatio, setSmartAxisRatio, _value, 10);
            }
        }
        selectionStartIndexInt = fMathFloor(selectionStartIndexFloat);
        if (selectionStartIndexInt === 0) {
            selectionStartIndexInt++;
        }
        selectionEndIndexInt = fMathCeil(selectionEndIndexFloat);
        var _result = calcSelectionFactors(yAxisDataRefs, selectionStartIndexFloat,
            selectionEndIndexFloat, totalWidth, selectionHeight);
        //todo remove it
        if (_result) {
            selectionFactorX = _result.factorX;
            selectionMaxY = _result.maxY;
            if (configMinValueAxisY !== vUndefined || _result.minY === selectionMinY) {
                selectionMinY = _result.minY;
                animate(selectionFactorY, setSelectionFactorY, _result.factorY,
                    (withoutAnimations ? 1 : vNull), vUndefined, vTrue);
            } else {
                animate(selectionMinY * 1, setSelectionMinY, _result.minY,
                    vNull, vUndefined, vTrue);
            }
        }

        calcSmartAxisY();

        if (updateDateRangeTextTimer) {
            clearTimeout(updateDateRangeTextTimer);
        }
        updateDateRangeTextTimer = setTimeout(updateDateRangeText, 20);

        if (currentZoomState === STATE_ZOOM_TRANSFORM_TO_HOURS ||
            currentZoomState === STATE_ZOOM_TRANSFORM_TO_DAYS) {
            dataStore.hours.factors = calcSelectionFactors(dataStore.hours.yAxisData,
                dataStore.hours.startIndex,
                dataStore.hours.endIndex, selectionFactorX, selectionHeight);

        }

    }

    /**
     @param {string} tagName
     @return {Element}
     */
    function createElement(tagName, prefix, classes, styles, parent) {
        var _el = vDocument.createElement(tagName),
            i,
            s;
        _el.id = prefix + ctxId;
        for (i in classes) {
            _el.classList.add(classes[i]);
        }
        for (s in styles) {
            _el.style[s] = styles[s];
        }
        if (parent) {
            parent.appendChild(_el);
        }
        return _el;
    }

    function createTitleLabels() {
        var _titleContainer = createElement("div",
            "title_cnt_", ["title-container"], {}, container);

        dayRangeDiv = createElement("div",
            "day_range_", ["day-range"], {}, _titleContainer);

        zoomOutDiv = createElement("div",
            "zoom_out_", ["zoom-out", "animate", "hidden"], {}, _titleContainer);

        var sd = createElement("span",
            "zoom_out_svg_", [], {}, zoomOutDiv);
        sd.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\"  x=\"0px\" y=\"0px\" width=\"11px\" viewBox=\"0 0 483.083 483.083\">\n" +
            "\t<g>\n" +
            "\t\t<path d=\"M195.04,375.7c42.217,0,81.033-13.883,112.483-37.4l139.683,139.683c3.4,3.4,7.65,5.1,11.9,5.1s8.783-1.7,11.9-5.1\n" +
            "\t\t\tc6.517-6.517,6.517-17.283,0-24.083L332.74,315.35c30.883-33.433,50.15-78.2,50.15-127.5C382.89,84.433,298.74,0,195.04,0\n" +
            "\t\t\tS7.19,84.433,7.19,187.85S91.34,375.7,195.04,375.7z M195.04,34c84.717,0,153.85,68.85,153.85,153.85S280.04,341.7,195.04,341.7\n" +
            "\t\t\tc-84.717,0-153.85-68.85-153.85-153.85S110.04,34,195.04,34z\"></path>\n" +
            "\t\t<path d=\"M123.073,207.117H264.74c9.35,0,17-7.65,17-17s-7.65-17-17-17H123.073c-9.35,0-17,7.65-17,17\n" +
            "\t\t\tS113.723,207.117,123.073,207.117z\"></path>\n" +
            "\t</g>\n" +
            "</svg>";


        zoomOutDiv.addEventListener("click", zoomOutToDays);

        var zoomOutText = createElement("span",
            "zoom_out_text_", [], {}, zoomOutDiv);
        zoomOutText.innerHTML = "Zoom out";


        titleDiv = createElement("div",
            "title_", ["title", "animate", "top"], {}, _titleContainer);
        titleDiv.innerHTML = config.title || "";
    }






    /**
     * Assign property from source
     * @param source {Object} data
     * @param field {String} target field of data
     */
    function assignAxisProperty(store, source, field) {
        if (source) {
            var _axis,
                _i,
                _yAxisRef;
            for (_axis in source) {
                for (_i in  store.yAxisData) {
                    _yAxisRef = store.yAxisData[_i];
                    if (_yAxisRef.alias === _axis) {
                        _yAxisRef[field] = source[_axis];
                    }
                }
            }
        }
    }

    function prepareHoursCache() {
        var _store = dataStore.hours;
        var _from = _store.from,
            _to = _store.to,
            _fromTimestamp = xAxisDataRef.data[_from],
            _toTimestamp = xAxisDataRef.data[_to],
            _k;
        _store.startIndex = vUndefined;
        _store.endIndex = vUndefined;
        for (_k = 1; _k < _store.xAxisData.l; _k++) {
            if (!_store.startIndex) {
                if (_fromTimestamp <= _store.xAxisData.data[_k]) {
                    _store.startIndex = _k;
                }
            }
            else if (!_store.endIndex) {
                if (_toTimestamp <= _store.xAxisData.data[_k]) {
                    _store.endIndex = _k;
                    break;
                }
            }
        }
        if (_store.endIndex >= _store.xAxisData.l) {
            _store.endIndex = _store.xAxisData.l;
        }
        if (_store.startIndex >= _store.endIndex) {
            _store.startIndex = _store.endIndex - 1;
        }
        return _k;
    }

    function prepareCaches(src, isHours) {
        if (!isHours) {
            clear();
        }
        if (src) {
            var columns = src.columns,
                _i,
                _k,
                _store = isHours ? dataStore.hours : dataStore.days;
            if (columns) {
                _store.yAxisData = [];
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
                        _store.xAxisData = {
                            data: _column,
                            l: _dataLen,
                            min: _min,
                            max: _max,
                            detailCache: {}
                        };
                    } else {
                        _store.yAxisData.push(
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

                assignAxisProperty(_store, src.types, "type");
                assignAxisProperty(_store, src.colors, "color");
                assignAxisProperty(_store, src.names, "name");

                for (_i in _store.yAxisData) {
                    var _chart = _store.yAxisData[_i];
                    var _chartInfo = new ChartInfo(_store.xAxisData, _chart);
                    _chartInfo.createButton();
                    charts.push(_chartInfo);
                }

                if (!isHours) {
                    xAxisDataRef = _store.xAxisData;
                    yAxisDataRefs = _store.yAxisData;
                    calcNavigatorFactors(vTrue);
                } else {
                    prepareHoursCache();
                }
            }
        }
    }

    function getFunctionName(f) {
        return f.name || f.toString().substring(9, 32);
    }

    function getLength(a) {
        return a.length;
    }

    /**
     * Animates the properties
     * @param initial {Number} initial value
     * @param setter {Function} setter of value
     * @param speed {Number=} speed (number of frames)
     * @param proposed {Number} proposed value
     * @param logarithmic {Boolean=} is logarithmic scale
     * @returns {Boolean} animation enqueued
     */
    function animate(initial, setter, proposed, speed, logarithmic) {

        var _key = getFunctionName(setter),
            _frameCount,
            _exAnimationFrames;
        if (initial !== proposed && setter) { //no need animation
            if (this) {
                _key += this.getAlias();
            }

            _frameCount = speed || (mousePressed || mouseHoveredRegionType === ENUM_SELECTION_HOVER ? 5 : 15); //faster when user active
            if (logarithmic && initial) { // smooth logarithmic scale for big transitions
                _exAnimationFrames = fMathCeil(fMathAbs(fMathLog(fMathAbs(proposed / initial)) * 10));
                _frameCount += getMin(_exAnimationFrames, 15);
            }
            animations[_key] = {
                i: initial,
                c: setter,
                p: proposed,
                s: _frameCount
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
            _increment,
            _epsilon;
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
                _epsilon = _animation.i - _animation.p;
                if (_animation.f !== 0 && (_increment > 0 ? _epsilon <= 0 : _epsilon >= 0)) {
                    _animation.c(_animation.i);
                } else {
                    _animation.c(_animation.p);
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
        legendTop = uIBtnRadius + CONST_ANTI_BLUR_SHIFT;
        legendLeft = -uIBtnRadius + CONST_ANTI_BLUR_SHIFT;
        legendTextLeft[0] = -uIBtnRadius + uIGlobalPadding3;
        legendDateTop = uIBtnRadius + uIGlobalPadding3 + envSmallTextHeight + CONST_ANTI_BLUR_SHIFT;
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
                setFont(frameContext, envBoldDefaultFont);
                _width[_isEven] = getMax(getTextWidth(frameContext, _value) + uIGlobalPadding3, _width[_isEven]);
                setFont(frameContext, envRegularSmallFont);
                _width[_isEven] = getMax(getTextWidth(frameContext, _axisY.name) + uIGlobalPadding3, _width[_isEven]);
                _qnt++;
            }
        }

        legendTextLeft[1] = _width[0];
        _proposedWidth = _width[0] + (_width[1] || 0) + uIGlobalPadding3;
        setFont(frameContext, envBoldDefaultFont);
        _proposedWidth = getMax(getTextWidth(frameContext, legendDateText) + uIGlobalPadding3 + CONST_ANTI_BLUR_SHIFT, _proposedWidth);
        legendHeight = uIBtnRadius2 + envDefaultTextHeight + uIGlobalPadding2 + fMathCeil(_qnt / 2) * (envDefaultTextHeight + envSmallTextHeight + uIGlobalPadding3);
        animate(legendWidth, setLegendWidth, _proposedWidth);
    }

    /**
     * Animation complete event
     * @param animationKey {String} callback function name
     */
    function animationComplete(animationKey) {
        if (animationKey === CONST_SELECTION_FACTOR_Y_ANIMATION_KEY) {


            calcSmartAxisY();
            animate(smartAxisYOpacity, setAxisYLabelOpacity, 1, 10);
        } else if (animationKey === CONST_AXIS_X_LABEL_OPACITY_ANIMATION_KEY && smartAxisXFrozen) {
            smartAxisXFrozen = vFalse;
            animate(smartAxisXRatio, setSmartAxisRatio, 0, 1);
            animate(smartAxisXOpacity, setAxisXLabelOpacity, 1, 5);
        } else if (animationKey === CONST_SET_ZOOM_START_ANIMATION_KEY ||
            animationKey === CONST_SET_ZOOM_END_ANIMATION_KEY) {
            if (!animations[CONST_SET_ZOOM_START_ANIMATION_KEY] &&
                !animations[CONST_SET_ZOOM_END_ANIMATION_KEY]) {
                if (currentZoomState === STATE_ZOOM_TRANSFORM_TO_HOURS) {
                    dataStore.days.startIndexOff = selectionStartIndexInt;
                    dataStore.days.endIndexOff = getMin(selectionEndIndexInt, xAxisDataRef.l - 2);
                    if (smartAxisXFrozen) {
                        smartAxisXFrozen = vFalse;
                        animate(smartAxisXRatio, setSmartAxisRatio, 0, 1);
                        animate(smartAxisXOpacity, setAxisXLabelOpacity, 1, 5);
                    }

                    currentZoomState = STATE_ZOOM_HOURS;
                    xAxisDataRef = dataStore.hours.xAxisData;
                    yAxisDataRefs = dataStore.hours.yAxisData;

                    calcNavigatorFactors(vTrue);
                    delete animations[CONST_SELECTION_FACTOR_Y_ANIMATION_KEY];
                    selectionFactorY = dataStore.hours.factors.factorY;
                    associateZoomStart(dataStore.hours.startIndex - 1, 1);
                    associateZoomEnd(dataStore.hours.endIndex - 1, 1);


                } else if (currentZoomState === STATE_ZOOM_TRANSFORM_TO_DAYS) {
                    currentZoomState = STATE_ZOOM_DAYS;
                }
            }
        }
    }

    function setTheme(dark) {

    }


    function measureDurations() {
        try {
            performance.measure("total", measure.start, measure.end);
            performance.measure("animation", measure.start, measure.animation);
            performance.measure("calcSelectionFactors", measure.animation, measure.calcSelectionFactors);
            performance.measure("drawNavigatorLayer", measure.calcSelectionFactors, measure.drawNavigatorLayer);
            performance.measure("drawHorizontalGrid", measure.drawNavigatorLayer, measure.drawHorizontalGrid);
            performance.measure("drawSeries", measure.drawHorizontalGrid, measure.drawSeries);
            performance.measure("drawNavigatorLayerB", measure.drawSeries, measure.drawNavigatorLayerB);
            performance.measure("drawSeriesLegend", measure.drawNavigatorLayerB, measure.drawSeriesLegend);
            performance.measure("end", measure.drawPressHighlight, measure.end);

            var measures = performance.getEntriesByType("measure");

            var y = 50;
            setFont(frameContext, envRegularSmallFont);
            setFillStyle(frameContext, envColor);
            setGlobalAlpha(frameContext, 0.2);
            for (var measureIndex in measures) {
                var meas = measures[measureIndex];
                frameContext.fillText(meas.name + " " + meas.duration.toFixed(4), uIBtnRadius2, y);
                y = y + envSmallTextHeight + uIGlobalPadding;
            }
            frameContext.fillText("currentZoomState" + " " + currentZoomState, uIBtnRadius2, y);
            // Finally, clean up the entries.

        } catch (e) {

        }
        performance.clearMarks();
        performance.clearMeasures();
    }

    /**
     * Render cycle
     */
    function render() {

        performance.mark(measure.start);
        processAnimations();
        performance.mark(measure.animation);
        if (selectionNeedUpdateFactorY) {
            selectionNeedUpdateFactorY = vFalse;
            assignSelectionFactors();


        }

        performance.mark(measure.calcSelectionFactors);
        if (needRedraw) {
            needRedraw = vFalse;
            redrawFrame();
        }
        var _proposed = performance.now();
        if (lastPerformance) {
            frameDelay = 0.8 * frameDelay + 0.2 * (_proposed - lastPerformance );
        }
        lastPerformance = _proposed;
        performance.mark(measure.end);


        measureDurations();

        requestAnimationFrame(render);
    }

    initialize();
    render();

    return {
        draw: draw,
        invalidate: invalidate,
        clear: clear,
        destroy: destroy,
        hovered: getMouseHoveredRegionType,
        setLoadDetailsCallback: setLoadDetailsCallback,
        setTheme: setTheme
    };
};