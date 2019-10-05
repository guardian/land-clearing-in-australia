const fs = require('fs')
const gdal = require("gdal");


/*
Use this script to get info about a geotiff

Run from the command line

node get-info-about-geotiff name-of-tiff
*/


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


