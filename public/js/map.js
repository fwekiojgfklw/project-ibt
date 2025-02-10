// const apiUrl = "http://localhost:2000"
const apiUrlMain = "https://sofiatraffic-api-v4.bpilot253.com"
const apiUrl = "https://proud-butterfly-93f5.bpilot253.workers.dev"
// const websocketUrl = "ws://localhost:2000/websocket"
// const websocketUrl = "wss://sofiatraffic-api-v4.bpilot253.com/websocket"
const websocketUrl = "wss://proud-butterfly-93f5.bpilot253.workers.dev/websocket"

const origin = [42.69671, 23.32129]

const map = L.map("map", {
    center: origin,
    zoom: 15,
    preferCanvas: true,
    zoomSnap: 0.1,
    attributionControl: false,
});

map.zoomControl.setPosition("topright");

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    minZoom: 10,
    maxZoom: 19,
    // attribution: "&copy; <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>"
}).addTo(map);

const clusterGroup = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: false,
    removeOutsideVisibleBounds: true,
    disableClusteringAtZoom: 15,
}).addTo(map);

// const stopsLayer = L.featureGroup.subGroup(clusterGroup).addTo(map)
const stopsLayer = L.featureGroup().addTo(map)
const polylinesLayer = L.featureGroup().addTo(map)
const circleVehiclesLayer = L.featureGroup()
const vehiclesLayer = L.featureGroup().addTo(map)

const vehicleLayers = {
    bus: L.featureGroup.subGroup(vehiclesLayer).addTo(map),
    night: L.featureGroup.subGroup(vehiclesLayer).addTo(map),
    tram: L.featureGroup.subGroup(vehiclesLayer).addTo(map),
    trolley: L.featureGroup.subGroup(vehiclesLayer).addTo(map),
    filtered: L.featureGroup.subGroup(vehiclesLayer).addTo(map),
}

const circleVehicleLayers = {
    bus: L.featureGroup.subGroup(circleVehiclesLayer).addTo(map),
    night: L.featureGroup.subGroup(circleVehiclesLayer).addTo(map),
    tram: L.featureGroup.subGroup(circleVehiclesLayer).addTo(map),
    trolley: L.featureGroup.subGroup(circleVehiclesLayer).addTo(map),
    filtered: L.featureGroup.subGroup(vehiclesLayer).addTo(map),
}

// L.control.layers(null, {
//     "Спирки": stopsLayer,
//     "Метростанции": stationsLayer,
//     "Автобуси": vehicleLayers.bus,
//     "Трамваи": vehicleLayers.tram,
//     "Тролейбуси": vehicleLayers.trolley,
// }).addTo(map);

let stops, lines, tramCompositions, languages, language;
let polylines = []
const activeVehicles = []
let vehicleToSearch;
let currentMapBounds = map.getBounds()

const stationIcon = L.icon({
    iconUrl: "images/metro_icon.svg",
    iconSize: [16, 16],
    tooltipAnchor: [0, -8],
    popupAnchor: [0, -8]
});

const vehicleIcons = {
    bus: L.icon({
        iconUrl: "images/bus_icon.png",
        iconSize: [35, 35],
        tooltipAnchor: [0, -18],
        popupAnchor: [0, -18]
    }),

    night: L.icon({
        iconUrl: "images/bus_icon.png",
        iconSize: [35, 35],
        tooltipAnchor: [0, -18],
        popupAnchor: [0, -18]
    }),

    tram: L.icon({
        iconUrl: "images/tram_icon.png",
        iconSize: [35, 35],
        tooltipAnchor: [0, -18],
        popupAnchor: [0, -18]
    }),

    trolley: L.icon({
        iconUrl: "images/trolleybus_icon.png",
        iconSize: [35, 35],
        tooltipAnchor: [0, -18],
        popupAnchor: [0, -18]
    }),
}

