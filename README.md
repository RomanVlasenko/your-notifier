your_notifier
=============

<b>Your notifier</b> is a Chrome extension that helps to gather and monitor data from different sources.

###How to Use###
- Press <i>Create rule</i>
- Add some title for a page which you'd like to monitor
- Add URL of that page
- Add jQuery/CSS selector by which notifier will get particular piece of data you're interested in
- PROFIT!

###Example1:###
I'd like to be aware of current price for new Kindle Fire from Amazon.

####Rule:####
- Title: <pre>Kindle Fire (Price)</pre>
- URL: <pre>http://www.amazon.com/Kindle-Fire-HDX-Display-Wi-Fi/dp/B00BWYQ9YE/ref=sr_tr_1?s=digital-text&ie=UTF8&qid=1385503461&sr=1-1&keywords=kindle+fire</pre>
- CSS Selector: <pre>span#buyingPriceValue</pre>

###Example1:###
I'd like to be updated on Apple stocks price

####Rule:####
- Title: <pre>Apple Inc. stocks price</pre>
- URL: <pre>http://finance.yahoo.com/q?s=AAPL</pre>
- CSS Selector: <pre>span.time_rtq_ticker</pre>