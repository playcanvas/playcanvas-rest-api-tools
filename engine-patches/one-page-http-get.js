(function () {
    // We pass the config as an object instead of a Base64 string to save file size
    // This patches the http get function to return immediately if the URL is already an object
    var oldGet = pc.Http.prototype.get;

    pc.Http.prototype.get = function get(url, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = {};
        }

        // If the url is an object, just return it
        if (typeof(url) === 'object') {
            callback(null, url);
            return;
        }

        oldGet.call(this, url, options, callback);
    }
})();
