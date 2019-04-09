var Test = function (pref) {
    "use strict";

    function setValue(v) {
        console.log(pref+" "+v);
    }

    return {
        setValue:  setValue
    };
};



var a = new Test("A");
var b = new Test("B");


var Animator = function () {

    var iterator = 1;

    function animate(callBack) {
        callBack(iterator++);
    }

    return {
        animate: animate
    };
}

var animator = new Animator();

animator.animate(a.setValue);
animator.animate(b.setValue);

