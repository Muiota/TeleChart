/*jslint browser: true*/
/*global  */
var TeleChart = function (ctxId) {
    "use strict";

    var DEFAULT_COLOR = "#3DC23F";
    var NAVIGATION_HEIGHT_PERCENT = 20;

    var _container = document.getElementById(ctxId),
        _width = _container.offsetWidth,
        _height = _container.offsetHeight,
        _navigationHeight = parseInt(_width * NAVIGATION_HEIGHT_PERCENT / 100),
        _needRedraw = true,
        _mainCanvas = createCanvas(_width, _height, "main"),
        _frameCanvas = createCanvas(_width, _height, "frame"),
        _xAxisDataRef = null,
        _yAxisDataRef = [];

    _container.appendChild(_mainCanvas);

    function createCanvas(width, height, postfix) {
        var canvas = document.createElement('canvas');
        canvas.id = "Layer_" + postfix;
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    _mainCanvas.style.border = "1px solid"; //todo

    var _mainCtx = _mainCanvas.getContext("2d"),
        _frameContext = _frameCanvas.getContext("2d"),
        _data = null;

    function redrawFrame(ctx) {
        ctx.clearRect(0, 0, _width, _height);
        if (_yAxisDataRef && _yAxisDataRef.length) {
            var _columnsLen = _yAxisDataRef.length;
            var axisX = _xAxisDataRef;
            for (var i = 0; i < _columnsLen; i++) {
                var axisY = _yAxisDataRef[i];
                ctx.beginPath();
                ctx.strokeStyle = axisY.color;
                var length = axisX.data.length;
                var isFirst = true;
                for (var k = 1; k < length; k++) {
                    var xValue = (k - 1) * axisX.koef;
                        var yValue = _height  + (axisY.data[k] - axisY.min) * axisY.koef;
                        if (isFirst) {
                            ctx.moveTo(xValue, yValue);
                            isFirst = false;
                        } else {
                            ctx.lineTo(xValue, yValue);
                        }
                    }


                ctx.stroke();

                ctx.fillStyle = "rgba(240, 240, 240, 0.5)";
                ctx.fillRect(0, _height - _navigationHeight, _width, _navigationHeight);
            }

        }
    }

    function prepareCaches() {
        if (!_data)
            return;

        if (_data.columns) {
            var _columnsLen = _data.columns.length;
            for (var i = 0; i < _columnsLen; i++) {
                var _column = _data.columns[i];
                var _dataLen = _column.length;
                var _max = Number.MIN_SAFE_INTEGER;
                var _min = Number.MAX_SAFE_INTEGER;
                for (var k = 1; k < _dataLen; k++) {
                    var _elementVal = _column[k];
                    if (_elementVal > _max) {
                        _max = _elementVal;
                    } if (_elementVal < _min) {
                        _min = _elementVal;
                    }
                }
                _dataLen
                if (_column[0] === "x") {
                    _xAxisDataRef = {
                        data:_column,
                        min: _min,
                        max: _max,
                        koef: _width / (_dataLen - 1)
                    };
                } else {
                    _yAxisDataRef.push(
                        {
                            alias: _column[0],
                            data: _column, //without realloc mem
                            color: DEFAULT_COLOR,
                            min: _min,
                            max: _max,
                            koef: - _navigationHeight / (_max - _min)
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

        assignAxisProperty(_data.types, "type");
        assignAxisProperty(_data.colors, "color");
        assignAxisProperty(_data.names, "name");
    }

    function draw(data) {
        if (data) {
            _data = data;
            prepareCaches();
            _needRedraw = true;
        }
    }

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

/*
TeleChart.prototype.render = function() {
//<canvas id="myCanvas" width="300" height="150" style="border:1px solid #d3d3d3;">
//Your browser does not support the HTML5 canvas tag.</canvas>
var c = document.getElementById("myCanvas");
var ctx = c.getContext("2d");
ctx.beginPath();
ctx.moveTo(0, 0);
ctx.lineTo(300, 150);
ctx.stroke();
}

TeleChart.prototype.greet = function() {
  if (this.canTalk) {
    console.log('Hi, I am ' + this.name);
  }
}; */
