import svgPanZoom from 'svg-pan-zoom' //npm install --save ariutta/svg-pan-zoom  - https://github.com/ariutta/svg-pan-zoom
import ScrollyTeller from "./modules/scrollyteller"
import Clear from './modules/clear'
import { $, $$, wait, getDimensions } from "./modules/util"
import * as d3 from 'd3'
import lgas from './data/nsw.json'
import states from './data/au-states.json'
import clearing from './data/clearing.json'
import places from './data/places.json'
import * as topojson from "topojson"

var app = {

	settings: {},

	init: () => {

		app.viz = document.querySelector("#data-viz");

		app.settings.width = getDimensions(app.viz)[0]

		app.settings.height = (app.settings.width < 861) ? app.settings.width  * 0.8 : app.settings.width  * 0.6 ;

		app.settings.mobile = (app.settings.width < 861) ? true : false ;

		app.settings.margin = { top: 0, right: 0, bottom: 0, left: 0 } ;

		app.setup()

	},

	setup: () => {

		var clearingMap = new Map( clearing.map( (item) => [item.code, item]) )

		for (var i = 0; i < lgas.objects.nsw.geometries.length; i++) {

			let id = +lgas.objects.nsw.geometries[i].properties.LGA_CODE19
	
			try {

			  let properties = clearingMap.get(id)["clearing-17-18"]

			  lgas.objects.nsw.geometries[i].properties.clearing = properties

			} catch(err) {

			  lgas.objects.nsw.geometries[i].properties.clearing = null

			}
			
		}

		app.settings.image = new Image()

		app.settings.image.src = '<%= path %>/assets/aus-crop-light.png'

		app.settings.image.onload = (e) => {

			app.create()
			
		};


	},

	create: () => {

		app.settings.projection = d3.geoMercator()
                .scale(1)
                .translate([0,0])

		app.settings.canvas = d3.select("#data-viz").append("canvas")	
		                .attr("width", app.settings.width)
		                .attr("height", app.settings.height)
		                .attr("id", "map-animation-csg")
		                .attr("overflow", "hidden");                          

		app.settings.context = app.settings.canvas.node().getContext("2d"); 	              

		app.settings.path = d3.geoPath()
			.projection(app.settings.projection)
			.context(app.settings.context);

		var results = app.getCoordinates(topojson.feature(states,states.objects.states))

		app.translate = results.t

		app.scale = results.s

		console.log(`${app.translate} ${app.scale}`)

		app.settings.projection
		      .translate(app.translate)
		      .scale(app.scale)

		app.zoom = d3.zoom().on("zoom", app.zoomed);

		var bbox = {
			"type": "Feature",
			"geometry": {
				"type": "Polygon",
				"coordinates": [[[142.713261,-35.973839],[142.713261,-21.9994],[156.160526,-21.9994],[156.160526,-35.973839],[142.713261,-35.973839]]]
			}
		}

		app.drawMap()

		app.scroll()


	},

	zoomed: (d) => {

		var z = d3.event.transform

		//console.log(z)


		app.settings.projection.translate([z.x, z.y])
		app.settings.projection.scale(z.k) //2057.4992022879255


  		app.drawMap()
	},

	getCoordinates: (features) => {

		var b = app.settings.path.bounds(features),
		s = 1 / Math.max((b[1][0] - b[0][0]) / app.settings.width, (b[1][1] - b[0][1]) / app.settings.height),
		t = [(app.settings.width - s * (b[1][0] + b[0][0])) / 2, (app.settings.height - s * (b[1][1] + b[0][1])) / 2];

		console.log(`${t} ${s}`)

		return { s : s, t : t }
	},

	drawMap: () => {

		app.settings.context.clearRect(0, 0, app.settings.width, app.settings.width);
		//app.settings..drawImage(app.settings.image, rtranslate_x, rtranslate_y, raster_width, raster_height);
		app.settings.context.beginPath();
		app.settings.path(topojson.mesh(states,states.objects.states));
		app.settings.context.strokeStyle= "#bcbcbc";
		app.settings.context.stroke();
		app.settings.context.closePath();

	},

	relocate: (location, scale=2) => {

		console.log(`${location} - ${scale}`)

		app.transform = d3.zoomIdentity
							.translate(location[0], location[1])
							.scale(scale)

		app.settings.canvas.transition().duration(750).call(app.zoom.transform, app.transform);

	},

	temp: () => {

		//projection.fitSize([app.settings.width, app.settings.height], topojson.feature(states,states.objects.states));

		// Old school: https://bl.ocks.org/mbostock/4707858
		// Cool kids: https://github.com/d3/d3-geo#projection_fitExtent

		var filterPlaces = places.features.filter(function(d){ 
			return (app.settings.mobile) ? d.properties.scalerank < 2 : d.properties.scalerank < 3 ;		
		});

		// console.log(filterPlaces);


		function drawMap() {
			// context.beginPath();
		 //    path(graticule());
		 //    context.strokeStyle = "#efefef";
		 //    context.stroke();

			console.log("We is drawing")

			context.clearRect(0, 0, app.settings.width, app.settings.width);

			//context.drawImage(app.settings.image, rtranslate_x, rtranslate_y, raster_width, raster_height);

		    context.beginPath();
		    path(topojson.mesh(states,states.objects.states));
		    context.strokeStyle= "#bcbcbc";
		    context.stroke();
		    context.closePath();

		    filterPlaces.forEach(function(d,i) {
				context.beginPath();
				context.save();
				context.fillStyle="#767676";
				context.shadowColor="white";
				context.shadowBlur=5;
				context.fillText(d.properties.name,projection([d.properties.longitude,d.properties.latitude])[0],projection([d.properties.longitude,d.properties.latitude])[1]);
				context.font = "15px 'Guardian Text Sans Web' Arial";
			    context.closePath();
			    context.restore();

			})

		}

		drawMap();

	},

	scroll: () => {

		const scrolly = new ScrollyTeller({
			parent: document.querySelector("#scrolly-1"),
			triggerTop: 1/3, // percentage from the top of the screen that the trigger should fire
			triggerTopMobile: 0.75,
			transparentUntilActive: true
		});

		scrolly.addTrigger({num: 1, do: () => {
			console.log("Trigger...1")
			app.relocate([-1680.943996723708,-155.49784755720094], 881.7963392939776)
		}});

		scrolly.addTrigger({num: 2, do: () => {
			console.log("Trigger...2 boom")
			app.relocate([-4886.299084881671, -810.1602319186863], 2057.4992022879255)

			var bbox = {
				"type": "Feature",
				"geometry": {
					"type": "Polygon",
					"coordinates": [[[142.713261,-35.973839],[142.713261,-21.9994],[156.160526,-21.9994],[156.160526,-35.973839],[142.713261,-35.973839]]]
				}
			}

			//console.log(app.settings.projection.invert([0,0]))

			//console.log(app.settings.projection.scale(),app.settings.projection.translate())

			//https://github.com/d3/d3-geo

			//app.settings.projection.fitSize([app.settings.width, app.settings.height], bbox);

			//console.log(app.settings.projection.scale(),app.settings.projection.translate())

			//app.settings.projection.center([145,-38])

			//app.drawMap()

		}});

		scrolly.addTrigger({num: 3, do: () => {
			console.log("Trigger...3")
		}});

		scrolly.addTrigger({num: 4, do: () => {
			console.log("Trigger...4")
		}});

		scrolly.addTrigger({num: 5, do: () => {
			console.log("Trigger...5")
		}});

		scrolly.addTrigger({num: 6, do: () => {
			console.log("Trigger...6")
		}});

		scrolly.addTrigger({num: 7, do: () => {
			console.log("Trigger...7")
		}});

		scrolly.watchScroll();

	}

}

app.init()
