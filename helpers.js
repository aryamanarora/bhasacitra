var stringToColour = function(str) {
    str += 'jf'
    var hash = 0
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    var colour = '#'
    for (var i = 0; i < 3; i++) {
        var value = (hash >> (i * 8)) & 0xFF
        colour += ('00' + value.toString(16)).substr(-2)
    }
    return colour
}

var averageRGB = (function () {
    // Keep helper stuff in closures
    var reSegment = /[\da-z]{2}/gi;

    // If speed matters, put these in for loop below
    function dec2hex(v) {return v.toString(16);}
    function hex2dec(v) {return parseInt(v,16);}

    return function (c1, c2, v1 = 1, v2 = 1) {
    var sum = v1 + v2
    v1 /= sum
    v2 /= sum
    // Split into parts
    var b1 = c1.match(reSegment);
    var b2 = c2.match(reSegment);
    var t, c = [];

    // Average each set of hex numbers going via dec
    // always rounds down
    for (var i=b1.length; i;) {
        var a = hex2dec(b1[--i])
        var b = hex2dec(b2[i])
        t = dec2hex(Math.round(a * v1 + b * v2));
        // Add leading zero if only one character
        c[i] = t.length == 2? '' + t : '0' + t; 
    }
    return  c.join('');
    }
}());

function calculateRadius(number) {
    return Math.min(15, Math.log(1.5 + number) * 5)
}