import { useEffect, useRef } from 'react';

// height: pixels for the compact chart, or '100%' to fill a parent (the enlarged popup)
export default function StockChart({ symbol, height = 320 }) {
	const container = useRef();

	useEffect(() => {
		container.current.innerHTML = '';
		const script = document.createElement('script');
		script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
		script.async = true;
		script.innerHTML = JSON.stringify({
			autosize: true,
			symbol,
			interval: 'D',
			timezone: 'Asia/Kolkata',
			theme: 'dark',
			style: '1',
			locale: 'en',
			allow_symbol_change: true,
			save_image: true,
			withdateranges: true,
			hide_top_toolbar: false,
			hide_side_toolbar: height === '100%' ? false : true,
		});
		container.current.appendChild(script);
	}, [symbol, height]);

	return <div ref={container} className="tradingview-widget-container" style={{ width: '100%', height }} />;
}
