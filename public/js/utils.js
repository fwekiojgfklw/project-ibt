const vehicleTypesSortingOrder = ["metro", "tram", "trolley", "bus", "night"]

function toRadians(degrees) {
	return degrees * (Math.PI / 180)
}

function toDegrees(radians) {
	return radians * (180 / Math.PI)
}

function normaliseAngle(angle) {
    return ((angle + 180) % 360) - 180
}

function calculateBearing(geo) {
    const [coords1, coords2] = [geo.previous.coords, geo.current.coords]

    if (!coords1 || !coords2) {
        return null
    }

    const [lat1, lon1] = coords1
    const [lat2, lon2] = coords2

    const lat1Rad = toRadians(lat1)
    const lat2Rad = toRadians(lat2)
    const deltaLonRad = toRadians(lon2 - lon1)

    const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad)
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad)
    const bearing = toDegrees(Math.atan2(y, x))

    return (bearing + 360) % 360
}

function calculateSpeed(geo) {
    const [coords1, timestamp1] = [geo.previous.coords, geo.previous.timestamp]
    const [coords2, timestamp2] = [geo.current.coords, geo.current.timestamp]

    if (!coords1 || !coords2) {
        return 0
    }

    const distance = calculateDistance(coords1, coords2)
    const time = Math.abs(timestamp1 - timestamp2) / 1000
    const speed = Math.round(distance / time * 3.6)

    if (speed > 90) {
        return geo.speed
    }

    return speed
}

