var fs = require('fs')
var geotiff = require('geotiff')
var epsg = require('epsg-to-proj')
var extents = require('geotiff-extents')
var turf = require("@turf/turf")
var { convert } = require('geojson2shp')
var unzipper = require("unzipper")

/*
Use this script if you need to creat a bounding box
shapefile. You may need to a bounding box if you want 
to crop geotiffs to specific coordinates

If you want to create a bbox to match an existing geotiff...

Run from the command line

node create-bbox-shapefile name-of-tiff

If you want to create a bbox from specific coordinates you will need the
North west latitude, north west longitude, south east latitude, south east longitude
then update line 53... then

Run from the command line

node create-bbox-shapefile

*/

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

			app.bbox([104.671555,-7.237148,160.569992,-46.833892])
			
		}

	},

	getExtent: async function(filepath) {

		var tiff = await geotiff.fromFile(filepath);

		var image = await tiff.getImage();

		var fd = image.getFileDirectory()

		var gk = image.getGeoKeys()

		var extent = extents({
		  tiePoint: fd.ModelTiepoint,
		  pixelScale: fd.ModelPixelScale,
		  width: fd.ImageWidth,
		  height: fd.ImageLength,
		  proj: require('proj4'),
		  from: epsg[gk.ProjectedCSTypeGeoKey || gk.GeographicTypeGeoKey],
		  to: epsg[3857]
		})

		app.bbox([ extent.upperLeft[0], extent.upperLeft[1], extent.lowerRight[0], extent.lowerRight[1] ])

	},

	bbox: function(array) {

		var poly = turf.bboxPolygon(array);

		app.bounder(poly)

	},

    bounder: async function(bboxPolygon) {    

        const options = {

          layer: 'bbox',

          targetCrs: 3857

        }

        const featureCollection = { type: 'FeatureCollection', crs: { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::3857" } }, features: [ bboxPolygon ] }

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