import { useEffect, useRef } from "react";

/*
  StockChart.jsx
  - Embeds TradingView's advanced chart widget into the page for interactive
  - symbol charting. The `symbol` prop controls which instrument is displayed.
  - The component injects the TradingView embed script each time the symbol
  - changes. Using a ref ensures the container is replaced cleanly.
*/
export default function StockChart({ symbol }) {
  const container = useRef();

  useEffect(() => {
    // Clear previous widget (if any) before inserting a new one for the
    // updated symbol.
    container.current.innerHTML = "";

    const script = document.createElement("script");

    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

    script.async = true;

    // TradingView expects JSON config inside the script tag.
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: "D",
      timezone: "Asia/Kolkata",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      save_image: true,
      withdateranges: true,
      hide_top_toolbar: false,
      hide_side_toolbar: false,
    });

    container.current.appendChild(script);
  }, [symbol]);

  return (
    <div
      ref={container}
      className="tradingview-widget-container"
      style={{
        width: "100%",
        height: "600px",
      }}
    ></div>
  );
}