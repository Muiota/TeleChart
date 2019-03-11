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
        CONST_MIN_SAFE_INTEGER = -(Math.pow(2, 53) - 1);


    var parseInt = window.parseInt;

    var container = document.getElementById(ctxId),
        totalWidth = container.offsetWidth,
        totalHeight = container.offsetHeight,
        navigationHeight = parseInt(totalWidth * CONST_NAVIGATION_HEIGHT_PERCENT / 100),
        selectionHeight = totalWidth - navigationHeight - navigationHeight,
        navigationTop = totalHeight - navigationHeight,
        needRedraw = true,
        mainCanvas = createCanvas(totalWidth, totalHeight, "m_" + ctxId),
        frameCanvas = createCanvas(totalWidth, totalHeight, "f_" + ctxId),
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
        minIsZero = true;

    container.appendChild(mainCanvas);

    function createCanvas(width, height, postfix) {
        var canvas = document.createElement("canvas");
        canvas.id = "layer_" + postfix;
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    mainCanvas.style.border = "1px solid"; //todo remove

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

    reOffset();
    window.addEventListener('scroll', function (e) {
        reOffset(); //todo resize
    });

    function beginPath() {
        _frameContext.beginPath();
    }

    function setLineWidth(width) {
        _frameContext.lineWidth = width;
    }

    function endPath() {
        _frameContext.stroke();
    }

    function redrawFrame() {
        _frameContext.clearRect(0, 0, totalWidth, totalHeight);
        if (xAxisDataRef && yAxisDataRef && yAxisDataRef.length) {
            var _axisX = xAxisDataRef;
            var _startZoom = ( zoomStart) * navigationFactorX;
            var _endZoom = ( zoomEnd) * navigationFactorX;

            _frameContext.fillStyle = "rgba(0, 0, 0, 0.3)"; //todo config and redesign
            _frameContext.fillRect(_startZoom, navigationTop, _endZoom - _startZoom, navigationHeight);
            _frameContext.fillStyle = "#ffffff"; //todo config
            _frameContext.fillRect(_startZoom + CONST_PADDING, navigationTop + CONST_PADDING/2, _endZoom - _startZoom - CONST_PADDING * 2, navigationHeight - CONST_PADDING ); //todo optimize

            var _columnsLen = yAxisDataRef.length;

            for (var _i = 0; _i < _columnsLen; _i++) {
                var _axisY = yAxisDataRef[_i];

                //navigator series
                beginPath();
                setLineWidth(1);
                _frameContext.strokeStyle = _axisY.color;
                var _length = _axisX.data.length;
                for (var _k = 1; _k < _length; _k++) {
                    var _xValue = (_k - 1) * navigationFactorX;
                    var _yValue = totalHeight + (_axisY.data[_k] - navigationMinY) * navigationFactorY;
                    if (_k === 1) {
                        _frameContext.moveTo(_xValue, _yValue);
                    } else {
                        _frameContext.lineTo(_xValue, _yValue);
                    }
                }
                endPath();

                //selection series
                beginPath()
                setLineWidth(2);
                for (var _j = selectionStartIndex; _j <= selectionEndIndex; _j++) {
                    var _selValueX = (_j - selectionStartIndex) * selectionFactorX;
                    var _selValueY = selectionHeight + (_axisY.data[_j] - selectionMinY) * selectionFactorY;
                    if (_k === selectionStartIndex) {
                        _frameContext.moveTo(_selValueX, _selValueY);
                    } else {
                        _frameContext.lineTo(_selValueX, _selValueY);
                    }
                }
                endPath();
            }

            //Draw navigation
            _frameContext.fillStyle = "rgba(245, 241, 240, 0.6)"; //todo config
            _frameContext.fillRect(0, navigationTop, _startZoom, navigationHeight);
            _frameContext.fillRect(_endZoom, navigationTop, totalWidth - _endZoom, navigationHeight);

            //todo debug need remove
            _frameContext.fillStyle = "rgba(0, 0, 0, 0.2)"; //todo config
            _frameContext.fillText("selectionStartIndex " + selectionStartIndex, 10, 50);
            _frameContext.fillText("selectionEndIndex " + selectionEndIndex, 10, 70);
            _frameContext.fillText("selectionFactorX " + selectionFactorX, 10, 90);
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
        selectionMinY = _min ;
        selectionMaxY = _max;
    }

    function prepareCaches(src) {
        if (!src) {
            return;
        }
        var columns = src.columns;
        if (columns) {
            var _columnsLen = columns.length;
            for (var i = 0; i < _columnsLen; i++) {
                var _column = columns[i];
                var _dataLen = _column.length;
                var _max = CONST_MIN_SAFE_INTEGER;
                var _min = CONST_MAX_SAFE_INTEGER;
                for (var k = 1; k < _dataLen; k++) {
                    var _elementVal = _column[k];
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

    var _mainCtx = mainCanvas.getContext("2d"),
        _frameContext = frameCanvas.getContext("2d");

    //var nextFrame = 0;
    function render() {
        if (needRedraw) {
            needRedraw = false;
            redrawFrame();
        }
        _mainCtx.clearRect(0, 0, totalWidth, totalHeight);
        _mainCtx.drawImage(frameCanvas, 0, 0, totalWidth, totalHeight);
        requestAnimationFrame(render);
        //   var next = performance.now();  //todo need remove
//        console.log(1000/ (next - nextFrame));
        //      nextFrame = next;
    }

    render();
    return {
        draw: draw
    };
};

