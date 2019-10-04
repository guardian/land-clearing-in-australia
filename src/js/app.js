import lgas from './data/nsw.json'
import states from './data/au-states.json'
import clearing from './data/clearing.json'
import places from './data/places.json'
import settings from './data/settings'
import { Preflight } from './modules/preflight'
import { Climitizer } from './modules/climitizer'
import share from './modules/share'

var app = {

	init: () => {

		var wrangle = new Preflight(clearing)

		wrangle.process(lgas).then( (lgaData) => {

		    var climate = new Climitizer(settings, lgaData, states, places)

		    app.socialize(settings)

		})

	},

	socialize: (settings) => {

        var shareURL = app.getShareUrl()

        let shareFn = share(settings.title, shareURL, settings.fbImg, settings.twImg, settings.twHash, settings.socialMessage);

	    [].slice.apply(document.querySelectorAll('.od-share__button')).forEach(shareEl => {

	        var network = shareEl.getAttribute('data-network');

	        shareEl.addEventListener('click',() => shareFn(network));

	    });

	},

	getShareUrl: () => { 
        var isInIframe = (parent !== window);
        var parentUrl = null;
        var shareUrl = (isInIframe) ? document.referrer : window.location.href;
        return shareUrl;  
    }

}

app.init()
