"use client";

import L from "leaflet";
import { findPinSvg } from "./legendConfig";

export const findPinIcon = new L.DivIcon({
  className: "find-pin-marker",
  html: findPinSvg(32, 42),
  iconSize: [32, 42],
  iconAnchor: [16, 39],
  popupAnchor: [0, -39],
});

export const selectedIcon = new L.DivIcon({
  className: "custom-marker-selected",
  html: `<div style="
    width: 24px; height: 24px;
    background: #22c55e;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 0 20px rgba(34,197,94,0.6);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export const historyIcon = new L.DivIcon({
  className: "custom-marker-history",
  html: `<div style="
    width: 20px; height: 20px;
    background: #d4a017;
    border: 2px solid #fef3c7;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(212,160,23,0.5);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});
