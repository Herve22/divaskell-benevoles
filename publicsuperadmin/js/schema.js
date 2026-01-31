const nodes = new vis.DataSet([
  { id: 1, label: "users" },
  { id: 2, label: "groupes" },
  { id: 3, label: "evenements" },
  { id: 4, label: "creneaux" },
  { id: 5, label: "inscriptions" }
]);

const edges = new vis.DataSet([
  { from: 1, to: 2 },
  { from: 2, to: 3 },
  { from: 2, to: 4 },
  { from: 4, to: 5 },
]);

const container = document.getElementById("network");
const network = new vis.Network(container, { nodes, edges }, { nodes: { shape: "ellipse", color: "#d0e2ff" }});
