(function () {
    pc.Application.prototype.resizeCanvas = function (width, height) {
        if (!this._allowResize) return; // prevent resizing (e.g. if presenting in VR HMD)

        // prevent resizing when in XR session
        if (this.xr && this.xr.session)
            return;

        var windowWidth = window.innerWidth;
        var windowHeight = window.innerHeight;

        if (window.mraid) {
            var mraidSize = mraid.getMaxSize();
            windowWidth = mraidSize.width;
            windowHeight = mraidSize.height;
        }

        if (this._fillMode === pc.FILLMODE_KEEP_ASPECT) {
            var r = this.graphicsDevice.canvas.width / this.graphicsDevice.canvas.height;
            var winR = windowWidth / windowHeight;

            if (r > winR) {
                width = windowWidth;
                height = width / r;
            } else {
                height = windowHeight;
                width = height * r;
            }
        } else if (this._fillMode === pc.FILLMODE_FILL_WINDOW) {
            width = windowWidth;
            height = windowHeight;
        }
        // OTHERWISE: FILLMODE_NONE use width and height that are provided

        this.graphicsDevice.canvas.style.width = width + 'px';
        this.graphicsDevice.canvas.style.height = height + 'px';

        this.updateCanvasSize();

        // return the final values calculated for width and height
        return {
            width: width,
            height: height
        };
    }
})();
