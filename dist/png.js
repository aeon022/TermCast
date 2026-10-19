"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodePng = encodePng;
const resvg_js_1 = require("@resvg/resvg-js");
const svg_1 = require("./renderer/svg");
const gif_1 = require("./gif");
/** Renders one frame (normally the last) as a PNG; `scale` 2 doubles the pixel size for sharp images on retina screens. */
function encodePng(frame, options, scale = 1) {
    if (!(scale >= 0.25 && scale <= 8))
        throw new Error('scale must be between 0.25 and 8');
    const svg = (0, svg_1.renderGridFrame)(frame, options);
    const resvg = new resvg_js_1.Resvg(svg, {
        font: (0, gif_1.resolveMonospaceFontOptions)(),
        fitTo: scale === 1 ? { mode: 'original' } : { mode: 'zoom', value: scale }
    });
    return Buffer.from(resvg.render().asPng());
}
