// v5 - Cleaned & Fixed
const container = document.getElementById('container');
const zoneViewer = document.getElementById('zoneViewer');
let zoneFrame = document.getElementById('zoneFrame');
const searchBar = document.getElementById('searchBar');
const sortOptions = document.getElementById('sortOptions');
const filterOptions = document.getElementById('filterOptions');

const zonesurls = [
    "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/assets@main/zones.json"
];

let zonesURL = zonesurls[Math.floor(Math.random() * zonesurls.length)];

const coverBase = "https://cdn.jsdelivr.net/gh/gn-math/covers@main";
const htmlBase  = "https://cdn.jsdelivr.net/gh/gn-math/html@main";

const blockedGames = [225, 528];

const htmlOverrides = {
    114: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curly-siffle@main/114.html",
    266: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curlyi-siffle@main/266.html",
    9000: "https://raw.githubusercontent.com/ObitoCourage-commits/curly-siffle/main/9000.html?t=" + Date.now(),
    9001: "https://raw.githubusercontent.com/ObitoCourage-commits/curly-siffle/main/9001.html",
    9002: "https://raw.githubusercontent.com/ObitoCourage-commits/curly-siffle/main/9002.html",
    9003: "https://raw.githubusercontent.com/ObitoCourage-commits/curly-siffle/main/9003.html",
    9004: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curly-siffle@main/9004.html",
    9005: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curly-siffle@main/9005.html",
    9006: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curly-siffle@main/9006.html",
    9007: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curly-siffle@main/9007.html",
    9008: "https://raw.githubusercontent.com/ObitoCourage-commits/curly-siffle/main/9008.html?t=" + Date.now(),
    9009: "https://raw.githubusercontent.com/ObitoCourage-commits/curly-siffle/main/9009.html?t=" + Date.now(),
    9010: "https://raw.githubusercontent.com/ObitoCourage-commits/curly-siffle/main/9010.html?t=" + Date.now(),
    9011: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curly-siffle@main/9011.html",
    9013: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curly-siffle@main/9013.html",
    9014: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curly-siffle@main/9014.html",
    9016: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curly-siffle@main/9016.html",
    9017: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curly-siffle@main/9017.html",
    9018: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curly-siffle@main/9018.html",
    9019: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curly-siffle@main/9019.html",
    9020: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curly-siffle@main/9020.html",
    9021: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curly-siffle@main/9021.html",
    9022: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curly-siffle@main/9022.html",
    9023: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curly-siffle@main/9023.html",
    9024: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curly-siffle@main/9024.html",
    9025: "https://cdn.jsdelivr.net/gh/ObitoCourage-commits/curly-siffle@main/9025.html"
};

function getGameURL(zone) {
    const override = htmlOverrides[zone.id] || htmlOverrides[Number(zone.id)];
    if (override) return override;

    return zone.url
        .replace("{COVER_URL}", coverBase)
        .replace("{HTML_URL}", htmlBase);
}

let zones = [];
let popularityData = {};

const featuredContainer = document.getElementById('featuredZones');

function toTitleCase(str) {
    return str.replace(/\w\S*/g, text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase());
}

async function listZones() {
    try {
        // Try to get latest SHA for cache busting
        try {
            const shaRes = await fetch("https://api.github.com/repos/ObitoCourage-commits/assets/commits?per_page=1");
            if (shaRes.ok) {
                const commits = await shaRes.json();
                const sha = commits[0]?.sha;
                if (sha) {
                    zonesURL = `https://cdn.jsdelivr.net/gh/ObitoCourage-commits/assets@${sha}/zones.json`;
                }
            }
        } catch (e) {
            console.warn("Could not fetch latest SHA, using default URL");
        }

        const response = await fetch(zonesURL + "?t=" + Date.now());
        if (!response.ok) throw new Error("Failed to fetch zones.json");

        let json = await response.json();

        zones = json.filter(z => !blockedGames.includes(z.id));

        // Force first item as featured if wanted
        if (zones[0]) zones[0].featured = true;

        // Load popularity stats
        await Promise.all([
            fetchPopularity("year"),
            fetchPopularity("month"),
            fetchPopularity("week"),
            fetchPopularity("day")
        ]);

        sortZones();

        // Handle ?id= parameter
        try {
            const params = new URLSearchParams(window.location.search);
            const id = params.get('id');
            const isEmbed = window.location.hash.includes("embed");

            if (id) {
                const zone = zones.find(z => String(z.id) === String(id));
                if (zone) {
                    if (isEmbed) {
                        window.open(getGameURL(zone), "_blank");
                    } else {
                        openZone(zone);
                    }
                }
            }
        } catch (e) {}

        // Populate filter dropdown with special tags
        const allTags = [...new Set(
            json.flatMap(obj => Array.isArray(obj.special) ? obj.special : [])
        )];

        filterOptions.innerHTML = `<option value="none">All Types</option>`;
        allTags.forEach(tag => {
            const opt = document.createElement("option");
            opt.value = tag;
            opt.textContent = toTitleCase(tag);
            filterOptions.appendChild(opt);
        });

    } catch (error) {
        console.error("Error loading zones:", error);
        container.innerHTML = `<p style="color:red;">Error loading zones: ${error.message}</p>`;
    }
}

async function fetchPopularity(duration) {
    if (popularityData[duration]) return;
    popularityData[duration] = {};

    try {
        const res = await fetch(
            `https://data.jsdelivr.com/v1/stats/packages/gh/gn-math/html@main/files?period=${duration}`
        );
        const data = await res.json();

        data.forEach(file => {
            const match = file.name.match(/\/(\d+)\.html$/);
            if (match) {
                const id = parseInt(match[1]);
                popularityData[duration][id] = file.hits?.total ?? 0;
            }
        });
    } catch (e) {
        console.warn(`Failed to load ${duration} popularity`);
    }
}

