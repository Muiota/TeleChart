/*jslint browser: true*/
/*global  */
var TeleChart = function (ctxId) {
    "use strict";

    var DEFAULT_COLOR = "#3DC23F",
        DEFAULT_TYPE = "line",
        NAVIGATION_HEIGHT_PERCENT = 20,
        DEFAULT_NAVIGATION_WIDTH_PERCENT = 25,
        PADDING = 5;

    var _container = document.getElementById(ctxId),
        _width = _container.offsetWidth,
        _height = _container.offsetHeight,
        _navigationHeight = parseInt(_width * NAVIGATION_HEIGHT_PERCENT / 100),
        _navigationTop = _height - _navigationHeight,
        _needRedraw = true,
        _mainCanvas = createCanvas(_width, _height, "main_"+ctxId),
        _frameCanvas = createCanvas(_width, _height, "frame_"+ctxId),
        _xAxisDataRef = null,
        _yAxisDataRef = [],
        _navigation = {
            mouse: {x: 0, y: 0, offsetX: 0, offsetY: 0, hovered: null, pressed: false},
            zoom: {
                start: null,
                end: null
            }
        };

    _container.appendChild(_mainCanvas);

    function createCanvas(width, height, postfix) {
        var canvas = document.createElement("canvas");
        canvas.id = "layer_" + postfix;
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    _mainCanvas.style.border = "1px solid"; //todo

    function setHoveredElement() {
        var result = null;
        if (_navigation.mouse.y > _navigationTop) {
            result = "navigation";
            var _startZoom = ( _navigation.zoom.start) * _xAxisDataRef.koef ;
            var _endZoom = ( _navigation.zoom.end) * _xAxisDataRef.koef;
            var startZShift = _startZoom - _navigation.mouse.x;
            var endZShift = _endZoom - _navigation.mouse.x;
            if (Math.abs(startZShift + PADDING) < PADDING) {
                result = "start";
            } else if (Math.abs(endZShift- PADDING) < PADDING) {
                result = "end";
            } else if (_navigation.mouse.x > _startZoom && _navigation.mouse.x < _endZoom) {
                _navigation.mouse.startShift = startZShift / _xAxisDataRef.koef;
                _navigation.mouse.endShift = endZShift / _xAxisDataRef.koef;
                result = "in";
            }
        }
        if (_navigation.mouse.hovered !== result) {
            _navigation.mouse.hovered = result;
            switch (_navigation.mouse.hovered) {
                case "start":
                case "end":
                    _mainCanvas.style.cursor = "col-resize";
                    break;
                case "in":
                    _mainCanvas.style.cursor = "grab";
                    break;
                default:
                    _mainCanvas.style.cursor = "inherit";
                    break;
            }
        }
    }

    function handleMouseMove(e) {
        e.preventDefault();
        e.stopPropagation();

        if (_navigation.mouse.pressed && e.buttons !== 1) {
            _navigation.mouse.pressed = false;
        }

        _navigation.mouse.x = parseInt(e.clientX - _navigation.mouse.offsetX);
        _navigation.mouse.y = parseInt(e.clientY - _navigation.mouse.offsetY);
        if (!_navigation.mouse.pressed) {
            setHoveredElement();
        } else {
            var _proposedX = _navigation.mouse.x / _xAxisDataRef.koef;
            var _maxProposedX = _xAxisDataRef.data.length - 1;
            if (_proposedX < 0) {
                _proposedX = 0;
            } else if (_proposedX > _maxProposedX) {
                _proposedX = _maxProposedX;
            }
            var threshold = 30/ _xAxisDataRef.koef;
            switch (_navigation.mouse.hovered) {
                case "start":
                    if (_navigation.zoom.end - _proposedX > threshold) {
                        _navigation.zoom.start = _proposedX;
                    }
                    break;
                case "end":
                    if (_proposedX - _navigation.zoom.start > threshold) {
                        _navigation.zoom.end = _proposedX;
                    }
                    break;
                case "in":
                    var start = _proposedX + _navigation.mouse.startShift;
                    var end = _proposedX + _navigation.mouse.endShift;
                    if (start < 0) {
                        start = 0;
                        end = _navigation.mouse.endShift - _navigation.mouse.startShift;
                    }
                    if (end > _maxProposedX) {
                        end = _maxProposedX;
                        start = _maxProposedX - _navigation.mouse.endShift + _navigation.mouse.startShift;
                    }

                    _navigation.zoom.start = start;
                    _navigation.zoom.end = end;
                    break;
            }
        }
        _needRedraw = true;
    }

    function handleMouseClick(e, pressed) {
        e.preventDefault();
        e.stopPropagation();
        _navigation.mouse.pressed = pressed;
        _needRedraw = true;
    }

    _mainCanvas.onmousemove = function (e) {
        handleMouseMove(e);
    };

    _mainCanvas.onmousedown = function (e) {
        handleMouseClick(e, true);
    };

    _mainCanvas.onmouseup = function (e) {
        handleMouseClick(e, false);
    };

    function reOffset() {
        var _bb = _mainCanvas.getBoundingClientRect();
        _navigation.mouse.offsetX = _bb.left;
        _navigation.mouse.offsetY = _bb.top;
        _needRedraw = true;
    }

    reOffset();
    window.addEventListener('scroll', function (e) {
        reOffset(); //todo resize
    });

    function redrawFrame(ctx) {
        ctx.clearRect(0, 0, _width, _height);
        if (_xAxisDataRef && _yAxisDataRef && _yAxisDataRef.length) {
            var _axisX = _xAxisDataRef;
            var _startZoom = ( _navigation.zoom.start) * _axisX.koef;
            var _endZoom = ( _navigation.zoom.end) * _axisX.koef;

            ctx.fillStyle = "#9f9f9f"; //todo config
            ctx.fillRect(_startZoom, _navigationTop, _endZoom - _startZoom, _navigationHeight);
            ctx.fillStyle = "#ffffff"; //todo config
            ctx.fillRect(_startZoom + PADDING, _navigationTop + PADDING, _endZoom - _startZoom - PADDING * 2, _navigationHeight - PADDING * 2); //todo optimize

            var _columnsLen = _yAxisDataRef.length;

            for (var i = 0; i < _columnsLen; i++) {
                var axisY = _yAxisDataRef[i];
                ctx.beginPath();
                ctx.strokeStyle = axisY.color;
                var length = _axisX.data.length;
                var isFirst = true;
                for (var k = 1; k < length; k++) {
                    var xValue = (k - 1) * _axisX.koef;
                    var yValue = _height + (axisY.data[k] - axisY.min) * axisY.koef;
                    if (isFirst) {
                        ctx.moveTo(xValue, yValue);
                        isFirst = false;
                    } else {
                        ctx.lineTo(xValue, yValue);
                    }
                }


                ctx.stroke();
            }

            ctx.fillStyle = "rgba(240, 240, 240, 0.6)"; //todo config
            ctx.fillRect(0, _navigationTop, _startZoom, _navigationHeight);
            ctx.fillRect(_endZoom, _navigationTop, _width - _endZoom, _navigationHeight);

            //todo debug need remove
            ctx.fillStyle = "#222222";
            ctx.fillText(JSON.stringify(_navigation.mouse), 10, 50);
            ctx.fillText(JSON.stringify(_navigation.mouse.pressed), 10, 70);
        }
    }

    function prepareCaches(src) {
        if (!src)
            return;

        if (src.columns) {
            var _columnsLen = src.columns.length;
            for (var i = 0; i < _columnsLen; i++) {
                var _column = src.columns[i];
                var _dataLen = _column.length;
                var _max = Number.MIN_SAFE_INTEGER;
                var _min = Number.MAX_SAFE_INTEGER;
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
                    _xAxisDataRef = {
                        data: _column,
                        min: _min,
                        max: _max,
                        koef: _width / (_dataLen - 1)
                    };
                    _navigation.zoom.end = (_dataLen - 1);
                    _navigation.zoom.start = _navigation.zoom.end - (_navigation.zoom.end) * DEFAULT_NAVIGATION_WIDTH_PERCENT / 100;
                } else {
                    _yAxisDataRef.push(
                        {
                            alias: _column[0],
                            data: _column, //without realloc mem
                            color: DEFAULT_COLOR,
                            type: DEFAULT_TYPE,
                            name: _column[0],
                            min: _min,
                            max: _max,
                            koef: -_navigationHeight / (_max - _min) //negate for canvas
                        });
                }
            }
        }

        function assignAxisProperty(source, field) {
            if (source) {
                var _columnsLen = _yAxisDataRef.length;
                for (var axis in source) {
                    if (source.hasOwnProperty(axis)) {
                        var type = source[axis];
                        for (var i = 0; i < _columnsLen; i++) {
                            var _yAxisRef = _yAxisDataRef[i];
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
            _needRedraw = true;
        }
    }

    var _mainCtx = _mainCanvas.getContext("2d"),
        _frameContext = _frameCanvas.getContext("2d");

    function render() {
        if (_needRedraw) {
            _needRedraw = false;
            redrawFrame(_frameContext);
        }
        _mainCtx.clearRect(0, 0, _width, _height);
        _mainCtx.drawImage(_frameCanvas, 0, 0, _width, _height);
        requestAnimationFrame(render);
    }

    render();
    return {
        draw: draw
    }
};

