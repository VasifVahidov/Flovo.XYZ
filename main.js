let jsonData = {};

// Fetch JSON data
fetch('data.json')
    .then(response => response.json())
    .then(data => {
        jsonData = data;
        console.log("Data loaded successfully");
    })
    .catch(error => console.error('Error fetching JSON:', error));

document.getElementById('searchForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const query = document.getElementById('searchInput').value.trim();
    let result = jsonData[query] || fuzzySearch(query, jsonData);

    if (result) {
        document.getElementById('result').classList.remove('hidden');
        createCollapsibleTree(result, query);
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
    let node = {
        name: name,
        description: data.description,
        children: data.subtopics ? Object.entries(data.subtopics).map(([key, value]) => convertToTree(value, key)) : null
    };
    return node;
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
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
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
});

// Close history modal
document.getElementById("closeHistory").addEventListener("click", function() {
    document.getElementById("historyModal").classList.add("hidden");
});
