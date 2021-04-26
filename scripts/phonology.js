var width = window.innerWidth, height = window.innerHeight

var svg = d3.select("#map")
    .attr("preserveAspectRatio", "xMidYMid")
    .attr("viewBox", "0 0 " + width + " " + height)
var defs = svg.append("defs")
var g = svg.append("g")

var projection = d3.geoEqualEarth()
    .scale(1000)
    .center([60, 20])
    .translate([width / 2, height / 2])

var path = d3.geoPath()
    .projection(projection)

var scale = 1
function zoomed(event) {
    g.attr("transform", event.transform)
    scale = event.transform.k
    d3.selectAll("circle")
        .attr("r", function() {
            return d3.select(this).attr("data-r") / event.transform.k
        })
        .attr("stroke-width", function() {
            return 1 / event.transform.k
        })
    d3.selectAll("#land, #voronoi")
        .attr("stroke-width", function() {
            return 0.5 / event.transform.k
        })
    d3.selectAll("line")
        .attr("stroke-width", function() {
            return 1 / event.transform.k
        })
    d3.selectAll("text")
        .attr("font-size", 30 / event.transform.k)
}
function unzoomed() {
    svg.transition().duration(1000).call(
        zoom.transform,
        d3.zoomIdentity,
        d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
    )
}
var zoom = d3.zoom()
    .extent([[0, 0], [width, height]])
    .scaleExtent([1, 12])
    .on("zoom", zoomed)
svg.call(zoom)
    
var base = g.append("g")
var lines = g.append("g")
var subg = g.append("g")

var clicked = null

Promise.all([
    d3.json("../data/coords.json"),
    d3.json("../data/refs.json"),
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json"),
    d3.csv("../data/typology/phonology.csv")
]).then(function(files) {
    load(...files)
})