const vehicleTypes = {
    bus: "Автобус",
    night: "Автобус",
    tram: "Трамвай",
    trolley: "Тролейбус",
}

const lineTypeColors = {
    bus: "#bd202e",
    night: "#000000",
    tram: "#f7941f",
    trolley: "#0095da",
}

const numericalTypeReplacements = {
    1: "bus",
    2: "tram",
    4: "trolley",
    5: "night"
}

const typeReplacements = {
    "bus": "A",
    "night": "A",
    "tram": "TM",
    "trolley": "TB"
}

const reverseTypeReplacements = {
    "A": "bus",
    "TM": "tram",
    "TB": "trolley"
}

const FilterVehicles = function (vehicleId, vehicleType) {
    if (vehicleId === "") return;

    let matchingVehicles
    
    if (vehicleType === undefined) {
        matchingVehicles = activeVehicles.filter(vehicle => vehicle.id === vehicleId)
    } else if (vehicleType === "") {
        vehicleId = vehicleId.padStart(4, "0")
        matchingVehicles = activeVehicles.filter(vehicle => vehicle.id.replace(/[a-z]/gi, "") === vehicleId || (vehicle.id.includes("+") && vehicle.id.replace(/[a-z]/gi, "").includes(vehicleId)))
    } else {
        vehicleId = vehicleId.padStart(4, "0")
        matchingVehicles = activeVehicles.filter(vehicle => vehicle.id === `${vehicleType}${vehicleId}` || (vehicle.id.includes("+") && vehicle.id.includes(vehicleType) && vehicle.id.includes(vehicleId)))
    }

    if (matchingVehicles.length === 0) {
        vehicleToSearch = { vehicleId, vehicleType }
        return
    }

    map.closePopup()

    map.fitBounds(matchingVehicles.map(vehicle => vehicle.marker.getLatLng()), { maxZoom: 16, animate: false })

    if (matchingVehicles.length === 1) {
        matchingVehicles[0].marker.openPopup()
    }

    return true
};

let retries = 0

