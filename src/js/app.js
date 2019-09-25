import lgas from './data/nsw.json'
import states from './data/au-states.json'
import clearing from './data/clearing.json'
import places from './data/places.json'
import settings from './data/settings'
import { Preflight } from './modules/preflight'
import { Climitizer } from './modules/climitizer'

var app = {

	init: () => {

		var wrangle = new Preflight(clearing)

		wrangle.process(lgas).then( (lgaData) => {

		    var climate = new Climitizer(settings, lgaData, states, places)

		})

	}

}

app.init()
