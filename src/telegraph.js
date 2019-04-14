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
        CONST_BACKGROUND_CLASS = "background",

        CONST_ZOOM_ANIMATION_SPEED = 15,
        CONST_AXIS_X_LABEL_OPACITY_ANIMATION_KEY = getFunctionName(setAxisXLabelOpacity),
        CONST_SET_ZOOM_START_ANIMATION_KEY = getFunctionName(setZoomStart),
        CONST_SET_ZOOM_END_ANIMATION_KEY = getFunctionName(setZoomEnd),

        CONST_CHART_MASTER = "master",
        CONST_CHART_DETAIL = "detail",

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
        ENUM_CHART_TYPE_AREA = "area",
        ENUM_CHART_TYPE_PIE = "pie";

    var ParamsStorage = function () {
        var dataStore = {};

        function put(key, value) {
            dataStore[key] = value;
        }

        function get(key) {
            return dataStore[key];
        }

        return {
            put: put,
            get: get
        };
    }

    var container = vDocument.getElementById(ctxId),                               //canvases container
        isMobile = ("ontouchstart" in vWindow),
        charts = [],
        detailCharts = [],
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
                barMask: "rgba(36, 47, 62, 0.5)"
            },

        totalWidth,
        visibleWidth,
        filterHeight,
        selectionHeight,

        filterHeightHalf,
        selectionBottom,
        filterTop,
        filterBottom,
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
        zoomStartPosition,
        zoomEndPosition,

        storedZoomStartFloat,
        storedZoomEndFloat,
        storedProposedPosition,

        storedFilterStartIndexFloat,
        storedFilterEndIndexFloat,

        selectionStartIndexFloat,
        selectionEndIndexFloat,
        selectionStartIndexInt,
        selectionEndIndexInt,

        selectionCurrentIndexFloat,
        selectionCurrentIndexPinned,
        isSelectionCurrentIndexChanged,

        filterStartIndexFloat,
        filterEndIndexFloat,

        needUpdateMainFactor,
        needUpdateFilterFactor,


        smartAxisXStart,                //@type {Number} frozen X-axis left bound for scroll
        smartAxisXRange,                //@type {Number} frozen X-axis range for scroll
        smartAxisXFrozen,               //@type {Number} X-axis labels resort frozen
        smartAxisXRatio,                //@type {Number} floated X-axis sub labels factor
        smartAxisXFrozenStart,          //@type {Number} frozen selectionStartIndexFloat for scroll
        smartAxisXFrozenEnd,            //@type {Number} frozen selectionEndIndexFloat for scroll
        smartAxisXOpacity = 1,          //@type {Number} opacity of X-axis labels
        smartAxisYOpacity = 1,          //@type {Number} opacity of Y-axis labels

        filterPressed = 0,           //@type {Number} pressed navigator 0..1 (opacity)
        filterPressedRegionType,     //@type {Number} type of pressed element for animations
        filterNeedUpdateBuffer,      //@type {Boolean} navigators buffer invalidated need repaint

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
        detailChartOffset,
        detailAxisQuality = 24,
        paramsStorage = new ParamsStorage();


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

            if (_startIndexInt < 1) {
                _startIndexInt = 1;
            }
            if (_endIndexInt >= length) {
                _endIndexInt = length - 1;
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


        return {
            getAlias: getAlias,
            setWidth: setWidth,
            setHeight: setHeight,

            getLocalMaxY: getLocalMaxY,
            getLocalMinY: getLocalMinY,
            getFactorY: getFactorY,
            getFactorX: getFactorX,
            calculateFactors: calculateFactors,
            getLineWidth: getLineWidth
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
            divTlpRow,
            divLegendVal,
            divButton,
            opacity = 1,

            enabled = vTrue,
            filterAxis,
            mainAxis,
            percentageData = [];

        function initAxis(globalMainAxis, globalFilterAxis) {
            if (globalScaledY) {
                filterAxis = new AxisInfo(alias + "f", xData, [this], visibleWidth, filterHeight, 1, vTrue);
                mainAxis = new AxisInfo(alias + "m", xData, [this], visibleWidth, selectionHeight, config.lineWidth || 1.5, vTrue);
                filterAxis.calculateFactors(fParseInt(filterStartIndexFloat), fParseInt(filterEndIndexFloat));
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

        function setEnabled(val) {
            enabled = val;
            updateButtonStatus(this);
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
            needUpdateMainFactor = vTrue;
            filterNeedUpdateBuffer = vTrue;
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
            while (_selectionAxis > filterHeightHalf) {
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
            while (_nextScaleLevel > filterHeightHalf) {
                _yCoordinate = fMathCeil(_nextScaleLevel) + CONST_ANTI_BLUR_SHIFT;
                moveOrLine(frameContext, vTrue, uIGlobalPadding2, _yCoordinate);
                moveOrLine(frameContext, vFalse, uIGlobalPadding2 + visibleWidth, _yCoordinate);
                _nextScaleLevel = _nextScaleLevel + smartAxisYRangeFloat * mainAxis.getFactorY();
            }
            endPath(frameContext);
            setGlobalAlpha(frameContext, 1);
        }


        function drawSeriesCore(context, axis, offsetIndex, startIndexInt, endIndexInt, bottom, offset) {
            var _k,
                _xPos,
                _yPos,
                _yValue,
                _minY = axis.getLocalMinY(),
                _factorX = axis.getFactorX(),
                _factorY = axis.getFactorY(),
                _extendBounds = fParseInt(35 / _factorX),
                _yData = globalPercentageMode ? getPercentageData() : yData
            offset = offset || 0;

            beginPath(context);
            switch (type) {
                case ENUM_CHART_TYPE_LINE:
                    setStrokeStyle(context, color);
                    setLineWidth(context, axis.getLineWidth() * uiDisplayScaleFactor);
                    for (_k = startIndexInt; _k <= endIndexInt;) {
                        _xPos = offset + uIGlobalPadding2 + (_k - offsetIndex) * _factorX;
                        _yPos = bottom + (_yData[_k] - _minY) * _factorY;
                        moveOrLine(context, _k++ === startIndexInt, _xPos, _yPos);
                    }
                    endPath(context);
                    break;

                case ENUM_CHART_TYPE_BAR:
                    setFillStyle(context, color);
                    startIndexInt = getMax(startIndexInt - _extendBounds, 1);
                    _xPos = offset + uIGlobalPadding2 + (startIndexInt - offsetIndex) * _factorX;
                    moveOrLine(context, vTrue, _xPos, bottom);
                    endIndexInt = getMin(endIndexInt + _extendBounds, lastIndex);

                    for (_k = startIndexInt; _k <= endIndexInt; _k++) {
                        _xPos = offset + uIGlobalPadding2 + (_k - offsetIndex) * _factorX;
                        if (_yPos) {
                            moveOrLine(context, vFalse, _xPos, _yPos);
                        }
                        _yValue = _yData[_k];
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
                    startIndexInt = getMax(startIndexInt - _extendBounds, 1);
                    _xPos = offset + uIGlobalPadding2 + (startIndexInt - offsetIndex) * _factorX;
                    moveOrLine(context, vTrue, _xPos, bottom);
                    endIndexInt = getMin(endIndexInt + _extendBounds, lastIndex);
                    for (_k = startIndexInt; _k <= endIndexInt; _k++) {
                        _xPos = offset + uIGlobalPadding2 + (_k - offsetIndex) * _factorX;
                        _yValue = _yData[_k] * opacity;

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

                case ENUM_CHART_TYPE_PIE:
                    //todo pie chart
                    break;
            }


        }

        function drawMainSeries(isChild, offset, exOpacity) {
            if (inTransition() && !isChild) {
                setGlobalAlpha(frameContext, opacity * (1 - animationCounter));
            } else {
                setGlobalAlpha(frameContext, opacity * (exOpacity || 1));
            }
            drawSeriesCore(frameContext, mainAxis,
                isChild ? 0 : selectionStartIndexFloat,
                isChild ? 1 : selectionStartIndexInt,
                isChild ? lastIndex : selectionEndIndexInt,
                selectionBottom, offset, opacity);
        }

        function drawFilterSeries(isChild, offset, exOpacity) {
            if (offset && !isChild) {
                setGlobalAlpha(bufferNavigatorContext, opacity * (1 - animationCounter));
            } else {
                setGlobalAlpha(bufferNavigatorContext, opacity * (exOpacity || 1));
            }
            drawSeriesCore(bufferNavigatorContext, filterAxis,
                isChild ? 0 : filterStartIndexFloat,
                isChild ? 1 : fParseInt(filterStartIndexFloat),
                isChild ? lastIndex : fParseInt(filterEndIndexFloat),
                filterHeight, offset);
        }

        function drawArrowPoint() {
            var _posX = uIGlobalPadding2 + (selectionCurrentIndexFloat - selectionStartIndexFloat  ) * mainAxis.getFactorX(),
                _from = fMathFloor(selectionCurrentIndexFloat),
                _value = yData[_from];

            var _proposedTooltipLeft = (_posX / uiDisplayScaleFactor);

            if (type !== ENUM_CHART_TYPE_LINE) {
                _proposedTooltipLeft = _proposedTooltipLeft + 15;
            } else {
                _proposedTooltipLeft = _proposedTooltipLeft - 15;
            }


            if (_proposedTooltipLeft < 0) {
                _proposedTooltipLeft = 0;
            } else {
                var _tooltipWidth = fParseInt(getStyle(divTooltipContainer, CONST_WIDTH).replace(CONST_PIXEL, "")) + 5;
                if (_proposedTooltipLeft + _tooltipWidth > container.clientWidth) {
                    _proposedTooltipLeft = container.clientWidth - _tooltipWidth;
                }
            }
            divTooltipContainer.style.left = _proposedTooltipLeft + CONST_PIXEL; //todo optimize
            updateLegendValue(_value);
            divTooltipDate.innerHTML = formatDate(xData[_from], vTrue, vTrue);

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

        function updateButtonStatus(owner) {
            if (enabled) {
                addClass(divButton, "checked");
                removeClass(divTlpRow, CONST_BACKGROUND_CLASS);

            } else {
                removeClass(divButton, "checked");
                addClass(divTlpRow, CONST_BACKGROUND_CLASS);
            }
            animate.apply(owner, [opacity, setOpacity, enabled ? 1 : 0, 10]);
            needUpdateMainFactor = vTrue;
        }

        function handleButtonPress(owner) {
            enabled = !enabled
            updateButtonStatus(owner);
        }

        function createUiElements(cls, hidden) {
            var _button = createElement("div",
                "btn-", ["button", "checked", cls], {
                    border: "2px " + color + " solid",
                    color: color, backgroundColor: color
                }, divBtnContainer);
            if (hidden) {
                addClass(_button, CONST_BACKGROUND_CLASS);
            }
            var _that = this;
            _button.addEventListener("click", function (e) {
                handleButtonPress(_that);
            });
            _that.setButtonDiv(_button);

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

            var _tlpRow = createElement("div",
                "tlp-title", ["tooltip-row", cls], {}, divTooltipValues);
            _that.setTlpRowDiv(_tlpRow);
            if (hidden) {
                addClass(_tlpRow, CONST_BACKGROUND_CLASS);
            }

            var _tlpTitle = createElement("span",
                "tlp-title", ["tooltip-title"], {}, _tlpRow);
            _tlpTitle.innerHTML = name;

            _that.setTlpValDiv(createElement("span",
                "tlp-val", ["tooltip-value"], {
                    color: color
                }, _tlpRow));

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

        function setButtonDiv(val) {
            divButton = val;
        }


        function updateLegendValue(val) {
            divLegendVal.innerHTML = val;
        }


        function calculateMainFactors(startIndex, endIndex, withoutAnimations) {
            mainAxis.calculateFactors(startIndex, endIndex, withoutAnimations);
        }

        function calculateFilterFactors(startIndex, endIndex, withoutAnimations) {
            filterAxis.calculateFactors(startIndex, endIndex, withoutAnimations);
            filterNeedUpdateBuffer = vTrue;
        }

        return {
            initAxis: initAxis,
            getAlias: getAlias,
            getOpacity: getOpacity,
            getYData: getYData,
            getXData: getXData,
            getEnabled: getEnabled,
            setEnabled: setEnabled,
            calculateSmartAxisY: calculateSmartAxisY,
            drawYAxisLabels: drawYAxisLabels,
            calculateMainFactors: calculateMainFactors,
            calculateFilterFactors: calculateFilterFactors,
            drawHorizontalGrid: drawHorizontalGrid,
            drawMainSeries: drawMainSeries,
            drawFilterSeries: drawFilterSeries,
            drawArrowPoint: drawArrowPoint,
            getMainAxis: getMainAxis,
            getFilterAxis: getFilterAxis,
            createUiElements: createUiElements,
            getLastIndex: getLastIndex,
            getType: getType,
            getPercentageData: getPercentageData,
            drawTooltipArrow: drawTooltipArrow,
            setTlpValDiv: setTlpValDiv,
            setTlpRowDiv: setTlpRowDiv,
            setButtonDiv: setButtonDiv
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
            "tlp-", ["tooltip", CONST_BACKGROUND_CLASS], {}, container);

        divTooltipDate = createElement("div",
            "tlp-date-", ["tooltip-date"], {}, divTooltipContainer);

        divTooltipValues = createElement("div",
            "tlp-val-cnt-", ["tooltip-values"], {}, divTooltipContainer);

        divTooltipContainer.addEventListener("click", zoomInToHourData);

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
            var from = formatDateFull(charts[0].getXData()[selectionStartIndexInt + 1]);
            var to = formatDateFull(charts[0].getXData()[selectionEndIndexInt - 2]);
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
        filterHeight = fParseInt(totalWidth * CONST_NAVIGATOR_HEIGHT_PERCENT / 100); //nav height
        selectionHeight = totalWidth - filterHeight - filterHeight;      //selection window height
        filterHeightHalf = filterHeight / 2;                                 //half navigator height
        selectionBottom = selectionHeight + filterHeightHalf;                   //selection window bottom
        filterTop = fParseInt(selectionHeight + filterHeight + uIGlobalPadding4);        //navigator top
        filterBottom = filterTop + filterHeight;                          //navigator bottom
        totalHeight = filterBottom + uIGlobalPadding; //main frame height

        mainCanvas[CONST_WIDTH] = totalWidth || 2;
        mainCanvas[CONST_HEIGHT] = totalHeight || 2;

        bufferNavigatorCanvas[CONST_WIDTH] = totalWidth || 2;
        bufferNavigatorCanvas[CONST_HEIGHT] = filterHeight || 2;


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
            _chart.getFilterAxis().setHeight(filterHeight);
        }
        needUpdateMainFactor = vTrue;
        initFilterFactors(vFalse);
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
        filterPressed = val;
    }

    function setZoomStart(val) {
        zoomStartFloat = val;
        needUpdateMainFactor = vTrue;
    }

    function setZoomEnd(val) {
        zoomEndFloat = val;
        needUpdateMainFactor = vTrue;
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

    function calcChildIndex(index) {
        return (index - detailChartOffset) * detailAxisQuality + 1;
    }

    function calcParentIndex(index) {
        return (index - 1) / detailAxisQuality + detailChartOffset;
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

    function createChartObjects(data, globalAlias) {
        var _i,
            _data = parseDataSource(data),
            _charts = [];
        for (_i in _data.y) {
            var _chart = _data.y[_i];
            var _chartInfo = new ChartInfo(_data.x, _chart);
            _chartInfo.createUiElements(globalAlias, globalAlias !== CONST_CHART_MASTER);
            if (globalScaledY) {
                _chartInfo.initAxis();
            }
            _chartInfo.alias = globalAlias;
            _charts.push(_chartInfo);
        }
        if (!globalScaledY) {
            var _globalFilterAxis = new AxisInfo(globalAlias + "-f", _data.x, _charts, visibleWidth, filterHeight, 1, vTrue);
            var _globalMainAxis = new AxisInfo(globalAlias + "-m", _data.x, _charts, visibleWidth, selectionHeight, config.lineWidth || 2, vTrue);
            _globalFilterAxis.calculateFactors(filterStartIndexFloat, filterEndIndexFloat);
            for (_i in _charts) {
                _charts[_i].initAxis(_globalMainAxis, _globalFilterAxis);
            }
        }
        return _charts;
    }

    /**
     * Draws a json data
     * @param data {JSON} chart data
     */
    function draw(data) {
        clear();
        if (data) {
            charts = createChartObjects(data, CONST_CHART_MASTER);
            currentZoomState = STATE_ZOOM_DAYS;
            initFilterFactors(vTrue);
            invalidateInner();
        }
    }


    function getStyle(_el, propertyName) {
        var _currentStyle = _el.currentStyle;
        return _currentStyle ?
            _currentStyle[propertyName] :
            vDocument.defaultView.getComputedStyle(_el, vNull)[propertyName];
    }


    function formatDate(timestamp, withDay, withYear) {  //Jan 29
        dateSingleton.setTime(timestamp + timeZoneOffset);
        var _result = (withDay ? CONST_DAY_NAMES_SHORT[dateSingleton.getDay()] + ", " : "" ) +
            CONST_MONTH_NAMES_SHORT[dateSingleton.getMonth()] + " " + dateSingleton.getDate();
        if (withDay && withYear) {
            _result = _result + " " + dateSingleton.getFullYear();
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

        if (!_filterFactorX || inTransition()) {
            return;
        }

        if (_mainFactorX) { //Selection hovered
            if (mouseY < filterTop && (!force || !selectionCurrentIndexPinned || mousePressed)) {
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
            else if (mouseY > filterTop && mouseY < filterBottom) { //Navigator hovered
                _result = ENUM_NAVIGATOR_HOVER;
                var _startZoom = ( zoomStartFloat - filterStartIndexFloat) * _filterFactorX,
                    _endZoom = ( zoomEndFloat - filterStartIndexFloat) * _filterFactorX,
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


    function assignZoomStart(val, frameCount) {
        val = getMax(1, val);
        zoomStartPosition = (val - filterStartIndexFloat) * charts[0].getFilterAxis().getFactorX();
        animate(zoomStartFloat, setZoomStart, val, frameCount);
    }


    function assignZoomEnd(val, frameCount) {
        val = getMin(val, charts[0].getLastIndex());
        zoomEndPosition = (val - filterStartIndexFloat) * charts[0].getFilterAxis().getFactorX();
        animate(zoomEndFloat, setZoomEnd, val, frameCount);
    }

    function setFilterStartIndexFloat(val) {
        filterStartIndexFloat = val;
        needUpdateFilterFactor = vTrue;
        needUpdateMainFactor = vTrue;
    }

    function setFilterEndIndexFloat(val) {
        filterEndIndexFloat = val;
        needUpdateFilterFactor = vTrue;
        needUpdateMainFactor = vTrue;
    }

    function moveNavigatorFrame(shift, maxX, start, end) {
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
        assignZoomStart(_start);
        assignZoomEnd(_end);
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
                    assignZoomStart(_proposedX);
                }
            } else if (mouseHoveredRegionType === ENUM_END_SELECTION_HOVER) {
                if (_proposedX - zoomStartFloat > _threshold) {
                    assignZoomEnd(_proposedX);
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

    function restoreSelection() {

        animate(filterEndIndexFloat, setFilterEndIndexFloat, charts[0].getLastIndex(), CONST_ZOOM_ANIMATION_SPEED);
        animate(filterStartIndexFloat, setFilterStartIndexFloat, 1, CONST_ZOOM_ANIMATION_SPEED);

        animate(zoomStartFloat, assignZoomStart, storedZoomStartFloat, CONST_ZOOM_ANIMATION_SPEED + 2);
        animate(zoomEndFloat, assignZoomEnd, storedZoomEndFloat, CONST_ZOOM_ANIMATION_SPEED + 2);

    }

    function clearDetailElements() {
        var _existing = container.getElementsByClassName(CONST_CHART_DETAIL);
        while (_existing.length > 0) {
            for (var _i = 0; _i < _existing.length; _i++) {
                var _elem = _existing[_i];
                _elem.remove();
                if (_elem.parentNode) {
                    _elem.parentNode.removeChild(_elem);
                }
            }
            _existing = container.getElementsByClassName(CONST_CHART_DETAIL);
        }
    }

    function storeZoomPosition(index) {
        storedZoomStartFloat = zoomStartFloat;
        storedZoomEndFloat = zoomEndFloat;
        storedProposedPosition = index;

        console.log("storeZoomPosition {storedZoomStartFloat=" + storedZoomStartFloat + ";\r\n" +
            "storedZoomEndFloat=" + storedZoomEndFloat + ";\r\n" +
            "storedProposedPosition=" + storedProposedPosition + ";}\r\n");
    }

    function zoomInToHours(pData, timeStamp) {
        var _j,
            _childChart,
            _localCharts,
            _parentChart;
       hideTooltip();
        clearDetailElements();
        _localCharts = createChartObjects(pData, CONST_CHART_DETAIL);
        consistSettings(charts, _localCharts);
        _parentChart = charts[0];
        var _parentXData = _parentChart.getXData();
        var _parentLastIndex = _parentChart.getLastIndex();
        var _parentFromIndex;

        _childChart = _localCharts[0];
        detailAxisQuality = 3600000 * 24 / (_childChart.getXData()[2] - _childChart.getXData()[1]);

        var _childStart = _childChart.getXData()[1];
        var _childEnd = _childChart.getXData()[_childChart.getLastIndex()];
        var _filterStartIndex;
        var _filterEndIndex;
        for (_j = 1; _j < _parentLastIndex; _j++) {
            if (!_parentFromIndex && _parentXData[_j] >= timeStamp) {
                _parentFromIndex = _j;
            }
            if (!_filterStartIndex && _parentXData[_j] >= _childStart) {
                _filterStartIndex = _j;
                detailChartOffset = _j;
            } else if (!_filterEndIndex && _parentXData[_j] >= _childEnd) {
                _filterEndIndex = _j;
            }
        }
        var _parentToIndex = _parentFromIndex + 1;
        if (!_parentToIndex || !_filterEndIndex) {
            return;
        }

        currentZoomState = STATE_ZOOM_TRANSFORM_TO_HOURS;

        updateTitleStatus();
        detailCharts = _localCharts;
        storeZoomPosition(_parentFromIndex);

        freezeAxis();
        updateHoveredInfo(vNull);

        animate(filterEndIndexFloat, setFilterEndIndexFloat, _filterEndIndex, CONST_ZOOM_ANIMATION_SPEED);
        animate(filterStartIndexFloat, setFilterStartIndexFloat, _filterStartIndex, CONST_ZOOM_ANIMATION_SPEED);
        animate(zoomEndFloat, assignZoomEnd, _parentToIndex, CONST_ZOOM_ANIMATION_SPEED + 2);
        animate(zoomStartFloat, assignZoomStart, _parentFromIndex, CONST_ZOOM_ANIMATION_SPEED + 2);
        animationCounter = 0;
        animate(animationCounter, setAnimationCounter, 1, CONST_ZOOM_ANIMATION_SPEED);
    }

    function zoomOutToDays() {
        if (currentZoomState !== STATE_ZOOM_HOURS) {
            return;
        }

        currentZoomState = STATE_ZOOM_TRANSFORM_TO_DAYS;
        changeChildClass(CONST_CHART_DETAIL);
        changeChildClass(CONST_CHART_MASTER, vTrue);
        swapMasterDetailCharts();
        consistSettings(detailCharts, charts);
        setFilterStartIndexFloat(storedFilterStartIndexFloat);
        setFilterEndIndexFloat(storedFilterEndIndexFloat);

        var _start = calcParentIndex(zoomStartPosition);
        assignZoomStart(storedProposedPosition, 1);
        setZoomStart(storedProposedPosition, 1);
        assignZoomEnd(storedProposedPosition + 1, 1);
        setZoomEnd(storedProposedPosition + 1, 1);
        //   assignSelectionFactors();

        freezeAxis();
        animationCounter = 1;
        restoreSelection();
        animate(animationCounter, setAnimationCounter, 0.01, CONST_ZOOM_ANIMATION_SPEED);
        updateTitleStatus();
    }

    function loadHoursDataSuccess(data, timeStamp) {
        paramsStorage.put("h" + timeStamp, data);
        zoomInToHours(data, timeStamp);
    }

    function loadHoursDataFail() {
        currentZoomState = STATE_ZOOM_DAYS;
    }

    function zoomInToHourData(e) {
        stopPropagation(e);
        if (currentZoomState !== STATE_ZOOM_DAYS) {
            return;
        }

        var _currentPosition = fParseInt(selectionCurrentIndexFloat);
        var _currentTimeStamp = charts[0].getXData()[_currentPosition];
        var _detailCache = paramsStorage.get["h" + _currentTimeStamp];
        if (_detailCache) {
            zoomInToHours(_detailCache, _currentTimeStamp);
        } else {
            config.loadCallback(_currentTimeStamp,
                loadHoursDataSuccess, loadHoursDataFail);
        }
    }

    function hideTooltip() {
        animate(arrowTooltipOpacity, setArrowTooltipOpacity, 0);
        addClass(divTooltipContainer, CONST_BACKGROUND_CLASS);
        invalidateInner();
    }

    function showTooltip() {
        animate(arrowTooltipOpacity, setArrowTooltipOpacity, 1);
        removeClass(divTooltipContainer, CONST_BACKGROUND_CLASS);
        invalidateInner();
    }

    function inTransition() {
        return currentZoomState === STATE_ZOOM_TRANSFORM_TO_DAYS ||
            currentZoomState === STATE_ZOOM_TRANSFORM_TO_HOURS;
    }

    function unfreezeAxis() {
        if (smartAxisXFrozen && !inTransition()) {
            if (smartAxisXFrozenStart !== selectionStartIndexFloat ||
                smartAxisXFrozenEnd !== selectionEndIndexFloat) {
            } else {
                smartAxisXFrozen = vFalse;
                animate(smartAxisXRatio, setSmartAxisRatio, 0, 1);
                animate(smartAxisXOpacity, setAxisXLabelOpacity, 1, 5);
            }
        }
    }

    function freezeAxis() {
        if (!smartAxisXFrozen) {
            animate(smartAxisXRatio, setSmartAxisRatio, 0, 1);
            smartAxisXFrozenStart = selectionStartIndexFloat;
            smartAxisXFrozenEnd = selectionEndIndexFloat;
            smartAxisXFrozen = vTrue;
            delete animations[CONST_AXIS_X_LABEL_OPACITY_ANIMATION_KEY];
            setAxisXLabelOpacity(1);
        }
    }

    function handleMouseClick(e, pressed) {
        if (!handleMouseMove(e, vTrue)) {
            pressed = vFalse;
        }
        mousePressed = pressed;
        if (pressed) {
            freezeAxis();
            calcHoveredElement(vTrue);

            if (mouseHoveredRegionType === ENUM_ZOOM_HOVER ||
                mouseHoveredRegionType === ENUM_START_SELECTION_HOVER ||
                mouseHoveredRegionType === ENUM_END_SELECTION_HOVER) {
                stopPropagation(e);
                animate(filterPressed, setNavigatorPressed, 1, 15);
                filterPressedRegionType = mouseHoveredRegionType;
            } else if (mouseHoveredRegionType === ENUM_SELECTION_HOVER) {
                selectionCurrentIndexPinned = isMobile ? vFalse : !selectionCurrentIndexPinned;
                isSelectionCurrentIndexChanged = vFalse;
                if (!isMobile) {
                    zoomInToHourData(e);
                }
            }
        } else {
            animate(filterPressed, setNavigatorPressed, 0, 15);
            unfreezeAxis();
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


    function quadraticCurveTo(context, cp1x, cp1y, cp2x, cp2y, x, y) {
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

    function drawNavigatorSelector(context, x, y, width, height) {
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
        fill(context);
        endPath(context);


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

        var _mainOpacity = seriesMaxOpacity * smartAxisXOpacity;

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
        setFillStyle(frameContext, uiGlobalTheme.axisText);
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


        if (filterNeedUpdateBuffer) {
            clearCanvas(bufferNavigatorContext, totalWidth, filterHeight);
            if (globalStackedBarMode) {
                reverseOrder(bufferNavigatorContext);
                resetStackedRegister();
            }
            for (_i in charts) {
                charts[_i].drawFilterSeries();
            }

            if (inTransition() && detailCharts) {
                var _xOffset = (detailChartOffset - filterStartIndexFloat) * charts[0].getFilterAxis().getFactorX();
                for (_i in detailCharts) {
                    var _detailChart = detailCharts[_i];
                    if (_detailChart.getEnabled()) {
                        _detailChart.drawFilterSeries(vTrue, _xOffset, animationCounter);
                    }
                }
            }

            if (globalStackedBarMode) {
                returnOrder(bufferNavigatorContext);
            }
            filterNeedUpdateBuffer = vFalse;
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

        if (inTransition() && detailCharts) {
            var _xOffset = (detailChartOffset - selectionStartIndexFloat) * charts[0].getMainAxis().getFactorX();
            for (_i in detailCharts) {
                _axisY = detailCharts[_i];
                if (_axisY.getEnabled()) {
                    seriesMaxOpacity = getMax(_axisY.getOpacity(), seriesMaxOpacity);
                    _axisY.drawMainSeries(vTrue, _xOffset, animationCounter);
                }
            }
        }


        if (globalStackedBarMode) {
            returnOrder(frameContext);
        }
        if (charts[0].getType() === ENUM_CHART_TYPE_BAR) {
            setGlobalAlpha(frameContext, 1 * arrowTooltipOpacity);
            setFillStyle(frameContext, uiGlobalTheme.barMask);
            fillRect(frameContext, 0, 0, totalWidth, selectionHeight + filterHeightHalf);
        }
        setGlobalAlpha(frameContext, 1);
        drawImage(bufferNavigatorCanvas, 0, filterTop);

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
        if (filterPressed > 0 && config.showTouches) {
            var _x;

            if (filterPressedRegionType === ENUM_START_SELECTION_HOVER) {
                _x = uIGlobalPadding2 + zoomStartPosition;
            } else if (filterPressedRegionType === ENUM_END_SELECTION_HOVER) {
                _x = uIGlobalPadding2 + zoomEndPosition;
            }
            else {
                _x = uIGlobalPadding2 + zoomStartPosition + (zoomEndPosition - zoomStartPosition) / 2;
            }

            beginPath(frameContext);
            setGlobalAlpha(frameContext, 0.1 * filterPressed);
            setFillStyle(frameContext, envColor);

            circle(frameContext, _x, filterTop + filterHeightHalf, filterPressed * 20 * uiDisplayScaleFactor);
            fill(frameContext);

        }


    }


    function drawFilterLayer() {
        setGlobalAlpha(frameContext, 1);
        setFillStyle(frameContext, uiGlobalTheme.scrollBackground);
        fillRect(frameContext, 0, filterTop, zoomStartPosition + uIGlobalPadding2, filterHeight);
        fillRect(frameContext, uIGlobalPadding2 + zoomEndPosition, filterTop,
            visibleWidth + uIGlobalPadding2 - zoomEndPosition + uiDisplayScaleFactor, filterHeight);
        fillRect(frameContext, 0, filterTop, uIGlobalPadding2, filterHeight);
        fillRect(frameContext, visibleWidth + uIGlobalPadding2 + uiDisplayScaleFactor, filterTop,
            uIGlobalPadding2, filterHeight);
        setLineWidth(frameContext, 0.5);
        setStrokeStyle(frameContext, uiGlobalTheme.scrollSelectorBorder);
        setFillStyle(frameContext, uiGlobalTheme.scrollSelector);
        drawNavigatorSelector(frameContext, zoomStartPosition + uiDisplayScaleFactor * 2, filterTop,
            zoomEndPosition - zoomStartPosition + uIGlobalPadding4 - uiDisplayScaleFactor * 3, filterHeight);

        setFillStyle(frameContext, uiGlobalTheme.scrollSelectorBorder);
        var _top = filterTop + filterHeightHalf - uIBtnRadius / 2;
        fillRect(frameContext, zoomStartPosition + uIGlobalPadding + uiDisplayScaleFactor, _top, uiDisplayScaleFactor * 2, uIBtnRadius);
        fillRect(frameContext, zoomEndPosition + uIGlobalPadding3 - uiDisplayScaleFactor * 2, _top, uiDisplayScaleFactor * 2, uIBtnRadius);

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
        }
    }

    function initFilterFactors(isReset) {
        var _chart,
            _i;
        if (!charts.length) {
            return;
        }

        if (isReset) {
            filterStartIndexFloat = 1;
            filterEndIndexFloat = charts[0].getLastIndex();
        }

        for (_i in charts) {
            _chart = charts[_i];
            _chart.calculateFilterFactors(filterStartIndexFloat, filterEndIndexFloat);
            if (!globalScaledY) {
                break;
            }
        }

        if (inTransition() && detailCharts) {
            for (_i in detailCharts) {
                _chart = detailCharts[_i];
                _chart.calculateFilterFactors(calcChildIndex(filterStartIndexFloat), calcChildIndex(filterEndIndexFloat));
                if (!globalScaledY) {
                    break;
                }
            }
        }

        if (isReset) {
            selectionStartIndexFloat = charts[0].getLastIndex() - (charts[0].getLastIndex()) * CONST_NAVIGATOR_WIDTH_PERCENT / 100;
            selectionEndIndexFloat = charts[0].getLastIndex();
            assignZoomStart(selectionStartIndexFloat);
            assignZoomEnd(selectionEndIndexFloat);
            calcSelectionFactors(selectionStartIndexFloat, selectionEndIndexFloat);

            if (inTransition() && detailCharts) {
                calcSelectionFactors(detailCharts, calcChildIndex(selectionStartIndexFloat),
                    calcChildIndex(selectionEndIndexFloat));
            }

        } else {
            assignZoomStart(selectionStartIndexFloat);
            assignZoomEnd(selectionEndIndexFloat);
            needUpdateMainFactor = vTrue;
        }

        filterNeedUpdateBuffer = vTrue;
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

    function calcSelectionFactors(chartItems, startIndex, endIndex) {
        for (var _i in chartItems) {
            var _chart = chartItems[_i];
            _chart.calculateMainFactors(startIndex, endIndex);
            _chart.calculateSmartAxisY();
            if (!globalScaledY) {
                break;
            }
        }

    }

    function calcFilterFactors(chartItems, startIndex, endIndex) {
        for (var _i in chartItems) {
            var _chart = chartItems[_i];
            _chart.calculateFilterFactors(startIndex, endIndex);
            if (!globalScaledY) {
                break;
            }
        }
    }

    function assignFilterFactors() {
        calcFilterFactors(charts, filterStartIndexFloat,
            filterEndIndexFloat);

        if (inTransition() && detailCharts) {
            calcFilterFactors(detailCharts, calcChildIndex(filterStartIndexFloat),
                calcChildIndex(filterEndIndexFloat));
        }
    }


    function assignSelectionFactors() {
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
        calcSelectionFactors(charts, selectionStartIndexFloat,
            selectionEndIndexFloat);

        if (inTransition() && detailCharts) {
            calcSelectionFactors(detailCharts, calcChildIndex(selectionStartIndexFloat),
                calcChildIndex(selectionEndIndexFloat));
        }

        calcSmartAxisY();

        if (updateDateRangeTextTimer) {
            clearTimeout(updateDateRangeTextTimer);
        }
        updateDateRangeTextTimer = setTimeout(updateDateRangeText, 20);
    }

    function addClass(el, cls) {
        el.classList.add(cls);
    }

    function removeClass(el, cls) {
        el.classList.remove(cls);
    }
    
    function changeChildClass(cls, isRemove) {
        var _i,
            _existing = container.getElementsByClassName(cls);
        for (_i = 0; _i < _existing.length; _i++) {
            isRemove? removeClass(_existing[_i], CONST_BACKGROUND_CLASS) :
                addClass(_existing[_i], CONST_BACKGROUND_CLASS);
        }
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

        divZoomOut.style.color = uiGlobalTheme.zoomOutText;

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

    function consistSettings(source, target) {
        for (var _s in source) {
            var _source = source[_s];
            for (var _t in target) {
                var _target = target[_t];
                if (_target.getAlias() === _source.getAlias()) {
                    _target.setEnabled(_source.getEnabled());
                }
            }
        }
    }

    function swapMasterDetailCharts() {
        var _forStoreCharts = charts;
        charts = detailCharts;
        detailCharts = _forStoreCharts;
    }

    function storeFilterRange() {
        storedFilterStartIndexFloat = filterStartIndexFloat;
        storedFilterEndIndexFloat = filterEndIndexFloat;

        console.log("storeFilterRange {storedFilterStartIndexFloat=" + storedFilterStartIndexFloat + ";\r\n" +
            "storedFilterEndIndexFloat=" + storedFilterEndIndexFloat + ";\r\n" +
            "}\r\n");
    }



    function switchToDetailChart() {

        var _i,
            start = calcChildIndex(storedProposedPosition),
            end = calcChildIndex(storedProposedPosition + 1);

        storeFilterRange();
        swapMasterDetailCharts();

        setFilterStartIndexFloat(1);
        setFilterEndIndexFloat(charts[0].getLastIndex());

        assignZoomStart(start);
        assignZoomEnd(end);
        changeChildClass(CONST_CHART_MASTER);
        changeChildClass(CONST_CHART_DETAIL, vTrue);
    }

    function switchToMainChart() {

        // paramsStorage.put(CONST_CHART_MASTER, charts);
        // charts = paramsStorage.get(CONST_CHART_DETAIL);
        //  setFilterStartIndexFloat(1);
        //  setFilterEndIndexFloat(charts[0].getLastIndex());

        //   assignZoomStart(1);
        //  assignZoomEnd(charts[0].getLastIndex());
        var _existing = vDocument.getElementsByClassName(CONST_CHART_DETAIL);
        for (var _i = 0; _i < _existing.length; _i++) {
            addClass(_existing[_i], CONST_BACKGROUND_CLASS);
        }
        _existing = vDocument.getElementsByClassName(CONST_CHART_MASTER);
        for (var _i = 0; _i < _existing.length; _i++) {
            removeClass(_existing[_i], CONST_BACKGROUND_CLASS);
        }
    }


    function animationComplete(animationKey) {
        if (animationKey === CONST_AXIS_X_LABEL_OPACITY_ANIMATION_KEY && smartAxisXFrozen) {
            unfreezeAxis();

        } else if (animationKey === CONST_SET_ZOOM_START_ANIMATION_KEY ||
            animationKey === CONST_SET_ZOOM_END_ANIMATION_KEY) {
            if (!animations[CONST_SET_ZOOM_START_ANIMATION_KEY] &&
                !animations[CONST_SET_ZOOM_END_ANIMATION_KEY]) {
                if (currentZoomState === STATE_ZOOM_TRANSFORM_TO_HOURS) {
                    currentZoomState = STATE_ZOOM_HOURS;
                    unfreezeAxis();
                    switchToDetailChart();
                } else if (currentZoomState === STATE_ZOOM_TRANSFORM_TO_DAYS) {
                    currentZoomState = STATE_ZOOM_DAYS;
                    unfreezeAxis();
                    switchToMainChart();
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

        if (needUpdateMainFactor) {
            needUpdateMainFactor = vFalse;
            assignSelectionFactors();
        }

        if (needUpdateFilterFactor || globalStackedBarMode) {
            needUpdateFilterFactor = vFalse;
            assignFilterFactors();
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

        //      perf.measureDurations(frameContext, charts);
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
