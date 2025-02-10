function waitForPolyline(vehicle) {
    return new Promise(resolve => {
        const check = setInterval(() => {
            const polyline = polylines.find(polyline => polyline.id === vehicle.lineId)

            if (polyline) {
                clearInterval(check)
                resolve(polyline)
            }
        }, 250)
    })
}

function StopMarker(stop) {
    let marker

    if (stop.code.length < 4 || (2900 < stop.code && stop.code < 6000)) {
        marker = stop.marker || L.marker(stop.coords, { icon: stationIcon, riseOnHover: true, keyboard: false })
    } else {
        marker = stop.marker || L.circleMarker(stop.coords, { radius: 5, stroke: true, color: "#0064FF", weight: 1.5, fill: true, fillColor: "#FFF", fillOpacity: 1 })
    }

    stop.marker = marker

    const tooltip = stop.marker.getTooltip() || L.tooltip({ direction: "top" })
    const popup = stop.marker.getPopup() || L.popup({ className: "stop-popup", maxWidth: 500 })
    
    tooltip.setContent(`${stop.names[language.code]} (${stop.code})`)

    popup.setContent(/*html*/`
        <div class="popup-row">
            <p class="title">${stop.names[language.code]} (${stop.code})</p>
        </div>
    `)

    if (!stop.marker.getTooltip()) {
        stop.marker.bindTooltip(tooltip)
        stop.marker.bindPopup(popup)

        // stop.marker.open = async function () {
        //     closeStopModal()
        //     $(".stop-modal .stop-name").text(`${stop.names[language.code]} (${stop.code})`)
        //     $(".stop-modal .spinner-border").show()
        //     $(".stop-modal").removeClass("closed")

        //     const data = await fetch(`${apiUrl}/virtual-board/${stop.code}`).then(response => response.json())

        //     $(".stop-modal .arrivals").empty()
    
        //     for (const route of data) {
        //         if (route.type === "metro") {
        //             route.type = `metro ${route.name}`
        //             route.name = route.name.replace("M", "")
        //         }
        //     }

        //     const arrivals = data.map(route => /*html*/`
        //         <div class="arrival">
        //             <span class="line ${route.type}">
        //                 <span class="icon"></span>
        //                 <span class="number">${route.name}</span>
        //             </span>
        //             <span class="destination">${stops.find(stop => stop.code === route.lastStop.replace("M", "")).names[language.code]}</span>
        //             <span class="times">${route.times.map(time => /*html*/`<strong>${time.t}</strong>`).join(", ")} ${language.min}</span>
        //         </div>
        //     `)

        //     $(".stop-modal .spinner-border").hide()
        //     $(".stop-modal .arrivals").append(arrivals.join(""))
        // }

        // stop.marker.on("click", stop.marker.open)

        stop.marker.on("popupopen", async function () {
            tooltip.setOpacity(0)
    
            const data = await fetch(`${apiUrl}/virtual-board/${stop.code}`).then(response => response.json())
    
            for (const route of data) {
                if (route.type === "metro") {
                    route.type = route.name
                }
            }
    
            const arrivals = data.map(route => /*html*/`
                <div class="popup-row route">
                    <span class="line-number ${route.type}">${route.name}</span>
                    <span class="times">${route.times.map(time => /*html*/`<strong>${time.t}</strong>`).join(", ")} ${language.min}</span>
                </div>
            `)
            
            popup.setContent(/*html*/`
                <div class="popup-row">
                    <p class="title">${stop.names[language.code]} (${stop.code})</p>
                </div>
                ${arrivals.length > 0 ? /*html*/`
                    <div class="arrivals">
                        ${arrivals.join("")}
                    </div>
                `: /*html*/`
                    <div class="popup-row">${language.noArrivals}</div>
                `}
            `)
        })
    
        stop.marker.on("popupclose", function () {
            tooltip.setOpacity(0.9)
    
            popup.setContent(/*html*/`
                <div class="popup-row">
                    <p class="title">${stop.names[language.code]} (${stop.code})</p>
                </div>
            `)
        })
    
        stop.marker.addTo(stopsLayer)
    }
}

function CircleVehicleMarker(vehicle) {
    const vehicleType = vehicle.type
    const marker = vehicle.circleMarker || L.circleMarker(null, { radius: 5, stroke: false, fill: true, fillColor: lineTypeColors[vehicleType], fillOpacity: 1 })
    
    marker.setLatLng(vehicle.geo.current.coords)
        .addTo(circleVehicleLayers[vehicleType])

    if (!vehicle.circleMarker) {
        vehicle.circleMarker = marker

        marker.on("click", function () {
            showVehicle(vehicle.id)
        })
    }
}

