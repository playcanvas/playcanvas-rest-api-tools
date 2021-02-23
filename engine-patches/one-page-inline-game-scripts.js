(function () {
    pc.ScriptHandler.prototype._loadScript = function (url, callback) {
        var head = document.head;
        var element = document.createElement('script');
        this._cache[url] = element;

        // use async=false to force scripts to execute in order
        element.async = false;

        // Decode the url from base64 to text
        var index = url.indexOf(',');
        var base64 = url.slice(index + 1);
        var data = window.atob(base64);

        element.innerText = data;
        head.appendChild(element);

        callback(null, url, element);
    };
})();