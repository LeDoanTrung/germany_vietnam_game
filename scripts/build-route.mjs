// Turns the stops in src/config/route-waypoints.json into a street-following
// path and saves it as src/config/route-path.json.
//
// This runs once, on a developer machine (`npm run route`), so the deployed
// game never calls a routing API — no keys, no fees, works on GitHub Pages.
// Uses the public OSRM demo server, which is fine for occasional one-off use.

import { readFile, writeFile } from "node:fs/promises";

const WAYPOINTS = new URL("../src/config/route-waypoints.json", import.meta.url);
const OUTPUT = new URL("../src/config/route-path.json", import.meta.url);

const { start, via = [], destination } = JSON.parse(await readFile(WAYPOINTS, "utf8"));
const stops = [start, ...via, destination].map((stop) => stop.coords);

// OSRM wants lng,lat; the config is lat,lng like Google Maps.
const coordinates = stops.map(([lat, lng]) => `${lng},${lat}`).join(";");
const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

const response = await fetch(url, { headers: { "User-Agent": "shipper-game route builder" } });
if (!response.ok) throw new Error(`OSRM request failed: ${response.status} ${response.statusText}`);

const data = await response.json();
const route = data.routes?.[0];
if (!route) throw new Error(`OSRM found no route: ${data.code ?? "unknown error"}`);

// Back to lat,lng, rounded to ~1 m to keep the file small.
const path = route.geometry.coordinates.map(([lng, lat]) => [Number(lat.toFixed(5)), Number(lng.toFixed(5))]);

await writeFile(
  OUTPUT,
  JSON.stringify({ distanceMeters: Math.round(route.distance), durationSeconds: Math.round(route.duration), path }) + "\n",
);

console.log(`Saved ${path.length} points, ${(route.distance / 1000).toFixed(1)} km → src/config/route-path.json`);
