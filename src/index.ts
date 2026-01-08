import "./scrolling-banner-card";
import "./editor";

// Register in the HA card picker (so it appears in the visual UI picker)
(window as any).customCards = (window as any).customCards || [];
if (!(window as any).customCards.some((c: any) => c.type === "custom:scrolling-banner-card")) {
  (window as any).customCards.push({
    type: "custom:scrolling-banner-card",
    name: "Scrolling Banner Card",
    description: "A responsive scrolling banner showing entity states.",
    preview: true,
  });
}