function VehicleMarker(vehicle) {
    CircleVehicleMarker(vehicle)

    const vehicleType = vehicle.type
    const vehicleModel = vehicle.model || language.vehicleTypes.unknown
    const hasBearing = vehicle.geo.bearing !== null
    const hasSpeed = vehicle.geo.speed !== null && vehicle.geo.speed !== undefined
    const bearing = hasBearing && vehicle.geo.bearing + 45

    const marker = vehicle.marker || L.marker(null, { zIndexOffset: 1000, riseOnHover: true, rotationOrigin: "center center" })
    const popup = marker.getPopup() || L.popup({ className: "vehicle-popup", /*autoPan: false,*/ minWidth: 200, maxWidth: 500 })
    const tooltip = marker.getTooltip() || L.tooltip({ direction: "top" })

    tooltip.setContent(/*html*/`${language.vehicleTypes[vehicleType]} #<strong>${vehicle.fleetNumber}</strong>${vehicle.line ? /*html*/`, <span class="line-number ${vehicleType}">${language.vehicle.lowercaseLine} <strong>${vehicle.line}</strong></span>` : ""}`)

    popup.setContent(/*html*/`
        <div class="popup-row vehicle-header ${vehicleType}">
            <p class="title"><span class="vehicle-id">${language.vehicleTypes[vehicleType]} #${vehicle.fleetNumber}</span><a class="icon copy" title="${language.vehicle.copyLink}" onclick="navigator.clipboard.writeText(window.location.href)"></a></p>
            <div class="info">
                <p class="vehicle-model">${getVehicleFeatureIcons(vehicle)}<span>${vehicleModel || language.vehicleTypes.unknown}</span></p>
                <span class="line-number ${vehicleType}">${vehicle.line === "" ? language.vehicle.noLine : `${language.vehicle.line} ${vehicle.line}`}</span>
                <span><i class="icon speedometer"></i> <strong>${hasSpeed ? vehicle.geo.speed : "-"}</strong> km/h</span>
            </div>
        </div>
    `)

    // if (marker.isPopupOpen()) {
    //     console.log(vehicle)
    // }

    if (!marker.getPopup()) {
        marker.bindPopup(popup)
        marker.bindTooltip(tooltip)

        let pendingRoutePromise = false

        marker.on("popupopen", function () {
            gtag("event", "vehicle_view", {
                "event_category": "vehicle",
                "event_label": vehicle.id
            })

            // marker.removeFrom(vehicleLayers[vehicleType])
            // marker.addTo(map)
            // marker.openPopup()

            tooltip.setOpacity(0)

            const url = new URL(window.location.href)
            url.searchParams.set("vehicle", vehicle.id)
            window.history.pushState({}, null, url.toString())

            if (vehicle.lineId === "") return;

            const polylineData = polylines.find(line => line.id === vehicle.lineId)

            if (polylineData) {
                // console.log(vehicle.id, vehicle.lineId, polylineData)
                // polyline.polyline.addTo(polylinesLayer)

                for (const route of polylineData.routes) {
                    route.polyline.addTo(polylinesLayer)
                }
            } else if (!pendingRoutePromise) {
                pendingRoutePromise = true

                fetch(`${apiUrl}/line/${vehicle.lineId}`).then(response => response.json()).then(data => {
                    buildRoute(data)
                })

                waitForPolyline(vehicle).then(polylineData => {
                    pendingRoutePromise = false
                    
                    if (!marker.isPopupOpen()) return;

                    // console.log(vehicle.id, vehicle.lineId, polylineData)
                    // polyline.polyline.addTo(polylinesLayer)

                    for (const route of polylineData.routes) {
                        route.polyline.addTo(polylinesLayer)
                    }
                })
            }
        })

        marker.on("popupclose", function () {
            // marker.removeFrom(map)
            // marker.addTo(vehicleLayers[vehicleType])

            tooltip.setOpacity(0.9)
            
            const url = new URL(window.location.href)
            url.searchParams.delete("vehicle")
            window.history.replaceState({}, null, url.toString())

            polylinesLayer.clearLayers()
        })
    }

    let icon

    if (getSetting("simpleMarkers", true)) {
        icon = vehicleIcons[vehicleType]

        marker.setRotationAngle(0)
    } else {
        icon = L.divIcon({
            iconSize: [30, 30],
            tooltipAnchor: [0, -15],
            popupAnchor: [0, -15],
            className: `leaflet-vehicle-icon ${vehicleType}`,
            html: /*html*/`
                <div class="vehicle-marker ${vehicleType} ${hasBearing ? "direction" : ""}">
                    <span style="${vehicle.line.length >= 4 ? "font-size: 10px !important;" : ""}${hasBearing ? `transform: rotate(-${bearing}deg);` : ""}">${vehicle.line}</span>
                </div>
            `
            // html: /*html*/`
            //     <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
            //         <style>
            //             text {
            //                 font-family: "Sofia Sans", sans-serif;
            //                 font-size: 12px;
            //                 font-weight: 700;
            //                 fill: white;
            //                 text-align: center;
            //             }
            //         </style>
            //         <circle cx="15" cy="15" r="13" stroke="white" stroke-width="2"></circle>
            //         <text x="15px" y="15px" dominant-baseline="middle" text-anchor="middle" transform="rotate(0)" transform-origin="13 13">${vehicle.line}</text>
            //     </svg>
            // `
        })

        marker.setRotationAngle(bearing)
    }

    marker.setLatLng(vehicle.geo.current.coords)
        .setIcon(icon) // vehicleIcons[vehicleType]
        // .addTo(vehicleLayers[vehicleType])
        // .addTo(marker.isPopupOpen() ? map : vehicleLayers[vehicleType])
    
    checkMarkerBounds(marker, vehicleLayers[vehicleType])
    
    if (!vehicle.marker) {
        vehicle.marker = marker

        if (vehicleToSearch && FilterVehicles(vehicleToSearch.vehicleId, vehicleToSearch.vehicleType)) {
            vehicleToSearch = null
        }
    }
}