const ConnectToWebSocket = function (temp) {
    if (!temp) {
        retries++

        if (retries > 5) {
            return console.log("Failed to connect to web socket")
        }
    }

    const ws = new WebSocket(websocketUrl)

    if (!temp) {
        ws.onopen = () => {
            retries = 0
            console.log("Connected")
        }

        ws.onerror = (error) => {
            console.error(error)
        }
    
        ws.onclose = () => {
            console.log("Disconnected")
            setTimeout(ConnectToWebSocket, 2000)
        }
    }

    ws.onmessage = (event) => {
        const vehicles = (JSON.parse(event.data)).avl
        
        // vehiclesLayer.eachLayer(function (marker) {
        //     if (!vehicles.find(vehicle => vehicle.vehicleId === marker.options.vehicleId) && Date.now() - marker.options.lastUpdated > 60000) {
        //         vehiclesLayer.removeLayer(marker)
        //     }
        // })

        for (const vehicle of vehicles) {
            if (vehicle.vehicleType === "tram" && isSecondCar(vehicle.vehicleId) || vehicle.latitude === 0 || vehicle.longitude === 0) continue;

            if (vehicle.vehicleType === "tram") {
                const secondCar = getSecondCar(vehicle.vehicleId)
                
                if (secondCar) {
                    vehicle.vehicleId += `+${secondCar}`
                }
            }

            let vehicleObject = activeVehicles.find(activeVehicle => activeVehicle.id === vehicle.vehicleId)

            if (vehicleObject) {
                if (Math.floor(vehicleObject.geo.current.timestamp / 1000) === Math.floor(Date.now() / 1000) || (vehicleObject.geo.current.coords[0] === vehicle.latitude && vehicleObject.geo.current.coords[1] === vehicle.longitude)) continue;

                vehicleObject.lastUpdated = Date.now()
                vehicleObject.geo.previous = vehicleObject.geo.current
                vehicleObject.geo.current = {
                    coords: [vehicle.latitude, vehicle.longitude],
                    timestamp: Date.now()
                }

                vehicleObject.geo.speed = calculateSpeed(vehicleObject.geo)

                // if (vehicleObject.geo.speed > 100) {
                //     console.log("Abnormally high speed", vehicleObject.geo.speed, {
                //         id: vehicleObject.id,
                //         lastUpdated: vehicleObject.lastUpdated,
                //         geo: {
                //             speed: vehicleObject.geo.speed,
                //             distance: calculateDistance(vehicleObject.geo.previous.coords, vehicleObject.geo.current.coords) / 1000,
                //             time: (vehicleObject.geo.current.timestamp - vehicleObject.geo.previous.timestamp) / 1000,
                //             previous: {
                //                 coords: vehicleObject.geo.previous.coords,
                //                 timestamp: vehicleObject.geo.previous.timestamp
                //             },
                //             current: {
                //                 coords: vehicleObject.geo.current.coords,
                //                 timestamp: vehicleObject.geo.current.timestamp
                //             }
                //         }
                //     })

                //     L.circleMarker(vehicleObject.geo.previous.coords, { radius: 10, stroke: false, fill: true, fillColor: "#00FF00", fillOpacity: 1 }).addTo(map)
                //     L.circleMarker(vehicleObject.geo.current.coords, { radius: 10, stroke: false, fill: true, fillColor: "#FF0000", fillOpacity: 1 }).addTo(map)
                // }

                if (vehicleObject.geo.speed > 3) {
                    vehicleObject.geo.bearing = calculateBearing(vehicleObject.geo)
                }
            } else {
                vehicleObject = {
                    id: vehicle.vehicleId,
                    fleetNumber: normaliseVehicleId(vehicle.vehicleId, true),
                    type: normaliseVehicleType(vehicle),
                    features: {},
                    line: "",
                    lastUpdated: Date.now(),
                    geo: {
                        bearing: null,
                        speed: null,
                        previous: null,
                        current: {
                            coords: [vehicle.latitude, vehicle.longitude],
                            timestamp: Date.now()
                        }
                    }
                }

                const model = getVehicleModel(vehicleObject)

                vehicleObject.model = model.name
                vehicleObject.features.lowFloor = model.lowFloor
                vehicleObject.features.ac = model.ac

                activeVehicles.push(vehicleObject)
            }

            vehicleObject.lineId = vehicle.line

            if (vehicle.line !== "") {
                vehicleObject.lineId = `${typeReplacements[vehicle.vehicleType]}${vehicle.line}`
                const line = lines.find(line => line.id === vehicleObject.lineId)

                if (line) {
                    vehicleObject.line = line.name

                    if (vehicleObject.line.includes("N")) {
                        vehicleObject.type = "night"
                    // } else {
                    //     vehicleObject.type = line.type
                    }
                }
            }

            VehicleMarker(vehicleObject)
        }

        for (const vehicle of activeVehicles) {
            if (Date.now() - vehicle.lastUpdated > 5 * 60000) {
                vehiclesLayer.removeLayer(vehicle.marker)
                vehiclesLayer.removeLayer(vehicle.circleMarker)
                activeVehicles.splice(activeVehicles.indexOf(vehicle), 1)
                continue
            }
        }

        if (temp) {
            ws.close()
        }
    }
};

