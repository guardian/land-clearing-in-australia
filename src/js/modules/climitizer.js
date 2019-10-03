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

        this.timelineInterval = null

        this.active = false

        this.timer = 0

        this.current = 0

        this.placenames = places.features.filter(function(d){ 
            return (self.mobile) ? d.properties.scalerank < 2 : d.properties.scalerank < 3 ;        
        });

        this.shadow = d3.geoMercator()
                .scale(1)
                .translate([0,0])

        this.createComponents()

	}

    createComponents() {

        var self = this

        this.components = {

            canvasizer: new Canvasizer(self.settings.geotiff, self.settings.bbox[1])

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

        this.before = new Image()

        this.before.src = this.settings.before

        this.after = new Image()

        this.after.src = this.settings.after

        this.image = new Image()

        this.image.src = this.settings.basemap.src

        this.image.onload = (e) => {

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

            self.drawMap()

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

    drawMap() {

        var self = this

        var nw = self.projection([104.671555,-7.237148])
        var se = self.projection([160.569992,-46.833892])    
        var sx = 0
        var sy = 0
        var sw = 4000
        var sh = 3283
        var dx = nw[0]
        var dy = nw[1]
        var dw = se[0] - nw[0]
        var dh = se[1] - nw[1]
        var width = se[0] - nw[0]
        var height = se[1] - nw[1]
        
        self.context.clearRect(0, 0, self.width, self.height);
        self.context.drawImage(self.image, sx, sy, sw, sh, dx, dy, dw, dh);        
        self.context.beginPath();
        self.path(topojson.mesh(self.states,self.states.objects.states));
        self.context.strokeStyle = "#bcbcbc";
        self.context.stroke();
        self.context.closePath();


        if (self.active) {

            var nwba = self.projection([149.626429,-28.914100])
            var seba = self.projection([149.879115,-29.130252])    
            var sxba = 0
            var syba = 0
            var swba = 800
            var shba = 800
            var dxba = nwba[0]
            var dyba = nwba[1]
            var dwba = seba[0] - nwba[0]
            var dhba = seba[1] - nwba[1]

            self.context.drawImage(self.before, sxba, syba, swba, shba, dxba, dyba, dwba, dhba);

        }

        self.labelizer()

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

        self.labelizer()

        self.annotizer(self.settings.annotations[0])


    }

    relocate(location, scale=2) {

        var self = this

        self.transform = d3.zoomIdentity
                            .translate(location[0], location[1])
                            .scale(scale)

        self.canvas.transition().duration(750).call(self.zoom.transform, self.transform);

    }
   
    animate() {

        var self = this

        if (self.x===0) {

            self.drawMap()

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

        var year = self.x + 2001

        d3.select("#infobox").html(year)

        self.x = (self.x < self.y - 1) ? self.x + 1 : 0 ;

    }

    timeline(alpha) {

        var self = this

        d3.select("#land-cleared")
            .transition()
            .duration(2000)
            .style("opacity", "1")

    }

    labelizer() {

        var self = this

        this.placenames.forEach(function(d,i) {
            self.context.beginPath();
            self.context.save();
            self.context.fillStyle="#000000";
            self.context.shadowColor="white";
            self.context.shadowBlur=5;
            self.context.font = "15px 'Guardian Text Sans Web' Arial";
            self.context.fillText(d.properties.name,self.projection([d.properties.longitude,d.properties.latitude])[0],self.projection([d.properties.longitude,d.properties.latitude])[1]);
            self.context.closePath();
            self.context.restore();

        })

    }

    annotizer(data) {

        var self = this
        var sx = self.projection([data.lng, data.lat])[0]
        var sy = self.projection([data.lng, data.lat])[1]
        var cpx = sx
        var cpy = sy + data.length / 2
        var toX = sx + data.length
        var toY = sy + data.length
        
        self.context.beginPath();
        self.context.fillStyle = "rgba(55, 217, 56,"+ data.opacity +")";
        self.context.moveTo(sx,sy);
        self.context.quadraticCurveTo(cpx, cpy, toX, toY);
        self.context.stroke();
        self.context.closePath();
        self.drawArrowhead(sx,sy,350,data.arrowsize,data.arrowsize)

        self.context.beginPath();
        self.context.save();
        self.context.fillStyle="#000000";
        self.context.shadowColor="white";
        self.context.shadowBlur=5;
        self.context.font = "15px 'Guardian Text Sans Web' Arial";
        self.context.fillText(data.note,toX + 10, toY + 10);
        self.context.closePath();
        self.context.restore();

    }

    drawArrowhead(locx, locy, angle, sizex, sizey) {

        var self = this
        var hx = sizex / 2;
        var hy = sizey / 2;

        self.context.translate((locx ), (locy));
        self.context.rotate(angle);
        self.context.translate(-hx,-hy);

        self.context.beginPath();
        self.context.fillStyle="#000000";
        self.context.moveTo(0,0);
        self.context.lineTo(0,1*sizey);    
        self.context.lineTo(1*sizex,1*hy);
        self.context.closePath();
        self.context.fill();

        self.context.translate(hx,hy);
        self.context.rotate(-angle);
        self.context.translate(-locx,-locy);
    }        

    findAngle(sx, sy, ex, ey) {
        return Math.atan2((ey - sy), (ex - sx));
    }

    scroll() {

        var self = this

        this.scrolly = new ScrollyTeller({
            parent: document.querySelector("#scrolly-1"),
            triggerTop: 1/3, // percentage from the top of the screen that the trigger should fire
            triggerTopMobile: 0.75,
            transparentUntilActive: true
        });

        this.scrolly.addTrigger({num: 1, do: () => {

            self.current = 0

            var relocate = self.geo(0)

            self.relocate(relocate.translate, relocate.scale)

            self.drawMap()

        }});

        this.scrolly.addTrigger({num: 2, do: () => {

            self.current = 1

            d3.select("#infobox").html("")

            if (self.tickerInterval!=null) {

                clearInterval(self.tickerInterval);

                self.tickerInterval = null

            }

            var relocate = self.geo(1)

            self.relocate(relocate.translate, relocate.scale)

        }});

        this.scrolly.addTrigger({num: 3, do: () => {

            self.current = 2

            self.x = 0

            if (self.tickerInterval === null) {

                self.tickerInterval = window.setInterval(self.animate.bind(this), 500);

            }

            var relocate = self.geo(1)

            self.relocate(relocate.translate, relocate.scale)

            self.drawMap()

            
        }});

        this.scrolly.addTrigger({num: 4, do: () => {

            self.current = 3

            d3.select("#infobox").html("")

            if (self.tickerInterval!=null) {

                clearInterval(self.tickerInterval);

                self.tickerInterval = null

            }

            var relocate = self.geo(2)

            self.relocate(relocate.translate, relocate.scale)

            self.drawMap()

        }});

        this.scrolly.addTrigger({num: 5, do: () => {

            self.current = 4

            self.active = false

            self.drawLGAS()
            
        }});

        this.scrolly.addTrigger({num: 6, do: () => {

            self.current = 5

            d3.select("#land-clearing").style("opacity","0").style('filter', 'grayscale(100%)');

            self.active = false

            var relocate = self.geo(2)

            self.relocate(relocate.translate, relocate.scale)

        }});

        this.scrolly.addTrigger({num: 7, do: () => {

            self.current = 6

            d3.select("#land-cleared").style("opacity","0")

            d3.select("#land-clearing-mask").style("opacity","0")

            if (self.timelineInterval!=null) {

                clearInterval(self.timelineInterval);

                self.timelineInterval = null

            }

            self.active = true

            var relocate = self.geo(3)

            self.relocate(relocate.translate, relocate.scale)

            wait(250).then( () => {

                d3.select("#land-clearing")
                  .transition()
                  .duration(550)
                  .style("opacity", "1")

            })

            wait(800).then( () => {

                d3.select("#land-clearing")
                  .transition()
                  .duration(1000)
                  .style('filter', 'grayscale(0%)');

            })

            wait(1000).then( () => {

                d3.select("#land-clearing-mask")
                  .transition()
                  .duration(1000)
                  .style("opacity", "0.5");

            })

        }});

        this.scrolly.addTrigger({num: 8, do: () => {

            console.log("Number 8")

            d3.select("#land-clearing").style("opacity","1")

            self.current = 7

            self.active = true

            var relocate = self.geo(3)

            self.relocate(relocate.translate, relocate.scale)

            self.timeline();


        }});

        this.scrolly.addTrigger({num: 9, do: () => {

            d3.select("#land-clearing").style("opacity","0")

            var relocate = self.geo(0)

            self.relocate(relocate.translate, relocate.scale)

            console.log("9")

            self.current = 8

        }});

        this.scrolly.addTrigger({num: 10, do: () => {

            console.log("10")

            self.current = 9

        }});

        this.scrolly.doScrollAction(self.current)

        this.scrolly.watchScroll();

        this.resizer()

    }

    resizer() {

        var self = this

        window.addEventListener("resize", function() {

            clearTimeout(document.body.data)

            document.body.data = setTimeout( function() { 

                self.resize()

            }, 200);

        });

    }

    resize() {

        console.log("Resize the map")

        var self = this

        self.width = getDimensions(self.viz)[0]

        self.height = window.innerHeight;

        self.canvas = d3.select("#map-animation-csg")  
                        .attr("width", self.width)
                        .attr("height", self.height);                   

        self.context = self.canvas.node().getContext("2d");                   

        self.path = d3.geoPath()
            .projection(self.projection)
            .context(self.context);

        self.scrolly.doScrollAction(self.current)

    }

}