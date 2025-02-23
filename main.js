let jsonData = {};

// Fetch JSON data
fetch('data.json')
    .then(response => response.json())
    .then(data => {
        jsonData = data;
        console.log("Data loaded successfully");
    })
    .catch(error => console.error('Error fetching JSON:', error));

    document.getElementById('searchForm').addEventListener('submit', async function (event) {
        event.preventDefault();
        const query = document.getElementById('searchInput').value.trim();
    
        let result = jsonData[query] || fuzzySearch(query, jsonData);
    
        if (!result) {
            result = await fetchWikipediaData(query); // Fetch from Wikipedia
            if (result) {
                result.children = await fetchWikidataSubtopics(query); // Fetch subtopics from Wikidata
            }
        }
    
        if (result) {
            document.getElementById('result').classList.remove('hidden');
    
            if (document.getElementById('toggleTreeView').checked) {
                createRadialTree(result, query); // 🌟 Circuit View
            } else {
                createCollapsibleTree(result, query); // 🔄 Standard View
            }
        } else {
            document.getElementById('result').innerHTML = `<p class="text-red-500">No results found for: <strong>${query}</strong></p>`;
        }
    });
    
    

// **Fuzzy search function**
function fuzzySearch(query, data) {
    for (const key in data) {
        if (key.toLowerCase().includes(query.toLowerCase())) {
            return data[key];
        }
    }
    return null;
}

// **Updated JSON-to-Tree Conversion**
function convertToTree(data, name) {
    let parsedSubtopics = data.children || parseDescriptionToSubtopics(data.description);

    return {
        name: name,
        description: data.description,
        children: parsedSubtopics ? parsedSubtopics.map(subtopic => convertToTree(subtopic, subtopic.name)) : []
    };
}