(async function () {
    const sofiaTrafficCheck = await fetch(`${apiUrl}/check`)
    
    if (!sofiaTrafficCheck.ok) {
        $("body").empty()

        $("body").append(/*html*/`
            <div class="notice text-center">
                <p>Поради ограничения, наложени от Център за градска мобилност, сайтът не е достъпен извън територията на Република България.</p>
                <p>Използването на VPN услуга с местоположение в България може да Ви помогне да получите достъп до сайта.</p>
                <p>Извиняваме се за причиненото неудобство.</p>
                <br><br>
                <p>Due to limitations imposed by the Sofia Urban Mobility Center, the site is not accessible outside the territory of the Republic of Bulgaria.</p>
                <p>Using a VPN service with a location in Bulgaria can help you access the site.</p>
                <p>Apologies for any inconvenience caused.</p>
            </div>
        `)
    
        return
    };

    let noticesChain = Promise.resolve()

    if (window.top !== window.self) {
        noticesChain = noticesChain.then(() => showEmbedNotice())
    }

    if (!getSetting("welcomeNotice", true)) {
        noticesChain = noticesChain.then(() => showWelcomeNotice())
    }

    let dStops, cgmLines, cgmStops

    [ dStops, cgmLines, cgmStops, tramCompositions ] = await Promise.all([
        fetch("https://raw.githubusercontent.com/Dimitar5555/sofiatraffic-schedules/refs/heads/master/docs/data/stops.json").then(response => response.json()),
        fetch(`${apiUrl}/lines`).then(response => response.json()),
        fetch(`${apiUrl}/stops`).then(response => response.json()),
        fetch(`${apiUrlMain}/tram-compositions`).then(response => response.json()),
    ])

    // fetch(`${apiUrl}/lines-data`).then(response => response.json()).then(routes => {
    //     for (const route of routes) {
    //         buildRoute(route)
    //     }
    // })

    // const linePromises = []
    lines = []

    for (const line of cgmLines) {
        if (line.type === 3) continue;

        lines.push({
            id: line.ext_id,
            type: numericalTypeReplacements[line.type], //line.subtype === "night" ? "night" : line.type
            name: line.name,
        })

        // linePromises.push(fetch(`${apiUrl}/line/${line.ext_id}`).then(response => response.json()))
    }
    
    // Promise.all(linePromises).then(data => {
    //     for (const line of data) {
    //         buildRoute(line)
    //     }
    // })

    // [ stops, { stops: cgmStops, lines: cgmLines }, routes ] = await Promise.all([
    //     fetch("https://raw.githubusercontent.com/Dimitar5555/sofiatraffic-schedules/refs/heads/master/docs/data/stops.json").then(response => response.json()),
    //     // fetch("https://raw.githubusercontent.com/Dimitar5555/sofiatraffic-schedules/refs/heads/master/docs/data/routes.json").then(response => response.json()),
    //     fetch(`${apiUrl}/data`).then(response => response.json()),
    //     fetch(`${apiUrl}/lines-data`).then(response => response.json()),
    // ])

    stops = []

    for (const stop of dStops) {
        // if (2900 < stop.code && stop.code < 6000) continue;

        const stopCode = stop.code.toString().padStart(4, "0")

        const stopName = stop.names.bg

        stops.push({
            code: stopCode,
            names: {
                bg: stopName,
                en: transliterate(stopName)
            },
            coords: stop.coords
        })
    }

    for (const stop of cgmStops) {
        if (stop.code.length !== 4 || stops.find(stop_ => stop_.code === stop.code)) continue;

        const stopName = stop.name.toUpperCase()

        stops.push({
            code: stop.code,
            names: {
                bg: stopName,
                en: transliterate(stopName)
            },
            coords: [stop.latitude, stop.longitude]
        })
    }

    if (!getSetting("language")) {
		setSetting("language", "bg")
    }

    languages = {}

    const translations = await Promise.all([
        fetch("i18n/bg.json").then(response => response.json()),
        fetch("i18n/en.json").then(response => response.json())
    ])

    for (const translation of translations) {
        languages[translation.code] = translation
    }
    
    loadLanguage()

    for (const stop of stops) {
        StopMarker(stop)
    }

    const announcements = await fetch(`${apiUrlMain}/announcements`).then(response => response.json())
    const announcementsToShow = announcements.filter(announcement => {
        const timestamp = getSetting(`announcement-${announcement.id}`)

        if (!timestamp || Date.now() - timestamp > 24 * 60 * 60 * 1000) {
            return true
        }
    })

    announcementsToShow.forEach(announcement => {
        noticesChain = noticesChain.then(() => showAnnouncement(announcement))
    })

    const oldAnnouncements = Object.keys(localStorage).filter(key => key.startsWith("announcement-") && !announcements.find(announcement => announcement.id.toString() === key.replace("announcement-", "")))
    
    for (const key of oldAnnouncements) {
        localStorage.removeItem(key)
    }

    init()

    ConnectToWebSocket()

    $(".loading-screen").addClass("d-none")
})();

