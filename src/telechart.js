/*jslint browser: true*/
/*global $ */
var TeleChart = function (ctxId) {
    "use strict";

    var CONST_DEFAULT_TYPE = "line",
        CONST_NAVIGATION_HEIGHT_PERCENT = 12,
        CONST_NAVIGATION_WIDTH_PERCENT = 25,
        CONST_NAVIGATOR = 1,
        CONST_DISPLAY_SCALE_FACTOR = 1.5,
        CONST_PADDING = 5,
        CONST_START_SELECTION = 2,
        CONST_END_SELECTION = 3,
        CONST_IN_FRAME_SELECTION = 4,
        CONST_MAX_SAFE_INTEGER = Math.pow(2, 53) - 1,
        CONST_MIN_SAFE_INTEGER = -(Math.pow(2, 53) - 1),
        CONST_HUMAN_SCALES = [2, 5, 10],
        CONST_MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        CONST_DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];


    var parseInt = window.parseInt;

    var container = document.getElementById(ctxId),
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
        minIsZero = true;

    function init() {

        var _size = getBodyStyle("font-size"),
            _canvasStyle = mainCanvas.style;
        frameContext.lineJoin = "round";
        textHeight = parseInt(parseInt(_size.replace(/\D/g, '')) * 1.2);
        _size = textHeight + "px";
        frameContext.font = _size + " " + getBodyStyle("font-family");
        xScaleTextWidth = getTextWidth("XXX XX");
        _canvasStyle.width = parseInt(totalWidth / CONST_DISPLAY_SCALE_FACTOR) + "px"; //todo retina
        _canvasStyle.height = parseInt(totalHeight / CONST_DISPLAY_SCALE_FACTOR) + "px";
    }

    init();

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
            result = CONST_NAVIGATOR;
            var _startZoom = ( zoomStart) * navigationFactorX;
            var _endZoom = ( zoomEnd) * navigationFactorX;
            var startZShift = _startZoom - mouseX;
            var endZShift = _endZoom - mouseX;
            if (Math.abs(startZShift + CONST_PADDING) < CONST_PADDING) {
                result = CONST_START_SELECTION;
            } else if (Math.abs(endZShift - CONST_PADDING) < CONST_PADDING) {
                result = CONST_END_SELECTION;
            } else if (mouseX > _startZoom && mouseX < _endZoom) {
                mouseFrame.start = startZShift / navigationFactorX;
                mouseFrame.end = endZShift / navigationFactorX;
                result = CONST_IN_FRAME_SELECTION;
            }
        }
        if (mouseHovered !== result) {
            mouseHovered = result;
            switch (mouseHovered) {
                case CONST_START_SELECTION:
                case CONST_END_SELECTION:
                    setCursor("col-resize");
                    break;
                case CONST_IN_FRAME_SELECTION:
                    setCursor("pointer");
                    break;
                default:
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
            case CONST_START_SELECTION:
                if (zoomEnd - _proposedX > threshold) {
                    zoomStart = _proposedX;
                }
                calcSelectionFactors();
                break;
            case CONST_END_SELECTION:
                if (_proposedX - zoomStart > threshold) {
                    zoomEnd = _proposedX;
                }
                calcSelectionFactors();
                break;
            case CONST_IN_FRAME_SELECTION:
                var start = _proposedX + mouseFrame.start;
                var end = _proposedX + mouseFrame.end;
                if (start < 0) {
                    start = 0;
                    end = mouseFrame.end - mouseFrame.start;
                }
                if (end > _maxProposedX) {
                    end = _maxProposedX;
                    start = _maxProposedX - mouseFrame.end + mouseFrame.start;
                }

                zoomStart = start;
                zoomEnd = end;
                calcSelectionFactors();
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

    function fillText(text, x, y, maxWidth) {
        frameContext.fillText(text, x, y, maxWidth);
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

    function drawHorizontalScales(color) {
        var _selectionAxis = selectionHeight + selectionUpSpace;
        beginPath();
        setStrokeStyle(getRGBA(color, 0.1));
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

    function drawScaleLabels(color, background) { //todo need optimize
        var _selectionAxis = selectionHeight + selectionUpSpace;
        var _c = getRGBA(color, 0.4);

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
        var _bg = getRGBA(background, 0.7);

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

    function drawButton(x, y, width,_height, envColor, color, name) {
        beginPath();
        setStrokeStyle(getRGBA(envColor, 0.2));
        setLineWidth(1);
        var _radius = 20;
        moveOrLine(true, x + _radius, y);
        moveOrLine(false, x + width - _radius, y);
        quadraticCurveTo(x + width, y, x + width, y + _radius);
        quadraticCurveTo(x + width, y + _height, x + width - _radius, y + _height);
        moveOrLine(false, x + _radius, y + _height);
        quadraticCurveTo(x, y + _height, x, y + _height - _radius);
        quadraticCurveTo(x, y, x + _radius, y);
        closePath();
        endPath();
        setFillStyle(color);
        beginPath();
        arc(x + _radius, y + _radius, 14, 0, 2 * Math.PI);
        fill();
        setFillStyle(envColor);
        fillText(name, x + _radius * 2 + CONST_PADDING, y + _radius + textHeight / 2 - CONST_PADDING + 2);
    }

    function drawButtons(envColor) {
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

            drawButton(_x, _y, _width,_height, envColor, _axis.color, _axis.name);
            _x = _x + _width + CONST_PADDING * 3;
        }
    }

    function redrawFrame() {
        frameContext.clearRect(0, 0, totalWidth, totalHeight);
        if (xAxisDataRef && yAxisDataRef && yAxisDataRef.length) {
            var _axisX = xAxisDataRef;
            var _startZoom = ( zoomStart) * navigationFactorX;
            var _endZoom = ( zoomEnd) * navigationFactorX;
            var _envColor = getBodyStyle("color");
            var _envBgColor = getBodyStyle("background-color");
            setFillStyle(getRGBA(_envColor, 0.3));
            fillRect(_startZoom, navigationTop, _endZoom - _startZoom, navigationHeight);
            setFillStyle(_envBgColor);
            fillRect(_startZoom + CONST_PADDING * 2, navigationTop + CONST_PADDING / 2, _endZoom - _startZoom - CONST_PADDING * 4, navigationHeight - CONST_PADDING); //todo optimize
            drawHorizontalScales(_envColor);
            var _selectionAxis = selectionHeight + selectionUpSpace;
            for (var _i = 0; _i < yAxisDataRef.length; _i++) {
                var _axisY = yAxisDataRef[_i];

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
            }

            //Draw navigation frame
            setFillStyle(getRGBA(_envColor, 0.1));
            fillRect(0, navigationTop, _startZoom, navigationHeight);
            fillRect(_endZoom, navigationTop, totalWidth - _endZoom, navigationHeight);

            setFillStyle(getRGBA(_envBgColor, 0.5));
            fillRect(0, navigationTop, _startZoom, navigationHeight);
            fillRect(_endZoom, navigationTop, totalWidth - _endZoom, navigationHeight);

            //Draw scales
            drawScaleLabels(_envColor, _envBgColor);

            drawButtons(_envColor);


            //todo debug need remove
            //  frameContext.fillStyle = "rgba(0, 0, 0, 0.2)";
            //  frameContext.fillText("font-size " + getBodyStyle("font-size"), 10, 50);
            //   frameContext.fillText("font-family " + getBodyStyle("font-family"), 10, 70);
            //    _frameContext.fillText("selectionFactorX " + selectionFactorX, 10, 90);
            mainCtx.clearRect(0, 0, totalWidth, totalHeight);
            mainCtx.drawImage(frameCanvas, 0, 0, totalWidth, totalHeight);
        }
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
            if (_axisY.max > _max) {
                _max = _axisY.max;
            }
            if (_axisY.min < _min) {
                _min = _axisY.min;
            }
        }
        navigationFactorY = -(navigationHeight - 2) / (_max - _min);
        navigationMinY = _min + 1;
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
        selectionFactorX = totalWidth / (selectionEndIndex - selectionStartIndex);
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
        selectionFactorY = -(selectionHeight - 2) / (_max - _min);
        selectionMinY = _min;
        selectionMaxY = _max;
        calcSmartScale();
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
                    zoomEnd = (_dataLen - 2);
                    zoomStart = zoomEnd - (zoomEnd) * CONST_NAVIGATION_WIDTH_PERCENT / 100;
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
            calcSelectionFactors();
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

    //var nextFrame = 0;
    function render() {
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
    return {
        draw: draw,
        invalidate: invalidate,
        clear: clear
    };
};