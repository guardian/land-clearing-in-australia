import * as d3 from 'd3'
const GeoTIFF = require('geotiff/dist/geotiff.bundle.js');

export default class Canvasizer {

	constructor(path, bbox) {

		var self = this

		this.path = path

		this.bbox = bbox

		this.canvas = document.createElement('canvas');

		this.context = this.canvas.getContext('2d');

		this.projection = d3.geoMercator()
                .scale(1)
                .translate([0,0])
	}

	async render() {

		var self = this

		var tiff = await GeoTIFF.fromUrl(self.path);

		var image = await tiff.getImage();

	    this.tiffWidth = await image.getWidth();

	    this.tiffHeight = await image.getHeight();

		this.canvas.width = this.tiffWidth;

		this.canvas.height = this.tiffHeight;

		this.width = this.tiffWidth

		this.height = this.tiffHeight

		console.log(`Canvas width: ${this.width}, Canvas height: ${this.height}`)

        this.projection.fitSize([self.width, self.height], self.bbox);

	    var values = (await image.readRasters())[0]

		var tiepoint = image.getTiePoints()[0];

		var pixelScale = image.getFileDirectory().ModelPixelScale;

		var geoTransform = [ tiepoint.x, pixelScale[0], 0, tiepoint.y, 0, -1 * pixelScale[1] ];

		var invGeoTransform = [ -geoTransform[0] / geoTransform[1], 1 / geoTransform[1],0, -geoTransform[3] / geoTransform[5],0,1 / geoTransform[5] ];

		self.contours = d3.contours()
		    .size([self.tiffWidth, self.tiffHeight])
		    .smooth(false)
		    .thresholds(20)

		var data = Array.from(self.contours(values), d => d)

		data = data.reverse()

		data.pop()

		for (let item of data) {

			for (let coordinates of item.coordinates) {

		        for (let a of coordinates) {

		        	for (var i = 0; i < a.length; i++) {

		        		a[i] = self.projection.invert(a[i])

		        	}
		        }
			}
		}

		var results = await data

		return results

	}

}

