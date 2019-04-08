/*jslint browser: true*/
/*global window*/
var TeleChart = function (ctxId, config) {
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

        ENUM_NAVIGATOR_HOVER = 1,
        ENUM_START_SELECTION_HOVER = 2,
        ENUM_END_SELECTION_HOVER = 3,
        ENUM_ZOOM_HOVER = 4,
        ENUM_SELECTION_HOVER = 5,
        ENUM_LEGEND_HOVER = 6;

    /**
     * Global members
     * @type {Number|Array|String|HTMLCanvasElement|CanvasRenderingContext2D|Element|Object|Date}
     */
    var container = vDocument.getElementById(ctxId),                               //canvases container
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
        /** X-Axis data object
         {
         data: {Array of timestamp}
         l: {Number}  length of data array
         max: {Number} max of X value
         min: {Number} min of X value
         }
         @type {Object}
         */
        xAxisDataRef,
        /** Array of Y-Axis data objects
         {
         alias: {String}"",        //Alias of series
         bOn: {Boolean},           //Series enabled
         color: {String},          //Series color "#3DC23F"
         data: {Array of number},  //Series Y-data
         max: {Number},            //Max value of series
         min: {Number},            //Min value of series
         name: {String},           //Name of series
         sCg: {Array of Number},   //Array of opacity by color 0..1 step 0.01
         sO: 1,                    //Series opacity 0..1
         type: "line"              //Type of series
         }
         @type {Array}
         */
        yAxisDataRefs = [],
        /** Assoc array of animation objects
         {
            c: {Function}             //callback for set value
            i: {Number}               //initial value
            o: {Object}               //callback context (may be undefined)
            p: {Number}               //proposed value
            s: {Number}               //number of frames to transform
            @type {Object}
         */
        animations = {},
        configMinValueAxisY,    //@type {Number} Min value for Y-axes (if undefined then will be auto calculated)

        mouseX,                 //@type {Number} mouse X-coord
        mouseY,                 //@type {Number} mouse Y-coord
        mouseOffsetX,           //@type {Number} mouse X-coord offset
        mouseOffsetY,           //@type {Number} mouse Y-coord offset
        mouseHoveredRegionType, //@type {Number} type of region hovered (ENUM_..._HOVERED const)
        mousePressed,           //@type {Boolean} mouse pressed (touched)
        /**
         Object for zoom frame proposed coordinates (xAxisDataRef.data)
         {
            tF: {Number},       //index of mouse cursor (xAxisDataRef.data)
            tS: {Number},       //proposed left bound index in selection window (xAxisDataRef.data)
            tE: {Number},       //proposed right bound index  in selection window (xAxisDataRef.data)

            //And separated (tS,tE) due to animations
            nS: {Number},       //proposed left bound index of data in navigator
            nE: {Number},       //proposed right bound index of data in navigator (xAxisDataRef.data)
         }
         * @type {{}}
         */
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
        selectionCurrentIndexChanged,

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
        smartAxisYRangeFloat,           //@type {Number} floated range of Y-axis labels
        smartAxisYRangeInt,             //@type {Number} natural range of Y-axis labels
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
        envColorGrad = [],              //@type {Array of numbers} array of opacity by environment color 0..1 step 0.01
        envWhiteColorGrad = [],         //@type {Array of numbers} array of opacity by white color 0..1
        envBgColorGrad = [],            //@type {Array of numbers} array of opacity by environment background color 0..1
        envRegularSmallFont,            //@type {String} regular small font
        envBoldSmallFont,               //@type {String} bold small font
        envRegularDefaultFont,          //@type {String} regular default font
        envBoldDefaultFont,             //@type {String} bold default font

        lastPerformance,                //@type {Number} last frame time
        frameDelay = 0,                 //@type {Number} current repaint time for animation corrections

        boundHighlight,                 //@type {Number} out of bounds highlight opacity 0..1
        dateSingleton = new Date(),     //@type {Date} singleton for date format
        dateSingletonFull = new Date(),     //@type {Date} singleton for date format

        isTouchEvent,
        dayRangeDiv,
        titleDiv,
        zoomOutDiv,
        isHoursZoomed,
        storedDayModeStartIndex,
        storedDayModeEndIndex,

        updateDateRangeTextTimer,
        buttonsContainer;

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
            "title_cnt_", ["title"], {margin: CONST_PIXEL_MARGIN}, container);

        dayRangeDiv = vDocument.createElement("div");
        dayRangeDiv.id = "day_range_" + ctxId;
        dayRangeDiv.style.float = "right";
        _titleContainer.appendChild(dayRangeDiv);
        zoomOutDiv = vDocument.createElement("div");
        var sd = vDocument.createElement("span");
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
        zoomOutDiv.appendChild(sd);
        zoomOutDiv.id = "zoom_out_" + ctxId;
        zoomOutDiv.style.float = "left";
        zoomOutDiv.style.cursor = "pointer";
        zoomOutDiv.classList.add("animate");
        zoomOutDiv.classList.add("hidden");

        zoomOutDiv.addEventListener("click", function () {
            isHoursZoomed = vFalse;
            associateZoomStart(storedDayModeStartIndex, 15);
            associateZoomEnd(storedDayModeEndIndex, 15);
            updateTitleStatus();
        });

        _titleContainer.appendChild(zoomOutDiv);

        var zoomOutText = vDocument.createElement("span");
        zoomOutText.innerHTML = "Zoom out";
        zoomOutText.style.marginLeft = "5px";
        zoomOutDiv.appendChild(zoomOutText);

        titleDiv = vDocument.createElement("div");
        titleDiv.id = "title_container_" + ctxId;
        titleDiv.style.float = "left";
        titleDiv.classList.add("animate");
        titleDiv.classList.add("top");
        titleDiv.innerHTML = config.title || "";
        _titleContainer.appendChild(titleDiv);
    }


    function handleButtonClick() {
        var _index = this.getAttribute("data-index");
        var _axis = yAxisDataRefs[fParseInt(_index)];
        _axis.bOn = !_axis.bOn
        if (_axis.bOn) {
            this.classList.add("checked");
        } else {
            this.classList.remove("checked");
        }
        animate(_axis.sO, setSeriesOpacity, _axis.bOn ? 1 : 0, vUndefined, _axis);
        calcNavigatorFactors();
        calcSelectionFactors();
    }

    function createButton(index) { //todo remove all buttons before
        var _axis = yAxisDataRefs[index];
        var title = _axis.name;
        var color = _axis.color;
        var _button = createElement("div",
            "btn_", ["button"], {
                border: "2px " + color + " solid",
                color: color, backgroundColor: color
            }, buttonsContainer);

        if (_axis.bOn) {
            _button.classList.add("checked");
        }
        _button.setAttribute("data-index", index);
        _button.addEventListener("click", handleButtonClick);

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
        _text.innerHTML = title;
    }

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

        //   addEventListener("scroll", calcMouseOffset);
        //  addEventListener("resize", calcMouseOffset);
        //   addEventListener("mouseup", handleMouseClick);
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

    //======== setters for animation ========
    function setSelectionFactorY(val) {
        selectionFactorY = val;
    }

    function setSelectionMinY(val) {
        selectionMinY = val;
        animate(selectionFactorY, setSelectionFactorY, -(selectionHeight - 2) / (selectionMaxY - selectionMinY),
            vNull, vUndefined, vTrue);
    }

    function setNavigationFactorY(val) {
        navigatorFactorY = val;
        navigatorNeedUpdateBuffer = vTrue;
    }

    function setNavigatorMinY(val) {
        navigatorMinY = val;
        navigatorNeedUpdateBuffer = vTrue;
        if (animate(navigatorFactorY, setNavigationFactorY, -(navigatorHeight - 2) / (navigatorMaxY - navigatorMinY), vNull, vUndefined, vTrue)) {
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

    function setSeriesOpacity(val, series) {
        series.sO = val;
        navigatorNeedUpdateBuffer = vTrue;
    }

    function setAxisYLabelOpacity(val) {
        smartAxisYOpacity = val;
    }

    function setSmartAxisYRange(val) {
        smartAxisYRangeFloat = val;
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
        mainCanvas.onmousemove = vUndefined;
        mainCanvas.ontouchmove = vUndefined;
        mainCanvas.onmouseout = vUndefined;
        mainCanvas.onmouseover = vUndefined;
        mainCanvas.onmousedown = vUndefined;
        mainCanvas.onmouseup = vUndefined;
        mainCanvas.ontouchstart = vUndefined;
        mainCanvas.ontouchend = vUndefined;
        container.removeChild(mainCanvas);
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

        var _envColor = getBodyStyle("color"),
            _envBgColor = getBodyStyle("background-color"),
            _opacity,
            _i;
        for (_i = 0; _i <= 100; _i++) {
            _opacity = _i / 100;
            envColorGrad[_i] = getRGBA(_envColor, _opacity);
            envBgColorGrad[_i] = getRGBA(_envBgColor, _opacity);
            envWhiteColorGrad[_i] = getRGBA("#FFFFFF", _opacity);
        }
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
        dateSingleton.setTime(timestamp);
        var _result = (withDay ? CONST_DAY_NAMES_SHORT[dateSingleton.getDay()] + ", " : "" ) +
            CONST_MONTH_NAMES_SHORT[dateSingleton.getMonth()] + " " + dateSingleton.getDate();
        if (withDay && config.withYearLabel) {
            _result = dateSingleton.getFullYear() + ", " + _result;
        }
        return _result;
    }

    /**
     * Formats a date of UNIX timestamp
     * @param timestamp {Number} UNIX timestamp
     * @param withDay {Boolean=} with day of week
     * @returns {string} Formatted date
     */
    function formatDateFull(timestamp) {
        dateSingletonFull.setTime(timestamp);
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
        if (mouseHoveredRegionType !== proposed || force) {
            mouseHoveredRegionType = proposed;

            if (mouseHoveredRegionType !== ENUM_SELECTION_HOVER &&
                mouseHoveredRegionType !== ENUM_LEGEND_HOVER) {
                animate(legendCursorOpacity, setLegendCursorOpacity, 0);
                animate(legendBoxOpacity, setLegendBoxOpacity, 0);
            }

            //Set cursor
            if (mouseHoveredRegionType === ENUM_SELECTION_HOVER) { //most likely
                animate(legendCursorOpacity, setLegendCursorOpacity, 1);
                setCursor(0);
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
        var _result = vNull,
            _i;

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
                if ((legendBoxOpacity === 0 && !force) || isTouchEvent) {
                    var _proposed = fMathRound(mouseX / selectionFactorX + selectionStartIndexFloat);
                    _proposed = getMin(getMax(1, _proposed), xAxisDataRef.l - 1);
                    calcLegendPosition(_proposed);
                    if (_proposed !== selectionCurrentIndexFloat) {
                        selectionCurrentIndexChanged = vTrue;
                    }
                    animate(selectionCurrentIndexFloat, setSelectionCurrentIndexFloat, _proposed);
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

            if (fMathAbs(_startZShift + uIGlobalPadding2) < uIGlobalPadding4) { //Navigator start edge hovered
                _result = ENUM_START_SELECTION_HOVER;
            } else if (fMathAbs(_endZShift - uIGlobalPadding2) < uIGlobalPadding4) { //Navigator end edge hovered
                _result = ENUM_END_SELECTION_HOVER;
            } else if (mouseX > _startZoom && mouseX < _endZoom) { //Navigator center hovered
                mouseFrame.nS = _startZShift / navigatorFactorX;
                mouseFrame.nE = _endZShift / navigatorFactorX;
                _result = ENUM_ZOOM_HOVER;
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
     * @param frameCount {Number=} buber of frames for animation
     */
    function associateZoomStart(val, frameCount) {
        zoomStartInt = val * navigatorFactorX;
        animate(zoomStartFloat, setZoomStart, val, frameCount);
    }

    /**
     * Setter for end navigator edge
     * @param val {Number} value
     * @param frameCount {Number=} buber of frames for animation
     */
    function associateZoomEnd(val, frameCount) {
        zoomEndInt = val * navigatorFactorX;
        animate(zoomEndFloat, setZoomEnd, val, frameCount);
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

    /**
     * Handles the mouse move
     * @param e {Object}
     * @param withoutPress {Boolean=}
     */
    function handleMouseMove(e, withoutPress) {

        if (mouseHoveredRegionType === ENUM_ZOOM_HOVER ||
            mouseHoveredRegionType === ENUM_START_SELECTION_HOVER ||
            mouseHoveredRegionType === ENUM_END_SELECTION_HOVER) {
            stopPropagation(e);
        }
        calcMouseOffset();
        var _touches = e.touches;
        isTouchEvent = _touches && getLength(_touches);

        var newVar = isTouchEvent ?
            assignMousePos(_touches[0], withoutPress) :
            assignMousePos(e, withoutPress);

        if (isTouchEvent && mouseHoveredRegionType === ENUM_SELECTION_HOVER && withoutPress) {
            newVar = false;
        }
        return newVar;
    }

    function updateTitleStatus () {
        if (isHoursZoomed) {
            zoomOutDiv.classList.remove("hidden");
            titleDiv.classList.add("hidden");
        } else
        {
            zoomOutDiv.classList.add("hidden");
            titleDiv.classList.remove("hidden");
        }
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
            delete animations[CONST_AXIS_X_LABEL_OPACITY_ANIMATION_KEY];
            setAxisXLabelOpacity(1);
            if (mouseHoveredRegionType === ENUM_ZOOM_HOVER ||
                mouseHoveredRegionType === ENUM_START_SELECTION_HOVER ||
                mouseHoveredRegionType === ENUM_END_SELECTION_HOVER) {
                stopPropagation(e);
                animate(navigatorPressed, setNavigatorPressed, 1, 15);
                navigatorPressedRegionType = mouseHoveredRegionType;
            } else if (mouseHoveredRegionType === ENUM_SELECTION_HOVER) {
                if (legendBoxOpacity === 0 || selectionCurrentIndexChanged) {
                    animate(legendBoxOpacity, setLegendBoxOpacity, 1);
                    selectionCurrentIndexChanged = vFalse;
                } else {
                    animate(legendBoxOpacity, setLegendBoxOpacity, 0);
                }

            } else if (mouseHoveredRegionType === ENUM_LEGEND_HOVER) {
                if (!isHoursZoomed) {
                    isHoursZoomed = vTrue;
                    updateTitleStatus();
                    storedDayModeStartIndex = selectionStartIndexInt;
                    storedDayModeEndIndex = getMin(selectionEndIndexInt, xAxisDataRef.l - 2);
                    updateHoveredInfo(vNull);
                    associateZoomStart(selectionCurrentIndexFloat - 1, 15);
                    associateZoomEnd(selectionCurrentIndexFloat, 15);
                }
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
     * @param context {CanvasRenderingContext2D} context for drawing
     * @param width {Number=} width in pixels (default 1)
     */
    function setLineWidth(context, width) {
        context.lineWidth = width || displayScaleFactor;
    }

    /**
     * @param context {CanvasRenderingContext2D} context for drawing
     * Begins a path, or resets the current path
     */
    function beginPath(context) {
        context.beginPath();
    }

    /**
     * @param context {CanvasRenderingContext2D} context for drawing
     * Creates a path from the current point back to the starting point
     */
    function endPath(context) {
        context.stroke();
    }

    /**
     * @param context {CanvasRenderingContext2D} context for drawing
     * Creates a path from the current point back to the starting point
     */
    function closePath(context) {
        context.closePath();
    }

    /**
     * Width of the specified text, in pixels
     * @param context {CanvasRenderingContext2D} context for drawing
     * @param text {String} measured text
     * @returns {Number} width in pixels
     */
    function getTextWidth(context, text) {
        return context.measureText(text)[CONST_WIDTH];
    }

    /**
     * Draws filled text on the canvas
     * @param context {CanvasRenderingContext2D} context for drawing
     * @param text {String} text that will be written on the canvas
     * @param x {Number} x coordinate where to start painting the text
     * @param y {Number} y coordinate where to start painting the text
     */
    function fillText(context, text, x, y) {
        context.fillText(text, x, y);
    }

    /**
     * Creates a line TO that point or moves FROM the last specified point
     * @param context {CanvasRenderingContext2D} context for drawing
     * @param isMove {Boolean} move only
     * @param x {Number} x coordinate in pixels
     * @param y {Number} y coordinate in pixels
     */
    function moveOrLine(context, isMove, x, y) {
        isMove ? context.moveTo(x, y) : context.lineTo(x, y);
    }

    /**
     * Adds a point to the current path by using the specified control points that represent a quadratic Bézier curve
     * @param context {CanvasRenderingContext2D} context for drawing
     * @param cpx {Number} The x-coordinate of the Bézier control point
     * @param cpy {Number} The y-coordinate of the Bézier control point
     * @param x {Number} The x-coordinate of the ending point
     * @param y {Number} The y-coordinate of the ending point
     */
    function quadraticCurveTo(context, cpx, cpy, x, y) {
        context.quadraticCurveTo(cpx, cpy, x, y);
    }

    /**
     * Fills the current drawing (path)
     * @param context {CanvasRenderingContext2D} context for drawing
     */
    function fill(context) {
        context.fill();
    }

    /**
     * Creates an circle
     * @param context {CanvasRenderingContext2D} context for drawing
     * @param x {Number} the x-coordinate of the center of the circle
     * @param y {Number} the y-coordinate of the center of the circle
     * @param radius {Number} the radius of the circle
     */
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
     * Draws the horizontal grid
     */
    function drawHorizontalGrid() {
        var _nextScaleLevel = selectionBottom,
            _yCoordinate;
        beginPath(frameContext);
        setStrokeStyle(frameContext, envColorGrad[10]);
        setLineWidth(frameContext, displayScaleFactor);
        while (_nextScaleLevel > navigatorHeightHalf) {
            _yCoordinate = fMathCeil(_nextScaleLevel) + CONST_ANTI_BLUR_SHIFT;
            moveOrLine(frameContext, vTrue, 0, _yCoordinate);
            moveOrLine(frameContext, vFalse, totalWidth, _yCoordinate);
            _nextScaleLevel = _nextScaleLevel + smartAxisYRangeFloat * selectionFactorY;
        }
        endPath(frameContext);
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
            _nextScaleValue = fMathCeil(selectionMinY),
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
        _labelY = _selectionAxis + uIGlobalPadding * 5;

        setLineWidth(frameContext);
        for (_i = _nextItem - _axisRange; _i <= selectionEndIndexInt; _i += _axisRange) {
            _nextItem = fMathCeil(_i);
            _labelX = (_nextItem - selectionStartIndexFloat ) * selectionFactorX;
            _opacity && fMathAbs((_nextItem - smartAxisXStart) % _prevSmartAxisRange) >= 1 ?
                setFillStyle(frameContext, _opacity) :
                setFillStyle(frameContext, _color);
            if (_nextItem > 0) {
                fillText(frameContext, formatDate(xAxisDataRef.data[_nextItem]), _labelX, _labelY);
            }
        }

        //Y-axis labels ============================
        _color = envColorGrad[fParseInt(50 * getMin(seriesMaxOpacity, smartAxisYOpacity))];
        while (_selectionAxis > navigatorHeightHalf) {
            _labelY = fParseInt(_selectionAxis) + CONST_ANTI_BLUR_SHIFT - uIGlobalPadding;
            _value = _nextScaleValue.toString();
            _textLength = getLength(_value);
            if (_textLength > 6) {
                _value = _nextScaleValue / 1000000 + "M";
            }
            else if (_textLength > 3) {
                _value = _nextScaleValue / 1000 + "K";
            }

            setFillStyle(frameContext, _bgColor);
            fillRect(frameContext, uiGlobalPaddingHalf, _labelY - envSmallTextHeight + 2,
                getTextWidth(frameContext, _value) + uIGlobalPadding2, envSmallTextHeight);
            setFillStyle(frameContext, _color);
            fillText(frameContext, _value, uIGlobalPadding, _labelY);
            _nextScaleValue = fParseInt(_nextScaleValue + smartAxisYRangeInt);
            _selectionAxis = _selectionAxis + smartAxisYRangeFloat * selectionFactorY;
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

        beginPath(bufferNavigatorContext);
        setStrokeStyle(bufferNavigatorContext, series.sCg[100]);
        setGlobalAlpha(bufferNavigatorContext, series.sO);

        for (_k = 1; _k < xAxisDataRef.l;) {
            _yValue = navigatorHeight + (series.data[_k] - navigatorMinY) * navigatorFactorY;
            moveOrLine(bufferNavigatorContext, _k === 1, _xValue, _yValue);
            _xValue = _k++ * navigatorFactorX;
        }
        endPath(bufferNavigatorContext);
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
            //selection series
            beginPath(frameContext);
            setStrokeStyle(frameContext, _axisY.sCg[fParseInt(100 * _axisY.sO)]);
            setLineWidth(frameContext, config.lineWidth || 2 * displayScaleFactor);

            for (_k = selectionStartIndexInt; _k <= selectionEndIndexInt;) {
                _xValue = (_k - selectionStartIndexFloat) * selectionFactorX;
                _yValue = selectionBottom + (_axisY.data[_k] - selectionMinY) * selectionFactorY;
                moveOrLine(frameContext, _k++ === selectionStartIndexInt, _xValue, _yValue);
            }
            endPath(frameContext);
        }
        navigatorNeedUpdateBuffer = vFalse;
        drawImage(bufferNavigatorCanvas, 0, navigatorTop);
    }

    /**
     * Draws the legend
     */
    function drawSeriesLegend() { //todo optimize (big code)
        var _selectionAxis = selectionBottom,
            _sValueX = (selectionCurrentIndexFloat - selectionStartIndexFloat  ) * selectionFactorX,
            _sValueY,
            _leftThreshold = _sValueX + legendLeft - displayScaleFactor * 2,
            _rightThreshold = 0,
            _from = fMathFloor(selectionCurrentIndexFloat),
            _to = _from + 1,
            _i,
            _axisY,
            _legendCursorOpacity = 100 * legendCursorOpacity,

            _qnt = 0,
            _overlap,
            _sValueYFrom,
            _sValueYTo,
            _opacity,
            _isEven,
            _shiftX,
            _value;

        beginPath(frameContext);
        setStrokeStyle(frameContext, envColorGrad[fParseInt(40 * legendCursorOpacity)]);
        setLineWidth(frameContext);
        moveOrLine(frameContext, vTrue, _sValueX, 0);
        moveOrLine(frameContext, vFalse, _sValueX, selectionBottom);
        endPath(frameContext);
        setLineWidth(frameContext, 2 * displayScaleFactor);

        for (_i in yAxisDataRefs) {
            _axisY = yAxisDataRefs[_i];
            _sValueYFrom = _selectionAxis + (_axisY.data[_from] - selectionMinY) * selectionFactorY;
            _opacity = _axisY.sO;
            if (_from === selectionCurrentIndexFloat || _to >= xAxisDataRef.l) {
                _sValueY = _sValueYFrom;
            } else {
                _sValueYTo = _selectionAxis + (_axisY.data[_to] - selectionMinY) * selectionFactorY;
                _sValueY = _sValueYFrom + (_sValueYTo - _sValueYFrom) * (selectionCurrentIndexFloat - _from);
            }

            beginPath(frameContext);
            setFillStyle(frameContext, envBgColorGrad[fParseInt(_legendCursorOpacity * _opacity)]);
            circle(frameContext, _sValueX, _sValueY, 3 * displayScaleFactor);
            fill(frameContext);

            beginPath(frameContext);
            setStrokeStyle(frameContext, _axisY.sCg[fParseInt(_legendCursorOpacity * _opacity)]);

            circle(frameContext, _sValueX, _sValueY, 4 * displayScaleFactor);
            endPath(frameContext);
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
            setStrokeStyle(frameContext, envColorGrad[fParseInt(40 * legendBoxOpacity * legendCursorOpacity)]);
            setFillStyle(frameContext, envBgColorGrad[fParseInt(30 + 60 * legendBoxOpacity * legendCursorOpacity)]);
            drawBalloon(frameContext, _sValueX + legendLeft + _leftThreshold, legendTop,
                legendWidth - _leftThreshold + _rightThreshold, legendHeight);
            setFont(frameContext, envBoldSmallFont);
            setFillStyle(frameContext, envColorGrad[fParseInt(legendBoxOpacity * _legendCursorOpacity)]);
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
                    setFillStyle(frameContext, _axisY.sCg[fParseInt(legendBoxOpacity * _legendCursorOpacity)]);
                    setFont(frameContext, envBoldDefaultFont);
                    fillText(frameContext, _value, _sValueX + _shiftX, _sValueY);
                    setFont(frameContext, envRegularSmallFont);
                    fillText(frameContext, _axisY.name, _sValueX + _shiftX,
                        _sValueY + envDefaultTextHeight + uIGlobalPadding);
                    _qnt++;
                }
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
                _x = zoomStartInt;
            } else if (navigatorPressedRegionType === ENUM_END_SELECTION_HOVER) {
                _x = zoomEndInt;
            }
            else {
                _x = zoomStartInt + (zoomEndInt - zoomStartInt) / 2;
            }

            beginPath(frameContext);
            setFillStyle(frameContext, envColorGrad[fParseInt(navigatorPressed * 20)]);

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
            _grd.addColorStop(_x ? 0 : 1, envColorGrad[0]);
            _grd.addColorStop(_x ? 1 : 0, envColorGrad[fParseInt(20 * fMathAbs(overflow))]);
            setFillStyle(frameContext, _grd);
            fillRect(frameContext, _x, 0, uIBtnRadius, selectionBottom);
        }
    }

    /**
     * Draws a navigator opacity layers
     * @param isBackground
     */
    function drawNavigatorLayer(isBackground) {
        if (isBackground) {
            setFillStyle(frameContext, envColorGrad[30]);
            fillRect(frameContext, zoomStartInt, navigatorTop, zoomEndInt - zoomStartInt, navigatorHeight);
            setFillStyle(frameContext, envBgColorGrad[100]);
            fillRect(frameContext, zoomStartInt + uIGlobalPadding2, navigatorTop + uiGlobalPaddingHalf, zoomEndInt -
                zoomStartInt - uIGlobalPadding4, navigatorHeight - uIGlobalPadding);
        } else {
            setFillStyle(frameContext, envColorGrad[10]);
            fillRect(frameContext, 0, navigatorTop, zoomStartInt, navigatorHeight);
            fillRect(frameContext, zoomEndInt, navigatorTop, totalWidth - zoomEndInt, navigatorHeight);

            setFillStyle(frameContext, envBgColorGrad[50]);
            fillRect(frameContext, 0, navigatorTop, zoomStartInt, navigatorHeight);
            fillRect(frameContext, zoomEndInt, navigatorTop, totalWidth - zoomEndInt, navigatorHeight);
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
            setFont(frameContext, envRegularSmallFont);
            drawNavigatorLayer(vTrue);
            performance.mark(measure.drawNavigatorLayer);


            drawHorizontalGrid();
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
                    if (animate(navigatorFactorY, setNavigationFactorY, _navigatorFactorY, vNull, vUndefined, vTrue)) {
                        animate(smartAxisYOpacity, setAxisYLabelOpacity, 0, 2);
                    }
                } else {
                    animate(navigatorMinY * 1, setNavigatorMinY, _min * 1, vNull, vUndefined, vTrue);
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
            _i = fMathCeil(selectionMinY),
            _factor = 1,
            _newProposed,
            _divider;

        if (_prevProposed > 10) {
        } else if (_prevProposed > 2) {
            _factor = _factor / 10;
        } else {
            _factor = _factor / 1000;
        }

        do {
            if (_i >= getLength(CONST_HUMAN_SCALES)) {
                _i = 0;
                _factor = _factor * 10;
            }
            _divider = CONST_HUMAN_SCALES[_i] * _factor;
            _newProposed = fMathCeil(_prevProposed / _divider) * _divider;
            _i++;
        } while (_newProposed - _prevProposed < _threshold);
        animate(smartAxisYRangeFloat, setSmartAxisYRange, _newProposed);
        smartAxisYRangeInt = _newProposed;
    }

    /**
     * Calculates the selection factors
     */
    function calcSelectionFactors() {
        selectionStartIndexFloat = zoomStartFloat + 1;
        selectionEndIndexFloat = zoomEndFloat + 1;
        var _max = vUndefined,
            _min = configMinValueAxisY,
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
            selectionMaxY = _max;
            if (configMinValueAxisY !== vUndefined || _min === selectionMinY) {
                selectionMinY = _min;
                animate(selectionFactorY, setSelectionFactorY, -(selectionHeight - 2) / (_max - _min),
                    vNull, vUndefined, vTrue);
            } else {
                animate(selectionMinY * 1, setSelectionMinY, _min,
                    vNull, vUndefined, vTrue);
            }
            calcSmartAxisY();
        }
        if (updateDateRangeTextTimer) {
            clearTimeout(updateDateRangeTextTimer);
        }
        updateDateRangeTextTimer = setTimeout(updateDateRangeText, 20);
    }

    /**
     * Calculates the buttons params
     */
    function createButtons() {
        for (var _i in yAxisDataRefs) {
            var _axis = yAxisDataRefs[_i];
            _axis.sCg = [];
            for (var _j = 0; _j <= 100; _j++) {
                _axis.sCg[_j] = getRGBA(_axis.color, _j / 100);
            }
            createButton(_i);
        }
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
                createButtons();
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

            _frameCount = s || (mousePressed || mouseHoveredRegionType === ENUM_SELECTION_HOVER ? 5 : 15); //faster when user active
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
        }
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
            setFillStyle(frameContext, envColorGrad[30])
            for (var measureIndex in measures) {
                var meas = measures[measureIndex];
                frameContext.fillText(meas.name + " " + meas.duration.toFixed(4), uIBtnRadius2, y);
                y = y + envSmallTextHeight + uIGlobalPadding;
            }
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
            calcSelectionFactors();
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
        hovered: getMouseHoveredRegionType
    };
};



