const vehicleModels = {
    tram: [
        {
            name: "PESA Swing 122NaSF",
            lowFloor: true,
            ac: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0])
                return 2301 <= fleetNumber && fleetNumber <= 2399
            }
        },
        {
            name: "Tatra T6A2SF",
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0])
                return 2041 <= fleetNumber && fleetNumber <= 2057
            }
        },
        {
            name: "Tatra T6A2B",
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0])
                return 2033 <= fleetNumber && fleetNumber <= 2034 || 3001 <= fleetNumber && fleetNumber <= 3099
            }
        },
        {
            name: "Inekon T8M-700 IT",
            lowFloor: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0])
                return 3401 <= fleetNumber && fleetNumber <= 3499
            }
        },
        {
            name: "Schindler/Siemens Be 4/6 S",
            lowFloor: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0])
                return 601 <= fleetNumber && fleetNumber <= 699
            }
        },
        {
            name: "T8M-500 F",
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0])
                return 501 <= fleetNumber && fleetNumber <= 599
            }
        },
        {
            name: "T8M-900 F",
            lowFloor: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0])
                return 901 <= fleetNumber && fleetNumber <= 999
            }
        },
        {
            name: "T6M-700 F",
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0])
                return 701 <= fleetNumber && fleetNumber <= 899
            }
        },
        {
            name: "Tatra T6B5B",
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0])
                return 4101 <= fleetNumber && fleetNumber <= 4139
            }
        },
        {
            name: "Tatra T6A5",
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0])
                return 4140 <= fleetNumber && fleetNumber <= 4199
            }
        },
        {
            name: "Duewag GT8",
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0])
                return 4401 <= fleetNumber && fleetNumber <= 4499
            }
        }
    ],
    trolley: [
        {
            name: "Ikarus 280.92F",
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [2108, 2903].includes(fleetNumber)
            }
        },
        {
            name: "Ikarus 280.92",
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [2123, 2702, 2703, 2913, 2915].includes(fleetNumber)
            }
        },
        {
            name: "Škoda 26Tr Solaris III",
            lowFloor: true,
            ac: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return 1601 <= fleetNumber && fleetNumber <= 1649
            }
        },
        {
            name: "Škoda 27Tr Solaris III",
            lowFloor: true,
            ac: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [[1650, 1699], [2675, 2699]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound)
            }
        },
        {
            name: "Škoda 27Tr Solaris IV",
            lowFloor: true,
            ac: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return 2801 <= fleetNumber && fleetNumber <= 2899
            }
        }
    ],
    bus: [
        {
            name: "MAN A23 Lion's City G NG313 CNG",
            lowFloor: true,
            ac: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [[1150, 1199], [1601, 1699], [2000, 2045], [2300, 2399], [3100, 3199]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound)
            }
        },
        {
            name: "Yutong ZK6126HGA",
            lowFloor: true,
            ac: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [[1201, 1299], [2046, 2099], [3600, 3649]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound)
            }
        },
        {
            name: "Yutong ZK6126HGA CNG",
            lowFloor: true,
            ac: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [[3650, 3699]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound)
            }
        },
        {
            name: "BMC Procity 12 CNG",
            lowFloor: true,
            ac: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [[1401, 1499], [3400, 3499], [7041, 7171]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound) || [[2500, 2599]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound) && vehicle.id.slice(0, 1) === "A"
            }
        },
        {
            name: "Mercedes-Benz O345 Conecto I G",
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [[1100, 1138], [2161, 2172], [3301, 3399]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound)
            }
        },
        {
            name: "Mercedes-Benz Conecto II",
            lowFloor: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [[1801, 1899]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound)
            }
        },
        {
            name: "Karsan e-JEST",
            lowFloor: true,
            ac: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [[1010, 1099]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound) || [[2501, 2505]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound) && vehicle.id.slice(0, 2) === "TB"
            }
        },
        {
            name: "BMC Belde 220 SLF",
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [[2720, 2799], [3700, 3899]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound)
            }
        },
        {
            name: "Higer KLQ6832GEV",
            lowFloor: true,
            ac: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [[2811, 2899]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound)
            }
        },
        {
            name: "Higer KLQ6125GEV3",
            lowFloor: true,
            ac: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [[1701, 1703], [5001, 5015], [5031, 5099]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound)
            }
        },
        {
            name: "Yutong E12LF",
            lowFloor: true,
            ac: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [[2800, 2810], [3011, 3099]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound)
            }
        },
        {
            name: "Mercedes-Benz O345 Conecto I C",
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [[1901, 1999]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound)
            }
        },
        {
            name: "MAN A61 SG262",
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [[2135, 2160]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound)
            }
        },
        {
            name: "Mercedes-Benz Intouro II",
            ac: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [[1301, 1399]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound)
            }
        },
        {
            name: "MAN A39 Lion's City DD ND313",
            lowFloor: true,
            ac: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [[2602, 2605]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound)
            }
        },
        {
            name: "Mercedes-Benz O345 G",
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [3592].includes(fleetNumber)
            }
        },
        {
            name: "Neoplan N4426/3 Centroliner",
            lowFloor: true,
            ac: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [2601].includes(fleetNumber)
            }
        },
        {
            name: "MAN A21 Lion's City NL313 CNG",
            lowFloor: true,
            ac: true,
            isModel: function (vehicle) {
                const fleetNumber = Number(vehicle.fleetNumber)
                return [7173, 7175].includes(fleetNumber)
            }
        }
    ]
}