(function () {
    // Patch out supportsImageBitmap as that doesn't load some images when XHR is also patched out
    // We override the setting in configure before we load assets
    var oldAppConfigure = pc.Application.prototype.configure;
    pc.Application.prototype.configure = function (json, callback) {
        this.graphicsDevice.supportsImageBitmap = false;
        oldAppConfigure.call(this, json, callback);
    };

    pc.Http.prototype.get = function get(url, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = {};
        }

        var index = url.indexOf(',');
        var base64 = url.slice(index + 1);
        var data = window.atob(base64);

        if (url.startsWith('data:application/json') || options.responseType === pc.Http.ResponseType.JSON) {
            data = JSON.parse(data);
        } else if (url.startsWith('data:text/plain')) {
            // Do nothing
        } else {
            // Assume binary if not JSON
            var len = data.length;
            var bytes = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
                bytes[i] = data.charCodeAt(i);
            }
            data = bytes.buffer;
        }

        callback(null, data);
    }
})();
