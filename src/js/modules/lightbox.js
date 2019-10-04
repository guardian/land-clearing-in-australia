import template from '../../templates/lightbox.html'
import Ractive from 'ractive'
import ractiveFade from 'ractive-transitions-fade'
import ractiveTap from 'ractive-events-tap'

export class Lightbox {

	constructor() {

		var self = this

        this.screenWidth = window.innerWidth;

        this.screenHeight = window.innerHeight;   

        this.images = []

        this.captions = []

        this.database = {}

        this.ready = false

        this.database.showLightbox = false

        this.database.current  = 0

        this.database.currentLabel  = 1

        this.database.total  = 0

        this.database.showInfo = false

        this.database.path  = "<%= path %>/assets/" + this.slideshowWidth(this.screenWidth)

    }

    async render() {

        var self = this;

        this.elem = document.createElement('div');

        this.elem.id = 'lightbox-container';

        document.getElementsByTagName('body')[0].appendChild(self.elem);

        [].slice.apply(document.querySelectorAll('[data-image]')).forEach( (imageEl,index) => {

            var src = `${self.database.path}/${imageEl.getAttribute('data-image')}`;

            var caption = (imageEl.getAttribute('data-caption')!=undefined) ? imageEl.getAttribute('data-caption') : "" ;

            self.images.push(src)

            self.captions.push(caption)

            imageEl.addEventListener('click',() => {

                self.lightbox(index)

            });


        });

        this.database.caption = (self.captions.length > 0) ? self.captions[0] : "" ;

        this.database.total = self.images.length

        this.database.image = self.images[0]

        await this.ractivate()

        return self.images

    }

    lightbox(index) {

        var self = this

        if (this.ready) {

            this.elem.style.display = "block";

            this.database.showLightbox = true

            this.database.current = index

            this.database.currentLabel = index + 1

            this.database.caption = this.captions[this.database.current]

            this.ractive.set(this.database)

        }

    }

    ractivate() {

        var self = this

        console.log("This ractivate")

        this.ractive = new Ractive({

            target: "#lightbox-container",

            template: template,

            data: self.database

        });

        this.ractive.on( 'next', function ( context, id ) {

            self.database.current = (self.database.current === (self.database.total-1)) ? 0 : self.database.current + 1 ;

            self.database.currentLabel = self.database.current + 1

            self.database.caption = self.captions[self.database.current]

            self.ractive.set(self.database)

        });

        this.ractive.on( 'back', function ( context, id ) {

            self.database.current = (self.database.current === 0) ? self.database.total - 1 : self.database.current - 1 ;

            self.database.currentLabel = self.database.current + 1

            self.database.caption = self.captions[self.database.current]

            self.ractive.set(self.database)

        });

        this.ractive.on( 'info', function ( context ) {

            self.database.showInfo = (self.database.showInfo) ? false : true ;

            self.ractive.set(self.database)

        });


        this.ractive.on( 'close', ( context ) => {

            self.elem.style.display = "none";

            self.database.showLightbox = false

            self.ractive.set(self.database)

        });


        this.ready = true

    }

    slideshowWidth(width) {

      return (width < 321) ? 320 :
          (width < 481) ? 480 :
          (width < 741) ? 740 :
          (width < 981) ? 980 :
          (width < 981) ? 980 :
          (width < 1301) ? 1300 : 2000 ;

    }


}