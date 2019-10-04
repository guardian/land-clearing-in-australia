var fs = require('fs')
var geotiff = require('geotiff')
var epsg = require('epsg-to-proj')
var extents = require('geotiff-extents')
var turf = require("@turf/turf")
var { convert } = require('geojson2shp')
var unzipper = require("unzipper")

var app = {

	precheck: function(filepath) {

		if (filepath!=undefined) {

			try {

				if (fs.existsSync(filepath)) {

					app.getExtent(filepath)

				} else {

					console.error("Not valid")

				}

			} catch(err) {

				console.error(err)

			}

		} else {

			console.log("General")

			app.bbox([104.671555,-7.237148,160.569992,-46.833892])

			//[[[104.671555,-7.237148],[160.569992,-7.237148],[160.569992,-46.833892],[104.671555,-46.833892],[104.671555,-7.237148]]]
			
		}

	},

	getExtent: async function(filepath) {

		var tiff = await geotiff.fromFile(filepath);

		var image = await tiff.getImage();

		var fd = image.getFileDirectory()

		var gk = image.getGeoKeys()

		console.log(gk)

		var extent = extents({
		  tiePoint: fd.ModelTiepoint,
		  pixelScale: fd.ModelPixelScale,
		  width: fd.ImageWidth,
		  height: fd.ImageLength,
		  proj: require('proj4'),
		  from: epsg[gk.ProjectedCSTypeGeoKey || gk.GeographicTypeGeoKey],
		  to: epsg[4326]
		})

		//app.bbox([ extent.upperLeft[0], extent.upperLeft[1], extent.lowerRight[0], extent.lowerRight[1] ])

		/*
		Queensland: 136.511993,-29.841984,156.990509,-9.493932
		NSW: 139.916725,-38.927499,155.385475,-27.257224
		*/

		//app.bbox([136.511993,-29.841984,156.990509,-9.493932])

		app.bbox([142.713261,-35.973839,156.160526,-21.999400])

	},

	bbox: function(array) {

		var poly = turf.bboxPolygon(array);

		app.bounder(poly)

	},

    bounder: async function(bboxPolygon) {    

        const options = {

          layer: 'bbox',

          targetCrs: 4326

        }

        const featureCollection = { type: 'FeatureCollection', crs: { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::4326" } }, features: [ bboxPolygon ] }


        console.log(JSON.stringifeatureCollection)

        await convert(featureCollection, 'bbox.zip', options).then( (done) => {

            fs.createReadStream(`bbox.zip`)
                .pipe(unzipper.Extract({ path: 'bbox' }))
                    .on('finish',(cb => {
                        console.log("Unzipped bbox")
                    }));


        })

    }

}

app.precheck(process.argv[2])