var stringToColour = function(str) {
    str += 'jf'
    var hash = 0
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    var colour = '#'
    for (var i = 0; i < 3; i++) {
        var value = (hash >> (i * 8)) & 0xFF
        colour += ('00' + value.toString(16)).substr(-2)
    }
    return colour
}
var averageRGB = (function () {
    // Keep helper stuff in closures
    var reSegment = /[\da-z]{2}/gi;

    // If speed matters, put these in for loop below
    function dec2hex(v) {return v.toString(16);}
    function hex2dec(v) {return parseInt(v,16);}

    return function (c1, c2, v1 = 1, v2 = 1) {
    var sum = v1 + v2
    v1 /= sum
    v2 /= sum
    // Split into parts
    var b1 = c1.match(reSegment);
    var b2 = c2.match(reSegment);
    var t, c = [];

    // Average each set of hex numbers going via dec
    // always rounds down
    for (var i=b1.length; i;) {
        var a = hex2dec(b1[--i])
        var b = hex2dec(b2[i])
        t = dec2hex(Math.round(a * v1 + b * v2));
        // Add leading zero if only one character
        c[i] = t.length == 2? '' + t : '0' + t; 
    }
    return  c.join('');
    }
}());
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

Promise.all([
    d3.json("coords.json"),
    d3.json("refs.json"), 
    d3.json("data.json"), 
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json")
]).then(function(files) {
    load(...files)
})

function load(coord, ref, data, world) {
    topo = topojson.feature(world, world.objects.land).features
    console.log(world)
    defs.selectAll("path")
        .data(topo)
        .enter()
        .append("path")
            .attr("id", "land")
            .attr("d", path)
            .attr("fill", "#EEE")
    // g.selectAll("path")
    //     .data(topo)
    //     .enter()
    //     .append("path")
    //         .attr("id", "land")
    //         .attr("d", path)
    //         .attr("fill", "#EEE")
    //         .attr("stroke", "black")
    //         .attr("stroke-width", 0.5)

    var mask = defs.append("mask")
        .attr("id", "clip")
        
    mask.append("use")
        .attr("xlink:href", "#land")
    
    var clicked = null
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

    console.log(ref.length + " references")
    console.log(Object.keys(langs).length + " languages/speech varieties")
    console.log(Object.keys(cities).length + " locations")
    cts = []
    // for (key in langs) {
    //     cts.push(langs[key].length)
    // }
    for (key in ref) {
        console.log(ref[key])
        cts.push(ref[key].year)
    }
    d3.select("html").append("p").text(cts)

    var cities_voronoi = []
    for (city in cities) {
        console.log(city)
        cities_voronoi.push([coord.cities[city][1], coord.cities[city][0], city])
    }
    var voronoi = d3.geoVoronoi()(cities_voronoi)
    g.append("g")
        .attr("mask", "url(#clip)")
        .selectAll("path")
        .data(voronoi.polygons().features)
        .enter()
        .append("path")
            .attr("id", "voronoi")
            .attr("d", path)
            .attr("stroke", "black")
            .attr("stroke-width", 0.5)
            .attr("fill", function(d) {
                var count = 0, colour = null
                var city = d.properties.site[2]
                if (city == "blank") return "#EEEEEE"
                for (lang in cities[city]) {
                    d3.select(this).attr("data-lang", d3.select(this).attr("data-lang") + " " + lang.replace(" ", "_"))
                    // var new_colour = "#EEEEEE"
                    var new_colour = '#' + averageRGB(stringToColour(coord.family[lang][1]), stringToColour(coord.family[lang][0]), 1, 3)
                    if (coord.family[lang].length == 3) new_colour = '#' + averageRGB(stringToColour(coord.family[lang][2]), new_colour, 1, 3)
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
    

    var lines = g.append("g")
    var subg = g.append("g")

    var stored_coords = {}
    for (lang in langs) {
        refs[lang].sort((a, b) => (a.year < b.year) ? 1 : ((b.year < a.year) ? -1 : 0))
        var loc = projection([d3.mean(langs[lang], d => d[1]), d3.mean(langs[lang], d => d[0])])
        stored_coords[lang] = loc
        stored_coords[lang][0] += Math.random() * 2 - 1
        stored_coords[lang][1] += Math.random() * 2 - 1
        colour = '#' + averageRGB(stringToColour(coord.family[lang][1]), stringToColour(coord.family[lang][0]), 1, 3)
        if (coord.family[lang].length == 3) colour = '#' + averageRGB(stringToColour(coord.family[lang][2]), colour, 1, 3)
        var r = Math.sqrt(refs[lang].length) * 5
        var x = g.append("circle")
            .attr("cx", stored_coords[lang][0])
            .attr("cy", stored_coords[lang][1])
            .attr("r", r)
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
        })

        x.on("mouseout", function(event, d) {
            var l = d3.select(this).attr("id")
            d3.selectAll('[data-lang~="' + l.replace(" ", "_") + '"]').transition().style("opacity", null)
            d3.selectAll("text").transition().style("opacity", 0).remove()
        })
            
        x.on("click", function(event, d) {
            var l = d3.select(this).attr("id")
            if (clicked != l) {
                if (clicked != null) {
                    d3.selectAll(".card-text").remove()
                    d3.select(".name").text("Hover over/click a dot.")
                    subg.selectAll("*").transition().attr("r", 0).remove()
                    lines.selectAll("*")
                        .transition()
                        .attr("x1", stored_coords[l][0])
                        .attr("y1", stored_coords[l][1])
                        .remove()
                }
                d3.selectAll("circle")
                    .style("opacity", 0.3)
                clicked = l
                var board = d3.select(".card-body")
                d3.select(".name").text(l)
                board.append("p")
                    .attr("class", "card-text lead")
                    .html(`${coord.family[l][0]} / ${coord.family[l][1]} ${coord.family[l].length == 3 ? "/ " + coord.family[l][2] : ""}`)
                board.append("p")
                    .attr("class", "card-text")
                    .html(refs[l].length + " source(s) covering " + langs[l].length + " location(s).")
                board = board.append("ul")
                    .attr("class", "card-text")
                    .style("overflow-y", "scroll")
                    .style("max-height", "70vh")
                refs[l].forEach(x => {
                    var note = `${x.author.join(', ')} (${x.year}). ${x.type == 'article' ? '"' + x.title + '"' : '<em>' + x.title + '</em>'}.`
                    if (x.journal) note += ` In <em>${x.journal}</em>${x.volume ? (' ' + x.volume) : ''}${x.number ? ('(' + x.number + ')') : ''}.`
                    x.languages[l].forEach(city => {
                        note += ` <span class="badge bg-secondary">${city}</span>`
                    })
                    x.topics.forEach(topic => {
                        note += ` <span class="badge bg-primary">${topic}</span>`
                    })
                    if (x.url) note += ` <a href="${x.url}">link</a>`
                    board.append("li")
                        .html(note)
                })
                for (city in subcities[l]) {
                    var loc2 = projection([coord.cities[city][1], coord.cities[city][0]])
                    var r = Math.sqrt(subcities[l][city]) * 5
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
            }
            else {
                clicked = null
                d3.selectAll("circle")
                    .style("opacity", null)
                d3.selectAll(".card-text").remove()
                d3.select(".name").text("Hover over/click a dot.")
                subg.selectAll("*").transition().attr("r", 0).remove()
                lines.selectAll("*")
                    .transition()
                    .attr("x1", stored_coords[l][0])
                    .attr("y1", stored_coords[l][1])
                    .remove()
            }
        })
    }
    
}