function sortZones() {
    const sortBy = sortOptions.value;

    if (sortBy === 'name') {
        zones.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'id') {
        zones.sort((a, b) => a.id - b.id);
    } else if (sortBy === 'popular') {
        zones.sort((a, b) => (popularityData['year']?.[b.id] ?? 0) - (popularityData['year']?.[a.id] ?? 0));
    } else if (sortBy === 'trendingMonth') {
        zones.sort((a, b) => (popularityData['month']?.[b.id] ?? 0) - (popularityData['month']?.[a.id] ?? 0));
    } else if (sortBy === 'trendingWeek') {
        zones.sort((a, b) => (popularityData['week']?.[b.id] ?? 0) - (popularityData['week']?.[a.id] ?? 0));
    } else if (sortBy === 'trendingDay') {
        zones.sort((a, b) => (popularityData['day']?.[b.id] ?? 0) - (popularityData['day']?.[a.id] ?? 0));
    }

    // Keep special items (like suggestion) at top
    zones.sort((a, b) => (a.id === -1 ? -1 : b.id === -1 ? 1 : 0));

    // Display featured
    const featured = zones.filter(z => z.featured === true);
    displayFeaturedZones(featured);

    displayZones(zones);
}

function displayFeaturedZones(featuredZones) {
    featuredContainer.innerHTML = "";

    featuredZones.forEach(zone => {
        const div = document.createElement("div");
        div.className = "zone-item";
        div.onclick = () => openZone(zone);

        const img = document.createElement("img");
        img.dataset.src = zone.cover.replace("{COVER_URL}", coverBase).replace("{HTML_URL}", htmlBase);
        img.alt = zone.name;
        img.loading = "lazy";
        img.className = "lazy-zone-img";

        const btn = document.createElement("button");
        btn.textContent = zone.name;
        btn.onclick = e => { e.stopPropagation(); openZone(zone); };

        div.append(img, btn);
        featuredContainer.appendChild(div);
    });

    document.getElementById("allZonesSummary").textContent = `Featured Zones (${featuredZones.length})`;

    // Lazy load images
    lazyLoadImages('#featuredZones img.lazy-zone-img');
}

function displayZones(filteredZones) {
    container.innerHTML = "";

    filteredZones.forEach(zone => {
        const div = document.createElement("div");
        div.className = "zone-item";
        div.onclick = () => openZone(zone);

        const img = document.createElement("img");
        img.dataset.src = zone.cover.replace("{COVER_URL}", coverBase).replace("{HTML_URL}", htmlBase);
        img.alt = zone.name;
        img.loading = "lazy";
        img.className = "lazy-zone-img";

        const btn = document.createElement("button");
        btn.textContent = zone.name;
        btn.onclick = e => { e.stopPropagation(); openZone(zone); };

        div.append(img, btn);
        container.appendChild(div);
    });

    document.getElementById("allSummary").textContent = `All Zones (${filteredZones.length})`;

    lazyLoadImages('img.lazy-zone-img');
}

function lazyLoadImages(selector) {
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove("lazy-zone-img");
                obs.unobserve(img);
            }
        });
    }, { rootMargin: "100px", threshold: 0.1 });

    document.querySelectorAll(selector).forEach(img => observer.observe(img));
}

// Filter by special tag
function filterZones2() {
    const tag = filterOptions.value;
    if (tag === "none") {
        displayZones(zones);
    } else {
        const filtered = zones.filter(z => Array.isArray(z.special) && z.special.includes(tag));
        document.getElementById("featuredZonesWrapper").removeAttribute("open");
        displayZones(filtered);
    }
}

// Search filter
function filterZones() {
    const query = searchBar.value.toLowerCase().trim();
    if (!query) {
        displayZones(zones);
        return;
    }

    const filtered = zones.filter(z => z.name.toLowerCase().includes(query));
    document.getElementById("featuredZonesWrapper").removeAttribute("open");
    displayZones(filtered);
}

function openZone(file) {
    const url = getGameURL(file);

    if (file.url && file.url.startsWith("http") && !url.includes(".html")) {
        window.open(file.url, "_blank");
        return;
    }

    fetch(url + "?t=" + Date.now())
        .then(res => {
            if (!res.ok) throw new Error("Failed to load game");
            return res.text();
        })
        .then(html => {
            if (!zoneFrame || zoneFrame.contentDocument === null) {
                zoneFrame = document.createElement("iframe");
                zoneFrame.id = "zoneFrame";
                zoneViewer.appendChild(zoneFrame);
            }

            zoneFrame.contentDocument.open();
            zoneFrame.contentDocument.write(html);
            zoneFrame.contentDocument.close();

            document.getElementById('zoneName').textContent = file.name;
            document.getElementById('zoneId').textContent = file.id;
            document.getElementById('zoneAuthor').textContent = "by " + (file.author || "Unknown");

            if (file.authorLink) {
                document.getElementById('zoneAuthor').href = file.authorLink;
            }

            zoneViewer.style.display = "block";
            zoneViewer.hidden = false;

            // Update URL
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('id', file.id);
            history.pushState(null, '', newUrl);
        })
        .catch(err => {
            console.error(err);
            alert("Failed to load zone: " + err.message);
        });
}

// Rest of your functions (aboutBlank, closeZone, downloadZone, fullscreenZone, etc.) remain the same
// Just make sure you call listZones() at the very end:

listZones();
