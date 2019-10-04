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

				if (fs.existsSync(filepath)) {

					app.data(filepath)

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

	data: function(filepath) {

		app.filterPlaces = places.features.filter(function(d){ 
			return d.properties.scalerank < 3
		});

		app.makeMap(filepath)

	},

	makeMap: async function(filepath) {

		var tiff = await geotiff.fromFile(filepath);

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

		var color = d3.scaleSequential(d3.extent(values), d3.interpolateMagma)

		function scale(scaleFactor) {
			
		    return d3.geoTransform({
		        point: function(x, y) {
		            this.stream.point(x * scaleFactor, y  * scaleFactor);
		        }
		    });
		}


		var projection = d3.geoMercator()

		var path = d3.geoPath().projection(projection)

		var chart = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 ${tiffWidth} ${tiffHeight}" style="enable-background:new 0 0 ${tiffWidth} ${tiffHeight};" xml:space="preserve">
					
					<style type="text/css">

						.tree-0 {
							fill:none;
							display: none;
						}

						.tree-17 {
						  visibility: hidden;
						  animation: 1s show infinite;
						  fill: red;
						  display: none;
						}

						.tree-16 {
						  visibility: hidden;
						  animation: 1s show infinite;
						  animation-delay: 0.058s;
						  fill: yellow;
						}

						.tree-15 {
						  visibility: hidden;
						  animation: 1s show infinite;
						  animation-delay: 0.116s;
						  fill: pink;
						}

						.tree-14 {
						  visibility: hidden;
						  animation: 1s show infinite;
						  animation-delay: 0.174s;
						  fill: green;
						}

						.tree-13 {
						  visibility: hidden;
						  animation: 1s show infinite;
						  animation-delay: 0.232s;
						  fill: orange;
						}

						.tree-12 {
						  visibility: hidden;
						  animation: 1s show infinite;
						  animation-delay: 0.290s;
						  fill: red;
						}

						.tree-11 {
						  visibility: hidden;
						  animation: 1s show infinite;
						  animation-delay: 0.348s;
						  fill: red;
						}

						.tree-10 {
						  visibility: hidden;
						  animation: 1s show infinite;
						  animation-delay: 0.406s;
						  fill: red;
						}

						.tree-9 {
						  visibility: hidden;
						  animation: 1s show infinite;
						  animation-delay: 0.464s;
						  fill: red;
						}

						.tree-8 {
						  visibility: hidden;
						  animation: 1s show infinite;
						  animation-delay: 0.522s;
						  fill: red;
						}

						.tree-7 {
						  visibility: hidden;
						  animation: 1s show infinite;
						  animation-delay: 0.580s;
						  fill: red;
						}

						.tree-6 {
						  visibility: hidden;
						  animation: 1s show infinite;
						  animation-delay: 0.638s;
						  fill: red;
						}

						.tree-5 {
						  visibility: hidden;
						  animation: 1s show infinite;
						  animation-delay: 0.696s;
						  fill: red;
						}

						.tree-4 {
						  visibility: hidden;
						  animation: 1s show infinite;
						  animation-delay: 0.754s;
						  fill: red;
						}

						.tree-3 {
						  visibility: hidden;
						  animation: 1s show infinite;
						  animation-delay: 0.812s;
						  fill: red;
						}

						.tree-2 {
						  visibility: hidden;
						  animation: 1s show infinite;
						  animation-delay: 0.870s;
						  fill: red;
						}

						.tree-1 {
						  visibility: hidden;
						  animation: 1s show infinite;
						  animation-delay: 0.928s;
						  fill: red;
						}

						@keyframes show {
						  0%   { visibility: visible;}
						  12.5%  { visibility: visible; }
						  12.6%  { visibility: hidden; }
						  100% { visibility: hidden; }
						}

						.annual {
							font-size: 2em;
						}

					</style>

					<defs>
						<pattern id="queensland" x="0" y="0" height="100%" width="100%" viewBox="0 0 500 500">
							<image x="0" y="0" width="500" height="500" xlink:href="queensland.png"></image>
						</pattern>
					</defs>
					<g>
					<rect x="0" y="0" width="${tiffWidth}" height="${tiffHeight}" fill="url(#queensland)"/>

					${ Array.from(app.filterPlaces, (d) => {
						var point = app.convertGeoToPixel(d.properties.latitude,d.properties.longitude);
						console.log(point.x);
						return (point.x > 0 && point.x < tiffWidth && point.y > 0 && point.y < tiffWidth) ? `<text x="${point.x}" y="${point.y}" dy="-7" text-anchor="start" style="fill: black;">${d.properties.name}</text>` : '' ;
					})}

				  	</g>
				</svg>`

				app.create(chart)

	},

	convertGeoToPixel: function(latitude, longitude,
	                    mapWidth=1000, // in pixels
	                    mapHeight=1000, // in pixels
	                    mapLngLeft=136.511993, // in degrees. the longitude of the left side of the map (i.e. the longitude of whatever is depicted on the left-most part of the map image)
	                    mapLngRight=156.990509, // in degrees. the longitude of the right side of the map
	                    mapLatBottom=-29.841984) // in degrees.  the latitude of the bottom of the map
	  {

	  	//136.511993,-29.841984,156.990509,-9.493932

	    var self = this
	    const mapLatBottomRad = mapLatBottom * Math.PI / 180
	    const latitudeRad = latitude * Math.PI / 180
	    const mapLngDelta = (mapLngRight - mapLngLeft)

	    const worldMapWidth = ((mapWidth / mapLngDelta) * 360) / (2 * Math.PI)
	    const mapOffsetY = (worldMapWidth / 2 * Math.log((1 + Math.sin(mapLatBottomRad)) / (1 - Math.sin(mapLatBottomRad))))

	    const x = (longitude - mapLngLeft) * (mapWidth / mapLngDelta)
	    const y = mapHeight - ((worldMapWidth / 2 * Math.log((1 + Math.sin(latitudeRad)) / (1 - Math.sin(latitudeRad)))) - mapOffsetY)

	    return {x, y} // the pixel x,y value of this point on the map image
	  },


    create: function(data) {

        fs.writeFile("svg/queensland.svg", data, function(err) {

            if(err) {
                console.log(err);
            }

            console.log("Your SVG has been created")

        }); 

    }

}

app.precheck(process.argv[2])