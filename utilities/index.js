 const fs = require('fs')
//const geotiff = require('geotiff')
//const plotty = require('./libraries/plotty.min.js')
const gdal = require("gdal");
//const unzipper = require("unzipper")
//const turf = require("@turf/turf")
//const { convert } = require('geojson2shp')



var app = {

	precheck: function(filepath) {

		if (filepath!=undefined) {

			try {

				if (fs.existsSync(filepath)) {

					app.getInfo(filepath)

				} else {

					console.error("Not valid")

				}

			} catch(err) {

				console.error(err)

			}

		}

	},

	getInfo: async function(filepath) {

		console.error("File path: " + filepath)

		var dataset = gdal.open(filepath);
		 
		console.log("number of bands: " + dataset.bands.count());
		console.log("width: " + dataset.rasterSize.x);
		console.log("height: " + dataset.rasterSize.y);
		console.log("geotransform: " + dataset.geoTransform);
		console.log("srs: " + (dataset.srs ? dataset.srs.toWKT() : 'null'));

	}

}

app.precheck(process.argv[2])


