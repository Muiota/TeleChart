/*jslint browser: true*/
/*global window, PerfomanceMeter*/
var Telegraph = function (ctxId, config) {
    "use strict";

    var perf = new PerfomanceMeter();


    /**
     * External functions & variables (maybe need polyfills)
     */
    var oMath = Math,
        vWindow = window,
        fParseInt = vWindow.parseInt,
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
        CONST_BOLD_PREFIX = "bold ",
        CONST_WIDTH = "width",
        CONST_HEIGHT = "height",
        CONST_HIDDEN_CLASS = "hidden",
        CONST_AXIS_X_LABEL_OPACITY_ANIMATION_KEY = getFunctionName(setAxisXLabelOpacity),
        CONST_SET_ZOOM_START_ANIMATION_KEY = getFunctionName(setZoomStart),
        CONST_SET_ZOOM_END_ANIMATION_KEY = getFunctionName(setZoomEnd),

        ENUM_NAVIGATOR_HOVER = 1,
        ENUM_START_SELECTION_HOVER = 2,
        ENUM_END_SELECTION_HOVER = 3,
        ENUM_ZOOM_HOVER = 4,
        ENUM_SELECTION_HOVER = 5,

        STATE_ZOOM_DAYS = 1,
        STATE_ZOOM_TRANSFORM_TO_HOURS = 2,
        STATE_ZOOM_HOURS = 3,
        STATE_ZOOM_TRANSFORM_TO_DAYS = 4,

        ENUM_CHART_TYPE_LINE = "line",
        ENUM_CHART_TYPE_BAR = "bar",
        ENUM_CHART_TYPE_AREA = "area";

    var container = vDocument.getElementById(ctxId),                               //canvases container
        isMobile = ("ontouchstart" in vWindow),
        charts = [],
        uiDisplayScaleFactor,
        uIGlobalPadding,
        uiGlobalPaddingHalf,
        uIGlobalPadding2,
        uIGlobalPadding3,
        uIGlobalPadding4,
        uIBtnRadius,
        uIBtnRadius2,

        uiGlobalTheme =
            {
                scrollBackground: "rgba(48, 66, 89, 0.6)",
                scrollSelector: "#56626D",
                scrollSelectorBorder: "#FFFFFF",
                gridLines: "rgba(255, 255, 255, 0.1)",
                zoomOutText: "#48AAF0",
                tooltipArrow: "#D2D5D7",
                axisText: "#8E8E93",
                barMask: "rgba(36, 47, 62, 1)"
            },

        totalWidth,
        visibleWidth,
        navigatorHeight,
        selectionHeight,

        navigatorHeightHalf,
        selectionBottom,
        navigatorTop,
        navigatorBottom,
        totalHeight,
        needRedraw,
        mainCanvas,
        bufferNavigatorCanvas,
        frameContext,
        bufferNavigatorContext,

        animations = {},

        mouseX,
        mouseY,
        mouseOffsetX,
        mouseOffsetY,
        mouseHoveredRegionType,
        mousePressed,

        mouseFrame = {},

        zoomStartFloat,
        zoomEndFloat,
        zoomStartInt,
        zoomEndInt,

        selectionStartIndexFloat,
        selectionEndIndexFloat,
        selectionStartIndexInt,
        selectionEndIndexInt,

        selectionCurrentIndexFloat,
        selectionCurrentIndexPinned,
        isSelectionCurrentIndexChanged,

        selectionNeedUpdateFactorY,


        smartAxisXStart,                //@type {Number} frozen X-axis left bound for scroll
        smartAxisXRange,                //@type {Number} frozen X-axis range for scroll
        smartAxisXFrozen,               //@type {Number} X-axis labels resort frozen
        smartAxisXRatio,                //@type {Number} floated X-axis sub labels factor
        smartAxisXFrozenStart,          //@type {Number} frozen selectionStartIndexFloat for scroll
        smartAxisXFrozenEnd,            //@type {Number} frozen selectionEndIndexFloat for scroll
        smartAxisXOpacity = 1,          //@type {Number} opacity of X-axis labels
        smartAxisYOpacity = 1,          //@type {Number} opacity of Y-axis labels

        navigatorPressed = 0,           //@type {Number} pressed navigator 0..1 (opacity)
        navigatorPressedRegionType,     //@type {Number} type of pressed element for animations
        navigatorNeedUpdateBuffer,      //@type {Boolean} navigators buffer invalidated need repaint

        seriesMaxOpacity,               //@type {Number} max opacity of series for animations

        arrowTooltipOpacity = 0,


        envSmallTextHeight,
        envDefaultTextHeight,
        envColor,
        envBgColor,
        envRegularSmallFont,
        envBoldSmallFont,
        envRegularDefaultFont,
        envBoldDefaultFont,

        lastPerformance,
        frameDelay = 0,

        boundHighlight,
        dateSingleton = new Date(),
        dateSingletonFull = new Date(),

        timeZoneOffset = dateSingleton.getTimezoneOffset() * 60000,

        divDayRange,
        divTitle,
        divZoomOut,
        divBtnContainer,
        divTooltipContainer,
        divTooltipDate,
        divTooltipValues,

        currentZoomState,

        updateDateRangeTextTimer,

        animationCounter,
        globalScaledY,
        globalStackedBarMode,
        globalPercentageMode,
        stackedRegister = [],
        totalPercentageRegister = [],
        detailCache = {};


    var AxisInfo = function (alias, xData, yDataList, width, height, lineWidth, isStartFromZero) {
        var length = xData.length,
            maxY = vUndefined,
            minY = isStartFromZero ? 0 : vUndefined,

            localMaxY,
            localMinY,

            factorX,
            factorY;

        function init() {
            var _val,
                _k,
                _j;
            for (_j in yDataList) {
                var _container = yDataList[_j];
                var _data = _container.getYData();
                for (_k = 1; _k < length; _k++) { //todo need optimize cache blocks
                    _val = _data[_k];
                    maxY = getMax(_val, maxY);
                    minY = getMin(_val, minY);
                }
            }
            localMaxY = maxY;
            localMinY = minY;
        }

        init();

        function setLocalMinY(val) {
            localMinY = val;
            animate(factorY, setFactorY, -(height - 2) / (localMaxY - localMinY),
                vNull, vTrue);
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
                _container,
                _source,
                _data,
                _j,
                _k;

            if (_startIndexInt === 0) {
                _startIndexInt++;
            }

            if (globalStackedBarMode) {
                for (_k = _startIndexInt; _k <= _endIndexInt; _k++) {
                    _value = 0;
                    for (_j in yDataList) {
                        _container = yDataList[_j];
                        _data = _container.getYData();
                        _value += _data[_k] * _container.getOpacity();

                    }
                    _localMaxY = getMax(_value, _localMaxY);
                    _localMinY = getMin(_value, _localMinY);
                    if (globalPercentageMode) {
                        totalPercentageRegister[_k] = _value;
                    }
                }
            }
            else {
                for (_j in yDataList) {
                    _container = yDataList[_j];
                    _data = _container.getYData();
                    if (_container.getEnabled()) {
                        for (_k = _startIndexInt; _k <= _endIndexInt; _k++) {
                            _value = _data[_k];
                            _localMaxY = getMax(_value, _localMaxY);
                            _localMinY = getMin(_value, _localMinY);
                        }
                    }
                }
            }

            if (_localMaxY) {
                var _range = localMaxY - localMinY;
                factorX = width / (endIndex - startIndex);
                localMaxY = _localMaxY;
                if (globalPercentageMode) {
                    factorY = -(height - 2) / 100;
                    localMinY = _localMinY;
                    for (_j in yDataList) {
                        _container = yDataList[_j];
                        _source = _container.getYData();
                        _data = _container.getPercentageData();
                        for (_k = _startIndexInt; _k <= _endIndexInt; _k++) {
                            _data[_k] = _source[_k] * 100 / totalPercentageRegister[_k];
                        }
                    }
                }
                else {
                    _factorY = -(height - 2) / _range;
                    if (isStartFromZero || localMinY === _localMinY) {
                        localMinY = _localMinY;
                        if (withoutAnimations || (globalStackedBarMode && !mousePressed)) {
                            setFactorY(_factorY);
                        } else {
                            animate.apply(this, [factorY, setFactorY, _factorY,
                                vNull, vTrue]);
                        }
                    } else {
                        animate.apply(this, [localMinY * 1, setLocalMinY, _localMinY,
                            (withoutAnimations ? 1 : vNull), vTrue]);
                    }
                }

            }
        }


        function getAlias() {
            return alias;
        }

        function setWidth(val) {
            width = val;
        }

        function setHeight(val) {
            height = val;
        }

        function getWidth() {
            return width;
        }

        function getHeight() {
            return height;
        }

        function toString() {
            return "";
        }


        return {
            getAlias: getAlias,
            setWidth: setWidth,
            setHeight: setHeight,

            getLocalMaxY: getLocalMaxY,
            getLocalMinY: getLocalMinY,
            getFactorY: getFactorY,
            getFactorX: getFactorX,
            calculateFactors: calculateFactors,
            getLineWidth: getLineWidth,
            toString: toString
        };
    };

    var ChartInfo = function (xData, yInfo) {

        var alias = yInfo.alias,
            name = yInfo.name,
            type = yInfo.type,
            yData = yInfo.data,
            color = yInfo.color,
            smartAxisYRangeInt,
            smartAxisYRangeFloat,
            lastIndex = xData.length - 1,
            divLegendVal,
            divTlpRow,
            opacity = 1,

            enabled = vTrue,
            filterAxis,
            mainAxis,
            percentageData = [];

        function initAxis(globalMainAxis, globalFilterAxis) {
            if (globalScaledY) {
                filterAxis = new AxisInfo(alias + "f", xData, [this], visibleWidth, navigatorHeight, 1, vTrue);
                mainAxis = new AxisInfo(alias + "m", xData, [this], visibleWidth, selectionHeight, config.lineWidth || 1.5, vTrue);
                filterAxis.calculateFactors(1, lastIndex);
            } else {
                mainAxis = globalMainAxis;
                filterAxis = globalFilterAxis;
            }
        }

        function getYData() {
            return yData;
        }

        function getXData() {
            return xData;
        }

        function getEnabled() {
            return enabled;
        }

        function getPercentageData() {
            return percentageData;
        }

        function setSmartAxisYRange(val) {
            smartAxisYRangeFloat = val;
        }

        function calculateSmartAxisY() {
            var _range = globalPercentageMode ? 110 : mainAxis.getLocalMaxY() - mainAxis.getLocalMinY(),
                _prevProposed = fMathCeil(_range / 6),
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
            selectionNeedUpdateFactorY = vTrue; //todo
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
            var _opacity = getMin((globalScaledY ? opacity : seriesMaxOpacity * smartAxisYOpacity), smartAxisYOpacity);
            setGlobalAlpha(frameContext, _opacity);
            setFillStyle(frameContext, globalScaledY ? color : uiGlobalTheme.axisText);
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

                var _textWidth = getTextWidth(frameContext, _value);
                var _labelX = isRight ? visibleWidth - uiGlobalPaddingHalf - _textWidth : uIGlobalPadding2 + uiGlobalPaddingHalf;
                fillText(frameContext, _value, _labelX, _labelY);
                _nextScaleValue = fParseInt(_nextScaleValue + smartAxisYRangeInt);
                _selectionAxis = _selectionAxis + smartAxisYRangeFloat * mainAxis.getFactorY();
            }

        }

        function drawTooltipArrow(currentIndex, startIndex) {
            var _shift = currentIndex - startIndex;
            var _xPos = uIGlobalPadding2 + (_shift) * mainAxis.getFactorX(),
                _yPos,
                _yStacked,
                _position;
            setGlobalAlpha(frameContext, arrowTooltipOpacity);
            switch (type) {
                case ENUM_CHART_TYPE_LINE:
                case ENUM_CHART_TYPE_AREA:
                    beginPath(frameContext);

                    setStrokeStyle(frameContext, uiGlobalTheme.tooltipArrow);

                    setLineWidth(frameContext);
                    moveOrLine(frameContext, vTrue, _xPos, 0);
                    moveOrLine(frameContext, vFalse, _xPos, selectionBottom);
                    endPath(frameContext);
                    break;
                case ENUM_CHART_TYPE_BAR:
                    _position = fMathFloor(currentIndex);
                    _yPos = selectionBottom + (yData[_position] - mainAxis.getLocalMinY()) * mainAxis.getFactorY();

                    setFillStyle(frameContext, color);
                    if (globalStackedBarMode) {
                        _yStacked = _yPos - stackedRegister[1];
                        stackedRegister[1] = stackedRegister[1] + selectionBottom - _yPos;

                    } else {
                        _yStacked = _yPos;
                    }
                    fillRect(frameContext, _xPos, _yStacked, mainAxis.getFactorX(), selectionBottom - _yPos);
                    break;
            }
        }

        function drawHorizontalGrid() {
            var _nextScaleLevel = selectionBottom,
                _yCoordinate;
            beginPath(frameContext);
            setGlobalAlpha(frameContext, 1);
            setStrokeStyle(frameContext, uiGlobalTheme.gridLines);
            setLineWidth(frameContext, uiDisplayScaleFactor);
            while (_nextScaleLevel > navigatorHeightHalf) {
                _yCoordinate = fMathCeil(_nextScaleLevel) + CONST_ANTI_BLUR_SHIFT;
                moveOrLine(frameContext, vTrue, uIGlobalPadding2, _yCoordinate);
                moveOrLine(frameContext, vFalse, uIGlobalPadding2 + visibleWidth, _yCoordinate);
                _nextScaleLevel = _nextScaleLevel + smartAxisYRangeFloat * mainAxis.getFactorY();
            }
            endPath(frameContext);
            setGlobalAlpha(frameContext, 1);
        }


        function drawSeriesCore(context, axis, startIndexFloat, startIndexInt, endIndexInt, bottom) {
            var _k,
                _xPos,
                _yPos,
                _yValue,
                _minY = axis.getLocalMinY(),
                _factorX = axis.getFactorX(),
                _factorY = axis.getFactorY(),
                _inTransition = currentZoomState === STATE_ZOOM_TRANSFORM_TO_HOURS ||
                    currentZoomState === STATE_ZOOM_TRANSFORM_TO_DAYS;
            //selection series
            beginPath(context);
            setGlobalAlpha(context, opacity);

            switch (type) {
                case ENUM_CHART_TYPE_LINE:
                    setStrokeStyle(context, color);
                    setLineWidth(context, axis.getLineWidth() * uiDisplayScaleFactor);
                    for (_k = startIndexInt; _k <= endIndexInt;) {
                        _xPos = uIGlobalPadding2 + (_k - startIndexFloat) * _factorX;
                        _yPos = bottom + (yData[_k] - _minY) * _factorY;
                        moveOrLine(context, _k++ === startIndexInt, _xPos, _yPos);

                        //todo
                        if (_inTransition) {
                            var _currentLeft = _xPos;
                            var _currentTop = _yPos; //recursion
                            /* if (_k - 1 === dataStore.hours.from) {
                                 for (_j = dataStore.hours.startIndex; _j <= dataStore.hours.endIndex; _j++) {
                                     _xValue = _currentLeft + (_j - dataStore.hours.startIndex) * dataStore.hours.factors.factorX;
                                     _yValue = bottom + ( dataStore.hours.yAxisData[_i].data[_j] - dataStore.hours.factors.minY) * dataStore.hours.factors.factorY;
                                     var _resultY = _currentTop * (1 - animationCounter) + _yValue * animationCounter;
                                     moveOrLine(context, vFalse, _xValue, _resultY);
                                 }
                             } */
                        }
                    }
                    endPath(context);
                    break;

                case ENUM_CHART_TYPE_BAR:
                    setFillStyle(context, color);
                    var _ext = fParseInt(30 / _factorX);

                    var _start = getMax(startIndexInt - _ext, 1);
                    var x = uIGlobalPadding2 + (_start - startIndexFloat) * _factorX;
                    moveOrLine(context, vTrue, x, bottom);

                    var _end = getMin(endIndexInt + _ext, lastIndex);
                    for (_k = _start; _k <= _end; _k++) {
                        _xPos = uIGlobalPadding2 + (_k - startIndexFloat) * _factorX;
                        if (_yPos) {
                            moveOrLine(context, vFalse, _xPos, _yPos);
                        }
                        _yValue = yData[_k];
                        if (globalStackedBarMode) {
                            stackedRegister[_k] = _yValue * opacity + stackedRegister[_k];
                            _yValue = stackedRegister[_k];
                        }

                        _yPos = bottom + (_yValue - _minY) * _factorY;
                        moveOrLine(context, vFalse, _xPos, _yPos);
                    }
                    moveOrLine(context, vFalse, _xPos + _factorX, _yPos);
                    moveOrLine(context, vFalse, _xPos + _factorX, bottom);
                    closePath(context);
                    fill(context);
                    break;

                case ENUM_CHART_TYPE_AREA:
                    setFillStyle(context, color);
                    var _ext = fParseInt(30 / _factorX);

                    var _start = getMax(startIndexInt - _ext, 1);
                    var x = uIGlobalPadding2 + (_start - startIndexFloat) * _factorX;
                    moveOrLine(context, vTrue, x, bottom);

                    var _data = globalPercentageMode ? getPercentageData() : yData;
                    var _end = getMin(endIndexInt + _ext, lastIndex);
                    for (_k = _start; _k <= _end; _k++) {
                        _xPos = uIGlobalPadding2 + (_k - startIndexFloat) * _factorX;
                        _yValue = _data[_k] * opacity;

                        if (globalStackedBarMode) {
                            stackedRegister[_k] = _yValue + stackedRegister[_k];
                            _yValue = stackedRegister[_k];
                        }

                        _yPos = bottom + (_yValue - _minY) * _factorY;
                        moveOrLine(context, vFalse, _xPos, _yPos);
                    }
                    moveOrLine(context, vFalse, _xPos + _factorX, _yPos);
                    moveOrLine(context, vFalse, _xPos + _factorX, bottom);
                    closePath(context);
                    fill(context);
                    break;

            }


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
                lastIndex,
                navigatorHeight);
        }

        function drawArrowPoint() {
            var _posX = uIGlobalPadding2 + (selectionCurrentIndexFloat - selectionStartIndexFloat  ) * mainAxis.getFactorX(),
                _from = fMathFloor(selectionCurrentIndexFloat),
                _value = yData[_from];

            var _proposedTooltipLeft = (_posX / uiDisplayScaleFactor);

            if (type !== ENUM_CHART_TYPE_LINE ) {
                _proposedTooltipLeft = _proposedTooltipLeft + 15;
            } else {
                _proposedTooltipLeft = _proposedTooltipLeft - 15;
            }


            if (_proposedTooltipLeft < 0) {
                _proposedTooltipLeft = 0;
            } else
            {
                var _tooltipWidth = fParseInt(getStyle(divTooltipContainer, CONST_WIDTH).replace(CONST_PIXEL, ""))+ 5;
                if (_proposedTooltipLeft + _tooltipWidth > container.clientWidth) {
                    _proposedTooltipLeft = container.clientWidth - _tooltipWidth;
                }
            }
            divTooltipContainer.style.left = _proposedTooltipLeft + CONST_PIXEL; //todo optimize
            updateLegendValue(_value);
            divTooltipDate.innerHTML = formatDate(xData[_from], vTrue);

            switch (type) {
                case ENUM_CHART_TYPE_LINE:
                case ENUM_CHART_TYPE_AREA:

                    setLineWidth(frameContext, mainAxis.getLineWidth() * uiDisplayScaleFactor);
                    var _sValueY,
                        _sValueYTo,
                        _to = _from + 1,
                        _sValueYFrom;


                    _sValueYFrom = (_value - mainAxis.getLocalMinY()) * mainAxis.getFactorY();

                    if (_from === selectionCurrentIndexFloat || _to > lastIndex) {
                        _sValueY = _sValueYFrom;
                    } else {
                        _sValueYTo = (yData[_to] - mainAxis.getLocalMinY()) * mainAxis.getFactorY();
                        _sValueY = _sValueYFrom + (_sValueYTo - _sValueYFrom) * (selectionCurrentIndexFloat - _from);
                    }

                    if (globalStackedBarMode) {
                        _sValueY = _sValueY + stackedRegister[1];
                        stackedRegister[1] = _sValueY;
                    }
                    _sValueY += selectionBottom;
                    beginPath(frameContext);
                    setGlobalAlpha(frameContext, arrowTooltipOpacity * opacity);
                    setFillStyle(frameContext, envBgColor);
                    circle(frameContext, _posX, _sValueY, 3 * uiDisplayScaleFactor);
                    fill(frameContext);
                    beginPath(frameContext);
                    setStrokeStyle(frameContext, color);
                    circle(frameContext, _posX, _sValueY, 4 * uiDisplayScaleFactor);
                    endPath(frameContext);
                    break;
            }


        }

        function handleButtonPress(e, owner) {
            enabled = !enabled
            if (enabled) {
                addClass(e.currentTarget, "checked");
                removeClass(divTlpRow, CONST_HIDDEN_CLASS);

            } else {
                removeClass(e.currentTarget, "checked");
                addClass(divTlpRow, CONST_HIDDEN_CLASS);
            }
            animate.apply(owner, [opacity, setOpacity, enabled ? 1 : 0, 10]);
            selectionNeedUpdateFactorY = vTrue;
        }

        function createUiElements() {
            var _button = createElement("div",
                "btn-", ["button", "checked"], {
                    border: "2px " + color + " solid",
                    color: color, backgroundColor: color
                }, divBtnContainer);
            var _that = this;
            _button.addEventListener("click", function (e) {
                handleButtonPress(e, _that);
            });

            var _checkBox = createElement("span",
                "ch-", ["button-icon"], {}, _button);

            _checkBox.innerHTML = "<?xml version=\"1.0\"?>\n" +
                "<svg  xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"100%\" height=\"10px\" x=\"0px\" y=\"0px\"" +
                " viewBox=\"0 0 17.837 17.837\">" +
                "<g>" +
                "<path style=\"fill:#ffffff;\" d=\"M16.145,2.571c-0.272-0.273-0.718-0.273-0.99,0L6.92,10.804l-4.241-4.27" +
                "c-0.272-0.274-0.715-0.274-0.989,0L0.204,8.019c-0.272,0.271-0.272,0.717,0,0.99l6.217,6.258c0.272,0.271,0.715,0.271,0.99,0" +
                "L17.63,5.047c0.276-0.273,0.276-0.72,0-0.994L16.145,2.571z\"/>" +
                "</g>" +
                "</svg>";
            var _text = createElement("span",
                "ch-", ["button-text"], {}, _button);
            _text.innerHTML = name;

            var _tlpRow = createElement("tr",
                "tlp-title", ["tooltip-row"], {}, divTooltipValues);
            _that.setTlpRowDiv(_tlpRow);
            var _tlpTitle = createElement("td",
                "tlp-title", ["tooltip-title"], {
                    color: color
                }, _tlpRow);
            _tlpTitle.innerHTML = name;

            _that.setTlpValDiv(createElement("td",
                "tlp-val", ["tooltip-value"], {
                    color: color
                }, _tlpRow));

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

        function getFilterAxis() {
            return filterAxis;
        }

        function getLastIndex() {
            return lastIndex;
        }


        function setTlpValDiv(val) {
            divLegendVal = val;
        }
        
        function setTlpRowDiv(val) {
            divTlpRow = val;
        }

        function updateLegendValue(val) {
            divLegendVal.innerHTML = val;
        }

        return {
            initAxis: initAxis,
            getAlias: getAlias,
            getOpacity: getOpacity,
            getYData: getYData,
            getXData: getXData,
            getEnabled: getEnabled,
            calculateSmartAxisY: calculateSmartAxisY,
            drawYAxisLabels: drawYAxisLabels,
            drawHorizontalGrid: drawHorizontalGrid,
            drawMainSeries: drawMainSeries,
            drawFilterSeries: drawFilterSeries,
            drawArrowPoint: drawArrowPoint,
            getMainAxis: getMainAxis,
            getFilterAxis: getFilterAxis,
            createButton: createUiElements,
            getLastIndex: getLastIndex,
            getType: getType,
            getPercentageData: getPercentageData,
            drawTooltipArrow: drawTooltipArrow,
            setTlpValDiv: setTlpValDiv,
            setTlpRowDiv: setTlpRowDiv,
            toString: toString
        };
    };


    function initialize() {
        if (!config) {
            config = {};
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

        divBtnContainer = createElement("div",
            "btn-cnt-", ["buttons"], {}, container);

        divTooltipContainer = createElement("div",
            "tlp-", ["tooltip", CONST_HIDDEN_CLASS], {}, container);

        divTooltipDate = createElement("div",
            "tlp-date-", ["tooltip-date"], {}, divTooltipContainer);

        divTooltipValues = createElement("table",
            "tlp-val-cnt-", ["tooltip-values"], {}, divTooltipContainer);

        divTooltipContainer.addEventListener("click", lookupHourData);

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
        if (charts.length) {
            var from = formatDateFull(charts[0].getXData()[selectionStartIndexInt]);
            var to = formatDateFull(charts[0].getXData()[selectionEndIndexInt]);
            result = from + " - " + to;
        }
        divDayRange.innerHTML = result;
    }

    function recalculateBounds() {
        isMobile = ("ontouchstart" in vWindow);
        uiDisplayScaleFactor = vWindow.devicePixelRatio;
        uIGlobalPadding = 5 * uiDisplayScaleFactor;
        uiGlobalPaddingHalf = uIGlobalPadding / 2;
        uIGlobalPadding2 = uIGlobalPadding * 2;
        uIGlobalPadding3 = uIGlobalPadding * 3;
        uIGlobalPadding4 = uIGlobalPadding * 4;
        uIBtnRadius = 10 * uiDisplayScaleFactor;
        uIBtnRadius2 = uIBtnRadius * 2;

        totalWidth = container.clientWidth * uiDisplayScaleFactor;           //main frame width
        visibleWidth = totalWidth - uIGlobalPadding4;
        navigatorHeight = fParseInt(totalWidth * CONST_NAVIGATOR_HEIGHT_PERCENT / 100); //nav height
        selectionHeight = totalWidth - navigatorHeight - navigatorHeight;      //selection window height
        navigatorHeightHalf = navigatorHeight / 2;                                 //half navigator height
        selectionBottom = selectionHeight + navigatorHeightHalf;                   //selection window bottom
        navigatorTop = fParseInt(selectionHeight + navigatorHeight + uIGlobalPadding4);        //navigator top
        navigatorBottom = navigatorTop + navigatorHeight;                          //navigator bottom
        totalHeight = navigatorBottom + uIGlobalPadding; //main frame height

        mainCanvas[CONST_WIDTH] = totalWidth || 2;
        mainCanvas[CONST_HEIGHT] = totalHeight || 2;

        bufferNavigatorCanvas[CONST_WIDTH] = totalWidth || 2;
        bufferNavigatorCanvas[CONST_HEIGHT] = navigatorHeight || 2;


        var _size = getStyle(vDocument.body, "font-size"),
            _fontFamilyCombined = CONST_PIXEL + " " + getStyle(vDocument.body, "font-family"),
            _baseFontSize = fParseInt(_size.replace(/\D/g, ""));


        setLineWidth(bufferNavigatorContext);
        envSmallTextHeight = fParseInt(_baseFontSize * 0.8 * uiDisplayScaleFactor);
        envDefaultTextHeight = fParseInt(_baseFontSize * uiDisplayScaleFactor);

        envRegularSmallFont = envSmallTextHeight + _fontFamilyCombined;
        envRegularDefaultFont = envDefaultTextHeight + _fontFamilyCombined;
        envBoldSmallFont = CONST_BOLD_PREFIX + envRegularSmallFont;
        envBoldDefaultFont = CONST_BOLD_PREFIX + envRegularDefaultFont;

        setFont(frameContext, envRegularSmallFont);
        frameContext.lineJoin = "bevel";

        for (var _i in charts) {
            var _chart = charts[_i];
            _chart.getMainAxis().setWidth(visibleWidth);
            _chart.getMainAxis().setHeight(selectionHeight);
            _chart.getFilterAxis().setWidth(visibleWidth);
            _chart.getFilterAxis().setHeight(navigatorHeight);
        }
        selectionNeedUpdateFactorY = vTrue;
        calcNavigatorFactors(vFalse);
    }

    function onMouseDownInner(e) {
        handleMouseClick(e, vTrue);
    }

    function onMouseUpInner(e) {
        handleMouseClick(e, vFalse);
    }

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

    function setArrowTooltipOpacity(val) {
        arrowTooltipOpacity = val;
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
        removeAllChild(divBtnContainer);
        charts.length = 0;
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

        envColor = getStyle(vDocument.body, "color");
        envBgColor = getStyle(vDocument.body, "background-color");

        calcMouseOffset();
        invalidateInner();
    }

    /**
     * Draws a json data
     * @param data {JSON} chart data
     */
    function draw(data) {
        clear();
        if (data) {
            var _i,
                _data = parseDataSource(data);

            for (_i in _data.y) {
                var _chart = _data.y[_i];
                var _chartInfo = new ChartInfo(_data.x, _chart);
                _chartInfo.createButton();
                if (globalScaledY) {
                    _chartInfo.initAxis();
                }
                charts.push(_chartInfo);
            }

            if (!globalScaledY) {
                var _globalFilterAxis = new AxisInfo("gf", _data.x, charts, visibleWidth, navigatorHeight, 1, vTrue);
                var _globalMainAxis = new AxisInfo("gm", _data.x, charts, visibleWidth, selectionHeight, config.lineWidth || 2, vTrue);
                var _lastIndex = _data.x.length - 1;
                if (!globalScaledY) {
                    _globalFilterAxis.calculateFactors(1, _lastIndex);
                }
                for (_i in charts) {
                    charts[_i].initAxis(_globalMainAxis, _globalFilterAxis);
                }
            }

            currentZoomState = STATE_ZOOM_DAYS;
            calcNavigatorFactors(vTrue);
            invalidateInner();
        }
    }


    function getStyle(_el, propertyName) {
        var _currentStyle = _el.currentStyle;
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

            if (mouseHoveredRegionType !== ENUM_SELECTION_HOVER) {
                selectionCurrentIndexPinned = vFalse;
                hideTooltip();
            }

            //Set cursor
            if (mouseHoveredRegionType === ENUM_SELECTION_HOVER) { //most likely
                if (currentZoomState !== STATE_ZOOM_TRANSFORM_TO_HOURS) {
                    showTooltip();
                    setCursor(0);
                }
            } else if (mouseHoveredRegionType === ENUM_ZOOM_HOVER) {
                setCursor(1);
            } else if (mouseHoveredRegionType === ENUM_START_SELECTION_HOVER ||
                mouseHoveredRegionType === ENUM_END_SELECTION_HOVER) {
                setCursor(2);
            } else {
                setCursor(0);
            }
        }
    }


    function calcHoveredElement(force) {
        var _result = vNull,
            _filterFactorX = charts[0].getFilterAxis().getFactorX(),
            _mainFactorX = charts[0].getMainAxis().getFactorX();

        if (!_filterFactorX) {
            return;
        }

        if (_mainFactorX) { //Selection hovered
            if (mouseY < navigatorTop && (!force || !selectionCurrentIndexPinned || mousePressed)) {
                var _position = mouseX / _mainFactorX + selectionStartIndexFloat;
                var _proposed = (charts[0].getType() === ENUM_CHART_TYPE_BAR) ? fMathCeil(_position - 1) : fMathRound(_position);
                _proposed = getMin(getMax(1, _proposed), charts[0].getLastIndex());
                isSelectionCurrentIndexChanged = _proposed !== selectionCurrentIndexFloat;
                animate(selectionCurrentIndexFloat, setSelectionCurrentIndexFloat, _proposed, 3);
                mouseFrame.tS = zoomStartFloat;
                mouseFrame.tE = zoomEndFloat;
                mouseFrame.tF = mouseX;

                _result = ENUM_SELECTION_HOVER;
                invalidateInner();
            }
            else if (mouseY > navigatorTop && mouseY < navigatorBottom) { //Navigator hovered
                _result = ENUM_NAVIGATOR_HOVER;
                var _startZoom = ( zoomStartFloat) * _filterFactorX,
                    _endZoom = ( zoomEndFloat) * _filterFactorX,
                    _startZShift = _startZoom - mouseX,
                    _endZShift = _endZoom - mouseX;

                if (fMathAbs(_startZShift) < uIGlobalPadding2) { //Navigator start edge hovered
                    _result = ENUM_START_SELECTION_HOVER;
                } else if (fMathAbs(_endZShift) < uIGlobalPadding2) { //Navigator end edge hovered
                    _result = ENUM_END_SELECTION_HOVER;
                } else if (mouseX > _startZoom && mouseX < _endZoom) { //Navigator center hovered
                    mouseFrame.nS = _startZShift / _filterFactorX;
                    mouseFrame.nE = _endZShift / _filterFactorX;
                    _result = ENUM_ZOOM_HOVER;
                }
            }
            updateHoveredInfo(_result, force);
        }
    }


    function stopPropagation(e) {
        e.preventDefault();
        e.stopPropagation();
    }


    function associateZoomStart(val, frameCount) {
        zoomStartInt = val * charts[0].getFilterAxis().getFactorX();
        animate(zoomStartFloat, setZoomStart, val, frameCount);
    }


    function associateZoomEnd(val, frameCount) {
        zoomEndInt = val * charts[0].getFilterAxis().getFactorX();
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


    function navigateChart() {
        var _factorX = charts[0].getFilterAxis().getFactorX();
        if (_factorX) {
            var _proposedX = mouseX / _factorX,
                _maxProposedX = charts[0].getLastIndex(),
                _threshold = 30 / _factorX;

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
        if (charts.length) {
            if (mouseHoveredRegionType !== ENUM_SELECTION_HOVER) {
                navigateChart();
            }
        }
    }


    function assignMousePos(e, calcOnly) {
        var _clientX = e.clientX,
            _clientY = e.clientY;
        if (_clientX && _clientY) {
            mouseX = fParseInt((_clientX - mouseOffsetX) * uiDisplayScaleFactor) - uIGlobalPadding2;
            mouseY = fParseInt((_clientY - mouseOffsetY) * uiDisplayScaleFactor);
            if (mouseY >= -uIGlobalPadding && mouseX >= -uIGlobalPadding &&
                mouseX <= visibleWidth + uIGlobalPadding && mouseY <= totalHeight + uIGlobalPadding) {
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

        if (e.type === "mouseout") {
            updateHoveredInfo(vNull, vTrue);
        }

        calcMouseOffset();
        var _touches = e.touches;
        var isTouchEvent = _touches && _touches.length;

        if (mouseHoveredRegionType === ENUM_SELECTION_HOVER) {
            withoutPress = vTrue;
            if (currentZoomState !== STATE_ZOOM_TRANSFORM_TO_HOURS &&
                (selectionCurrentIndexPinned || isMobile)) {
                if (isMobile) {
                    selectionCurrentIndexPinned = vFalse;
                }
            }
        }

        var newVar = isTouchEvent && isMobile ?
            assignMousePos(_touches[0], withoutPress) :
            assignMousePos(e, withoutPress);

        if (isMobile && mouseHoveredRegionType === ENUM_SELECTION_HOVER && withoutPress) {
            newVar = vFalse;
        }
        return newVar;
    }

    function updateTitleStatus() {
        if (currentZoomState === STATE_ZOOM_HOURS ||
            currentZoomState === STATE_ZOOM_TRANSFORM_TO_HOURS) {
            removeClass(divZoomOut, CONST_HIDDEN_CLASS);
            addClass(divTitle, CONST_HIDDEN_CLASS);
        } else {
            addClass(divZoomOut, CONST_HIDDEN_CLASS);
            removeClass(divTitle, CONST_HIDDEN_CLASS);
        }
    }

    
    function zoomInToHours(pData, pTimeStamp) {
        currentZoomState = STATE_ZOOM_TRANSFORM_TO_HOURS;
        updateTitleStatus();
        //dataStore.days.startIndex = selectionStartIndexInt;
        // dataStore.days.endIndex = getMin(selectionEndIndexInt, charts[0].getLastIndex());
        // dataStore.days.factorY = 0;//selectionFactorY;
        // dataStore.hours.from = fParseInt(selectionCurrentIndexFloat);
        // dataStore.hours.to = dataStore.hours.from + 1;
        parseDataSource(pData, vTrue);
        updateHoveredInfo(vNull);
        animate(smartAxisXRatio, setSmartAxisRatio, 0, 1);
        smartAxisXFrozenStart = selectionStartIndexFloat;
        smartAxisXFrozenEnd = selectionEndIndexFloat;
        smartAxisXFrozen = vTrue;
        delete animations[CONST_AXIS_X_LABEL_OPACITY_ANIMATION_KEY];
        setAxisXLabelOpacity(1);
        var _from = fParseInt(selectionCurrentIndexFloat);
        var _to = _from+1;
        // dataStore.hours.to = dataStore.hours.from + 1;
         associateZoomEnd(_to, 15);
         associateZoomStart(_from, 15);
        animationCounter = 0;
        animate(animationCounter, setAnimationCounter, 1, 15);
        // invalidateInner();
    }

    function zoomOutToDays() {
        var _avigatorFactorX = charts[0].getFilterAxis().getFactorX();
        currentZoomState = STATE_ZOOM_TRANSFORM_TO_DAYS;
        //xAxisDataRef = dataStore.days.xAxisData;
        //yAxisDataRefs = dataStore.days.yAxisData;
        //selectionFactorY = dataStore.days.factorY;
        //zoomStartInt = dataStore.days.startIndexOff * _avigatorFactorX;
        // zoomEndInt = dataStore.days.endIndexOff * _avigatorFactorX;
        //   zoomStartFloat = dataStore.days.startIndexOff;
        //   zoomEndFloat = dataStore.days.endIndexOff;
        //dataStore.hours.from = zoomStartFloat + 1;
        // dataStore.hours.to = zoomEndFloat + 1;
        calcNavigatorFactors();
        // associateZoomStart(dataStore.days.startIndex, 15);
        //  associateZoomEnd(dataStore.days.endIndex, 15);
        animationCounter = 1;
        animate(animationCounter, setAnimationCounter, 0, 15);
        updateTitleStatus();
    }

    function loadHoursDataSuccess(data, timeStamp) {
        detailCache[timeStamp] = data;
        zoomInToHours(data, timeStamp);
    }

    function loadHoursDataFail() {
        currentZoomState = STATE_ZOOM_DAYS;
    }

    function lookupHourData() {
        var _currentPosition = fParseInt(selectionCurrentIndexFloat);
        var _currentTimeStamp = charts[0].getXData()[_currentPosition];
        var _detailCache = detailCache[_currentTimeStamp];
        if (_detailCache) {
            zoomInToHours(_detailCache, _currentTimeStamp);
        } else {
            config.loadCallback(_currentTimeStamp,
                loadHoursDataSuccess, loadHoursDataFail);
        }
    }

    function hideTooltip() {
        animate(arrowTooltipOpacity, setArrowTooltipOpacity, 0);
        addClass(divTooltipContainer, CONST_HIDDEN_CLASS);
        invalidateInner();
    }

    function showTooltip() {
        animate(arrowTooltipOpacity, setArrowTooltipOpacity, 1);
        removeClass(divTooltipContainer, CONST_HIDDEN_CLASS);
        invalidateInner();
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
            }  else if (mouseHoveredRegionType === ENUM_SELECTION_HOVER) {
                selectionCurrentIndexPinned = isMobile ? vFalse : !selectionCurrentIndexPinned;
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
                var _normal = color.length === 7,
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
        context.lineWidth = width || uiDisplayScaleFactor;
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


    function quadraticCurveTo(context,cp1x, cp1y, cp2x, cp2y, x, y) {
        context.quadraticCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    }


    function fill(context) {
        context.fill();
    }


    function circle(context, x, y, radius) {
        context.arc(x, y, radius, 0, CONST_TWO_PI);
    }

    function fillRect(context, x, y, w, h) {
        context.fillRect(x, y, w, h);
    }

    function drawBalloon(context, x, y, width, height) {
        var _xWidth = x + width,
            _yHeight = y + height;

        beginPath(context);
        moveOrLine(context, vTrue, x + uIGlobalPadding, y);
        quadraticCurveTo(context, x, y, x, y + uIGlobalPadding);
        moveOrLine(context, vFalse, x, _yHeight - uIGlobalPadding);
        quadraticCurveTo(context, x, _yHeight, x + uIGlobalPadding, _yHeight);
        moveOrLine(context, vFalse, _xWidth - uIGlobalPadding, _yHeight);
        quadraticCurveTo(context, _xWidth, _yHeight, _xWidth, _yHeight - uIGlobalPadding);
        moveOrLine(context, vFalse, _xWidth, y + uIGlobalPadding);
        quadraticCurveTo(context, _xWidth, y, _xWidth - uIGlobalPadding, y);
        closePath(context);

        var _border = uiDisplayScaleFactor * 2;
        moveOrLine(context, vTrue, x + uIGlobalPadding2, y + _border);
        moveOrLine(context, vFalse, _xWidth - uIGlobalPadding2, y + _border);
        moveOrLine(context, vFalse, _xWidth - uIGlobalPadding2, _yHeight - _border);
        moveOrLine(context, vFalse, x + uIGlobalPadding2, _yHeight - _border);

        closePath(context);

    }

    function setStrokeStyle(context, strokeStyle) {
        context.strokeStyle = strokeStyle;
    }

    function setGlobalAlpha(context, opacity) {
        context.globalAlpha = opacity;
    }

    function setFillStyle(context, fillStyle) {
        context.fillStyle = fillStyle;
    }

    function setFont(context, val) {
        context.font = val;
    }

    function drawImage(imgElem, dx, dy) {
        frameContext.drawImage(imgElem, dx, dy);
    }

    function clearCanvas(canvas, width, height) {
        canvas.clearRect(0, 0, width, height);
    }

    function reverseOrder(context) {
        context.globalCompositeOperation = "destination-over";
    }

    function returnOrder(context) {
        context.globalCompositeOperation = "source-over";
    }

    function drawAxisLabels() {
        var _selectionAxis = selectionBottom,
            _selectionFactorX = charts[0].getMainAxis().getFactorX(),
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

        var _mainOpacity = seriesMaxOpacity * smartAxisXOpacity ;

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
        setFillStyle(frameContext,  uiGlobalTheme.axisText);
        setLineWidth(frameContext);
        for (_i = _nextItem - _axisRange; _i <= selectionEndIndexInt; _i += _axisRange) {
            _nextItem = fMathCeil(_i);
            _labelX = uIGlobalPadding2 + (_nextItem - selectionStartIndexFloat ) * _selectionFactorX;
            _opacity !== vUndefined && fMathAbs((_nextItem - smartAxisXStart) % _prevSmartAxisRange) >= 1 ?
                setGlobalAlpha(frameContext, _opacity) :
                setGlobalAlpha(frameContext, _mainOpacity);
            if (_nextItem > 0) {
                var _text = currentZoomState !== STATE_ZOOM_HOURS ?
                    formatDate(charts[0].getXData()[_nextItem]) :
                    formatTime(charts[0].getXData()[_nextItem]);

                fillText(frameContext, _text, _labelX, _labelY);
            }
        }

        //Y-axis labels ============================

        for (_i in charts) {
            charts[_i].drawYAxisLabels(_i > 0);
            if (!globalScaledY) {
                break;
            }
        }


        setGlobalAlpha(frameContext, 1);
    }

    function resetStackedRegister(from, to) {
        var _lastIndex = to || charts[0].getLastIndex(),
            _firstIndex = from || 1,
            _k;
        for (_k = _firstIndex; _k <= _lastIndex; _k++) {
            stackedRegister[_k] = 0;
        }
    }

    function drawSeries() {
        seriesMaxOpacity = 0;
        var _i,
            _axisY;


        if (navigatorNeedUpdateBuffer) {
            clearCanvas(bufferNavigatorContext, totalWidth, navigatorHeight);
            if (globalStackedBarMode) {
                reverseOrder(bufferNavigatorContext);
                resetStackedRegister();
            }
            for (_i in charts) {
                charts[_i].drawFilterSeries();
            }
            if (globalStackedBarMode) {
                returnOrder(bufferNavigatorContext);
            }
            navigatorNeedUpdateBuffer = vFalse;
        }
        if (globalStackedBarMode) {
            reverseOrder(frameContext);
            resetStackedRegister();
        }
        for (_i in charts) {
            _axisY = charts[_i];
            seriesMaxOpacity = getMax(_axisY.getOpacity(), seriesMaxOpacity);
            _axisY.drawMainSeries();
        }


        if (globalStackedBarMode) {
            returnOrder(frameContext);
        }
        if (charts[0].getType() === ENUM_CHART_TYPE_BAR) {
            setGlobalAlpha(frameContext, 1);
            setFillStyle(frameContext, uiGlobalTheme.barMask);
            fillRect(frameContext, 0, 0, totalWidth, selectionHeight + navigatorHeightHalf);
        }
        setGlobalAlpha(frameContext, 1);
        drawImage(bufferNavigatorCanvas, 0, navigatorTop);

    }


    function updateLegend() {
        if (globalStackedBarMode) {
            resetStackedRegister(1, 1);
        }
        for (var _i in charts) {
            var _chart = charts[_i];
            if (_chart.getEnabled()) {
                _chart.drawArrowPoint();
            }
        }
    }

    /**
     * Draws a touch circle
     */
    function drawPressHighlight() {
        if (navigatorPressed > 0 && config.showTouches) {
            var _x;

            if (navigatorPressedRegionType === ENUM_START_SELECTION_HOVER) {
                _x = uIGlobalPadding2 + zoomStartInt;
            } else if (navigatorPressedRegionType === ENUM_END_SELECTION_HOVER) {
                _x = uIGlobalPadding2 + zoomEndInt;
            }
            else {
                _x = uIGlobalPadding2 + zoomStartInt + (zoomEndInt - zoomStartInt) / 2;
            }

            beginPath(frameContext);
            setGlobalAlpha(frameContext, 0.2 * navigatorPressed);
            setFillStyle(frameContext, envColor);

            circle(frameContext, _x, navigatorTop + navigatorHeightHalf, navigatorPressed * 20 * uiDisplayScaleFactor);
            fill(frameContext);

        }
        if (boundHighlight && config.showBounds) {
            drawBoundHighlight(boundHighlight);
        }


    }


    function drawBoundHighlight(overflow) {
        if (overflow !== 0) {
            var _x = overflow < 0 ? 0 : visibleWidth - uIBtnRadius,
                _grd;
            _grd = frameContext.createLinearGradient(_x, 0, _x + uIBtnRadius, 0);
            _grd.addColorStop(_x ? 0 : 1, getRGBA(envColor, 0));
            _grd.addColorStop(_x ? 1 : 0, getRGBA(envColor, fMathAbs(overflow) * 0.2));
            setFillStyle(frameContext, _grd);
            fillRect(frameContext, _x + uIGlobalPadding2, 0, uIBtnRadius, selectionBottom);
        }
    }


    function drawFilterLayer() {
        setGlobalAlpha(frameContext, 1);
        setFillStyle(frameContext, uiGlobalTheme.scrollBackground);
        fillRect(frameContext, 0, navigatorTop, zoomStartInt + uIGlobalPadding2, navigatorHeight);
        fillRect(frameContext, uIGlobalPadding2 + zoomEndInt, navigatorTop, visibleWidth + uIGlobalPadding2 - zoomEndInt + uiDisplayScaleFactor, navigatorHeight);
        fillRect(frameContext, 0, navigatorTop, uIGlobalPadding2, navigatorHeight);
        fillRect(frameContext, visibleWidth + uIGlobalPadding2 + uiDisplayScaleFactor, navigatorTop, uIGlobalPadding2, navigatorHeight);
        setLineWidth(frameContext, 0.5);
        setStrokeStyle(frameContext, uiGlobalTheme.scrollSelectorBorder);
        setFillStyle(frameContext, uiGlobalTheme.scrollSelector);
        drawBalloon(frameContext, zoomStartInt + uiDisplayScaleFactor, navigatorTop, zoomEndInt - zoomStartInt + uIGlobalPadding4 - uiDisplayScaleFactor * 3, navigatorHeight);
        fill(frameContext);
        endPath(frameContext);
    }

    function redrawFrame() {
        clearCanvas(frameContext, totalWidth, totalHeight);
        if (charts.length) {
            setFont(frameContext, envRegularSmallFont);


            if (charts[0].getType() === ENUM_CHART_TYPE_LINE) {
                charts[0].drawHorizontalGrid();
                drawSeries();
            } else {
                charts[0].drawHorizontalGrid();
                drawSeries();
            }

            perf.mark(perf.drawSeries);

            drawFilterLayer();
            perf.mark(perf.drawFilterLayer);

            if (seriesMaxOpacity > 0) {
                if (globalStackedBarMode) {
                    resetStackedRegister(1, 1);
                    for (var _i in charts) {
                        var _chart = charts[_i];
                        if (_chart.getEnabled()) {
                            _chart.drawTooltipArrow(selectionCurrentIndexFloat, selectionStartIndexFloat);
                        }
                    }
                }
                else {
                    charts[0].drawTooltipArrow(selectionCurrentIndexFloat, selectionStartIndexFloat);
                }
                drawAxisLabels();
                if (arrowTooltipOpacity > 0) {
                    updateLegend();
                }

            }

            perf.mark(perf.updateLegend);
            drawPressHighlight();
            perf.mark(perf.drawPressHighlight);

            //frameContext.translate(0, -400);

       //var sd = new Path2DPoly("M181 41c-7.854 0-15.665 3.228-21.219 8.781-5.553 5.554-8.78 13.365-8.781 21.219v370c0 7.854 3.228 15.665 8.781 21.219 5.554 5.553 13.365 8.78 21.219 8.781h150c7.854 0 15.665-3.228 21.219-8.781 5.553-5.554 8.78-13.365 8.781-21.219V71c0-7.854-3.228-15.665-8.781-21.219-5.554-5.553-13.365-8.78-21.219-8.781H181zm59.281 20a5.006 5.006 0 0 1 .219 0 5 5 0 0 1 .5 0h30a5 5 0 1 1 0 10h-30a5.013 5.013 0 0 1-.719-10zM161 91h190v325H161V91zm95 335c8.284 0 15 6.716 15 15 0 8.284-6.716 15-15 15-8.284 0-15-6.716-15-15 0-8.284 6.716-15 15-15z");

       //

        //    frameContext.fill(sd);
       //   dds();
         //   frameContext.translate(220, 0);
            //test();
        //    frameContext.translate(-220, 0);
        //    fill(frameContext);
            //frameContext.translate(0, 400);

        }
    }
    
    function dds() {
        frameContext.beginPath();
        frameContext.moveTo(181, 41);
        frameContext.bezierCurveTo(173.146, 41, 165.335, 44.228, 159.781, 49.781);
        frameContext.bezierCurveTo(154.228, 55.335, 151.001, 63.146, 151, 71);
        frameContext.lineTo(151, 441);
        frameContext.bezierCurveTo(151, 448.854, 154.228, 456.665, 159.781, 462.219);
        frameContext.bezierCurveTo(165.335, 467.772, 173.14600000000002, 470.99899999999997, 181, 471);
        frameContext.lineTo(331, 471);
        frameContext.bezierCurveTo(338.854, 471, 346.665, 467.772, 352.219, 462.219);
        frameContext.bezierCurveTo(357.772, 456.665, 360.99899999999997, 448.854, 361, 441);
        frameContext.lineTo(361, 71);
        frameContext.bezierCurveTo(361, 63.146, 357.772, 55.335, 352.219, 49.781);
        frameContext.bezierCurveTo(346.665, 44.228, 338.854, 41.001, 331, 41);
        frameContext.lineTo(181, 41);
        frameContext.closePath();
        frameContext.moveTo(240.281, 61);
        frameContext.arc(240.3905, 66.00480226882142, 5.006, -1.5926718229582832, -1.54892083063151, false);
        frameContext.arc(240.75, 65.99374608885954, 5, -1.6208171836006666, -1.5207754699891267, false);
        frameContext.lineTo(271, 61);
        frameContext.arc(271, 66, 5, 4.71238898038469, 1.5707963267948968, false);
        frameContext.lineTo(241, 71);
        frameContext.arc(240.67089693105856, 65.99781446065688, 5.013, -4.778086153637736, -1.6486521226829272, false);
        frameContext.closePath();
        frameContext.moveTo(161, 91);
        frameContext.lineTo(351, 91);
        frameContext.lineTo(351, 416);
        frameContext.lineTo(161, 416);
        frameContext.lineTo(161, 91);
        frameContext.closePath();
        frameContext.moveTo(256, 426);
        frameContext.bezierCurveTo(264.284, 426, 271, 432.716, 271, 441);
        frameContext.bezierCurveTo(271, 449.284, 264.284, 456, 256, 456);
        frameContext.bezierCurveTo(247.716, 456, 241, 449.284, 241, 441);
        frameContext.bezierCurveTo(241, 432.716, 247.716, 426, 256, 426);
        frameContext.closePath();
        frameContext.fill ("nonzero");
        frameContext.stroke ();
    }

    function test() {
        if (false) {
            frameContext.beginPath();
            frameContext.moveTo(181, 41);
            frameContext.bezierCurveTo(173.146, 41, 165.335, 44.228, 159.781, 49.781);
            frameContext.bezierCurveTo(154.228, 55.335, 151.001, 63.146, 151, 71);
            frameContext.lineTo(151, 441);
            frameContext.bezierCurveTo(151, 448.854, 154.228, 456.665, 159.781, 462.219);
            frameContext.bezierCurveTo(165.335, 467.772, 173.14600000000002, 470.99899999999997, 181, 471);
            frameContext.lineTo(331, 471);
            frameContext.bezierCurveTo(338.854, 471, 346.665, 467.772, 352.219, 462.219);
            frameContext.bezierCurveTo(357.772, 456.665, 360.99899999999997, 448.854, 361, 441);
            frameContext.lineTo(361, 71);
            frameContext.bezierCurveTo(361, 63.146, 357.772, 55.335, 352.219, 49.781);
            frameContext.bezierCurveTo(346.665, 44.228, 338.854, 41.001, 331, 41);
            frameContext.closePath();
        } else {
           drawBalloon(frameContext, 151, 41, 211, 420);
        }


        ///=================================

        frameContext.moveTo(240.281, 61);
        frameContext.lineTo(271, 61);
        frameContext.arc(271, 66, 5, 4.8, 1.6, false);
        frameContext.lineTo(241, 71);
        frameContext.arc(240, 66, 5.013, -4.8, -1.6, false);
        frameContext.closePath();

        //==================== window
        frameContext.moveTo(161, 91);
        frameContext.lineTo(351, 91);
        frameContext.lineTo(351, 416);
        frameContext.lineTo(161, 416);
        frameContext.lineTo(161, 91);
        frameContext.closePath();
        //====================


        frameContext.moveTo(240.281, 61+365);
        frameContext.lineTo(271, 61+365);
        frameContext.arc(271, 66+365, 5, 4.8, 1.6, false);
        frameContext.lineTo(241, 71+365);
        frameContext.arc(240, 66+365, 5.013, -4.8, -1.6, false);
        frameContext.closePath();

        frameContext.fill ("nonzero");
        frameContext.stroke();
    }
    

    function calcNavigatorFactors(isReset) {
        if (!charts.length) {
            return;
        }
        for (var _i in charts) {
            var _chart = charts[_i];
            _chart.getFilterAxis().calculateFactors(1, _chart.getLastIndex());
            if (!globalScaledY) {
                break;
            }
        }


        if (isReset) {
            associateZoomStart(1);
            associateZoomEnd(charts[0].getLastIndex());
            setTimeout(function () {
                associateZoomStart(charts[0].getLastIndex() - (charts[0].getLastIndex()) * CONST_NAVIGATOR_WIDTH_PERCENT / 100, 5);
            }, 200);
        } else {
            associateZoomStart(selectionStartIndexFloat);
            associateZoomEnd(selectionEndIndexFloat);
        }
        navigatorNeedUpdateBuffer = vTrue;
        invalidateInner();
    }

    function calcSmartAxisY() {
        for (var _i in charts) {
            charts[_i].calculateSmartAxisY();
            if (!globalScaledY) {
                break;
            }
        }
    }

    function calcSelectionFactors(startIndex, endIndex) {
        for (var _i in charts) {
            var _chart = charts[_i];
            _chart.getMainAxis().calculateFactors(startIndex, endIndex);
            if (globalStackedBarMode) {
                _chart.getFilterAxis().calculateFactors(1, _chart.getLastIndex());
            }

            _chart.calculateSmartAxisY();
            if (!globalScaledY) {
                break;
            }
        }
    }


    function assignSelectionFactors(withoutAnimations) {
        selectionStartIndexFloat = zoomStartFloat;
        selectionEndIndexFloat = zoomEndFloat;
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
        calcSelectionFactors(selectionStartIndexFloat,
            selectionEndIndexFloat);
        calcSmartAxisY();

        if (updateDateRangeTextTimer) {
            clearTimeout(updateDateRangeTextTimer);
        }
        updateDateRangeTextTimer = setTimeout(updateDateRangeText, 20);

        /*
        if (currentZoomState === STATE_ZOOM_TRANSFORM_TO_HOURS ||
            currentZoomState === STATE_ZOOM_TRANSFORM_TO_DAYS) {
           calcSelectionFactors(dataStore.hours.yAxisData,
                dataStore.hours.startIndex,
                dataStore.hours.endIndex, charts[0].getMainAxis().getFactorX(), selectionHeight);

        }
        */

    }

    function addClass(el, cls) {
        el.classList.add(cls);
    }

    function removeClass(el, cls) {
        el.classList.remove(cls);
    }
    
    function createElement(tagName, prefix, classes, styles, parent) {
        var _el = vDocument.createElement(tagName),
            _i,
            _s;
        _el.id = prefix + ctxId;
        for (_i in classes) {
            addClass(_el, classes[_i]);
        }
        for (_s in styles) {
            _el.style[_s] = styles[_s];
        }
        if (parent) {
            parent.appendChild(_el);
        }
        return _el;
    }

    function createTitleLabels() {
        var _titleContainer = createElement("div",
            "title-cnt-", ["title-container"], {}, container);

        divDayRange = createElement("div",
            "day-range-", ["day-range"], {}, _titleContainer);

        divZoomOut = createElement("div",
            "zoom-out-", ["zoom-out", "animate", CONST_HIDDEN_CLASS], {}, _titleContainer);

        var sd = createElement("span",
            "zoom-out-svg-", ["zoom-out-svg"], {}, divZoomOut);
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


        divZoomOut.addEventListener("click", zoomOutToDays);
        var zoomOutText = createElement("span",
            "zoom-out-text-", [], {}, divZoomOut);
        zoomOutText.innerHTML = "Zoom out";
        divTitle = createElement("div",
            "title-", ["title", "animate", "top"], {}, _titleContainer);
        divTitle.innerHTML = config.title || "";
    }

    function assignAxisProperty(yAxisData, source, field) {
        if (source) {
            var _axis,
                _i,
                _yAxisRef;
            for (_axis in source) {
                for (_i in  yAxisData) {
                    _yAxisRef = yAxisData[_i];
                    if (_yAxisRef.alias === _axis) {
                        _yAxisRef[field] = source[_axis];
                    }
                }
            }
        }
    }

    function parseDataSource(src) {
        if (src) {
            var columns = src.columns,
                _i,
                _xAxisData,
                _yAxisData = [];
            if (columns) {
                for (_i in columns) {
                    var _column = columns[_i],
                        _alias = _column[0];
                    if (_alias === "x") {
                        _xAxisData = _column;
                    } else {
                        _yAxisData.push(
                            {
                                alias: _alias,
                                data: _column,
                                name: _alias
                            });
                    }
                }

                assignAxisProperty(_yAxisData, src.types, "type");
                assignAxisProperty(_yAxisData, src.colors, "color");
                assignAxisProperty(_yAxisData, src.names, "name");

                globalScaledY = src.y_scaled;
                globalStackedBarMode = src.stacked;
                globalPercentageMode = src.percentage;
                return {
                    x: _xAxisData,
                    y: _yAxisData
                };
            }
        }
    }

    function getFunctionName(f) {
        return f.name || f.toString().substring(9, 32);
    }

    function animate(initial, setter, proposed, speed, logarithmic) {
        var _key = getFunctionName(setter),
            _frameCount,
            _exAnimationFrames;
        if (initial !== proposed && setter) { //no need animation
            if (this) {
                _key += this.getAlias();
            }

            _frameCount = speed || (mousePressed || 5);
            if (logarithmic && initial) {
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

    function animationComplete(animationKey) {
        if (animationKey === CONST_AXIS_X_LABEL_OPACITY_ANIMATION_KEY && smartAxisXFrozen) {
            smartAxisXFrozen = vFalse;
            animate(smartAxisXRatio, setSmartAxisRatio, 0, 1);
            animate(smartAxisXOpacity, setAxisXLabelOpacity, 1, 5);
        } else if (animationKey === CONST_SET_ZOOM_START_ANIMATION_KEY ||
            animationKey === CONST_SET_ZOOM_END_ANIMATION_KEY) {
            if (!animations[CONST_SET_ZOOM_START_ANIMATION_KEY] &&
                !animations[CONST_SET_ZOOM_END_ANIMATION_KEY]) {
                if (currentZoomState === STATE_ZOOM_TRANSFORM_TO_HOURS) {
                    if (smartAxisXFrozen) {
                        smartAxisXFrozen = vFalse;
                        animate(smartAxisXRatio, setSmartAxisRatio, 0, 1);
                        animate(smartAxisXOpacity, setAxisXLabelOpacity, 1, 5);
                    }

                    currentZoomState = STATE_ZOOM_HOURS
                    calcNavigatorFactors(vTrue);


                } else if (currentZoomState === STATE_ZOOM_TRANSFORM_TO_DAYS) {
                    currentZoomState = STATE_ZOOM_DAYS;
                }
            }
        }
    }

    function setTheme(theme) {
        uiGlobalTheme = theme;
        divZoomOut.style.color = uiGlobalTheme.zoomOutText;
    }

    function render() {

        perf.mark(perf.start);
        processAnimations();
        perf.mark(perf.animation);

        if (selectionNeedUpdateFactorY) {
            selectionNeedUpdateFactorY = vFalse;
            assignSelectionFactors();
        }

        perf.mark(perf.calcSelectionFactors);
        if (needRedraw) {
            needRedraw = vFalse;
            redrawFrame();
        }
        var _proposed = performance.now();
        if (lastPerformance) {
            frameDelay = 0.8 * frameDelay + 0.2 * (_proposed - lastPerformance );
        }
        lastPerformance = _proposed;
        perf.mark(perf.end);

        perf.measureDurations(frameContext);
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
        setTheme: setTheme
    };
};