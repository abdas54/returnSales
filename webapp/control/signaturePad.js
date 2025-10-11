sap.ui.define([
  "sap/ui/core/Control"
], function(Control) {
  "use strict";

  return Control.extend("signature.control.SignaturePad", {
    metadata: {
      properties: {
        width: { type: "sap.ui.core.CSSSize", defaultValue: "400px" },
        height: { type: "sap.ui.core.CSSSize", defaultValue: "150px" }
      }
    },

    renderer: function(oRm, oControl) {
      oRm.write("<canvas");
      oRm.writeControlData(oControl);
      oRm.addStyle("border", "1px solid #000");
      oRm.addStyle("width", oControl.getWidth());
      oRm.addStyle("height", oControl.getHeight());
      oRm.writeStyles();
      oRm.write("></canvas>");
    },

    onAfterRendering: function () {
      const canvas = this.getDomRef();
      this.ctx = canvas.getContext("2d");
      this.drawing = false;
      canvas.width = parseInt(this.getWidth());
      canvas.height = parseInt(this.getHeight());

      canvas.addEventListener("mousedown", this._startDrawing.bind(this));
      canvas.addEventListener("mousemove", this._draw.bind(this));
      canvas.addEventListener("mouseup", this._stopDrawing.bind(this));
      canvas.addEventListener("mouseleave", this._stopDrawing.bind(this));

    // Use Pointer Events — works with pen, touch, and mouse
      canvas.addEventListener("pointerdown", this._startDrawing.bind(this));
      canvas.addEventListener("pointermove", this._draw.bind(this));
      canvas.addEventListener("pointerup", this._stopDrawing.bind(this));
      canvas.addEventListener("pointerleave", this._stopDrawing.bind(this));

        canvas.addEventListener("touchstart", this._startDrawing.bind(this));
      canvas.addEventListener("touchmove", this._draw.bind(this));
      canvas.addEventListener("touchend", this._stopDrawing.bind(this));

   
    },

    _startDrawing: function (e) {
      this.drawing = true;
      this.ctx.beginPath();
      this.ctx.moveTo(e.offsetX, e.offsetY);
    },

    _draw: function (e) {
      if (!this.drawing) return;
      this.ctx.lineTo(e.offsetX, e.offsetY);
      this.ctx.stroke();
    },

    _stopDrawing: function () {
      this.drawing = false;
    },

    clear: function () {
      const canvas = this.getDomRef();
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    },

    getSignature: function () {
      const canvas = this.getDomRef();
      return canvas.toDataURL("image/png");
    }
  });
});