function calculateDistance(coords1, coords2) {
    const [lat1, lon1] = coords1
    const [lat2, lon2] = coords2
    
    if (lat1 == lat2 && lon1 == lon2) {
        return 0
    }

    const earthRadius = 6371000
    const lat1Rad = toRadians(lat1)
    const lat2Rad = toRadians(lat2)
    const deltaLatRad = toRadians(lat2 - lat1)
    const deltaLonRad = toRadians(lon2 - lon1)

    const a =  Math.sin(deltaLatRad / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLonRad / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return earthRadius * c
}

function normaliseLine(lineString) {
    let line, type

    if (lineString.slice(0, 1) === "A") {
        line = lineString.slice(1)
        type = line.includes("N") ? "night" : "bus"
    } else if (lineString.slice(0, 3) === "TBE") {
        line = lineString.slice(3)
        type = "bus"
    } else if (lineString.slice(0, 2) === "TM") {
        line = lineString.slice(2)
        type = "tram"
    } else if (lineString.slice(0, 2) === "TB") {
        line = lineString.slice(2)
        type = "trolley"
    }

    return { line, type }
}

function extractPolyline(value) {
    const splitted = value.split("LINESTRING")
    const collection = splitted[1]
        .replace(/\(/g, "")
        .replace(/\)/g, "")
        .trim()
        .split(",")

    const resultArr = []

    for (const item of collection) {
        const coordinates = item.trim().split(" ")
        const coord1 = Number(coordinates[0])
        const coord2 = Number(coordinates[1])

        if (isNaN(coord1) || isNaN(coord2)) continue;

        resultArr.push([coord2, coord1])
    }

    return resultArr
}

// function buildRoute(route) {
//     const { line, type } = normaliseLine(route.line);
        
//     const matchingLine = lines.find(line_ => line_.name.toString() === line && (line_.type === type || line_.type === "bus" && type === "trolley"))

//     if (!matchingLine) return;

//     const polyline = []

//     for (const direction of [0, 1]) {
//         for (const segment of route[`direction${direction}`].segments) {
//             polyline.push(...extractPolyline(segment.wkt))
//         }
//     }

//     polylines.push({
//         id: matchingLine.id,
//         type: matchingLine.type,
//         name: route.direction0.name.toUpperCase(),
//         polyline: L.polyline(polyline, { color: lineTypeColors[matchingLine.type], weight: 3, opacity: 1, interactive: false })
//     })
// }

function buildRoute(route) {
    if (polylines.find(line => line.id === route.line.ext_id)) return;

    const type = numericalTypeReplacements[route.line.type]
    const routes = []

    for (const direction of route.routes) {
        const polyline = L.polyline(extractPolyline(direction.details.polyline), { color: lineTypeColors[type], weight: 3, opacity: 1, interactive: false })
        
        routes.push({
            id: direction.id,
            name: direction.name.toUpperCase(),
            polyline: polyline
        })
    }

    polylines.push({
        id: route.line.ext_id,
        type: type,
        name: route.routes[0].name.toUpperCase(),
        routes: routes
    })
}

function isSecondCar(vehicleId) {
    vehicleId = Number(vehicleId.slice(-4))
    return tramCompositions.some(composition => composition[1] === vehicleId)
}

function getSecondCar(vehicleId) {
    vehicleId = Number(vehicleId.slice(-4))
    const result = tramCompositions.find(composition => composition[0] === vehicleId)
    return result ? result[1] : null
}

function getVehicleModel(vehicle) {
    return vehicleModels[vehicle.type.replace("night", "bus")]?.find(model => model.isModel(vehicle))
}

function getVehicleFeatureIcons(vehicle) {
    let html = ""

    if (vehicle.features.lowFloor) {
        html += /*html*/`<i class="feature-icon low-floor"></i>`
    }

    if (vehicle.features.ac) {
        html += /*html*/`<i class="feature-icon ac"></i>`
    }

    return html
}

function normaliseVehicleId(vehicleId, string) {
    vehicleId = Number(vehicleId.replace(/[a-z]/gi, "")) || vehicleId.replace(/[a-z]/gi, "")
    return string ? vehicleId.toString() : vehicleId
}

function normaliseVehicleType(vehicle) {
    let vehicleType = vehicle.vehicleType
    const fleetNumber = Number(vehicle.vehicleId.replace(/[a-z]/gi, ""))

    if (vehicleType === "trolley" && [[1701, 1703], [5001, 5015], [5031, 5099], [2501, 2505]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound)) {
        vehicleType = "bus"
    }

    return vehicleType
}

function showLine(lineId) {
    const vehicles = activeVehicles.filter(vehicle => vehicle.lineId === lineId)
    map.closePopup()

    vehicleLayers.bus.removeFrom(map)
    vehicleLayers.night.removeFrom(map)
    vehicleLayers.tram.removeFrom(map)
    vehicleLayers.trolley.removeFrom(map)

    circleVehicleLayers.bus.removeFrom(map)
    circleVehicleLayers.night.removeFrom(map)
    circleVehicleLayers.tram.removeFrom(map)
    circleVehicleLayers.trolley.removeFrom(map)

    for (const vehicle of vehicles) {
        vehicle.marker.removeFrom(vehicleLayers[vehicle.type])
        vehicle.circleMarker.removeFrom(vehicleLayers[vehicle.type])
        vehicle.marker.addTo(vehicleLayers.filtered)
        vehicle.circleMarker.addTo(vehicleLayers.filtered)
    }

    map.fitBounds(vehicles.map(vehicle => vehicle.marker.getLatLng()), { animate: false })
    closeSearchModal()
}

function showVehicle(vehicleId) {
    const vehicle = activeVehicles.find(vehicle => vehicle.id === vehicleId)
    map.closePopup()
    map.fitBounds([vehicle.marker.getLatLng()], { maxZoom: 17, animate: false })
    vehicle.marker.openPopup()
    closeSearchModal()
}

function showStop(stopCode) {
    const stop = stops.find(stop => stop.code === stopCode)
    map.closePopup()
    map.fitBounds([stop.marker.getLatLng()], { maxZoom: 17, animate: false })
    // stop.marker.open()
    stop.marker.openPopup()
    closeSearchModal()
}

function sortVehicles(vehicles) {
    return vehicles.sort((a, b) => a.type === b.type ? a.fleetNumber.localeCompare(b.fleetNumber, undefined, { numeric: true }) : vehicleTypesSortingOrder.indexOf(a.type) - vehicleTypesSortingOrder.indexOf(b.type))
}

function formatForComparison(string) {
    return string.toLowerCase().replace("а", "a").replace("тм", "tm").replace("тб", "tb").replace("х", "x")
}

function search() {
    const query = $("#searchInput").val().toLowerCase().trim()

    const lineList = $("#linesCategory > .results")
    const vehicleList = $("#vehiclesCategory > .results")
    const stopList = $("#stopsCategory > .results")

    lineList.empty()
    vehicleList.empty()
    stopList.empty()

    if (query.length === 0) {
        $(".search-info").removeClass("d-none")
        $(".search-results").addClass("d-none")
        return
    }
    
    let filteredLines = []
    let filteredVehicles = []
    let filteredStops = []

    filteredLines = lines.filter(line => formatForComparison(line.name) === formatForComparison(query)).sort((a, b) => vehicleTypesSortingOrder.indexOf(a.type) - vehicleTypesSortingOrder.indexOf(b.type))

    if (filteredLines.length > 0) {
        filteredVehicles.push(...sortVehicles(activeVehicles.filter(vehicle => formatForComparison(vehicle.line) === formatForComparison(query))))
    }

    filteredVehicles.push(...sortVehicles(activeVehicles.filter(vehicle => vehicle.fleetNumber.startsWith(query) && !filteredVehicles.find(vehicle_ => vehicle_.id === vehicle.id))))
    filteredVehicles.push(...sortVehicles(activeVehicles.filter(vehicle => vehicle.fleetNumber.includes(query) && !filteredVehicles.find(vehicle_ => vehicle_.id === vehicle.id))))

    if (query.length >= 2) {
        filteredStops = stops.filter(stop => stop.code.includes(query) || stop.names[language.code].toLowerCase().includes(query.toLowerCase()))
    }

    if (filteredVehicles.length === 0) {
        filteredVehicles.push(...sortVehicles(activeVehicles.filter(vehicle => vehicle.model && (vehicle.model.toLowerCase().includes(query) || vehicle.model.toLowerCase().replace("š", "s").includes(query)))))
    }

    for (const line of filteredLines) {
        lineList.append(/*html*/`
            <div class="result">
                <span class="line ${line.type}">
                    <span class="icon"></span>
                    <span class="number">${line.name}</span>
                </span>
            </div>
        `)
    }

    for (const vehicle of filteredVehicles) {
        vehicleList.append(/*html*/`
            <div class="result" onclick="showVehicle('${vehicle.id}')">
                <div class="vehicle-info">
                    <span class="line ${vehicle.type}">
                        <span class="icon"></span>
                        <span class="number">${vehicle.line}</span>
                    </span>
                    <span class="vehicle">${language.vehicleTypes[vehicle.type]} #${vehicle.fleetNumber}</span>
                </div>
                <div class="vehicle-model">${getVehicleFeatureIcons(vehicle)}<span>${vehicle.model || language.vehicleTypes.unknown}</span></div>
            </div>
        `)
    }

    for (const stop of filteredStops) {
        stopList.append(/*html*/`
            <div class="result" onclick="showStop('${stop.code}')">
                <span class="stop">${stop.names[language.code]} (${stop.code})</span>
            </div>
        `)
    }

    if (filteredLines.length === 0 && filteredVehicles.length === 0 && filteredStops.length === 0) {
        $(".search-info").removeClass("d-none")
        $(".search-results").addClass("d-none")
    } else {
        $(".search-info").addClass("d-none")
        $(".search-results").removeClass("d-none")

        if (filteredLines.length > 0) {
            lineList.parent().removeClass("d-none")
        } else {
            lineList.parent().addClass("d-none")
        }

        if (filteredVehicles.length > 0) {
            vehicleList.parent().removeClass("d-none")
        } else {
            vehicleList.parent().addClass("d-none")
        }

        if (filteredStops.length > 0) {
            stopList.parent().removeClass("d-none")
        } else {
            stopList.parent().addClass("d-none")
        }
    }
}

function filter() {
    const vehicleType = $("#vehicleTypeFilter").val()

    if (vehicleType === "all") {
        for (const layer of [...Object.values(vehicleLayers), ...Object.values(circleVehicleLayers)]) {
            layer.addTo(map)
        }
    } else if (vehicleType === "tram") {
        for (const layer of [...Object.values(vehicleLayers), ...Object.values(circleVehicleLayers)]) {
            layer.removeFrom(map)
        }

        vehicleLayers.tram.addTo(map)
        circleVehicleLayers.tram.addTo(map)
    } else if (vehicleType === "trolley") {
        for (const layer of [...Object.values(vehicleLayers), ...Object.values(circleVehicleLayers)]) {
            layer.removeFrom(map)
        }

        vehicleLayers.trolley.addTo(map)
        circleVehicleLayers.trolley.addTo(map)
    } else if (vehicleType === "bus") {
        for (const layer of [...Object.values(vehicleLayers), ...Object.values(circleVehicleLayers)]) {
            layer.removeFrom(map)
        }

        vehicleLayers.bus.addTo(map)
        vehicleLayers.night.addTo(map)
        circleVehicleLayers.bus.addTo(map)
        circleVehicleLayers.night.addTo(map)
    }

    if (map.getZoom() < 15 && getVehiclesInBounds() > 40) {
        map.removeLayer(vehiclesLayer)
        map.addLayer(circleVehiclesLayer)
    } else {
        map.addLayer(vehiclesLayer)
        map.removeLayer(circleVehiclesLayer)
    }
}

function checkMarkerBounds(marker, layer) {
    if (currentMapBounds.contains(marker.getLatLng())) {
        marker.addTo(layer)
    } else {
        marker.removeFrom(layer)
    }
}

function getVehiclesInBounds() {
    const vehiclesInBounds = []

    for (const vehicle of activeVehicles) {
        if (currentMapBounds.contains(vehicle.marker.getLatLng()) && (map.hasLayer(vehicleLayers[vehicle.type]) || map.hasLayer(circleVehicleLayers[vehicle.type]))) {
            vehiclesInBounds.push(vehicle)
        }
    }

    return vehiclesInBounds.length
}

function transliterate(text) {
    const transliteratedCharacters = {
        А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ж: "ZH", З: "Z", И: "I", Й: "Y",
        К: "K", Л: "L", М: "M", Н: "N", О: "O", П: "P", Р: "R", С: "S", Т: "T", У: "U",
        Ф: "F", Х: "H", Ц: "TS", Ч: "CH", Ш: "SH", Щ: "SHT", Ъ: "A", Ь: "Y", Ю: "YU", Я: "YA"
    }

    return text.split("").map(char => transliteratedCharacters[char] || char).join("")
}

async function checkForAnnouncements(noticesChain = Promise.resolve()) {
    const announcements = await fetch(`${apiUrlMain}/announcements`).then(response => response.json())
    const activeAnnouncements = announcements.filter(announcement => !document.cookie.split("; ").find(row => row.startsWith(`announcement-${announcement.id}=true`)))

    activeAnnouncements.forEach(announcement => {
        noticesChain = noticesChain.then(() => showAnnouncement(announcement))
    })
}

function showAnnouncement(announcement) {
    return new Promise(resolve => {
        const modal = $(/*html*/`
            <div id="announcement-${announcement.id}" class="notice-modal-container modal-container">
                <div class="modal-backdrop"></div>

                <div class="notice-modal">
                    <div>${announcement[language.code]}</div>
                    <button id="announcement-close" class="btn btn-primary">${language.actions.okay}</button>
                </div>
            </div>
        `)

        $("body").append(modal)

        $(`#announcement-${announcement.id} #announcement-close`).one("click", function () {
            setSetting(`announcement-${announcement.id}`, Date.now())
            modal.addClass("hidden")
            setTimeout(() => modal.remove(), 250)
            resolve(modal)
        })
    })
}

function getSetting(setting, bool) {
    const value = localStorage.getItem(setting)
    return bool ? value === "true" : value
}

function setSetting(setting, value) {
    localStorage.setItem(setting, value)
}

function loadLanguage() {
    language = languages[localStorage.language]

    $("[data-i18n]").each(async function () {
        const key = $(this).attr("data-i18n")
        const path = key.split(".")
		const translation = path.reduce((acc, cur) => acc[cur], language)

        if (!translation) return;

        if ($(this).is("input[type=\"search\"]")) {
            $(this).attr("placeholder", translation)
        } else {
            $(this).text(translation)
        }
    })

    for (const vehicle of activeVehicles) {
        VehicleMarker(vehicle)
    }

    for (const stop of stops) {
        StopMarker(stop)
    }
}