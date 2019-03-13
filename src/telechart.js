/*jslint browser: true*/
/*global $ */
var TeleChart = function (ctxId) {
    "use strict";

    var CONST_DEFAULT_TYPE = "line",
        CONST_NAVIGATION_HEIGHT_PERCENT = 12,
        CONST_NAVIGATION_WIDTH_PERCENT = 25,
        CONST_DISPLAY_SCALE_FACTOR = 1.5,
        CONST_PADDING = 5,
        ENUM_NAVIGATOR_HOVER = 1,
        ENUM_START_SELECTION_HOVER = 2,
        ENUM_END_SELECTION_HOVER = 3,
        ENUM_IN_FRAME_SELECTION_HOVER = 4,
        ENUM_BUTTON_HOVER = 5,
        CONST_MAX_SAFE_INTEGER = Math.pow(2, 53) - 1,
        CONST_MIN_SAFE_INTEGER = -(Math.pow(2, 53) - 1),
        CONST_HUMAN_SCALES = [2, 5, 10],
        CONST_MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        CONST_DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        CONST_TWO_PI = 2 * Math.PI;

    var container = document.getElementById(ctxId),
        parseInt = window.parseInt,
        totalWidth = container.offsetWidth * CONST_DISPLAY_SCALE_FACTOR,
        totalHeight = container.offsetHeight * CONST_DISPLAY_SCALE_FACTOR,
        navigationHeight = parseInt(totalWidth * CONST_NAVIGATION_HEIGHT_PERCENT / 100),
        selectionHeight = totalWidth - navigationHeight - navigationHeight * 2,
        selectionUpSpace = navigationHeight / 2,
        navigationTop = selectionHeight + navigationHeight + CONST_PADDING * 4,
        needRedraw = true,
        mainCanvas = createCanvas(totalWidth, totalHeight, "m_" + ctxId),
        frameCanvas = createCanvas(totalWidth, totalHeight, "f_" + ctxId),
        mainCtx = mainCanvas.getContext("2d"),
        frameContext = frameCanvas.getContext("2d"),
        xAxisDataRef = null,
        yAxisDataRef = [],
        animations = {},
        mouseX,
        mouseY,
        mouseOffsetX,
        mouseOffsetY,
        mouseHovered = false,
        mousePressed = false,
        mouseFrame = {start: 0, end: 0},
        zoomStart,
        zoomEnd,
        selectionStartIndex,
        selectionEndIndex,
        selectionFactorX,
        selectionFactorY,
        selectionMinY,
        selectionMaxY,
        navigationFactorX,
        navigationFactorY,
        navigationMinY,
        scaleIntervalY,
        xScaleTextWidth,
        textHeight,
        needUpdateSelectionFactor = false,
        minIsZero = true,
        envColor,
        envBgColor;

    function init() {
        var _size = getBodyStyle("font-size"),
            _canvasStyle = mainCanvas.style;
        frameContext.lineJoin = "round";
        textHeight = parseInt(parseInt(_size.replace(/\D/g, '')) * 1.2);
        _size = textHeight + "px";
        frameContext.font = _size + " " + getBodyStyle("font-family");
        xScaleTextWidth = getTextWidth("XXX XX");
        _canvasStyle.width = parseInt(totalWidth / CONST_DISPLAY_SCALE_FACTOR) + "px";
        _canvasStyle.height = parseInt(totalHeight / CONST_DISPLAY_SCALE_FACTOR) + "px";
    }

    init();

    function setSelectionFactorY(val) {
        selectionFactorY = val;
    }

    function setNavigationFactorY(val) {
        navigationFactorY = val;
    }

    function setZoomStart(val) {
        zoomStart = val;
        needUpdateSelectionFactor = true;
    }

    function setZoomEnd(val) {
        zoomEnd = val;
        needUpdateSelectionFactor = true;
    }

    function clear() {
        xAxisDataRef = null;
        yAxisDataRef = [];
        invalidate();
    }

    container.appendChild(mainCanvas);

    function getBodyStyle(styleProp) {
        var el = document.body;
        if (el.currentStyle) {
            return el.currentStyle[styleProp];
        }
        return document.defaultView.getComputedStyle(el, null)[styleProp];
    }

    function createCanvas(width, height, postfix) {
        var canvas = document.createElement("canvas");
        canvas.id = "layer_" + postfix;
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    function formatDate(timestamp) {  //Jan 29
        var date = new Date(timestamp);
        var day = date.getDate();
        var monthIndex = date.getMonth();
        return CONST_MONTH_NAMES_SHORT[monthIndex] + " " + day;
    }

    function setCursor(cursor) {
        mainCanvas.style.cursor = cursor;
    }

    function setHoveredElement() {
        var result = null;
        if (mouseY > navigationTop && mouseY < navigationTop + navigationHeight) {
            result = ENUM_NAVIGATOR_HOVER;
            var _startZoom = ( zoomStart) * navigationFactorX;
            var _endZoom = ( zoomEnd) * navigationFactorX;
            var startZShift = _startZoom - mouseX;
            var endZShift = _endZoom - mouseX;
            if (Math.abs(startZShift + CONST_PADDING) < CONST_PADDING) {
                result = ENUM_START_SELECTION_HOVER;
            } else if (Math.abs(endZShift - CONST_PADDING) < CONST_PADDING) {
                result = ENUM_END_SELECTION_HOVER;
            } else if (mouseX > _startZoom && mouseX < _endZoom) {
                mouseFrame.start = startZShift / navigationFactorX;
                mouseFrame.end = endZShift / navigationFactorX;
                result = ENUM_IN_FRAME_SELECTION_HOVER;
            }
        } else if (mouseY > navigationTop + navigationHeight) {
            for (var _i = 0; _i < yAxisDataRef.length; _i++) {
                var _axis = yAxisDataRef[_i];
                _axis.hovered = false;
                if (mouseX > _axis.bX && mouseX < _axis.bX + _axis.bW &&
                    mouseY > _axis.bY && mouseY < _axis.bY + _axis.bH) {
                    _axis.hovered = true;
                    result = ENUM_BUTTON_HOVER;
                    break;
                }
            }
        }
        if (mouseHovered !== result) {
            mouseHovered = result;
            switch (mouseHovered) {
                case ENUM_START_SELECTION_HOVER:
                case ENUM_END_SELECTION_HOVER:
                    setCursor("col-resize");
                    break;
                case ENUM_IN_FRAME_SELECTION_HOVER:
                case ENUM_BUTTON_HOVER:
                    setCursor("pointer");
                    break;
                default:
                    //reset all hovered once
                    for (var _j = 0; _j < yAxisDataRef.length; _j++) {
                        yAxisDataRef[_j].hovered = false;
                    }
                    setCursor("inherit");
                    break;
            }
        }
    }

    function stopPropagation(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function moveHoveredElement() {
        var _proposedX = mouseX / navigationFactorX;
        var _maxProposedX = xAxisDataRef.data.length - 2;
        if (_proposedX < 0) {
            _proposedX = 0;
        } else if (_proposedX > _maxProposedX) {
            _proposedX = _maxProposedX;
        }
        var threshold = 30 / navigationFactorX;
        switch (mouseHovered) {
            case ENUM_START_SELECTION_HOVER:
                if (zoomEnd - _proposedX > threshold) {
                    animate(zoomStart, setZoomStart, _proposedX, 2);
                }
                break;
            case ENUM_END_SELECTION_HOVER:
                if (_proposedX - zoomStart > threshold) {
                    zoomEnd = _proposedX;
                    animate(zoomEnd, setZoomEnd, _proposedX, 2);
                }
                break;
            case ENUM_IN_FRAME_SELECTION_HOVER:
                var _start = _proposedX + mouseFrame.start;
                var _end = _proposedX + mouseFrame.end;
                if (_start < 0) {
                    _start = 0;
                    _end = mouseFrame.end - mouseFrame.start;
                }
                if (_end > _maxProposedX) {
                    _end = _maxProposedX;
                    _start = _maxProposedX - mouseFrame.end + mouseFrame.start;
                }

                animate(zoomStart, setZoomStart, _start, 2);
                animate(zoomEnd, setZoomEnd, _end, 2);
                break;
        }
    }

    function handleMouseMove(e) {
        stopPropagation(e);
        if (mousePressed && e.buttons !== 1) {
            mousePressed = false;
        }

        mouseX = parseInt((e.clientX - mouseOffsetX) * CONST_DISPLAY_SCALE_FACTOR);
        mouseY = parseInt((e.clientY - mouseOffsetY) * CONST_DISPLAY_SCALE_FACTOR);
        if (!mousePressed) {
            setHoveredElement();
        } else {
            moveHoveredElement();
        }
        invalidate();
    }

    function handleMouseClick(e, pressed) {
        stopPropagation(e);
        mousePressed = pressed;
        if (pressed)
        {
            switch (mouseHovered) {
                case ENUM_BUTTON_HOVER:
                    for (var _j = 0; _j < yAxisDataRef.length; _j++) {
                        if (yAxisDataRef[_j].hovered) {
                            yAxisDataRef[_j].enabled = !yAxisDataRef[_j].enabled;
                            calcNavigationFactors();
                            calcSelectionFactors();
                        }
                    }
                    break;
            }
        }
        invalidate();
    }

    mainCanvas.onmousemove = function (e) {
        handleMouseMove(e);
    };

    mainCanvas.onmousedown = function (e) {
        handleMouseClick(e, true);
    };

    mainCanvas.onmouseup = function (e) {
        handleMouseClick(e, false);
    };

    function invalidate() {
        envColor = getBodyStyle("color");
        envBgColor = getBodyStyle("background-color");
        needRedraw = true;
    }

    function reOffset() {
        var _bb = mainCanvas.getBoundingClientRect();
        mouseOffsetX = _bb.left;
        mouseOffsetY = _bb.top;
        invalidate();
    }

    window.addEventListener("scroll", function (e) {
        reOffset();
    });
    window.addEventListener("resize", function (e) {
        reOffset();
    });
    reOffset();

    function beginPath() {
        frameContext.beginPath();
    }

    function setLineWidth(width) {
        frameContext.lineWidth = width;
    }

    function endPath() {
        frameContext.stroke();
    }

    function getTextWidth(text) {
        return frameContext.measureText(text).width;
    }

    function fillText(text, x, y) {
        frameContext.fillText(text, x, y);
    }

    function getRGBA(color, opacity) {
        if (color.indexOf("#") !== -1) {
            var regExp = color.length === 7 ?
                /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i :
                /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
            var result = regExp.exec(color);
            color = "rgb(" + parseInt(result[1], 16) + "," + parseInt(result[2], 16) + "," + parseInt(result[3], 16) + ")";
        }
        if (color.indexOf("a") === -1) {
            return color.replace(")", ", " + opacity + ")").replace("rgb", "rgba");
        }
        return color;
    }

    function drawHorizontalScales() {
        var _selectionAxis = selectionHeight + selectionUpSpace;
        beginPath();
        setStrokeStyle(getRGBA(envColor, 0.1));
        setLineWidth(1);
        var nextScale = _selectionAxis;
        while (nextScale > selectionUpSpace) {
            var _y = parseInt(nextScale) + 0.5;
            moveOrLine(true, 0, _y);
            moveOrLine(false, totalWidth, _y);
            nextScale = nextScale + scaleIntervalY * selectionFactorY;
        }
        endPath();
        return nextScale;
    }

    function drawScaleLabels() { //todo need optimize
        var _selectionAxis = selectionHeight + selectionUpSpace;
        var _c = getRGBA(envColor, 0.4);

        //X-axis labels
        setLineWidth(1);
        setFillStyle(_c);
        var _nextItem = selectionStartIndex,
            _range = parseInt(Math.ceil((selectionEndIndex - selectionStartIndex) / 6));
        for (var _l = selectionStartIndex; _l <= selectionEndIndex; _l++) {
            var _labelX = (_l - selectionStartIndex) * selectionFactorX;
            if (_nextItem <= _l) {
                var _label = formatDate(xAxisDataRef.data[_l]);
                fillText(_label, _labelX, _selectionAxis + CONST_PADDING * 5);
                _nextItem = _nextItem + _range;
            }
        }

        //Y-axis labels
        var nextScaleValue = 0;
        var nextScale = _selectionAxis;
        var _bg = getRGBA(envBgColor, 0.7);

        while (nextScale > selectionUpSpace) {
            var _y = parseInt(nextScale) + 0.5 - CONST_PADDING;
            var _text = nextScaleValue.toString();
            var _textWidth = getTextWidth(_text);
            setFillStyle(_bg);
            fillRect(CONST_PADDING / 2, _y - textHeight + 2, _textWidth + CONST_PADDING * 2, textHeight); //todo
            setFillStyle(_c);
            fillText(_text, CONST_PADDING, _y);
            nextScaleValue = parseInt(nextScaleValue + scaleIntervalY);
            nextScale = nextScale + scaleIntervalY * selectionFactorY;
        }
    }

    function moveOrLine(isMove, x, y) {
        if (isMove) {
            frameContext.moveTo(x, y);
        } else {
            frameContext.lineTo(x, y);
        }
    }

    function quadraticCurveTo(cpx, cpy, x, y) {
        frameContext.quadraticCurveTo(cpx, cpy, x, y);
    }

    function closePath() {
        frameContext.closePath();
    }

    function fill() {
        frameContext.fill();
    }
    function arc(x,y,radius,startAngle,endAngle,anticlockwise) {
        frameContext.arc(x,y,radius,startAngle,endAngle,anticlockwise);
    }

    function fillRect(x, y, w, h) {
        frameContext.fillRect(x, y, w, h);
    }

    function setStrokeStyle(strokeStyle) {
        frameContext.strokeStyle = strokeStyle;
    }

    function setFillStyle(fillStyle) {
        frameContext.fillStyle = fillStyle;
    }

    function translate(x, y) {
        frameContext.translate(x, y);
    }

    function drawButton(axis) { //todo optimize
        var _x = axis.bX,
            _y = axis.bY,
            _width = axis.bW,
            _height = axis.bH,
            _color = axis.color,
            _name = axis.name,
            _enabled = axis.enabled;

        beginPath();
        setStrokeStyle(getRGBA(envColor, 0.2));
        setLineWidth(1);
        var _radius = 20;
        moveOrLine(true, _x + _radius, _y);
        moveOrLine(false, _x + _width - _radius, _y);
        quadraticCurveTo(_x + _width, _y, _x + _width, _y + _radius);
        quadraticCurveTo(_x + _width, _y + _height, _x + _width - _radius, _y + _height);
        moveOrLine(false, _x + _radius, _y + _height);
        quadraticCurveTo(_x, _y + _height, _x, _y + _height - _radius);
        quadraticCurveTo(_x, _y, _x + _radius, _y);
        closePath();
        endPath();
        setFillStyle(_color);
        beginPath();

        arc(_x + _radius, _y + _radius, 14, 0, CONST_TWO_PI);
        fill();

        setStrokeStyle(envBgColor);
        setLineWidth(4);
        beginPath();
        translate(-2, 4);
        moveOrLine(true, _x + _radius - CONST_PADDING, _y + _radius - CONST_PADDING);
        moveOrLine(false, _x + _radius, _y + _radius);
        moveOrLine(false, _x + _radius + CONST_PADDING * 1.8, _y + _radius - CONST_PADDING * 1.8);
        translate(2, -4);
        endPath();

        //todo animation circle

        if (!_enabled) {
            beginPath();
            setFillStyle(envBgColor);
            arc(_x + _radius, _y + _radius, 12, 0, CONST_TWO_PI);
            fill();
        }

        setFillStyle(envColor);
        fillText(_name, _x + _radius * 2 + CONST_PADDING, _y + _radius + textHeight / 2 - CONST_PADDING + 2);
    }

    function drawButtons() {
        for (var _i = 0; _i < yAxisDataRef.length; _i++) {
            var _axis = yAxisDataRef[_i];
            drawButton(_axis);
        }
    }

    function redrawFrame() {
        frameContext.clearRect(0, 0, totalWidth, totalHeight);
        if (xAxisDataRef && yAxisDataRef && yAxisDataRef.length) {
            var _axisX = xAxisDataRef;
            var _startZoom = ( zoomStart) * navigationFactorX;
            var _endZoom = ( zoomEnd) * navigationFactorX;

            var _existVisible = false;
            setFillStyle(getRGBA(envColor, 0.3));
            fillRect(_startZoom, navigationTop, _endZoom - _startZoom, navigationHeight);
            setFillStyle(envBgColor);
            fillRect(_startZoom + CONST_PADDING * 2, navigationTop + CONST_PADDING / 2, _endZoom - _startZoom - CONST_PADDING * 4, navigationHeight - CONST_PADDING); //todo optimize
            drawHorizontalScales();
            var _selectionAxis = selectionHeight + selectionUpSpace;
            for (var _i = 0; _i < yAxisDataRef.length; _i++) {
                var _axisY = yAxisDataRef[_i];

                if (!_axisY.enabled) {
                    continue;
                }

                //navigator series
                beginPath();
                setLineWidth(2);
                setStrokeStyle(_axisY.color);
                var _length = _axisX.data.length;
                for (var _k = 1; _k < _length; _k++) {
                    var _xValue = (_k - 1) * navigationFactorX;
                    var _yValue = navigationTop + navigationHeight + (_axisY.data[_k] - navigationMinY) * navigationFactorY;
                    moveOrLine(_k === 1, _xValue, _yValue);
                }
                endPath();

                //selection series
                beginPath();
                setLineWidth(3);
                for (var _j = selectionStartIndex; _j <= selectionEndIndex; _j++) {
                    var _selValueX = (_j - selectionStartIndex) * selectionFactorX;
                    var _selValueY = _selectionAxis + (_axisY.data[_j] - selectionMinY) * selectionFactorY;
                    moveOrLine(_j === selectionStartIndex, _selValueX, _selValueY);
                }
                endPath();
                _existVisible = true;
            }

            //Draw navigation frame
            setFillStyle(getRGBA(envColor, 0.1));
            fillRect(0, navigationTop, _startZoom, navigationHeight);
            fillRect(_endZoom, navigationTop, totalWidth - _endZoom, navigationHeight);

            setFillStyle(getRGBA(envBgColor, 0.5));
            fillRect(0, navigationTop, _startZoom, navigationHeight);
            fillRect(_endZoom, navigationTop, totalWidth - _endZoom, navigationHeight);

            if (_existVisible) {
                drawScaleLabels();
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

    function animate(f ,c, p, s) {
        var name = c.name;
        if (!name) {
            name = c.toString().match(/^function\s*([^\s(]+)/)[1];
        }
        animations[name] = {
            f: f,       //first
            c: c,       //callback
            p: p,       //proposed
            s: s || (mouseY < navigationTop + navigationHeight ? 5 : 15)    //speed
        };
    }

    function calcNavigationFactors() {
        navigationFactorX = (totalWidth) / (xAxisDataRef.data.length - 2);
        var _max = minIsZero ? 0 : CONST_MIN_SAFE_INTEGER;
        var _min = CONST_MAX_SAFE_INTEGER;
        for (var _i = 0; _i < yAxisDataRef.length; _i++) {
            var _axisY = yAxisDataRef[_i];
            if (!_axisY.enabled) {
                continue;
            }
            if (_axisY.max > _max) { //todo function
                _max = _axisY.max;
            }
            if (_axisY.min < _min) {
                _min = _axisY.min;
            }
        }
        if (_min < _max) {
            navigationMinY = _min + 1;
            animate(navigationFactorY, setNavigationFactorY, -(navigationHeight - 2) / (_max - _min));
        }
    }

    function calcSmartScale() {
        var _prevProposed = Math.ceil((selectionMaxY - selectionMinY) / 6),
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
            _newProposed = Math.ceil(_prevProposed / _divider) * _divider;
            _i++;
        } while (_newProposed - _prevProposed < _threshold);
        scaleIntervalY = _newProposed;
    }

    function calcSelectionFactors() {
        selectionStartIndex = parseInt(zoomStart + 1);
        selectionEndIndex = parseInt(zoomEnd + 1);
        var _max = CONST_MIN_SAFE_INTEGER;
        var _min = minIsZero ? 0 : CONST_MAX_SAFE_INTEGER;
        for (var _i = 0; _i < yAxisDataRef.length; _i++) {
            var _axisY = yAxisDataRef[_i];
            if (!_axisY.enabled) {
                continue;
            }
            for (var _j = selectionStartIndex; _j <= selectionEndIndex; _j++) {
                var _value = _axisY.data[_j];
                if (_value > _max) {
                    _max = _value;
                }
                if (_value < _min) {
                    _min = _value;
                }
            }
        }
        if (_min < _max) {
            selectionStartIndex = parseInt(zoomStart + 1);
            selectionEndIndex = parseInt(zoomEnd + 1);
            selectionFactorX = totalWidth / (selectionEndIndex - selectionStartIndex);
            selectionMinY = _min;
            selectionMaxY = _max;
            animate(selectionFactorY, setSelectionFactorY, -(selectionHeight - 2) / (_max - _min));
            calcSmartScale();
        }
    }

    function calcButtonsParams() {
        var _x = CONST_PADDING,
            _y = navigationTop + navigationHeight + CONST_PADDING * 6,
            _height = 40;

        for (var _i = 0; _i < yAxisDataRef.length; _i++) {
            var _axis = yAxisDataRef[_i],
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
    }

    function prepareCaches(src) {
        if (!src) {
            return;
        }
        var columns = src.columns;
        if (columns) {
            for (var _i = 0; _i < columns.length; _i++) {
                var _column = columns[_i];
                var _dataLen = _column.length;
                var _max = CONST_MIN_SAFE_INTEGER;
                var _min = CONST_MAX_SAFE_INTEGER;
                for (var _k = 1; _k < _dataLen; _k++) {
                    var _elementVal = _column[_k];
                    if (_elementVal > _max) {
                        _max = _elementVal;
                    }
                    if (_elementVal < _min) {
                        _min = _elementVal;
                    }
                }

                if (_column[0] === "x") {
                    xAxisDataRef = {
                        data: _column,
                        min: _min,
                        max: _max
                    };
                    setZoomEnd(_dataLen - 2);
                    setZoomStart( zoomEnd - (zoomEnd) * CONST_NAVIGATION_WIDTH_PERCENT / 100);
                } else {
                    yAxisDataRef.push(
                        {
                            alias: _column[0],
                            data: _column, //without realloc mem
                            type: CONST_DEFAULT_TYPE,
                            name: _column[0],
                            min: _min,
                            max: _max,
                            enabled: true
                        });
                }
            }
            calcNavigationFactors();
            calcButtonsParams();
        }

        function assignAxisProperty(source, field) {
            if (source) {
                for (var axis in source) {
                    if (source.hasOwnProperty(axis)) {
                        var _type = source[axis];
                        for (var _i = 0; _i < yAxisDataRef.length; _i++) {
                            var _yAxisRef = yAxisDataRef[_i];
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

    function draw(data) {
        if (data) {
            prepareCaches(data);
            invalidate();
        }
    }

    function handleAnimations() {
        for (var key in animations) {
            if (animations.hasOwnProperty(key)) {
                var _animation = animations[key];
                if (_animation) {
                    if (!_animation.factor) {
                        _animation.factor = (_animation.p - _animation.f) / _animation.s;
                    }
                    _animation.f = _animation.f + _animation.factor;
                    if (_animation.factor !== 0 && Math.abs(_animation.f - _animation.p) > Math.abs(_animation.factor * 2)) {
                        _animation.c(_animation.f);
                        invalidate();
                    } else {
                        _animation.c(_animation.p);
                        delete animations[key];
                        invalidate();
                    }
                }
            }
        }
    }

//var nextFrame = 0;
    function render() {
        handleAnimations();
        if (needUpdateSelectionFactor) {
            needUpdateSelectionFactor = false;
            calcSelectionFactors();
        }

        if (needRedraw) {
            needRedraw = false;
            redrawFrame();
        }

        requestAnimationFrame(render);
        //  var next = performance.now();  //todo need remove
//        console.log(1000/ (next - nextFrame));
        //      nextFrame = next;
    }

    render();
    invalidate();
    return {
        draw: draw,
        invalidate: invalidate,
        clear: clear
    };
};