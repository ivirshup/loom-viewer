import * as colors from '../js/colors';
import * as _ from 'lodash';
import { nMostFrequent, rndNorm, isArray } from '../js/util';

export function scatterplot(x, y, color, colorMode, logScaleColor, logScaleX, logScaleY) {
	return (context) => {
		if (!(isArray(x) &&
			isArray(y) &&
			isArray(color))) {
			return;
		}
		// avoid accidentally mutating source arrays
		x = x.slice(0);
		y = y.slice(0);
		color = color.slice(0);
		let { width, height, pixelRatio } = context;

		// Erase previous paint
		context.save();
		context.fillStyle = 'white';
		context.fillRect(0, 0, width, height);

		// Calculate some general properties
		// Make room for color legend on right
		width = (width - 200);

		// Scale of data
		let xmin = Math.min(...x);
		let xmax = Math.max(...x);
		let ymin = Math.min(...y);
		let ymax = Math.max(...y);

		// Log transform if requested
		if (logScaleX && logScaleY) {
			// if both axes are log scales, jitter in a
			// circle around the data instead of a box
			for (let i = 0; i < x.length; i++) {
				const r = rndNorm();
				const t = Math.PI * 2 * Math.random();
				x[i] = Math.log2(2 + x[i]) + r * Math.sin(t);
				y[i] = Math.log2(2 + y[i]) + r * Math.cos(t);
			}
			xmin = Math.log2(2 + xmin) - 1;
			xmax = Math.log2(2 + xmax) + 1;
			ymin = Math.log2(2 + ymin) - 1;
			ymax = Math.log2(2 + ymax) + 1;
		} else {
			if (logScaleX) {
				for (let i = 0; i < x.length; i++) {
					x[i] = Math.log2(2 + x[i]) + rndNorm();
				}
				xmin = Math.log2(1 + xmin) - 1;
				xmax = Math.log2(1 + xmax) + 1;
			}
			if (logScaleY) {
				for (let i = 0; i < y.length; i++) {
					y[i] = Math.log2(2 + y[i]) + rndNorm();
				}
				ymin = Math.log2(1 + ymin) - 1;
				ymax = Math.log2(1 + ymax) + 1;
			}
		}

		// Suitable radius of the markers
		const radius = Math.max(3, Math.sqrt(x.length) / 60) * pixelRatio;

		// Scale to screen dimensions and round to pixel position
		for (let i = 0; i < x.length; i++) {
			const xi = (x[i] - xmin) / (xmax - xmin) * (width - 2 * radius) + radius;
			x[i] = xi | 0;
		}
		for (let i = 0; i < y.length; i++) {
			const yi = (1 - (y[i] - ymin) / (ymax - ymin)) * (height - 2 * radius) + radius;
			y[i] = yi | 0;
		}

		const palette = (colorMode === 'Heatmap' ? colors.solar9 : colors.category20);

		// Calculate the color scale
		let mappedColor = Array.from(color);
		// Do we need to categorize the color scale?
		if (colorMode === 'Categorical' || !_.every(color, (c) => { return isFinite(c); })) {

			// Reserve palette[0] for all uncategorized items
			let cats = nMostFrequent(color, palette.length - 1).values;

			for (let i = 0; i < color.length; i++) {
				// Add one so the uncategorized become zero
				let idx = cats.indexOf(color[i]) + 1;
				mappedColor[i] = palette[idx];
			}

			// Draw the figure legend
			// Start at -1 which corresponds to
			// the "(other)" category, i.e. those
			// that didn't fit in the top 20
			const dotRadius = 2 * radius;
			const dotMargin = 10 * pixelRatio;
			const xDot = width + dotMargin + dotRadius;
			const xText = xDot + dotMargin + dotRadius;
			for (let i = -1; i < cats.length; i++) {
				let yDot = (i + 2) * (2 * dotRadius + dotMargin);
				context.beginPath();
				context.circle(xDot, yDot, dotRadius);
				context.closePath();
				// i+1 because white (other) is the first color
				// and i = 1 would be the first category
				context.fillStyle = palette[i + 1];
				context.fill();
				context.lineWidth = 0.25 * pixelRatio;
				context.strokeStyle = 'black';
				context.stroke();
				context.textStyle();
				context.textSize(10 * pixelRatio);
				if (i === -1) {
					context.fillText('(all other categories)', xText, yDot + 5 * pixelRatio);
				} else {
					context.fillText(cats[i], xText, yDot + 5 * pixelRatio);
				}
			}
		} else {
			let original_cmin = Math.min(...color);
			let original_cmax = Math.max(...color);
			mappedColor = Array.from(color);
			// Log transform if requested
			if (logScaleColor) {
				for (let i = 0; i < mappedColor.length; i++) {
					mappedColor[i] = Math.log2(color[i] + 1);
				}
			}

			// Map to the range of colors
			const cmin = Math.min(...mappedColor);
			const cmax = Math.max(...mappedColor);
			for (let i = 0; i < mappedColor.length; i++) {
				let j = Math.round((mappedColor[i] - cmin) / (cmax - cmin) * palette.length);
				let c = palette[j];
				mappedColor[i] = c;
			}

			// Draw the color legend
			const dotRadius = 2 * radius;
			const dotMargin = 10 * pixelRatio;
			const xDot = width + dotMargin + dotRadius;
			const xText = xDot + dotMargin + dotRadius;
			for (let i = 0; i < palette.length; i++) {
				let yDot = (i + 1) * (2 * dotRadius + dotMargin);
				context.beginPath();
				context.circle(xDot, yDot, dotRadius);
				context.closePath();
				// Invert it so max value is on top
				context.fillStyle = palette[palette.length - i - 1];
				context.fill();
				context.lineWidth = 0.25 * pixelRatio;
				context.strokeStyle = 'black';
				context.stroke();
				context.textStyle();
				context.textSize(10 * pixelRatio);
				if (i === 0) {
					context.fillText(parseFloat(original_cmax.toPrecision(3)), xText, yDot + 5 * pixelRatio);
				}
				if (i === palette.length - 1) {
					context.fillText(parseFloat(original_cmin.toPrecision(3)), xText, yDot + 5 * pixelRatio);
				}
			}
		}

		// Draw the scatter plot itself
		context.globalAlpha = 0.6;
		context.strokeStyle = 'black';
		context.lineWidth = 0.25;
		// Trick to draw by color, which is a lot faster on the HTML canvas element
		palette.forEach((current_color) => {
			context.beginPath();
			for (let i = 0; i < x.length; i++) {
				if (mappedColor[i] !== current_color) {
					continue;
				}
				context.circle(x[i], y[i], radius);
			}
			context.closePath();
			context.fillStyle = current_color;
			context.stroke();
			context.fill();
		});
		context.restore();
	};
}