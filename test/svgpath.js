const ARG_LENGTH = {
    a: 7,
    c: 6,
    h: 1,
    l: 2,
    m: 2,
    q: 4,
    s: 4,
    t: 2,
    v: 1,
    z: 0,
};

var logItem = "";
function log(v) {
    logItem = logItem.concat(v + ";\r\n");

}
const SEGMENT_PATTERN = /([astvzqmhlc])([^astvzqmhlc]*)/ig;

const NUMBER = /-?[0-9]*\.?[0-9]+(?:e[-+]?\d+)?/ig;

function parseValues(args) {
    const numbers = args.match(NUMBER);
    return numbers ? numbers.map(Number) : [];
}

/**
 * parse an svg path data string. Generates an Array
 * of commands where each command is an Array of the
 * form `[command, arg1, arg2, ...]`
 *
 * https://www.w3.org/TR/SVG/paths.html#PathDataGeneralInformation
 * @ignore
 *
 * @param {string} path
 * @returns {array}
 */
function parsePath(path) {
    const data = [];
    const p = String(path).trim();

    // A path data segment (if there is one) must begin with a "moveto" command
    if (p[0] !== 'M' && p[0] !== 'm') {
        return data;
    }



    p.replace(SEGMENT_PATTERN, (_, command, args) => {
        let type = command.toLowerCase();
    args = parseValues(args);

    // overloaded moveTo
    if (type === 'm' && args.length > 2) {
        data.push([command].concat(args.splice(0, 2)));
        type = 'l';
        command = command === 'm' ? 'l' : 'L';
    }

    // Ignore invalid commands
    if (args.length < ARG_LENGTH[type]) {
        return '';
    }

    data.push([command].concat(args.splice(0, ARG_LENGTH[type])));

    // The command letter can be eliminated on subsequent commands if the
    // same command is used multiple times in a row (e.g., you can drop the
    // second "L" in "M 100 200 L 200 100 L -100 -200" and use
    // "M 100 200 L 200 100 -100 -200" instead).
    while (args.length >= ARG_LENGTH[type] && args.length && ARG_LENGTH[type]) {
        data.push([command].concat(args.splice(0, ARG_LENGTH[type])));
    }

    return '';
});
    return data;
}

//=============================================================


function rotatePoint(point, angle) {
    const nx = (point.x * Math.cos(angle)) - (point.y * Math.sin(angle));
    const ny = (point.y * Math.cos(angle)) + (point.x * Math.sin(angle));
    point.x = nx;
    point.y = ny;
}

