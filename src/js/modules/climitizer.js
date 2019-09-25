import ScrollyTeller from "../modules/scrollyteller"
import Canvasizer from "../modules/canvasizer"
import { $, $$, wait, getDimensions } from "../modules/util"
import * as d3 from 'd3'
import * as topojson from "topojson"

export class Climitizer {

	constructor(settings, lgaData, states, places) {

		var self = this

        this.database = {}

		this.settings = settings

        this.lgaData = lgaData.boundaries

        this.max = d3.max(lgaData.data)

        this.colour = d3.scaleThreshold()
                        .range(["ffffff", "#ffe5e6", "#fde0dd","#fa9fb5","#f768a1","#dd3497","#ae017e"])
                        .domain([0, 10, 100, 500, 1000, 5000]);
        /*
        this.colour = d3.scaleLinear()
                        .range(['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6'])
                        .domain([1, self.max]); */

        this.states = states

        this.places = places

        this.viz = document.querySelector("#data-viz");

        this.width = getDimensions(self.viz)[0]

        this.height = window.innerHeight;

        this.mobile = (this.width < 861) ? true : false ;

        this.margin = { top: 0, right: 0, bottom: 0, left: 0 } ;

        this.x = 0

        this.y = 17

        this.tickerInterval = null

        this.shadow = d3.geoMercator()
                .scale(1)
                .translate([0,0])

        this.createComponents()

	}

    createComponents() {

        var self = this

        this.components = {

            canvasizer: new Canvasizer(`<%= path %>/assets/australia.tif`, self.settings.bbox[1])

        };

        this.renderDataComponents().then( (data) => {

            self.basemap()

        })

    }

    async renderDataComponents() {

        await Object.keys(this.components).forEach(key => this.renderComponent(key, this.database))

    }

    renderComponent(componentName, data) {

        var self = this

        this.components[componentName].render(data).then( (results) => {

            self.database[componentName] = results

        })

    }

    basemap() {

        var self = this

        //this.offscreenCanvas = document.createElement('canvas')

        //this.offscreenContext = this.offscreenCanvas.getContext('2d')

        this.image = new Image()

        this.image.src = this.settings.basemap.src

        this.image.onload = (e) => {

            //self.offscreenContext.drawImage(self.image, 0, 0, self.settings.basemap.width, self.settings.basemap.height)

            self.create()
            
        };

    }

    geo(bbox) {

        var self = this

        this.shadow.fitSize([this.width, this.height], self.settings.bbox[bbox]);

        var scale = this.shadow.scale()

        var translate = this.shadow.translate()

        return { "scale" : scale, "translate" : translate }

    }

    create() {

        var self = this

        self.projection = d3.geoMercator()
                .scale(1)
                .translate([0,0])

        self.canvas = d3.select("#data-viz").append("canvas")   
                        .attr("width", self.width)
                        .attr("height", self.height)
                        .attr("id", "map-animation-csg")
                        .attr("overflow", "hidden");                          

        self.context = self.canvas.node().getContext("2d");                   

        self.path = d3.geoPath()
            .projection(self.projection)
            .context(self.context);

        var zoomed = function(d) {

            var z = d3.event.transform

            self.projection.translate([z.x, z.y])

            self.projection.scale(z.k)

            self.drawMap().then( (bbox) => {


            })

        }

        self.zoom = d3.zoom().on("zoom", zoomed);

        self.scroll()

    }

    async getCoordinates(features) {

        var self = this

        var b = self.path.bounds(features),
        s = 1 / Math.max((b[1][0] - b[0][0]) / self.width, (b[1][1] - b[0][1]) / self.height),
        t = [(self.width - s * (b[1][0] + b[0][0])) / 2, (self.height - s * (b[1][1] + b[0][1])) / 2];

        return { s : s, t : t }
    }

    reposition(coordinates) {

        var self = this

        self.projection.translate(coordinates.t)

        self.projection.scale(coordinates.s)

    }

    async drawMap() {

        var self = this
        self.context.clearRect(0, 0, self.width, self.height);
        //self.context.drawImage(self.image, 0, 0, self.width, self.height);
        self.context.beginPath();
        self.path(topojson.mesh(self.states,self.states.objects.states));
        self.context.strokeStyle = "#bcbcbc";
        self.context.stroke();
        self.context.closePath();

       var nw = self.projection.invert([0,0])

       var se = self.projection.invert([self.width,self.height])

       return { "nw" : nw, "se" : se }

    }

    drawLGAS() {

        var self = this

        var choropleth = topojson.feature(self.lgaData,self.lgaData.objects.nsw).features

        choropleth.forEach(function(d) {
            self.context.fillStyle = (d.properties.clearing!=null) ? self.colour(d.properties.clearing) : "lightgrey" ;
            self.context.beginPath();
            self.path(d);
            self.context.fill();
            self.context.stroke();
        });


    }

    relocate(location, scale=2) {

        var self = this

        self.transform = d3.zoomIdentity
                            .translate(location[0], location[1])
                            .scale(scale)

        self.canvas.transition().duration(750).call(self.zoom.transform, self.transform);

    }

    convertGeoToPixel(latitude, longitude,
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
    }

    animate() {

        var self = this

        if (self.x===0) {

            self.drawMap().then( (bbox) => {


            })

        }

        for (let a of self.database.canvasizer[self.x].coordinates) {

            for (let b of a) {
                self.context.beginPath();
                self.context.fillStyle = "#ae017e"
                b.forEach(function(d,i) {

                    var latLng = self.projection([ d[0] , d[1] ] )

                    if (i==0) {
                        self.context.moveTo(latLng[0],latLng[1]);
                    } else {
                        self.context.lineTo(latLng[0],latLng[1]);
                    }
                })
                self.context.fill();
            }
        }

        self.x = (self.x < self.y - 1) ? self.x + 1 : 0 ;

    }

    scroll() {

        var self = this

        const scrolly = new ScrollyTeller({
            parent: document.querySelector("#scrolly-1"),
            triggerTop: 1/3, // percentage from the top of the screen that the trigger should fire
            triggerTopMobile: 0.75,
            transparentUntilActive: true
        });

        scrolly.addTrigger({num: 1, do: () => {

            console.log("Trigger...1")

            var relocate = self.geo(0)

            self.relocate(relocate.translate, relocate.scale)

            self.drawMap().then( (bbox) => {


            })

        }});

        scrolly.addTrigger({num: 2, do: () => {

            if (self.tickerInterval!=null) {

                clearInterval(self.tickerInterval);

                self.tickerInterval = null

            }

            var relocate = self.geo(1)

            self.relocate(relocate.translate, relocate.scale)

        }});

        scrolly.addTrigger({num: 3, do: () => {

            if (self.tickerInterval === null) {

                self.tickerInterval = window.setInterval(self.animate.bind(this), 1000);

            }

            var relocate = self.geo(1)

            self.relocate(relocate.translate, relocate.scale)

            self.drawMap().then( (bbox) => {


            })

            
        }});

        scrolly.addTrigger({num: 4, do: () => {

            if (self.tickerInterval!=null) {

                clearInterval(self.tickerInterval);

                self.tickerInterval = null

            }

            var relocate = self.geo(2)

            self.relocate(relocate.translate, relocate.scale)

            self.drawMap().then( (bbox) => {


            })

        }});

        scrolly.addTrigger({num: 5, do: () => {

            self.drawLGAS()
            
        }});

        scrolly.addTrigger({num: 6, do: () => {

        }});

        scrolly.addTrigger({num: 7, do: () => {

        }});

        scrolly.watchScroll();

    }

}