map.on("zoomend", function () {
    if (map.getZoom() < 15) {
        map.removeLayer(stopsLayer)
    } else {
        map.addLayer(stopsLayer)
    }
    
    // if (map.getZoom() < 15) {
    //     map.removeLayer(vehiclesLayer)
    //     map.addLayer(circleVehiclesLayer)
    // } else {
    //     map.addLayer(vehiclesLayer)
    //     map.removeLayer(circleVehiclesLayer)
    // }
});

map.on("moveend", function () {
    currentMapBounds = map.getBounds()

    for (const vehicle of activeVehicles) {
        checkMarkerBounds(vehicle.marker, vehicleLayers[vehicle.type])
    }

    if (map.getZoom() < 15 && getVehiclesInBounds() > 40 && !getSetting("noCircleMarkers", true)) {
        map.removeLayer(vehiclesLayer)
        map.addLayer(circleVehiclesLayer)
    } else {
        map.addLayer(vehiclesLayer)
        map.removeLayer(circleVehiclesLayer)
    }
});

function showEmbedNotice() {
    return new Promise(resolve => {
        const modal = $(/*html*/`
            <div id="embedNotice" class="notice-modal-container modal-container">
                <div class="modal-backdrop"></div>
    
                <div class="notice-modal">
                    <div>
                        Преглеждате вградена версия на сайта. За най-голямо удобство и производителност препоръчваме да отворите сайта в самостоятелен прозорец. Искате ли да направите това?
                    </div>
                    <div>
                        You are viewing an embedded version of the site. For the best experience, we suggest to open the site in a standalone window. Would you like to do that?
                    </div>
                    <button class="btn btn-primary" onclick="window.top.location.href = 'https:\/\/livemap-sofiatraffic.bpilot253.com'">
                        Да, отвори в самостоятелен прозорец.<br>Yes, open in a standalone window.
                    </button>
                    <button id="stayHereButton" class="btn btn-danger">
                        Не, остани тук.<br>No, stay here.
                    </button>
                </div>
            </div>
        `)
    
        $("body").append(modal)
    
        $("#stayHereButton").one("click", function () {
            modal.addClass("hidden")
            setTimeout(() => modal.remove(), 250)
            resolve()
        })
    })
}

function showWelcomeNotice() {
    return new Promise(resolve => {
        const modal = $(/*html*/`
            <div id="welcomeNotice" class="notice-modal-container modal-container">
                <div class="modal-backdrop"></div>
    
                <div class="notice-modal">
                    <div>
                        Сайтът е разработен абсолютно безвъзмездно и по никакъв начин не е официално свързан с Център за градска мобилност.
                        <br>
                        За повече информация относно създателя и сайта, както и за отзиви и препоръки, погледнете секцията "За сайта" в менюто, което се отваря чрез бутона с трите черти.
                    </div>
                    <div>
                        The site has been developed absolutely free of charge and is not officially affiliated with Sofia Urban Mobility Center in any way.
                        <br>
                        For more information about the creator and the site, as well as feedback and suggestions, take a look in the "About the site" section in the menu, which opens via the button with the three lines.
                    </div>
                    <button id="welcomeAckButton" class="btn btn-primary">
                        Разбрах.<br>I understood.
                    </button>
                </div>
            </div>
        `)
    
        $("body").append(modal)

        $("#welcomeAckButton").one("click", function () {
            setSetting("welcomeNotice", true)
            modal.addClass("hidden")
            setTimeout(() => modal.remove(), 250)
            resolve()
        })
    })
}

