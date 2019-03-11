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