function load(coord, ref, world, csv) {
    data = csv.reduce((map, row) => (map[row["Language Name"]] = row, map), {})
    topo = topojson.feature(world, world.objects.land).features
    // console.log(data)
    defs.selectAll("path")
        .data(topo)
        .enter()
        .append("path")
            .attr("id", "land")
            .attr("d", path)
            .attr("fill", "#EEE")

    var mask = defs.append("mask")
        .attr("id", "clip")
        
    mask.append("use")
        .attr("xlink:href", "#land")

    d3.select("#facets")
        .selectAll("button")
        .data(csv.columns.slice(2))
        .enter()
        .append("button")
            .attr("href", "#")
            .attr("id", d => d)
            .attr("class", "btn btn-primary m-2")
            .attr("style", "width: 50px;")
            .text(d => d)
            .on("click", (event, d) => {
                change(d)
            })
    
    langs = {}
    refs = {}
    cities = {}
    subcities = {}
    ref.forEach(d => {
        for (lang in d.languages) {
            if (!(lang in langs)) langs[lang] = []
            d.languages[lang].forEach(city => {
                if (!(city in cities)) cities[city] = {}
                if (!(lang in cities[city])) cities[city][lang] = 0
                cities[city][lang]++
                // if (!(city in coord.cities)) {
                //     console.log("Missing coordinates for " + city)
                // }
                langs[lang].push(coord.cities[city])
            })

            if (!(lang in refs)) refs[lang] = []
            refs[lang].push(d)

            if (!(lang in subcities)) subcities[lang] = {}
            d.languages[lang].forEach(city => {
                if (!(city in subcities[lang])) subcities[lang][city] = 0
                subcities[lang][city]++
            })
        }
    });

    // console.log(ref.length + " references")
    // console.log(Object.keys(langs).length + " languages/speech varieties")
    // console.log(Object.keys(cities).length + " locations")

    var cities_voronoi = []
    for (city in cities) {
        cities_voronoi.push([coord.cities[city][1], coord.cities[city][0], city])
    }
    var voronoi = d3.geoVoronoi()(cities_voronoi)

    change("b")
    base.attr("mask", "url(#clip)")
    function change(phone) {
        d3.select("#phone").text(phone)
        console.log(phone)
        g.selectAll("circle").remove()
        base.selectAll("path").remove()

        base.selectAll("path")
            .data(voronoi.polygons().features)
            .enter()
            .append("path")
                .attr("id", "voronoi")
                .attr("d", path)
                .attr("stroke", "black")
                .attr("stroke-width", 0.5 / scale)
                .attr("fill", function(d) {
                    var count = 0, colour = "#EEEEEE"
                    var city = d.properties.site[2]
                    if (city == "blank") return "#EEEEEE"
                    for (lang in cities[city]) {
                        if (!(lang in data)) continue
                        d3.select(this).attr("data-lang", d3.select(this).attr("data-lang") + " " + lang.replace(" ", "_"))
                        var new_colour = "#EEEEEE"
                        if (lang in data) new_colour = stringToColour(data[lang][phone])
                        // console.log(city, lang, cities[city][lang], new_colour)
                        // if (lang in data["breathy voice"].data && city in data["breathy voice"].data[lang]) new_colour = stringToColour(data["breathy voice"].data[lang][city])
                        // console.log(new_colour)
                        if (count == 0) {
                            count += cities[city][lang]
                            colour = new_colour
                        }
                        else {
                            colour = '#' + averageRGB(
                                new_colour,
                                colour,
                                cities[city][lang],
                                count)
                            count += cities[city][lang]
                        }
                    }
                    return colour
                })

        var stored_coords = {}
        function comp(a, b) {
            var x = a.year, y = b.year
            if (x == "n.d") x = 0
            if (y == "n.d") y = 0
            if (x.length >= 4) x = x.substr(0, 4)
            if (y.length >= 4) y = y.substr(0, 4)
            return (+x < +y) ? 1 : ((+x > +y) ? -1 : 0)
        }
        for (lang in langs) {
            // console.log(lang)
            refs[lang].sort(comp)
            var loc = projection([d3.mean(langs[lang], d => d[1]), d3.mean(langs[lang], d => d[0])])
            stored_coords[lang] = loc
            stored_coords[lang][0]
            stored_coords[lang][1]
            colour = '#EEE'
            if (lang in data) colour = stringToColour(data[lang][phone])
            var r = calculateRadius(refs[lang].length)

            var x = g.append("circle")
                .attr("cx", stored_coords[lang][0])
                .attr("cy", stored_coords[lang][1])
                .attr("r", r / scale)
                .attr("data-r", r)
                .attr("fill", colour)
                .attr("id", lang)
                .attr("stroke", "black")
                .attr("stroke-width", 1 / scale)

            x.on("mouseover", function(event, d) {
                var l = d3.select(this).attr("id")
                d3.selectAll('[data-lang~="' + l.replace(" ", "_") + '"]').transition().style("opacity", 0.2)
                var loc = stored_coords[l]
                g.append("text")
                    .attr("x", +loc[0])
                    .attr("y", +loc[1])
                    .attr("pointer-events", "none")
                    .attr("font-size", 30 / scale)
                    .style("opacity", 0)
                    .text(l)
                    .attr("id", l + "_text")
                    .transition()
                    .style("opacity", null)
                    .style("text-shadow", "0px 0px 10px white")
                for (city in subcities[l]) {
                    var loc2 = projection([coord.cities[city][1], coord.cities[city][0]])
                    var r = calculateRadius(subcities[l][city])
                    subg.append("circle")
                        .attr("cx", loc2[0])
                        .attr("cy", loc2[1])
                        .transition()
                        .attr("r", r / scale)
                        .attr("data-r", r)
                        .attr("fill", "steelblue")
                        .attr("stroke", "black")
                        .attr("stroke-width", 1 / scale)
                    lines.append("line")
                        .attr("x2", stored_coords[l][0])
                        .attr("y2", stored_coords[l][1])
                        .attr("x1", stored_coords[l][0])
                        .attr("y1", stored_coords[l][1])
                        .transition()
                        .attr("x1", loc2[0])
                        .attr("y1", loc2[1])
                        .attr("stroke", "black")
                        .attr("stroke-width", 1 / scale)
                }
            })

            x.on("mouseout", function(event, d) {
                var l = d3.select(this).attr("id")
                if (clicked != l) {
                    d3.selectAll('[data-lang~="' + l.replace(" ", "_") + '"]').transition().style("opacity", null)
                }
                d3.selectAll("text").transition().style("opacity", 0).remove()
                subg.selectAll("*").transition().attr("r", 0).remove()
                lines.selectAll("*")
                    .transition()
                    .attr("x1", stored_coords[l][0])
                    .attr("y1", stored_coords[l][1])
                    .remove()
            })
        }
    }
}