var PerfomanceMeter = function () {
    "use strict";

    var uIBtnRadius2 = 40 * window.devicePixelRatio;
    var envSmallTextHeight = parseInt(16 * 0.8 * window.devicePixelRatio);
    var uIGlobalPadding = 5 * window.devicePixelRatio;


    var extLog = [];

    var logsContainer = document.getElementById("logs");


    function logError(e) {
        var item = document.createElement("div");
        item.innerHTML = e + "";
        item.style.color = "red";
        logsContainer.appendChild(item);
    }

    console.error = function (e) {
        logError(e);
    }
    window.onerror = logError;



    function measureDurations(context, charts) {
        try {
            performance.measure("total", this.start, this.end);
            performance.measure("animation", this.start, this.animation);
            performance.measure("calcSelectionFactors", this.animation, this.calcSelectionFactors);
            performance.measure("drawSeries", this.calcSelectionFactors, this.drawSeries);
            performance.measure("drawFilterLayer", this.drawSeries, this.drawFilterLayer);
            performance.measure("end", this.drawFilterLayer, this.end);

            var measures = performance.getEntriesByType("measure");

            var y = 50;
            context.fillStyle = "#777777";
            context.globalAlpha = 0.6;

            for (var measureIndex in measures) {
                var meas = measures[measureIndex];
                context.fillText(meas.name + " " + meas.duration.toFixed(4), uIBtnRadius2, y);
                y = y + envSmallTextHeight + uIGlobalPadding;
            }


            context.fillText("filter.factorX" + " " + charts[0].getFilterAxis().getFactorX(), uIBtnRadius2, y);
            y = y + envSmallTextHeight + uIGlobalPadding;

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
        drawSeries: "drawSeries",
        drawFilterLayer: "drawFilterLayer",
        drawPressHighlight: "drawPressHighlight",
        end: "end"
    };
};



