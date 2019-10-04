var fs = require('fs')
var geotiff = require('geotiff')
var epsg = require('epsg-to-proj')
var extents = require('geotiff-extents')
var turf = require("@turf/turf")
var { convert } = require('geojson2shp')
var d3 = require('d3')
//const fetch = require('node-fetch');
//const Bluebird = require('bluebird');
var states = require('./data/au-states.json')
var places = require('./data/places.json')
//fetch.Promise = Bluebird;


var app = {

	precheck: function(filepath) {

		if (filepath!=undefined) {

			try {

				if (fs.existsSync(`geotiff/${filepath}.tif`)) {

					app.filepath = filepath

					app.create(filepath)

				} else {

					console.error("Not valid")

				}

			} catch(err) {

				console.error(err)

			}

		} else {

			console.log("Nothing to see here")

		}

	},

	create: async function(filepath) {

		var width = 3000

		var tiff = await geotiff.fromFile(`geotiff/${filepath}.tif`);

		var image = await tiff.getImage();

	    var tiffWidth = await image.getWidth();

	    var tiffHeight = await image.getHeight();

	    console.log(`${tiffWidth} - ${tiffHeight}`)

	    var values = (await image.readRasters())[0]

		var tiepoint = image.getTiePoints()[0];

		var pixelScale = image.getFileDirectory().ModelPixelScale;

		var geoTransform = [ tiepoint.x, pixelScale[0], 0, tiepoint.y, 0, -1 * pixelScale[1] ];

		var invGeoTransform = [ -geoTransform[0] / geoTransform[1], 1 / geoTransform[1],0, -geoTransform[3] / geoTransform[5],0,1 / geoTransform[5] ];

		// n = width, m = height

		var contours = d3.contours()
		    .size([tiffWidth, tiffHeight])
		    .smooth(false)
		    .thresholds(20)

		var ratio = width / tiffWidth

		var path = d3.geoPath().projection(app.scale(ratio)); //var path = d3.geoPath(null, self.context).projection(app.scale(ratio));

		var data = Array.from(contours(values), d => d)

		data = data.reverse()

		data.pop()

		app.write(data)

	},

    scale: function(scaleFactor) {
    	
        return d3.geoTransform({
            point: function(x, y) {
                this.stream.point(x * scaleFactor, y  * scaleFactor);
            }
        });
    },

    write: function(data) {

        fs.writeFile(`json/canvas.json`, JSON.stringify(data), function(err) {

            if(err) {
                console.log(err);
            }

            console.log("Your JSON has been created")

        }); 

    }

}

app.precheck(process.argv[2])