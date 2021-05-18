(function() {
    // From https://gist.github.com/borismus/1032746
    window.convertDataURIToBinary = function (base64String) {
        var raw = window.atob(base64String);
        var rawLength = raw.length;
        var array = new Uint8Array(new ArrayBuffer(rawLength));

        for(i = 0; i < rawLength; i++) {
            array[i] = raw.charCodeAt(i);
        }
        return array;
    }
})();