function translatePoint(point, dx, dy) {
    point.x += dx;
    point.y += dy;
}

    /**
     * Crates a Path2D polyfill object
     * @constructor
     * @ignore
     * @param {String} path
     */
    class Path2DPoly {
        constructor(path) {
            this.segments = [];
            if (path && path instanceof Path2DPoly) {
                this.segments.push(...path.segments);
            } else if (path) {
                this.segments = parsePath(path);
            }
        }
        addPath(path) {
            if (path && path instanceof Path2DPoly) {
                this.segments.push(...path.segments);
            }
        }
        moveTo(x, y) {
            this.segments.push(['M', x, y]);
        }
        lineTo(x, y) {
            this.segments.push(['L', x, y]);
        }
        arc(x, y, r, start, end, ccw) {
            this.segments.push(['AC', x, y, r, start, end, !!ccw]);
        }
        arcTo(x1, y1, x2, y2, r) {
            this.segments.push(['AT', x1, y1, x2, y2, r]);
        }
        closePath() {
            this.segments.push(['Z']);
        }
        bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
            this.segments.push(['C', cp1x, cp1y, cp2x, cp2y, x, y]);
        }
        quadraticCurveTo(cpx, cpy, x, y) {
            this.segments.push(['Q', cpx, cpy, x, y]);
        }
        rect(x, y, width, height) {
            this.segments.push(['R', x, y, width, height]);
        }
    }

    const cFill = window.CanvasRenderingContext2D.prototype.fill;
    const cStroke = window.CanvasRenderingContext2D.prototype.stroke;

    function buildPath(canvas, segments) {
        let endAngle;
        let startAngle;
        let largeArcFlag;
        let sweepFlag;
        let endPoint;
        let angle;
        let x;
        let x1;
        let y;
        let y1;
        let r;
        let b;
        let w;
        let h;
        let pathType;
        let centerPoint;
        let cpx;
        let cpy;
        let qcpx;
        let qcpy;
        let ccw;

         logItem = "";
        console.error("dsdsd");

        const currentPoint = { x: 0, y: 0 };

        // Reset control point if command is not cubic
        if (pathType !== 'S' && pathType !== 's' && pathType !== 'C' && pathType !== 'c') {
            cpx = null;
            cpy = null;
        }

        if (pathType !== 'T' && pathType !== 't' && pathType !== 'Q' && pathType !== 'q') {
            qcpx = null;
            qcpy = null;
        }

        canvas.beginPath();
        log("frameContext.beginPath()");
        for (let i = 0; i < segments.length; ++i) {
            const s = segments[i];
            pathType = s[0];
            switch (pathType) {
                case 'm':
                    x += s[1];
                    y += s[2];
                    canvas.moveTo(x, y);
                    log("frameContext.moveTo(" + x + ", " + y + ")");
                    break;
                case 'M':
                    x = s[1];
                    y = s[2];
                    canvas.moveTo(x, y);
                    log("frameContext.moveTo(" + x + ", " + y + ")");
                    break;
                case 'l':
                    x += s[1];
                    y += s[2];
                    canvas.lineTo(x, y);
                    log("frameContext.lineTo(" + x + ", " + y + ")");
                    break;
                case 'L':
                    x = s[1];
                    y = s[2];
                    canvas.lineTo(x, y);
                    log("frameContext.lineTo(" + x + ", " + y + ")");
                    break;
                case 'H':
                    x = s[1];
                    canvas.lineTo(x, y);
                    log("frameContext.lineTo(" + x + ", " + y + ")");
                    break;
                case 'h':
                    x += s[1];
                    canvas.lineTo(x, y);
                    log("frameContext.lineTo(" + x + ", " + y + ")");
                    break;
                case 'V':
                    y = s[1];
                    canvas.lineTo(x, y);
                    log("frameContext.lineTo(" + x + ", " + y + ")");
                    break;
                case 'v':
                    y += s[1];
                    canvas.lineTo(x, y);
                    log("frameContext.lineTo(" + x + ", " + y + ")");
                    break;
                case 'a':
                case 'A':
                    if (pathType === 'a') {
                        x += s[6];
                        y += s[7];
                    } else {
                        x = s[6];
                        y = s[7];
                    }

                    r = s[1];
                    // s[2] = 2nd radius in ellipse, ignore
                    // s[3] = rotation of ellipse, ignore
                    largeArcFlag = s[4];
                    sweepFlag = s[5];
                    endPoint = { x, y };
                    // translate all points so that currentPoint is origin
                    translatePoint(endPoint, -currentPoint.x, -currentPoint.y);

                    // angle to destination
                    angle = Math.atan2(endPoint.y, endPoint.x);

                    // rotate points so that angle is 0
                    rotatePoint(endPoint, -angle);

                    b = endPoint.x / 2;
                    // var sweepAngle = Math.asin(b / r);

                    centerPoint = { x: 0, y: 0 };
                    centerPoint.x = endPoint.x / 2;
                    if ((sweepFlag && !largeArcFlag) || (!sweepFlag && largeArcFlag)) {
                        centerPoint.y = Math.sqrt((r * r) - (b * b));
                    } else {
                        centerPoint.y = -Math.sqrt((r * r) - (b * b));
                    }
                    startAngle = Math.atan2(-centerPoint.y, -centerPoint.x);
                    endAngle = Math.atan2(endPoint.y - centerPoint.y, endPoint.x - centerPoint.x);

                    // rotate back
                    startAngle += angle;
                    endAngle += angle;
                    rotatePoint(endPoint, angle);
                    rotatePoint(centerPoint, angle);

                    // translate points
                    translatePoint(endPoint, currentPoint.x, currentPoint.y);
                    translatePoint(centerPoint, currentPoint.x, currentPoint.y);

                    canvas.arc(centerPoint.x, centerPoint.y, r, startAngle, endAngle, !sweepFlag);
                    log("frameContext.arc("+centerPoint.x+", "+ centerPoint.y+", "+ r+", "+ startAngle+", "+ endAngle+", "+ !sweepFlag +")");
                    break;
                case 'C':
                    cpx = s[3]; // Last control point
                    cpy = s[4];
                    x = s[5];
                    y = s[6];
                    canvas.bezierCurveTo(s[1], s[2], cpx, cpy, x, y);
                    log("frameContext.bezierCurveTo(" + s[1] + ", " + s[2] + ", " + cpx + ", " + cpy + ", " + x + ", " + y + ")");
                    break;
                case 'c':
                    canvas.bezierCurveTo(
                        s[1] + x,
                        s[2] + y,
                        s[3] + x,
                        s[4] + y,
                        s[5] + x,
                        s[6] + y
                    );
                    log("frameContext.bezierCurveTo(" +    ( s[1] + x)+ ", "+
                        (s[2] + y) +", "+
                        (s[3] + x)+", "+
                        (s[4] + y)+", "+
                        (s[5] + x)+", "+
                        (s[6] + y)+ ")");
                    cpx = s[3] + x; // Last control point
                    cpy = s[4] + y;
                    x += s[5];
                    y += s[6];
                    break;
                case 'S':
                    if (cpx === null || cpx === null) {
                        cpx = x;
                        cpy = y;
                    }

                    canvas.bezierCurveTo(
                        (2 * x) - cpx,
                        (2 * y) - cpy,
                        s[1],
                        s[2],
                        s[3],
                        s[4]
                    );
                    log("frameContext.bezierCurveTo(" +      ((2 * x) - cpx)+ ", "+
                        ((2 * y) - cpy)+ ", "+
                        s[1]+ ", "+
                        s[2]+ ", "+
                        s[3]+ ", "+
                        s[4]+ ")");

                    cpx = s[1]; // last control point
                    cpy = s[2];
                    x = s[3];
                    y = s[4];
                    break;
                case 's':
                    if (cpx === null || cpx === null) {
                        cpx = x;
                        cpy = y;
                    }

                    canvas.bezierCurveTo(
                        (2 * x) - cpx,
                        (2 * y) - cpy,
                        s[1] + x,
                        s[2] + y,
                        s[3] + x,
                        s[4] + y
                    );
                    log("frameContext.bezierCurveTo(" +   ((2 * x) - cpx)+ ", "+
                        ((2 * y) - cpy)+ ", "+
                        (s[1] + x)+ ", "+
                        (s[2] + y)+ ", "+
                        (s[3] + x)+ ", "+
                        (s[4] + y)+")");

                    cpx = s[1] + x; // last control point
                    cpy = s[2] + y;
                    x += s[3];
                    y += s[4];
                    break;
                case 'Q':
                    qcpx = s[1]; // last control point
                    qcpy = s[2];
                    x = s[3];
                    y = s[4];
                    canvas.quadraticCurveTo(qcpx, qcpy, x, y);
                    log("frameContext.quadraticCurveTo(" + qcpx+", "+ qcpy+", "+  x+", "+  y+")");
                    break;
                case 'q':
                    qcpx = s[1] + x; // last control point
                    qcpy = s[2] + y;
                    x += s[3];
                    y += s[4];
                    canvas.quadraticCurveTo(qcpx, qcpy, x, y);
                    log("frameContext.quadraticCurveTo(" + qcpx+", "+ qcpy+", "+  x+", "+  y+")");
                    break;
                case 'T':
                    if (qcpx === null || qcpx === null) {
                        qcpx = x;
                        qcpy = y;
                    }
                    qcpx = (2 * x) - qcpx; // last control point
                    qcpy = (2 * y) - qcpy;
                    x = s[1];
                    y = s[2];
                    canvas.quadraticCurveTo(qcpx, qcpy, x, y);
                    log("frameContext.quadraticCurveTo(" + qcpx+", "+ qcpy+", "+  x+", "+  y+")");
                    break;
                case 't':
                    if (qcpx === null || qcpx === null) {
                        qcpx = x;
                        qcpy = y;
                    }
                    qcpx = (2 * x) - qcpx; // last control point
                    qcpy = (2 * y) - qcpy;
                    x += s[1];
                    y += s[2];
                    canvas.quadraticCurveTo(qcpx, qcpy, x, y);
                    log("frameContext.quadraticCurveTo(" + qcpx+", "+ qcpy+", "+  x+", "+  y+")");
                    break;
                case 'z':
                case 'Z':
                    canvas.closePath();
                    log("frameContext.closePath()");
                    break;
                case 'AC': // arc
                    x = s[1];
                    y = s[2];
                    r = s[3];
                    startAngle = s[4];
                    endAngle = s[5];
                    ccw = s[6];
                    canvas.arc(x, y, r, startAngle, endAngle, ccw);
                    log("frameContext.arc("+x+", "+ y+", "+ r+", "+ startAngle+", "+ endAngle+", "+ ccw+")");
                    break;
                case 'AT': // arcTo
                    x1 = s[1];
                    y1 = s[2];
                    x = s[3];
                    y = s[4];
                    r = s[5];
                    canvas.arcTo(x1, y1, x, y, r);
                    log("frameContext.arc("+x1+", "+ y1+", "+ x+", "+ y+", "+ r+")");
                    break;
                case 'R': // rect
                    x = s[1];
                    y = s[2];
                    w = s[3];
                    h = s[4];
                    canvas.rect(x, y, w, h);
                    log("frameContext.rect(" + x + ", " + y + ", " + w + ", " + h + ")");
                    break;
                default:
                // throw new Error(`${pathType} is not implemented`); ?
            }

            currentPoint.x = x;
            currentPoint.y = y;
        }


    }

    window.CanvasRenderingContext2D.prototype.fill = function fill(...args) {
        let fillRule = 'nonzero';
        if (args.length === 0 || (args.length === 1 && typeof args[0] === 'string')) {
            cFill.apply(this, args);
            log("fill (" + args + ")")
            return;
        }
        if (arguments.length === 2) {
            fillRule = args[1];
        }
        const path = args[0];
        buildPath(this, path.segments);
  //  console.error("end");
        cFill.call(this, fillRule);
    log("fill (" + fillRule + ")")
    console.warn(logItem);
    };

    window.CanvasRenderingContext2D.prototype.stroke = function stroke(path) {
        if (!path) {
            cStroke.call(this);

            return;
        }
        buildPath(this, path.segments);
        cStroke.call(this);
        log("stroke ()");
    };

    window.Path2DPoly = Path2DPoly;


