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

		var path = d3.geoPath()

		var label

		var labels = []

		var bboxes = {

			"queensland" : [136.511993, 156.990509, -29.841984],

			"nsw" : [139.916725, 155.385475, -38.927499],

			"australia" : [142.713261, 156.160526, -35.973839]

		}

		//139.916725,-38.927499,155.385475,-27.257224

		for (label of app.filterPlaces) {

			var point = app.convertGeoToPixel(label.properties.latitude, label.properties.longitude, tiffWidth, tiffHeight, bboxes[filepath][0], bboxes[filepath][1], bboxes[filepath][2]);

			point.name = label.properties.name

			if (point.x > 0 && point.x < tiffWidth && point.y > 0 && point.y < tiffWidth) {

				labels.push(point)

			}

		}

		var features = Array.from(contours(values), (d, i) => {

			console.log(d)
			return d
		})

		console.log(features.length)

		features.shift()

		features.reverse()

		var html =`<!DOCTYPE html>
					<html>
					<head>
						<title></title>
						<link rel="stylesheet" type="text/css" href="main.css">
						<script src="https://interactive.guim.co.uk/libs/iframe-messenger/iframeMessenger.js"></script>
					</head>
					<body>

						<div class="interactive-container offset">
						    <div class="row">
							    <div id="controls" class="main-col">
							            <div class="row figureTitle">
							            	Land clearing in Australia
							            </div>
							            <div class="row subTitle">
							            	Showing the location of massacres where six or more people died between 1794 and 1928. Circles are sized by the estimated number of deaths of both Indigenous people and colonial people. The colour of the circles changes from <span class="red">red</span> to <span class="blue">blue</span> as time passes. Data is incomplete with more sites still to be added, particularly in WA
							            </div>	
							    </div>
						    </div>
    

								<div id="app" class="interactive-wrapper">

									<svg id="map" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 ${tiffWidth} ${tiffHeight}" style="enable-background:new 0 0 ${tiffWidth} ${tiffHeight};" xml:space="preserve">
												
										<style type="text/css">

											.features {
												fill: none;
											}

										</style>

										<defs>
											<pattern id="${filepath}" x="0" y="0" height="100%" width="100%" viewBox="0 0 ${tiffWidth} ${tiffHeight}">
												<image x="0" y="0" width="${tiffWidth}" height="${tiffHeight}" xlink:href="${filepath}.png"></image>
											</pattern>
										</defs>

										<g>

										<rect x="0" y="0" width="${tiffWidth}" height="${tiffHeight}" fill="url(#${filepath})"/>

										<text id="annual" x="20" y="80" font-family="Guardian Text Sans Web, Arial, sans-serif" font-size="30px" fill="black"></text>

										${ Array.from(labels, (d) => `<text font-family="Guardian Text Sans Web, Arial, sans-serif" x="${d.x}" y="${d.y}" dy="0" text-anchor="start" class="feature-label">${d.name}</text>`)}

										${ Array.from(features, (d, i) => `<path d="${path(d)}" class="features feature-${i}" />`)}

									  	</g>

									</svg>

								</div>

						    <div class="row notes">
						        <div class="main-col">
						            <div class="row">
						                Guardian graphic | Source: Guardian Australia / <a href="https://c21ch.newcastle.edu.au/colonialmassacres/" target="_blank">Colonial Frontier Massacres Project</a>. Read more about the data <a href="https://www.theguardian.com/australia-news/ng-interactive/2019/mar/04/massacre-map-australia-the-killing-times-frontier-wars" target="_blank">here</a>, including important notes about estimating the number of deaths
						            </div>
						        </div>
						    </div>
						</div>


						<script src="app.js"></script>
						<script>
						    iframeMessenger.enableAutoResize();
						</script>

					</body>
					</html>`


				app.create(html)

				// ${ Array.from(features, (d, i) => `<path d="${d}" class="features feature-${i}" />`)}

				// ${Array.from(contours(values), (d,i) => `<path d="${path(d)}" class="features feature-${i}" />`)}

	},

	scale: function(scaleFactor) {
		
	    return d3.geoTransform({
	        point: function(x, y) {
	            this.stream.point(x * scaleFactor, y  * scaleFactor);
	        }
	    });
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

        fs.writeFile(`html/index.html`, data, function(err) {

            if(err) {
                console.log(err);
            }

            console.log("Your HTML has been created")

        }); 

    }

}

app.precheck(process.argv[2])