function openSidebar() {
    closeStopModal()
    $(".sidebar").removeClass("closed")
    $(".backdrop").removeClass("hidden")
}

function collapseSidebar() {
    $(".sidebar").addClass("closed")
    $(".backdrop").addClass("hidden")
}

function setButtonActive(button) {
    button.addClass("active")
    button.siblings().removeClass("active")
    $("div.menu").addClass("hidden")
    collapseSidebar()
}

function closeSearchModal() {
    const lineList = $("#linesCategory > .results")
    const vehicleList = $("#vehiclesCategory > .results")
    const stopList = $("#stopsCategory > .results")

    $(".search-modal-container").addClass("hidden")

    $(".search-info").removeClass("d-none")
    $(".search-results").addClass("d-none")

    $("#searchInput").val("")

    lineList.empty()
    vehicleList.empty()
    stopList.empty()
}

function closeStopModal() {
    $(".stop-modal").addClass("closed")
    $(".stop-modal .stop-name").empty()
    $(".stop-modal .arrivals").empty()
}

function init() {
    $(document).on("keydown", function (event) {
        if (event.key === "Escape") {
            closeSearchModal()
        }
    })

    $("#searchInput").on("input", search)

    $("#menuButton").on("click", openSidebar)
    $(".backdrop").on("click", collapseSidebar)

    $("#searchButton").on("click", function () {
        closeStopModal()
        $(".search-modal-container").removeClass("hidden")
        $("#searchInput").focus()
    })

    $(".search-modal-container .modal-backdrop").on("click", closeSearchModal)
    $(".search-modal-container .modal-close").on("click", closeSearchModal)

    $("#filterButton").on("click", function () {
        closeStopModal()
        $(".filter-modal-container").removeClass("hidden")
    })

    $(".filter-modal-container .modal-backdrop").on("click", function () {
        $(".filter-modal-container").addClass("hidden")
    })

    $(".filter-modal-container .modal-close").on("click", function () {
        $(".filter-modal-container").addClass("hidden")
    })

    $("#locationButton").on("click", function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                const coords = [position.coords.latitude, position.coords.longitude]
                map.setView(coords, 17)
                $("#locationButton .icon").addClass("on")
            }, function () {
                alert(language.errors.getLocation)
            })
        } else {
            alert(language.errors.noLocation)
        }
    })

    $(".stop-modal .modal-close").on("click", closeStopModal)

    $("#mapButton").on("click", function () {
        setButtonActive($(this))
    })

    $("#settingsButton").on("click", function () {
        setButtonActive($(this))
        $(".settings-menu").removeClass("hidden")
    })

    $("#aboutButton").on("click", function () {
        setButtonActive($(this))
        $(".about-menu").removeClass("hidden")
    })

    $(".setting input[type='checkbox']").each(function () {
        const name = $(this).attr("id")
        const value = getSetting(name, true)
        
        if (value !== null) {
            $(this).prop("checked", value)
        }

        $(this).on("change", function () {
            const value = $(this).is(":checked")

            setSetting(name, value)

            if (name === "simpleMarkers") {
                for (const vehicle of activeVehicles) {
                    VehicleMarker(vehicle)
                }
            }
        })
    });

    $(".setting input[type='radio']").each(function () {
        const name = $(this).attr("name")
        const radioValue = $(this).attr("value")
        const value = getSetting(name)
        
        if (radioValue === value) {
            $(this).prop("checked", value)
        }

        $(this).on("change", async function () {
            const value = $(this).is(":checked")

            if (value) {
                setSetting(name, radioValue)

                if (name === "language") {
                    loadLanguage()
                }
            }
        })
    });

    const url = new URL(window.location.href)
    const vehicleId = url.searchParams.get("vehicle")
    
    if (vehicleId) {
        FilterVehicles(vehicleId)
    }
}