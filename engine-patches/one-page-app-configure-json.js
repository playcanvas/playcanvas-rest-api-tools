(function () {
    pc.Application.prototype.configure = function (json, callback) {
        const props = json.application_properties;
        const scenes = json.scenes;
        const assets = json.assets;

        this._parseApplicationProperties(props, (err) => {
            this._parseScenes(scenes);
            this._parseAssets(assets);
            if (!err) {
                callback(null);
            } else {
                callback(err);
            }
        });
    };
})();
