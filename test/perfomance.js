var PerfomanceMeter = function () {
    "use strict";

    var uIBtnRadius2 = 40 * window.devicePixelRatio;
    var envSmallTextHeight = parseInt(16 * 0.8 * window.devicePixelRatio);
    var uIGlobalPadding = 5 * window.devicePixelRatio;

    function measureDurations(context) {
        try {
            performance.measure("total", this.start, this.end);
            performance.measure("animation", this.start, this.animation);
            performance.measure("calcSelectionFactors", this.animation, this.calcSelectionFactors);
            performance.measure("drawNavigatorLayer", this.calcSelectionFactors, this.drawNavigatorLayer);
            performance.measure("drawSeries", this.drawNavigatorLayer, this.drawSeries);
            performance.measure("drawNavigatorLayerB", this.drawSeries, this.drawNavigatorLayerB);
            performance.measure("drawSeriesLegend", this.drawNavigatorLayerB, this.drawSeriesLegend);
            performance.measure("end", this.drawPressHighlight, this.end);

            var measures = performance.getEntriesByType("measure");

            var y = 50;
            context.fillStyle = "#777777";
            context.globalAlpha = 0.3;

            for (var measureIndex in measures) {
                var meas = measures[measureIndex];
                context.fillText(meas.name + " " + meas.duration.toFixed(4), uIBtnRadius2, y);
                y = y + envSmallTextHeight + uIGlobalPadding;
            }
        } catch (e) {

        }
        performance.clearMarks();
        performance.clearMeasures();
    }

    function mark(alias) {
        performance.mark(alias);
    }

    return {
        mark: mark,
        measureDurations: measureDurations,
        start: "start",
        animation: "animation",
        calcSelectionFactors: "calcSelectionFactors",
        drawNavigatorLayer: "drawNavigatorLayer",
        drawSeries: "drawSeries",
        drawNavigatorLayerB: "drawNavigatorLayerB",
        drawSeriesLegend: "drawSeriesLegend",
        drawPressHighlight: "drawPressHighlight",
        end: "end"
    };
};



