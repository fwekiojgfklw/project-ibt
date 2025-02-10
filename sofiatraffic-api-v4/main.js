const fs = require("fs");
const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const WebSocket = require("ws");
const proxy = require("express-http-proxy");
const globals = require("../../../globals");
const { sofiaTraffic } = require("../../../globals");

function formatRouteName(string) {
    for (let i = 0; i < string.length; i++) {
        const character = string.charAt(i)

        if (character === character.toUpperCase()) {
            string = string.replace(character, `-${character.toLowerCase()}`)
        }
    }

    return string
}

router.use(bodyParser.urlencoded({
    extended: true
}));

router.use(bodyParser.json());
router.use(cookieParser());

router.use(cors({
    origin: ["http://localhost:2000", "http://localhost:3000", /\.?livemap-sofiatraffic\.pages\.dev$/, /\.?sofiatraffic\.pages\.dev$/, /\.?bpilot253\.com$/]
}));

router.use(rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    windowMs: 60 * 1000,
    max: async (request, response) => {
        return 180
    },
    keyGenerator: (request, response) => request.ip,
}));

const typeReplacements = {
    1: "bus",
    2: "tram",
    3: "metro",
    4: "trolley",
    5: "night"
}

const sortingOrder = ["metro", "tram", "trolley", "bus", "night"]

const routeFiles = fs.readdirSync(__dirname).filter(file => file.endsWith(".js") && file !== "main.js")

for (const routeFile of routeFiles) {
    const routeRouter = require(`./${routeFile}`)
    const routeName = formatRouteName(routeFile.replace(".js", ""))
    router.use(`/${routeName}`, routeRouter)
}

const routeFolders = fs.readdirSync(__dirname, { withFileTypes: true }).filter(folder => folder.isDirectory()).map(folder => folder.name)

for (const routeName of routeFolders) {
    const routeRouter = express.Router()

    router.use(routeRouter)

    const subrouteFiles = fs.readdirSync(`${__dirname}/${routeName}`).filter(file => file.endsWith(".js"))

    for (const subrouteFile of subrouteFiles) {
        const subrouteRouter = require(`./${routeName}/${subrouteFile}`)
        const subrouteName = formatRouteName(subrouteFile.replace(".js", ""))
        routeRouter.use(`/${subrouteName}`, subrouteRouter)
    }
}

router.get("/lines-data", async (request, response) => {
    try {
        const response_ = await fetch("https://livemap.sofiatraffic.bg/api/lines-data").then(response => response.json())
        response.json(response_)
    } catch {
        response.status(500).json([])
    }
});

// router.get("/lines-data-proxy", proxy("https://livemap.sofiatraffic.bg/api/lines-data"));

// router.get("/lines-data", async (request, response) => {
//     response.redirect("https://livemap.sofiatraffic.bg/api/lines-data")
// });

router.get("/tram-compositions", async (request, response) => {
    try {
        const data = (await globals.database.collection("st_tramCompositions").getFullList({ filter: "inactive=false" })).map(composition => composition.composition)
        return response.json(data)
    } catch (error) {
        console.error(error)
        return response.status(500).json({ error: error })
    }
});

router.get("/announcements", async (request, response) => {
    try {
        const data = (await globals.database.collection("st_announcements").getFullList({
            filter: `startDate <= "${new Date().toISOString().replace("T", " ")}" && endDate >= "${new Date().toISOString().replace("T", " ")}"`,
        })).map(announcement => {
            announcement.id = Date.parse(announcement.updated)
            return globals.cleanupPocketbaseFields(announcement)
        })
        return response.json(data)
    } catch (error) {
        console.error(error)
        return response.status(500).json({ error: error })
    }
});

// router.get("/virtual-board/:stopCode", async (request, response) => {
//     try {
//         const response_ = await fetch(`https://sofiatraffic-proxy.onrender.com/virtual-board?stop_code=${request.params.stopCode}`, {
//             headers: {
//                 Origin: "https://dimitar5555.github.io"
//             }
//         }).then(response => response.json()).then(response => response.routes)
        
//         response.json(response_)
//     } catch (error) {
//         response.status(500).json([])
//     }
// });

// router.get("/virtual-board/:stopCode", async (request, response) => {
//     const data = await sofiaTraffic.getVirtualBoard(request.params.stopCode)

//     const arrivals = Object.entries(data).map(([_, route]) => {
//         return {
//             type: typeReplacements[route.type],
//             name: route.name,
//             // routeId: route.route_id,
//             // routeName: route.route_name,
//             lastStop: route.last_stop.slice(-4),
//             times: route.details
//         }
//     }).sort((a, b) => {
//         if (a.type === b.type) {
//             return a.name.localeCompare(b.name, undefined, { numeric: true })
//         }

//         return sortingOrder.indexOf(a.type) - sortingOrder.indexOf(b.type)
//     })

//     response.json(arrivals)
// });

router.ws("/websocket", async (ws, request) => {
    const targetWs = new WebSocket("wss://livemap.sofiatraffic.bg/websocket", {
        headers: {
            Origin: "https://livemap.sofiatraffic.bg"
        }
    });
    
    targetWs.on("message", (data) => {
        if (ws.readyState === WebSocket.OPEN) {
            data = JSON.parse(data.toString())
            ws.send(JSON.stringify(data.avl))
        }
    });
    
    ws.on("close", () => {
        targetWs.close()
    });

    targetWs.on("close", () => {
        ws.close()
    });

    targetWs.on("error", (error) => {
        console.error(error)
        ws.close(1011)
    });
});

// router.use("/proxy", proxy("https://www.sofiatraffic.bg", {
//     proxyReqPathResolver: function (request) {
//         return `/bg${request.url}`
//     },
//     proxyReqOptDecorator: function (proxyRequestOptions, request) {
//         if (request.url === "/") return proxyRequestOptions;

//         proxyRequestOptions.method = "POST"
//         proxyRequestOptions.headers = {
//             "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
//             "Accept": "application/json, text/plain, */*",
//             "Accept-Language": "en-GB,en;q=0.5",
//             "Accept-Encoding": "gzip, deflate, br, zstd",
//             "X-Requested-With": "XMLHttpRequest",
//             "Content-Type": "application/json",
//             "X-XSRF-TOKEN": request.cookies["XSRF-TOKEN"],
//             "Cookie": `sofia_traffic_session=${request.cookies.sofia_traffic_session}`,
//             "Sec-Fetch-Dest": "empty",
//             "Sec-Fetch-Mode": "cors",
//             "Sec-Fetch-Site": "same-origin",
//             "Priority": "u=1",
//             "Pragma": "no-cache",
//             "Cache-Control": "no-cache",
//             "Referrer": "https://www.sofiatraffic.bg/bg/public-transport",
//             "TE": "trailers"
//         }

//         return proxyRequestOptions
//     }
// }));

module.exports = router;