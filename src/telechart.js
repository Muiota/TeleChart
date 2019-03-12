/*jslint browser: true*/
/*global $ */
var TeleChart = function (ctxId) {
    "use strict";

    var CONST_DEFAULT_COLOR = "#3DC23F",
        CONST_DEFAULT_TYPE = "line",
        CONST_NAVIGATION_HEIGHT_PERCENT = 12,
        CONST_NAVIGATION_WIDTH_PERCENT = 25,
        CONST_PADDING = 5,
        CONST_NAVIGATOR = 1,
        CONST_START_SELECTION = 2,
        CONST_END_SELECTION = 3,
        CONST_IN_FRAME_SELECTION = 4,
        CONST_MAX_SAFE_INTEGER = Math.pow(2, 53) - 1,
        CONST_MIN_SAFE_INTEGER = -(Math.pow(2, 53) - 1),
        CONST_HUMAN_SACLES = [2, 5, 10],
        CONST_MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        CONST_DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];


    var parseInt = window.parseInt;

    var container = document.getElementById(ctxId),
        totalWidth = container.offsetWidth,
        totalHeight = container.offsetHeight,
        navigationHeight = parseInt(totalWidth * CONST_NAVIGATION_HEIGHT_PERCENT / 100),
        selectionHeight = totalWidth - navigationHeight - navigationHeight*2 ,
        selectionUpSpace = navigationHeight / 2,
        navigationTop = totalHeight - navigationHeight,
        needRedraw = true,
        mainCanvas = createCanvas(totalWidth, totalHeight, "m_" + ctxId),
        frameCanvas = createCanvas(totalWidth, totalHeight, "f_" + ctxId),
        mainCtx = mainCanvas.getContext("2d"),
        frameContext = frameCanvas.getContext("2d"),
        xAxisDataRef = null,
        yAxisDataRef = [],
        mouseX = 0,
        mouseY = 0,
        mouseOffsetX = 0,
        mouseOffsetY = 0,
        mouseHovered = false,
        mousePressed = false,
        mouseFrame = {start: 0, end: 0},
        zoomStart = 0,
        zoomEnd = 0,
        selectionStartIndex = 0,
        selectionEndIndex = 0,
        selectionFactorX = 0,
        selectionFactorY = 0,
        selectionMinY = 0,
        selectionMaxY = 0,
        navigationFactorX = 0,
        navigationFactorY = 0,
        navigationMinY = 0,
        scaleIntervalY = 0,
        minIsZero = true;

    function clear() {
        xAxisDataRef = null;
        yAxisDataRef = [];
        invalidate();
    }

    // mainCanvas.style.width = (totalWidth/2) +"px"; //todo retina
    // mainCanvas.style.height = (totalHeight/2) +"px";

    container.appendChild(mainCanvas);

    function getBodyStyle(styleProp) {
        var el = document.body;
        if (el.currentStyle)
            return el.currentStyle[styleProp];
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
        if (mouseY > navigationTop) {
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

        mouseX = parseInt(e.clientX - mouseOffsetX);
        mouseY = parseInt(e.clientY - mouseOffsetY);
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

    function getRGBA(color, opacity) {
        if (color.indexOf("#") !== -1) {
            var regExp = color.length === 7 ?
                /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i :
                /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
            var result = regExp.exec(color);
            color = "rgb(" + parseInt(result[1], 16) + "," + parseInt(result[2], 16) + "," + parseInt(result[3], 16) + ")";
        }
        if (color.indexOf("a") === -1) {
            return color.replace(")", ", "+opacity+")").replace("rgb", "rgba");
        } return color;
    }

    function drawScales(color) {
        var _selectionAxis = selectionHeight + selectionUpSpace;
        beginPath();
        frameContext.strokeStyle = getRGBA(color, 0.4);
        setLineWidth(0.5);
        frameContext.fillStyle = getRGBA(color, 0.6);
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

    function drawScaleLabels(color, background) {

        var _selectionAxis = selectionHeight + selectionUpSpace;
        var nextScaleValue = 0;
        var nextScale = _selectionAxis;
        var _bg = getRGBA(background, 0.7);
        var _c = getRGBA(color, 0.6);
        while (nextScale > selectionUpSpace) {
            var _y = parseInt(nextScale) + 0.5 - CONST_PADDING;
            var _text = nextScaleValue.toString();
            var _measure = frameContext.measureText(_text);
            frameContext.fillStyle =  _bg;
            frameContext.fillRect(CONST_PADDING - CONST_PADDING, _y - CONST_PADDING * 1.6, _measure.width + CONST_PADDING * 2, CONST_PADDING * 2.2); //todo
            frameContext.fillStyle =  _c;
            frameContext.fillText(_text, CONST_PADDING, _y);
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

    function redrawFrame() {
        frameContext.clearRect(0, 0, totalWidth, totalHeight);
        if (xAxisDataRef && yAxisDataRef && yAxisDataRef.length) {
            var _axisX = xAxisDataRef;
            var _startZoom = ( zoomStart) * navigationFactorX;
            var _endZoom = ( zoomEnd) * navigationFactorX;
            var _envColor = getBodyStyle("color");
            var _envBgColor = getBodyStyle("background-color");
            frameContext.fillStyle = getRGBA(_envColor, 0.4);
            frameContext.fillRect(_startZoom, navigationTop, _endZoom - _startZoom, navigationHeight);
            frameContext.fillStyle = _envBgColor;
            frameContext.fillRect(_startZoom + CONST_PADDING, navigationTop + CONST_PADDING/2, _endZoom - _startZoom - CONST_PADDING * 2, navigationHeight - CONST_PADDING ); //todo optimize

            var _columnsLen = yAxisDataRef.length;
            frameContext.lineJoin = "round";
            //            frameContext.translate(0.5,0.5);

            //frameContext.lineCap = "square"; //butt  round
            /*
            ctx.lineJoin = "bevel";
            ctx.lineJoin = "round";
            ctx.lineJoin = "miter";
            * */
            drawScales(_envColor);
            var _selectionAxis = selectionHeight + selectionUpSpace;
            for (var _i = 0; _i < _columnsLen; _i++) {
                var _axisY = yAxisDataRef[_i];

                //navigator series
                beginPath();
                setLineWidth(1);
                frameContext.strokeStyle = _axisY.color;
                var _length = _axisX.data.length;
                for (var _k = 1; _k < _length; _k++) {
                    var _xValue = (_k - 1) * navigationFactorX;
                    var _yValue = totalHeight + (_axisY.data[_k] - navigationMinY) * navigationFactorY;
                    moveOrLine(_k === 1, _xValue, _yValue);
                }
                endPath();

                //selection series
                beginPath();
                setLineWidth(2);
                for (var _j = selectionStartIndex; _j <= selectionEndIndex; _j++) {
                    var _selValueX = (_j - selectionStartIndex) * selectionFactorX;
                    var _selValueY = _selectionAxis + (_axisY.data[_j] - selectionMinY) * selectionFactorY;
                    moveOrLine(_j === selectionStartIndex, _selValueX, _selValueY);
                }
                endPath();

                //X-axis labels
                setLineWidth(1);
                frameContext.fillStyle = getRGBA(_envColor, 0.6);
                for (var _l = selectionStartIndex; _l <= selectionEndIndex; _l++) {
                    var _labelX = (_l - selectionStartIndex) * selectionFactorX;
                    if (_l === selectionStartIndex) {
                        var _label = formatDate(_axisX.data[_l]);
                        frameContext.fillText(_label, _labelX, _selectionAxis + CONST_PADDING * 4);
                    }
                }
            }

            //Draw navigation


            frameContext.fillStyle = getRGBA(_envColor, 0.1);
            frameContext.fillRect(0, navigationTop, _startZoom, navigationHeight);
            frameContext.fillRect(_endZoom, navigationTop, totalWidth - _endZoom, navigationHeight);

            frameContext.fillStyle = getRGBA(_envBgColor, 0.5);
            frameContext.fillRect(0, navigationTop, _startZoom, navigationHeight);
            frameContext.fillRect(_endZoom, navigationTop, totalWidth - _endZoom, navigationHeight);
            drawScaleLabels(_envColor, _envBgColor);

            //todo debug need remove
            //  frameContext.fillStyle = "rgba(0, 0, 0, 0.2)";
            //  _frameContext.fillText("selectionStartIndex " + selectionStartIndex, 10, 50);
            //   _frameContext.fillText("selectionEndIndex " + selectionEndIndex, 10, 70);
            //    _frameContext.fillText("selectionFactorX " + selectionFactorX, 10, 90);
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
            if (_i >= CONST_HUMAN_SACLES.length) {
                _i = 0;
                _factor = _factor * 10;
            }
            _divider = CONST_HUMAN_SACLES[_i] * _factor;
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
            var _columnsLen = columns.length;
            for (var _i = 0; _i < _columnsLen; _i++) {
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
                            color: CONST_DEFAULT_COLOR,
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
                var _columnsLen = yAxisDataRef.length;
                for (var axis in source) {
                    if (source.hasOwnProperty(axis)) {
                        var type = source[axis];
                        for (var i = 0; i < _columnsLen; i++) {
                            var _yAxisRef = yAxisDataRef[i];
                            if (_yAxisRef.alias === axis) {
                                _yAxisRef[field] = type;
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
        mainCtx.clearRect(0, 0, totalWidth, totalHeight);
        mainCtx.drawImage(frameCanvas, 0, 0, totalWidth, totalHeight);
        requestAnimationFrame(render);
        var next = performance.now();  //todo need remove
//        console.log(1000/ (next - nextFrame));
        //      nextFrame = next;
    }

    render();
    return  {
        draw: draw,
        invalidate: invalidate,
        clear: clear
    };
};