function createCollapsibleTree(data, query) {
    d3.select("#tree").selectAll("*").remove();

    const treeData = convertToTree(data, query);
    console.log("Converted Tree Structure:", JSON.stringify(treeData, null, 2));

    // 📏 Dynamically adjust width & height for a compact layout
    const width = Math.min(window.innerWidth - 40, 900);
    const height = Math.min(window.innerHeight - 100, 500);

    const svg = d3.select("#tree")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block")
        .style("margin", "auto")
        .call(d3.zoom().on("zoom", (event) => {
            svg.attr("transform", event.transform);
        }))
        .append("g")
        .attr("transform", `translate(${width / 3}, 50)`); // ⚡ Tighter centering

    // 📏 Tighter tree layout
    const treeLayout = d3.tree().size([height - 100, width - 400]); 
    const root = d3.hierarchy(treeData, d => d.children);
    root.x0 = height / 2;
    root.y0 = 0;

    // 🚀 Collapse all nodes except first level
    if (root.children) {
        root.children.forEach(collapse);
    }
    update(root);

    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }

    function update(source) {
        const duration = 400;
        const nodes = root.descendants();
        const links = root.links();

        treeLayout(root);
        nodes.forEach(d => d.y = d.depth * 90); // ⚡ Tighter spacing: 90px instead of 120px

        const node = svg.selectAll("g.node")
            .data(nodes, d => d.id || (d.id = Math.random()));

        const nodeEnter = node.enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${source.y0},${source.x0})`)
            .on("click", function (event, d) {
                toggleChildren(d);
                update(d);
            });

        nodeEnter.append("circle")
            .attr("r", 7) // 🔵 Slightly smaller nodes for compactness
            .style("fill", d => d._children ? "#4f46e5" : "#999")
            .style("cursor", "pointer");

        nodeEnter.append("text")
            .attr("dy", 3)
            .attr("x", d => d.children || d._children ? -12 : 12)
            .attr("text-anchor", d => d.children || d._children ? "end" : "start")
            .text(d => d.data.name)
            .style("fill", "#ffffff")
            .style("font-size", "11px"); // ⚡ Slightly smaller text

        const nodeUpdate = nodeEnter.merge(node);
        nodeUpdate.transition().duration(duration)
            .attr("transform", d => `translate(${d.y},${d.x})`);

        node.exit().transition().duration(duration)
            .attr("transform", d => `translate(${source.y},${source.x})`)
            .remove();

        const link = svg.selectAll("path.link")
            .data(links, d => d.target.id);

        link.enter()
            .insert("path", "g")
            .attr("class", "link")
            .attr("fill", "none")
            .attr("stroke", "#888")
            .attr("stroke-width", "1px") // ⚡ Thinner lines for less visual clutter
            .attr("d", d3.linkVertical() // ✅ Use vertical lines for a cleaner look
                .x(d => d.y)
                .y(d => d.x))
            .merge(link)
            .transition().duration(duration)
            .attr("d", d3.linkVertical()
                .x(d => d.y)
                .y(d => d.x));

        link.exit().transition().duration(duration)
            .attr("d", d3.linkVertical()
                .x(d => source.y)
                .y(d => source.x))
            .remove();

        nodes.forEach(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    function toggleChildren(d) {
        if (!d.children && !d._children) return; // ✅ Prevent toggling on empty nodes
    
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
    }
    
    
}

function createRadialTree(data, query) {
    d3.select("#tree").selectAll("*").remove(); // Clear previous tree

    const treeData = convertToTree(data, query);
    console.log("Converted Tree Structure:", JSON.stringify(treeData, null, 2));

    const width = 800,
        height = 800,
        radius = width / 2 - 50;

    const svg = d3.select("#tree")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    // ✅ Use `d3.cluster()` for a better radial structure
    const cluster = d3.cluster()
        .size([360, radius]);

    const root = d3.hierarchy(treeData, d => d.children);
    cluster(root);

    // ✅ Draw links (curved paths)
    const link = svg.selectAll("path")
        .data(root.links())
        .enter().append("path")
        .attr("d", d3.linkRadial()
            .angle(d => (d.x / 180) * Math.PI)
            .radius(d => d.y))
        .attr("fill", "none")
        .attr("stroke", "#00ffcc") // Neon blue-green circuit look
        .attr("stroke-width", "2px");

    // ✅ Draw nodes (circles)
    const node = svg.selectAll("g.node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `rotate(${d.x - 90}) translate(${d.y},0)`)
        .on("click", function (event, d) {
            toggleChildren(d);
            createRadialTree(data, query); // Update tree on click
        });

    node.append("circle")
        .attr("r", 8) // Adjusted node size
        .style("fill", d => d.children ? "#4f46e5" : "#999")
        .style("cursor", "pointer");

    // ✅ Fix text positioning to avoid overlap
    node.append("text")
        .attr("dy", 3)
        .attr("x", d => d.x < 180 ? 12 : -12)
        .attr("text-anchor", d => d.x < 180 ? "start" : "end")
        .attr("transform", d => d.x < 180 ? "" : "rotate(180)")
        .text(d => d.data.name)
        .style("fill", "#ffffff")
        .style("font-size", "12px");
}

// ✅ Collapsing Functionality
function toggleChildren(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
}




document.getElementById("downloadButton").addEventListener("click", function () {
    const treeElement = document.getElementById("tree");

    html2canvas(treeElement, { 
        scale: 2,
        backgroundColor: "#111"  // ✅ Force dark background for visibility
    }).then(canvas => {
        const image = canvas.toDataURL("image/png");

        // ✅ Special fix for Safari
        if (navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome")) {
            const newWindow = window.open();
            newWindow.document.write('<img src="' + image + '"/>');
        } else {
            const link = document.createElement("a");
            link.href = image;
            link.download = "flovo_tree.png";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });
});

function createMeteor() {
    const meteor = document.createElement("div");
    meteor.classList.add("meteor");

    // Random starting position
    meteor.style.left = Math.random() * window.innerWidth + "px";
    meteor.style.animationDuration = (Math.random() * 1.5 + 0.5) + "s"; // Random fall speed

    document.body.appendChild(meteor);

    // Remove meteor after animation
    setTimeout(() => {
        meteor.remove();
    }, 2000);
}

// Create meteors at intervals
setInterval(createMeteor, 200);

// Store search history in local storage
let searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || [];

document.getElementById("searchForm").addEventListener("submit", function(event) {
    event.preventDefault();
    const query = document.getElementById("searchInput").value.trim();
    
    if (query && !searchHistory.includes(query)) {
        searchHistory.unshift(query);
        if (searchHistory.length > 10) searchHistory.pop(); // Limit to last 10 searches
        localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
    }
});

// Show history modal
document.getElementById("historyButton").addEventListener("click", function() {
    const historyList = document.getElementById("historyList");
    historyList.innerHTML = ""; // Clear previous items

    searchHistory.forEach(search => {
        const item = document.createElement("li");
        item.className = "cursor-pointer hover:text-blue-400";
        item.innerText = search;
        item.onclick = function() {
            document.getElementById("searchInput").value = search;
            document.getElementById("historyModal").classList.add("hidden");
        };
        historyList.appendChild(item);
    });

    document.getElementById("historyModal").classList.remove("hidden");
    popup.style.zIndex = "1000"; // ✅ Ensure it comes to the front

});

// Close history modal
document.getElementById("closeHistory").addEventListener("click", function() {
    document.getElementById("historyModal").classList.add("hidden");
});

document.getElementById('toggleTreeView').addEventListener('change', function () {
    const query = document.getElementById('searchInput').value.trim();
    let result = jsonData[query] || fuzzySearch(query, jsonData);

    if (result) {
        if (this.checked) {
            createRadialTree(result, query); // 🌟 Circuit View
        } else {
            createCollapsibleTree(result, query); // 🔄 Standard View
        }
    }
});

async function fetchWikipediaData(topic) {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch data");

        const data = await response.json();
        if (!data.extract) return null; // No relevant data found

        return {
            name: topic,
            description: data.extract,
            children: [] // Placeholder for subtopics
        };
    } catch (error) {
        console.error("Error fetching Wikipedia data:", error);
        return null;
    }
}

async function fetchWikidataSubtopics(topic) {
    const wikidataQuery = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(topic)}&language=en&format=json&origin=*`;

    try {
        const response = await fetch(wikidataQuery);
        if (!response.ok) throw new Error("Failed to fetch Wikidata");

        const data = await response.json();
        if (!data.search || data.search.length === 0) return [];

        return data.search.map(entry => ({
            name: entry.label,
            description: entry.description || "No description available.",
            children: [] // Can be expanded later
        }));
    } catch (error) {
        console.error("Error fetching Wikidata subtopics:", error);
        return [];
    }
}

function parseDescriptionToSubtopics(description) {
    const subtopics = [];
    const sentences = description.split(/[\.\!]/).map(s => s.trim());

    let index = 1;
    for (const sentence of sentences) {
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
                const matchedKeyword = keywords.find(keyword => sentence.toLowerCase().includes(keyword));
                const extractedInfo = sentence.split(matchedKeyword)[1]?.trim();
                
                if (extractedInfo) {
                    subtopics.push({
                        name: `${category}: ${extractedInfo}`,  // ✅ Give each node a meaningful name
                        description: extractedInfo,
                        children: []
                    });
                    index++;
                }
            }
        }
    }

    return subtopics.length > 0 ? subtopics : null;  // ✅ Ensure a valid structure
}

