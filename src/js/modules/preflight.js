export class Preflight {

	constructor(clearing) {

		var self = this

		this.clearing = new Map( clearing.map( (item) => [item.code, item]) )

	}

  async process(lgas) {

    console.log("Testing")

    var self = this

    var array = []

    for (var i = 0; i < lgas.objects.nsw.geometries.length; i++) {

      let id = +lgas.objects.nsw.geometries[i].properties.LGA_CODE19

      try {

        let properties = self.clearing.get(id)["clearing-17-18"]

        lgas.objects.nsw.geometries[i].properties.clearing = properties

        array.push(properties)

      } catch(err) {

        lgas.objects.nsw.geometries[i].properties.clearing = null

      }
        
    }

    const data = new Set(array);

    return { boundaries: lgas, data : Array.from(data) }

  }

}