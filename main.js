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

// **Create collapsible tree (Fixed)**
function createCollapsibleTree(data, query) {
    d3.select("#tree").selectAll("*").remove();

    const treeData = convertToTree(data, query);
    console.log("Converted Tree Structure:", JSON.stringify(treeData, null, 2)); // Debugging log
    const width = 1000, height = 600;

    const svg = d3.select("#tree")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block") // Make sure it's centered
        .style("margin", "auto") // Center horizontally
        .append("g")
        .attr("transform", `translate(${width / 4}, 50)`);

    const treeLayout = d3.tree().size([height - 100, width - 300]);
    const root = d3.hierarchy(treeData, d => d.children);
    root.x0 = height / 2;
    root.y0 = 0;

    // **Collapse all nodes except first level**
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
        nodes.forEach(d => d.y = d.depth * 180);

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
            .attr("r", 10)
            .style("fill", d => d._children ? "#4f46e5" : "#999")
            .style("cursor", "pointer");

        nodeEnter.append("text")
            .attr("dy", 3)
            .attr("x", d => d.children || d._children ? -15 : 15)
            .attr("text-anchor", d => d.children || d._children ? "end" : "start")
            .text(d => d.data.name);

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
            .attr("stroke", "#999")
            .attr("stroke-width", "2px")
            .attr("d", d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x))
            .merge(link)
            .transition().duration(duration)
            .attr("d", d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x));

        link.exit().transition().duration(duration)
            .attr("d", d3.linkHorizontal()
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