if (!Number.MAX_SAFE_INTEGER) {
    Number.MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;
}

if (!Number.MIN_SAFE_INTEGER) {
    Number.MIN_SAFE_INTEGER = -(Math.pow(2, 53) - 1);
}


function getJSONP(url, callbackName, callback) {
    var ud = '_' + +new Date,
        script = document.createElement('script'),
        head = document.getElementsByTagName('head')[0]
            || document.documentElement;

    window[callbackName] = function (data) {
        head.removeChild(script);
        delete window[callbackName];
        callback && callback(data);
    };

    script.src = url + '?callback=' + ud;
    head.appendChild(script);

}
