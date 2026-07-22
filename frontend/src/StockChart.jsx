import { useEffect, useRef } from "react";

export default function StockChart({ symbol }) {
  const container = useRef();

  useEffect(() => {
    container.current.innerHTML = "";

    const script = document.createElement("script");

    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

    script.async = true;

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